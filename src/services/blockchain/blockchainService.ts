import { EVMWalletService } from './evmWallet'
import { SVMWalletService } from './svmWallet'
import { EVMService } from './evmService'
import { Wallet, Network, TokenBalance } from '../../types'
import { db } from '../storage/database'

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
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()
  private tokenServices: Map<string, EVMService> = new Map() // Cache token services
  private lastPriceFetch: number = 0
  private PRICE_FETCH_INTERVAL = 300000 // 5 minutes between price fetches (to avoid rate limits)
  private POLLING_INTERVAL = 10000 // 10 seconds for balance updates

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

    // Cache the new total
    await this.cacheTotal(wallet.address, network.id, totalUSD)

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
      tokenService = new EVMService(network.rpcUrl, chainId)
      this.tokenServices.set(serviceKey, tokenService)
    }

    // Get token balances
    const tokenBalances = await tokenService.getTokenBalances(walletAddress, tokenAddresses)

    // Get prices if needed
    let prices: Record<string, { usd: number; usd_24h_change?: number }> = {}
    if (tokenBalances.length > 0 && this.shouldFetchPrices()) {
      prices = await tokenService.fetchTokenPrices(tokenBalances.map((t) => t.address))
      this.lastPriceFetch = Date.now()

      // Cache prices
      await this.cachePrices(prices, chainId)
    } else if (tokenBalances.length > 0) {
      // Use cached prices
      prices = await this.getCachedPrices(
        tokenBalances.map((t) => t.address),
        chainId,
      )
    }

    // Combine balances with prices
    return tokenBalances.map((token) => ({
      ...token,
      usdPrice: prices[token.address.toLowerCase()]?.usd || 0,
      usd24hChange: prices[token.address.toLowerCase()]?.usd_24h_change || 0,
    }))
  }

  /**
   * Get Solana SPL tokens for a wallet
   */
  private async getSolanaTokens(
    walletAddress: string,
    network: Network,
  ): Promise<TokenWithPrice[]> {
    // TODO: Implement Solana token fetching
    // For now, return empty array
    return []
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
    console.log(
      `Checking ${finalAddresses.length} tokens for ${walletAddress} on chain ${chainId}:`,
      finalAddresses,
    )
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
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd`,
        )

        if (response.ok) {
          const data = await response.json()
          const price = data[tokenId]?.usd || 0

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
        } else if (response.status === 429) {
          // Rate limited - increase the interval
          console.warn('CoinGecko rate limit hit, using cached price')
          // Don't update lastPriceFetch so we'll wait longer before next attempt
        }
      } catch (error) {
        // CORS or network error - use cached price
        console.warn('Price fetch failed, using cached price:', error.message || error)
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
  ): Promise<void> {
    const id = `${walletAddress}_${networkId}`
    const existing = await db.walletBalances.get(id)

    await db.walletBalances.put({
      id,
      walletAddress,
      networkId,
      nativeBalance: '0', // We don't use this field in the new design
      nativeUSD: 0, // We don't use this field in the new design
      totalUSD,
      previousTotalUSD: existing?.totalUSD,
      lastUpdated: Date.now(),
    })
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

    if (wallet.type === 'EVM') {
      const privateKey = EVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
      return EVMWalletService.sendTransaction(privateKey, to, amount, network.rpcUrl)
    } else {
      const privateKey = SVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
      return SVMWalletService.sendTransaction(privateKey, to, amount, network.rpcUrl)
    }
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
  ): Promise<string> {
    if (!wallet.encryptedPrivateKey) {
      throw new Error('Wallet does not have a private key')
    }

    if (wallet.type === 'EVM') {
      const privateKey = EVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
      return EVMWalletService.sendToken(
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
   * Get transaction history (placeholder for now)
   */
  async getTransactionHistory(wallet: Wallet, network: Network): Promise<any[]> {
    // TODO: Implement transaction history fetching
    // For now, return empty array to maintain compatibility
    return []
  }
}
