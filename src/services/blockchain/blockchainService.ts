import { EVMWalletService } from './evmWallet'
import { SVMWalletService } from './svmWallet'
import { EVMService } from './evmService'
import { SVMService } from './svmService'
import { Wallet, Network, TokenBalance, Transaction } from '../../types'
import { db } from '../storage/database'
import { transactionMonitor } from '../transactions/transactionMonitor'
import { tokenImageService } from '../tokens/tokenImageService'
import { coinGeckoService } from '../api/coinGeckoService'

export interface BlockchainBalance {
  native: string
  nativeUSD: number
  tokens: TokenBalance[]
  totalUSD: number
  totalUSDChange?: number
  lastUpdated?: number
}

interface TokenWithPrice extends TokenBalance {
  usdPrice?: number
  usd24hChange?: number
}

export class BlockchainService {
  private static instance: BlockchainService
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()
  private tokenServices: Map<string, EVMService | SVMService> = new Map() // Cache token services for both EVM and SVM
  private lastPriceFetch: number = 0
  private PRICE_FETCH_INTERVAL = 300000 // 5 minutes between price fetches (to avoid rate limits)
  private POLLING_INTERVAL = 5000 // 5 seconds for balance updates
  private activePriceFetches: Map<string, Promise<any>> = new Map() // Track active price fetches

  static getInstance(): BlockchainService {
    if (!BlockchainService.instance) {
      BlockchainService.instance = new BlockchainService()
    }
    return BlockchainService.instance
  }

  /**
   * Start polling for a specific wallet and network
   */
  startPolling(
    wallet: Wallet,
    network: Network,
    onUpdate: (balance: BlockchainBalance) => void,
  ): void {
    const key = `${wallet.address}_${network.id}`

    // Stop existing polling for this wallet/network
    this.stopPolling(wallet, network)

    // Start new polling
    const poll = async () => {
      try {
        const balance = await this.getBalance(wallet, network)
        onUpdate(balance)
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Initial fetch
    poll()

    // Set up interval
    const interval = setInterval(poll, this.POLLING_INTERVAL)
    this.pollingIntervals.set(key, interval)
  }

  /**
   * Stop polling for a specific wallet and network
   */
  stopPolling(wallet: Wallet, network: Network): void {
    const key = `${wallet.address}_${network.id}`
    const interval = this.pollingIntervals.get(key)

    if (interval) {
      clearInterval(interval)
      this.pollingIntervals.delete(key)
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling(): void {
    for (const interval of this.pollingIntervals.values()) {
      clearInterval(interval)
    }
    this.pollingIntervals.clear()
  }

  /**
   * Get balance for a wallet on a specific network
   */
  async getBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      throw new Error(
        `Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`,
      )
    }

    let nativeBalance: string
    let tokens: TokenWithPrice[] = []

    if (wallet.type === 'EVM') {
      // Get native balance
      nativeBalance = await EVMWalletService.getBalance(wallet.address, network.rpcUrl)

      // Get token balances
      tokens = await this.getEVMTokens(wallet.address, network)
    } else {
      // Solana
      nativeBalance = await SVMWalletService.getBalance(wallet.address, network.rpcUrl)

      // Get SPL tokens
      tokens = await this.getSolanaTokens(wallet.address, network)
    }

    // Calculate native USD value
    const nativeUSD = await this.getNativeTokenUSD(nativeBalance, network)

    // Calculate total USD
    const tokensUSD = tokens.reduce((sum, token) => {
      const tokenValue = parseFloat(token.balance) * (token.usdPrice || 0)
      return sum + tokenValue
    }, 0)

    const totalUSD = nativeUSD + tokensUSD

    // Get previous total for change calculation
    const previousTotal = await this.getPreviousTotal(wallet.address, network.id)
    const totalUSDChange = previousTotal ? ((totalUSD - previousTotal) / previousTotal) * 100 : 0

    // Cache the new total and native balance
    await this.cacheTotal(wallet.address, network.id, totalUSD, nativeBalance, nativeUSD)
    
    // Cache token balances
    await this.cacheTokenBalances(wallet.address, network.id, tokens)

    return {
      native: nativeBalance,
      nativeUSD,
      tokens: tokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        balance: t.balance,
        logoURI: t.logoURI,
        usdValue: parseFloat(t.balance) * (t.usdPrice || 0), // Calculate USD value for each token
        change24h: t.usd24hChange || 0,
      })),
      totalUSD,
      totalUSDChange,
      lastUpdated: Date.now(),
    }
  }

  /**
   * Get EVM tokens for a wallet
   */
  private async getEVMTokens(walletAddress: string, network: Network): Promise<TokenWithPrice[]> {
    const chainId = network.chainId as number

    // Get list of tokens to check
    const tokenAddresses = await this.getTokenAddressesToCheck(walletAddress, chainId)

    // Get or create cached token service instance
    const serviceKey = `${network.rpcUrl}_${chainId}`
    let tokenService = this.tokenServices.get(serviceKey)
    if (!tokenService) {
      tokenService = new EVMService(network.rpcUrl, chainId, network.id, network)
      this.tokenServices.set(serviceKey, tokenService)
    }

    // Get token balances
    const tokenBalances = await tokenService.getTokenBalances(walletAddress, tokenAddresses)

    // Get prices if needed
    let prices: Record<string, { usd: number; usd_24h_change?: number }> = {}
    if (tokenBalances.length > 0) {
      const priceKey = `token-prices-${chainId}`
      
      // Check if we're already fetching prices for this chain
      const activeFetch = this.activePriceFetches.get(priceKey)
      if (activeFetch) {
        console.debug('Using existing price fetch for chain', chainId)
        prices = await activeFetch
      } else if (this.shouldFetchPrices()) {
        // Start new price fetch
        const priceFetchPromise = tokenService.fetchTokenPrices(tokenBalances.map((t) => t.address))
          .then(async (fetchedPrices) => {
            this.lastPriceFetch = Date.now()
            // Cache prices
            await this.cachePrices(fetchedPrices, chainId)
            return fetchedPrices
          })
          .finally(() => {
            this.activePriceFetches.delete(priceKey)
          })
        
        this.activePriceFetches.set(priceKey, priceFetchPromise)
        prices = await priceFetchPromise
      } else {
        // Use cached prices
        prices = await this.getCachedPrices(
          tokenBalances.map((t) => t.address),
          chainId,
        )
      }
    }

    // Combine balances with prices
    const tokensWithPrices = tokenBalances.map((token) => {
      const price = prices[token.address.toLowerCase()]
      if (!price && parseFloat(token.balance) > 0) {
        console.debug(`No price found for token ${token.symbol} (${token.address})`)
      }
      return {
        ...token,
        usdPrice: price?.usd || 0,
        usd24hChange: price?.usd_24h_change || 0,
      }
    })

    // Fetch images for tokens that don't have them (in background)
    if (tokensWithPrices.length > 0) {
      // Don't await this - let it run in background
      tokenImageService.fetchAndCacheTokenImages(
        tokensWithPrices.map(t => ({
          address: t.address,
          chainId,
          symbol: t.symbol,
          name: t.name
        }))
      ).catch(err => console.error('Failed to fetch token images:', err))
    }

    // Try to get cached images for immediate display
    for (const token of tokensWithPrices) {
      const metadataId = `${chainId}_${token.address.toLowerCase()}`
      const cached = await db.tokenMetadata.get(metadataId)
      if (cached?.logoURI) {
        token.logoURI = cached.logoURI
      }
    }

    return tokensWithPrices
  }

  /**
   * Get Solana SPL tokens for a wallet
   */
  private async getSolanaTokens(
    walletAddress: string,
    network: Network,
  ): Promise<TokenWithPrice[]> {
    // Get or create cached token service instance
    const serviceKey = `${network.rpcUrl}_${network.chainId}`
    let tokenService = this.tokenServices.get(serviceKey)
    
    if (!tokenService || !(tokenService instanceof SVMService)) {
      tokenService = new SVMService(network.rpcUrl, network)
      this.tokenServices.set(serviceKey, tokenService)
    }
    
    // Get token balances
    const tokenBalances = await (tokenService as SVMService).getTokenBalances(walletAddress)
    
    // Get prices if needed
    let prices: Record<string, { usd: number; usd_24h_change?: number }> = {}
    if (tokenBalances.length > 0 && this.shouldFetchPrices()) {
      prices = await (tokenService as SVMService).fetchTokenPrices(tokenBalances.map((t) => t.address))
      this.lastPriceFetch = Date.now()
      
      // Cache prices (use special Solana chainId)
      await this.cachePrices(prices, 999999)
    } else if (tokenBalances.length > 0) {
      // Use cached prices
      prices = await this.getCachedPrices(
        tokenBalances.map((t) => t.address),
        999999,
      )
    }
    
    // Combine balances with prices
    const tokensWithPrices = tokenBalances.map((token) => {
      const price = prices[token.address]
      if (!price && parseFloat(token.balance) > 0) {
        console.debug(`No price found for Solana token ${token.symbol} (${token.address})`)
      }
      return {
        ...token,
        usdPrice: price?.usd || 0,
        usd24hChange: price?.usd_24h_change || 0,
      }
    })
    
    // Fetch images for tokens that don't have them (in background)
    if (tokensWithPrices.length > 0) {
      // Don't await this - let it run in background
      tokenImageService.fetchAndCacheTokenImages(
        tokensWithPrices.map(t => ({
          address: t.address,
          chainId: 999999, // Special chainId for Solana
          symbol: t.symbol,
          name: t.name
        }))
      ).catch(err => console.error('Failed to fetch Solana token images:', err))
    }
    
    // Try to get cached images for immediate display
    for (const token of tokensWithPrices) {
      const metadataId = `999999_${token.address.toLowerCase()}`
      const cached = await db.tokenMetadata.get(metadataId)
      if (cached?.logoURI) {
        token.logoURI = cached.logoURI
      }
    }
    
    return tokensWithPrices
  }

  /**
   * Get list of token addresses to check for a wallet
   */
  private async getTokenAddressesToCheck(
    walletAddress: string,
    chainId: number,
  ): Promise<string[]> {
    const addresses = new Set<string>()
    const MAX_TOKENS_TO_CHECK = 50 // Limit to prevent RPC overload

    // Priority 1: Get manually added tokens (always check these)
    const discoveredTokens = await db.discoveredTokens
      .where('walletAddress')
      .equals(walletAddress)
      .and((token) => token.chainId === chainId.toString() && token.addedManually === true)
      .toArray()

    discoveredTokens.forEach((token) => {
      addresses.add(token.tokenAddress.toLowerCase())
    })

    // Priority 2: Get tokens from previous successful fetches (that had balance > 0)
    const tokenBalances = await db.tokenBalances
      .where('walletAddress')
      .equals(walletAddress)
      .and((balance) => balance.networkId === chainId.toString())
      .toArray()

    // Sort by balance descending to prioritize tokens with higher balances
    tokenBalances.sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))

    tokenBalances.forEach((balance) => {
      if (
        balance.tokenAddress &&
        balance.tokenAddress !== 'native' &&
        addresses.size < MAX_TOKENS_TO_CHECK
      ) {
        addresses.add(balance.tokenAddress.toLowerCase())
      }
    })

    // No common tokens - users must manually add all tokens they want to track

    const finalAddresses = Array.from(addresses).slice(0, MAX_TOKENS_TO_CHECK)
    return finalAddresses
  }

  /**
   * Check if we should fetch new prices
   */
  private shouldFetchPrices(): boolean {
    return Date.now() - this.lastPriceFetch > this.PRICE_FETCH_INTERVAL
  }

  /**
   * Get native token USD value
   */
  private async getNativeTokenUSD(balance: string, network: Network): Promise<number> {
    const amount = parseFloat(balance)
    if (amount === 0) return 0

    // Map network symbols to CoinGecko IDs
    const nativeTokenIds: Record<string, string> = {
      ETH: 'ethereum',
      BNB: 'binancecoin',
      MATIC: 'matic-network',
      SOL: 'solana',
    }

    const tokenId = nativeTokenIds[network.symbol] || network.symbol.toLowerCase()

    // Check if we should fetch new price
    if (this.shouldFetchPrices()) {
      try {
        const price = await coinGeckoService.getNativeTokenPrice(tokenId)

        if (price > 0) {
          // Cache the price
          await db.priceData.put({
            id: tokenId,
            symbol: network.symbol,
            usdPrice: price,
            usd24hChange: 0,
            lastUpdated: Date.now(),
          })

          // Update last fetch time on success
          this.lastPriceFetch = Date.now()

          return amount * price
        }
      } catch (error) {
        console.warn('Price fetch failed, using cached price:', error)
      }
    }

    // Use cached price
    const cachedPrice = await db.priceData.get(tokenId)
    const price = cachedPrice?.usdPrice || 0

    return amount * price
  }

  /**
   * Cache token prices
   */
  private async cachePrices(
    prices: Record<string, { usd: number; usd_24h_change?: number }>,
    chainId: number,
  ): Promise<void> {
    const updates = Object.entries(prices).map(([address, priceData]) => ({
      id: `${chainId}_${address.toLowerCase()}`,
      symbol: address,
      usdPrice: priceData.usd,
      usd24hChange: priceData.usd_24h_change || 0,
      lastUpdated: Date.now(),
    }))

    await db.priceData.bulkPut(updates)
  }

  /**
   * Get cached prices for tokens
   */
  private async getCachedPrices(
    addresses: string[],
    chainId: number,
  ): Promise<Record<string, { usd: number; usd_24h_change?: number }>> {
    const prices: Record<string, { usd: number; usd_24h_change?: number }> = {}

    for (const address of addresses) {
      const cached = await db.priceData.get(`${chainId}_${address.toLowerCase()}`)
      if (cached) {
        prices[address.toLowerCase()] = {
          usd: cached.usdPrice,
          usd_24h_change: cached.usd24hChange,
        }
      }
    }

    return prices
  }

  /**
   * Get previous total USD value
   */
  private async getPreviousTotal(walletAddress: string, networkId: string): Promise<number | null> {
    const cached = await db.walletBalances.get(`${walletAddress}_${networkId}`)
    return cached?.totalUSD || null
  }

  /**
   * Cache total USD value
   */
  private async cacheTotal(
    walletAddress: string,
    networkId: string,
    totalUSD: number,
    nativeBalance: string,
    nativeUSD: number,
  ): Promise<void> {
    const id = `${walletAddress}_${networkId}`
    const existing = await db.walletBalances.get(id)

    await db.walletBalances.put({
      id,
      walletAddress,
      networkId,
      nativeBalance,
      nativeUSD,
      totalUSD,
      previousTotalUSD: existing?.totalUSD,
      lastUpdated: Date.now(),
    })
  }

  /**
   * Cache token balances
   */
  private async cacheTokenBalances(
    walletAddress: string,
    networkId: string,
    tokens: TokenWithPrice[]
  ): Promise<void> {
    // First, remove old token balances for this wallet/network
    await db.tokenBalances
      .where('walletAddress')
      .equals(walletAddress)
      .and(item => item.networkId === networkId)
      .delete()
    
    // Then add the new token balances
    const tokenBalancesToCache = tokens.map(token => ({
      id: `${walletAddress}_${networkId}_${token.address}`,
      walletAddress,
      networkId,
      tokenAddress: token.address,
      symbol: token.symbol,
      name: token.name,
      decimals: token.decimals,
      balance: token.balance,
      usdValue: parseFloat(token.balance) * (token.usdPrice || 0),
      logoURI: token.logoURI,
      lastUpdated: Date.now()
    }))
    
    if (tokenBalancesToCache.length > 0) {
      await db.tokenBalances.bulkPut(tokenBalancesToCache)
    }
  }

  /**
   * Validate wallet address
   */
  validateAddress(address: string, type: 'EVM' | 'SVM'): boolean {
    if (type === 'EVM') {
      return EVMWalletService.isValidAddress(address)
    } else {
      return SVMWalletService.isValidAddress(address)
    }
  }

  /**
   * Send native token transaction
   */
  async sendTransaction(
    wallet: Wallet,
    network: Network,
    to: string,
    amount: string,
    password: string,
  ): Promise<string> {
    if (!wallet.encryptedPrivateKey) {
      throw new Error('Wallet does not have a private key')
    }

    let hash: string

    if (wallet.type === 'EVM') {
      const privateKey = EVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
      hash = await EVMWalletService.sendTransaction(privateKey, to, amount, network.rpcUrl)
    } else {
      const privateKey = SVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
      hash = await SVMWalletService.sendTransaction(privateKey, to, amount, network.rpcUrl)
    }

    // Record the transaction
    await transactionMonitor.recordTransaction(
      hash,
      wallet.address,
      to,
      amount,
      network
    )

    return hash
  }

  /**
   * Send token transaction
   */
  async sendToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number,
    password: string,
    tokenSymbol?: string,
  ): Promise<string> {
    if (!wallet.encryptedPrivateKey) {
      throw new Error('Wallet does not have a private key')
    }

    let hash: string

    if (wallet.type === 'EVM') {
      const privateKey = EVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
      hash = await EVMWalletService.sendToken(
        privateKey,
        network.rpcUrl,
        tokenAddress,
        to,
        amount,
        decimals,
      )
    } else {
      // TODO: Implement Solana token sending
      throw new Error('Solana token sending not yet implemented')
    }

    // Record the transaction
    await transactionMonitor.recordTransaction(
      hash,
      wallet.address,
      to,
      amount,
      network,
      {
        address: tokenAddress,
        symbol: tokenSymbol || 'Unknown',
        decimals
      }
    )

    return hash
  }

  /**
   * Estimate transaction fee
   */
  async estimateTransactionFee(
    wallet: Wallet,
    network: Network,
    to: string,
    amount?: string,
  ): Promise<string> {
    if (wallet.type === 'EVM') {
      return EVMWalletService.estimateTransactionFee(wallet.address, network.rpcUrl, to, amount)
    } else {
      // Solana has fixed fees
      return '0.000005'
    }
  }

  /**
   * Get transaction history from stored platform transactions
   */
  async getTransactionHistory(wallet: Wallet, network: Network): Promise<Transaction[]> {
    return transactionMonitor.getTransactionHistory(wallet.address, network)
  }
}

// Export singleton instance
export const blockchainService = BlockchainService.getInstance()
