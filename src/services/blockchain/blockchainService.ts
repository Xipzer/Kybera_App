import { EVMWalletService } from './evmWallet'
import { SVMWalletService } from './svmWallet'
import { Wallet, Network, Transaction, TokenBalance } from '../../types'
import { db } from '../storage/database'
import { memoryProtection } from '../security/memoryProtection'
import { TokenDiscoveryService } from '../tokenDiscovery/tokenDiscoveryService'
import { getTokenDiscoveryConfig } from '../../config/tokenDiscoveryConfig'
import { tokenPriceResolver } from '../tokenDiscovery/priceResolver'
import { ethers, JsonRpcProvider, Contract, formatUnits, isAddress, ZeroAddress } from 'ethers'

export interface BlockchainBalance {
  native: string
  nativeUSD: number
  tokens: TokenBalance[]
  totalUSD: number
  totalUSDChange?: number // Percentage change since last refresh
  lastUpdated?: number // Timestamp of last successful update
}

export interface PriceData {
  [symbol: string]: {
    usd: number
    usd_24h_change: number
  }
}

class BlockchainService {
  private PRICE_CACHE_DURATION = 60000 // 1 minute
  private BALANCE_CACHE_DURATION = 30000 // 30 seconds for rate limiting
  private tokenDiscoveryService: TokenDiscoveryService
  private refreshingBalances: Map<string, boolean> = new Map() // Track active refreshes
  
  constructor() {
    this.tokenDiscoveryService = new TokenDiscoveryService(getTokenDiscoveryConfig())
  }

  async getBalance(wallet: Wallet, network: Network): Promise<BlockchainBalance> {
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      console.error('Network type mismatch detected:', {
        walletType: wallet.type,
        walletAddress: wallet.address,
        networkType: network.type,
        networkName: network.name,
        networkRPC: network.rpcUrl
      })
      throw new Error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
    }
    
    // First, try to get cached balance
    const cachedBalance = await this.getCachedBalance(wallet, network)
    if (cachedBalance) {
      // Return cached balance immediately
      // But also trigger a background refresh if it's stale
      const isStale = Date.now() - cachedBalance.lastUpdated > this.BALANCE_CACHE_DURATION
      if (isStale) {
        // Only trigger refresh if not already refreshing
        const refreshKey = `${wallet.address}_${network.id}`
        if (!this.refreshingBalances.get(refreshKey)) {
          this.refreshBalanceInBackground(wallet, network)
        }
      }
      // Get cached token list
      const tokens = await this.getCachedTokenBalances(wallet, network)
      
      // Recalculate total USD from cached components
      let cachedTokensUSD = 0
      for (const token of tokens) {
        const cachedTokenData = await db.tokenBalances.get(
          `${wallet.address}_${network.id}_${token.address || 'native'}`
        )
        if (cachedTokenData?.usdValue) {
          cachedTokensUSD += cachedTokenData.usdValue
        }
      }
      
      const recalculatedTotalUSD = cachedBalance.nativeUSD + cachedTokensUSD
      
      // If recalculation yields 0 but we had a stored total, use the stored total
      const finalTotalUSD = recalculatedTotalUSD === 0 && cachedBalance.totalUSD > 0 
        ? cachedBalance.totalUSD 
        : recalculatedTotalUSD
      
      const totalUSDChange = this.calculateRefreshChange(finalTotalUSD, cachedBalance.previousTotalUSD)
      
      // Reduced logging - only log in development mode
      if (import.meta.env.DEV) {
        console.log('Returning cached balance')
      }
      
      return {
        native: cachedBalance.nativeBalance,
        nativeUSD: cachedBalance.nativeUSD,
        tokens,
        totalUSD: finalTotalUSD,
        totalUSDChange,
        lastUpdated: cachedBalance.lastUpdated
      }
    }

    // No cache, fetch fresh data
    try {
      // Double-check network type before calling service
      if (wallet.type !== network.type) {
        throw new Error(`Cannot fetch balance: wallet type ${wallet.type} doesn't match network type ${network.type}`)
      }
      
      // Get native balance
      const nativeBalance = wallet.type === 'EVM'
        ? await EVMWalletService.getBalance(wallet.address, network.rpcUrl)
        : await SVMWalletService.getBalance(wallet.address, network.rpcUrl)

      // Get price data - map SOL to solana for CoinGecko
      const priceId = network.symbol.toLowerCase() === 'sol' ? 'solana' : network.symbol.toLowerCase()
      let nativePrice = 0
      let nativeUSD = 0
      
      try {
        const prices = await this.getPrices([priceId])
        nativePrice = prices[priceId]?.usd || 0
        nativeUSD = parseFloat(nativeBalance) * nativePrice
      } catch (priceError) {
        console.error('Failed to fetch native token price:', priceError)
        // Try to get cached price
        const cachedPrice = await db.priceData.get(priceId)
        if (cachedPrice) {
          nativePrice = cachedPrice.usdPrice
          nativeUSD = parseFloat(nativeBalance) * nativePrice
        }
      }

      // Fetch token balances
      const tokens: TokenBalance[] = []
      
      if (wallet.type === 'SVM') {
        // Fetch SPL token balances for Solana
        try {
          const tokenBalances = await this.getSPLTokenBalances(wallet.address, network.rpcUrl)
          tokens.push(...tokenBalances)
        } catch (error) {
          console.error('Failed to fetch SPL token balances:', error)
        }
      } else if (wallet.type === 'EVM') {
        // Fetch ERC-20 token balances for EVM chains
        try {
          const tokenBalances = await this.getERC20TokenBalances(wallet.address, network)
          tokens.push(...tokenBalances)
        } catch (error) {
          console.error('Failed to fetch ERC-20 token balances:', error)
        }
      }
      
      // Fetch token prices if we have tokens
      let tokensUSD = 0
      const tokenUSDValues: Record<string, number> = {} // Track USD value per token
      
      if (tokens.length > 0) {
        try {
          // Use the new price resolver for all token types
          const chainId = wallet.type === 'EVM' ? network.chainId : network.chainId
          const tokenPrices = await tokenPriceResolver.getTokenPrices(tokens, chainId)
          
          tokens.forEach(token => {
            if (tokenPrices[token.address]) {
              const tokenUSD = parseFloat(token.balance) * tokenPrices[token.address].usd
              tokenUSDValues[token.address] = tokenUSD
              tokensUSD += tokenUSD
            }
          })
        } catch (error) {
          console.error('Failed to fetch token prices:', error)
          // Try to use cached price data if fresh fetch fails
          for (const token of tokens) {
            const cachedTokenBalance = await db.tokenBalances.get(
              `${wallet.address}_${network.id}_${token.address || 'native'}`
            )
            if (cachedTokenBalance?.usdValue) {
              tokenUSDValues[token.address] = cachedTokenBalance.usdValue
              tokensUSD += cachedTokenBalance.usdValue
            }
          }
        }
      }
      
      const totalUSD = nativeUSD + tokensUSD
      
      // Get previous balance for change calculation
      const balanceId = `${wallet.address}_${network.id}`
      const previousBalance = await db.walletBalances.get(balanceId)
      const totalUSDChange = this.calculateRefreshChange(totalUSD, previousBalance?.totalUSD)
      
      // Reduced logging - only log in development mode
      if (import.meta.env.DEV) {
        console.log('Storing balance to cache')
      }
      
      // Cache the balance data
      await db.walletBalances.put({
        id: balanceId,
        walletAddress: wallet.address,
        networkId: network.id,
        nativeBalance,
        nativeUSD,
        totalUSD,
        previousTotalUSD: previousBalance?.totalUSD,
        lastUpdated: Date.now()
      })
      
      // Cache token balances with USD values
      for (const token of tokens) {
        const tokenKey = token.address || token.symbol
        await db.tokenBalances.put({
          id: `${wallet.address}_${network.id}_${token.address || 'native'}`,
          walletAddress: wallet.address,
          networkId: network.id,
          tokenAddress: token.address || 'native',
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: token.balance,
          usdValue: tokenUSDValues[tokenKey] || 0,
          logoURI: token.logoURI,
          lastUpdated: Date.now()
        })
      }
      
      // Add USD values to tokens before returning
      const tokensWithUSD = tokens.map(token => ({
        ...token,
        usdValue: tokenUSDValues[token.address || token.symbol] || 0
      }))
      
      return {
        native: nativeBalance,
        nativeUSD,
        tokens: tokensWithUSD,
        totalUSD,
        totalUSDChange,
        lastUpdated: Date.now()
      }
    } catch (error: any) {
      console.error('Failed to get balance:', error)
      
      // Try to return cached data on error
      const cachedBalance = await this.getCachedBalance(wallet, network)
      if (cachedBalance) {
        const tokens = await this.getCachedTokenBalances(wallet, network)
        
        // Calculate total USD from cached values
        let cachedTokensUSD = 0
        for (const token of tokens) {
          // Get cached USD value for this token
          const cachedTokenData = await db.tokenBalances.get(
            `${wallet.address}_${network.id}_${token.address || 'native'}`
          )
          if (cachedTokenData?.usdValue) {
            cachedTokensUSD += cachedTokenData.usdValue
          }
        }
        
        // Recalculate total USD from cached components
        const recalculatedTotalUSD = cachedBalance.nativeUSD + cachedTokensUSD
        
        // If recalculation yields 0 but we had a stored total, use the stored total
        const finalTotalUSD = recalculatedTotalUSD === 0 && cachedBalance.totalUSD > 0 
          ? cachedBalance.totalUSD 
          : recalculatedTotalUSD
        
        const totalUSDChange = this.calculateRefreshChange(finalTotalUSD, cachedBalance.previousTotalUSD)
        
        // Reduced logging - only log in development mode
        if (import.meta.env.DEV) {
          console.log('Returning cached balance on error')
        }
        
        return {
          native: cachedBalance.nativeBalance,
          nativeUSD: cachedBalance.nativeUSD,
          tokens,
          totalUSD: finalTotalUSD,
          totalUSDChange,
          lastUpdated: cachedBalance.lastUpdated
        }
      }
      
      // Only return zeros if no cached data available
      return {
        native: '0',
        nativeUSD: 0,
        tokens: [],
        totalUSD: 0
      }
    }
  }

  async sendTransaction(
    wallet: Wallet,
    network: Network,
    to: string,
    amount: string,
    password: string
  ): Promise<string> {
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      throw new Error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
    }
    
    // Store private key in secure memory temporarily
    const keyId = `send_tx_${Date.now()}`
    
    try {
      // Get private key and store securely
      const privateKey = await this.getWalletPrivateKey(wallet, password)
      memoryProtection.storeSensitive(keyId, privateKey, 30000) // 30 seconds max
      
      // Send transaction
      const txHash = wallet.type === 'EVM'
        ? await EVMWalletService.sendTransaction(privateKey, to, amount, network.rpcUrl)
        : await SVMWalletService.sendTransaction(privateKey, to, amount, network.rpcUrl)
      
      // Store transaction in database
      await db.transactions.add({
        hash: txHash,
        from: wallet.address,
        to,
        value: amount,
        status: 'confirmed',
        timestamp: Date.now(),
        network: network.id
      })
      
      return txHash
    } catch (error) {
      console.error('Failed to send transaction:', error)
      throw error
    } finally {
      // Always wipe sensitive data
      memoryProtection.wipeSensitive(keyId)
    }
  }

  async sendToken(
    wallet: Wallet,
    network: Network,
    tokenAddress: string,
    to: string,
    amount: string,
    decimals: number,
    password: string
  ): Promise<string> {
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      throw new Error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
    }
    
    // Store private key in secure memory temporarily
    const keyId = `send_token_${Date.now()}`
    
    try {
      const privateKey = await this.getWalletPrivateKey(wallet, password)
      memoryProtection.storeSensitive(keyId, privateKey, 30000) // 30 seconds max
      
      const txHash = wallet.type === 'EVM'
        ? await EVMWalletService.sendERC20Token(privateKey, tokenAddress, to, amount, decimals, network.rpcUrl)
        : await SVMWalletService.sendSPLToken(privateKey, tokenAddress, to, amount, network.rpcUrl)
      
      // Store transaction
      await db.transactions.add({
        hash: txHash,
        from: wallet.address,
        to,
        value: amount,
        status: 'confirmed',
        timestamp: Date.now(),
        network: network.id
      })
      
      return txHash
    } catch (error) {
      console.error('Failed to send token:', error)
      throw error
    } finally {
      // Always wipe sensitive data
      memoryProtection.wipeSensitive(keyId)
    }
  }

  async getTransactionHistory(wallet: Wallet, network: Network): Promise<Transaction[]> {
    // For now, return transactions from database
    // TODO: Integrate with blockchain explorers for full history
    const storedTransactions = await db.transactions
      .where('from')
      .equals(wallet.address)
      .or('to')
      .equals(wallet.address)
      .toArray()
    
    // Convert stored transactions to Transaction type
    return storedTransactions
      .filter(tx => tx.network === network.id)
      .map(tx => ({
        ...tx,
        timestamp: new Date(tx.timestamp)
      }))
  }


  private async getWalletPrivateKey(wallet: Wallet, password: string): Promise<string> {
    if (wallet.encryptedPrivateKey) {
      // Imported wallet
      return wallet.type === 'EVM'
        ? EVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
        : SVMWalletService.decryptPrivateKey(wallet.encryptedPrivateKey, password)
    } else {
      // Derived wallet from group
      const group = await db.walletGroups.get(wallet.groupId)
      if (!group) throw new Error('Wallet group not found')
      
      const decryptedSeed = wallet.type === 'EVM'
        ? EVMWalletService.decryptPrivateKey(group.encryptedSeed, password)
        : SVMWalletService.decryptPrivateKey(group.encryptedSeed, password)
      
      const derived = wallet.type === 'EVM'
        ? await EVMWalletService.deriveWalletFromSeed(decryptedSeed, wallet.derivationIndex)
        : await SVMWalletService.deriveWalletFromSeed(decryptedSeed, wallet.derivationIndex)
      
      return derived.privateKey
    }
  }

  validateAddress(address: string, type: 'EVM' | 'SVM'): boolean {
    return type === 'EVM'
      ? EVMWalletService.isValidAddress(address)
      : SVMWalletService.isValidAddress(address)
  }

  async estimateTransactionFee(
    wallet: Wallet,
    network: Network,
    to: string,
    amount: string
  ): Promise<string> {
    // Validate network type matches wallet type
    if (wallet.type !== network.type) {
      throw new Error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
    }
    
    try {
      if (wallet.type === 'EVM') {
        return await EVMWalletService.estimateGasFee(wallet.address, to, amount, network.rpcUrl)
      } else {
        return await SVMWalletService.estimateTransactionFee(wallet.address, to, amount, network.rpcUrl)
      }
    } catch (error) {
      console.error('Failed to estimate transaction fee:', error)
      // Return a safe default fee estimate
      return wallet.type === 'EVM' ? '0.001' : '0.000005'
    }
  }
  
  private async getERC20TokenBalances(walletAddress: string, network: Network): Promise<TokenBalance[]> {
    try {
      // Discover tokens for this wallet and network
      const discoveredTokens = await this.tokenDiscoveryService.discoverTokens(
        walletAddress,
        network.chainId
      )
      
      if (discoveredTokens.length === 0) {
        // Only log once, not repeatedly
        if (import.meta.env.DEV) {
          console.log(`No tokens discovered for ${network.name}. Users can add tokens manually via the UI.`)
        }
        // Return empty array - users can add tokens manually
        return []
      }
      
      // Create provider for balance checking
      const provider = new JsonRpcProvider(network.rpcUrl)
      const tokens: TokenBalance[] = []
      
      // ERC20 ABI for balanceOf
      const erc20Abi = [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
        'function symbol() view returns (string)',
        'function name() view returns (string)'
      ]
      
      // Check balance for each discovered token (limit to prevent RPC overload)
      const maxTokensToCheck = 100 // Limit number of tokens to check
      const tokensToCheck = discoveredTokens.slice(0, maxTokensToCheck)
      
      for (const tokenInfo of tokensToCheck) {
        try {
          // Skip invalid addresses using ethers validation
          if (!tokenInfo.address || !isAddress(tokenInfo.address)) {
            continue
          }
          
          // Skip zero address
          if (tokenInfo.address === ZeroAddress) {
            continue
          }
          
          // First check if contract exists by getting code at address
          const code = await provider.getCode(tokenInfo.address)
          if (code === '0x' || code === '0x0') {
            // No contract at this address
            continue
          }
          
          const contract = new Contract(tokenInfo.address, erc20Abi, provider)
          
          // Get balance
          const balance = await contract.balanceOf(walletAddress)
          
          // Only include tokens with non-zero balance
          // In ethers v6, BigNumber methods are different
          if (balance > 0n) {
            // Get token details if not already available
            const decimals = tokenInfo.decimals || await contract.decimals()
            const symbol = tokenInfo.symbol || await contract.symbol()
            const name = tokenInfo.name || await contract.name()
            
            const formattedBalance = formatUnits(balance, decimals)
            
            tokens.push({
              address: tokenInfo.address,
              symbol,
              name,
              decimals,
              balance: formattedBalance,
              logoURI: tokenInfo.logoURI
            })
          }
        } catch (error: any) {
          // Only log if it's not a common contract error
          if (!error.message?.includes('missing revert data') && 
              !error.message?.includes('CALL_EXCEPTION') &&
              !error.message?.includes('is not defined') &&
              import.meta.env.DEV) {
            console.error(`Failed to fetch balance for token ${tokenInfo.address}:`, error.message || error)
          }
        }
      }
      
      return tokens
    } catch (error) {
      console.error('Failed to fetch ERC-20 token balances:', error)
      return []
    }
  }
  
  private async getSPLTokenBalances(walletAddress: string, rpcUrl: string): Promise<TokenBalance[]> {
    try {
      const { Connection, PublicKey } = await import('@solana/web3.js')
      const connection = new Connection(rpcUrl, 'confirmed')
      const walletPublicKey = new PublicKey(walletAddress)
      
      // Get all token accounts for the wallet
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
      })
      
      const tokens: TokenBalance[] = []
      
      // Get chainId from RPC URL
      let chainId = 'mainnet-beta'
      if (rpcUrl.includes('devnet')) chainId = 'devnet'
      else if (rpcUrl.includes('testnet')) chainId = 'testnet'
      
      // First, discover tokens for this wallet
      const discoveredTokens = await this.tokenDiscoveryService.discoverTokens(
        walletAddress,
        chainId
      )
      
      // Create a map of discovered tokens for quick lookup
      const tokenInfoMap = new Map<string, {symbol: string, name: string, logoURI?: string}>()
      
      // Add discovered tokens to the map
      for (const token of discoveredTokens) {
        tokenInfoMap.set(token.address, {
          symbol: token.symbol,
          name: token.name,
          logoURI: token.logoURI
        })
      }
      
      // Also fetch token registry as fallback
      try {
        const response = await fetch('https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json', {
          signal: AbortSignal.timeout(5000)
        })
        if (response.ok) {
          const tokenList = await response.json()
          tokenList.tokens.forEach((token: any) => {
            if (!tokenInfoMap.has(token.address)) {
              tokenInfoMap.set(token.address, {
                symbol: token.symbol,
                name: token.name,
                logoURI: token.logoURI
              })
            }
          })
        }
      } catch (error) {
        console.error('Failed to fetch token registry:', error)
      }
      
      
      for (const account of tokenAccounts.value) {
        const parsedInfo = account.account.data.parsed.info
        const balance = parsedInfo.tokenAmount.uiAmountString
        
        if (parseFloat(balance) > 0) {
          const mintAddress = parsedInfo.mint
          
          // Start with default values
          let symbol = 'Unknown'
          let name = 'Unknown Token'
          let logoURI: string | undefined
          
          // Check the token registry first
          if (tokenInfoMap.has(mintAddress)) {
            const tokenInfo = tokenInfoMap.get(mintAddress)!
            symbol = tokenInfo.symbol
            name = tokenInfo.name
            logoURI = tokenInfo.logoURI
          }
          // For tokens not in registry, try to fetch metadata from multiple sources
          else {
            try {
              // First try Jupiter's token list (more comprehensive)
              const jupiterResponse = await fetch(`https://token.jup.ag/strict/token/${mintAddress}`, {
                signal: AbortSignal.timeout(3000)
              })
              
              if (jupiterResponse.ok) {
                const jupiterData = await jupiterResponse.json()
                if (jupiterData) {
                  symbol = jupiterData.symbol || symbol
                  name = jupiterData.name || name
                  logoURI = jupiterData.logoURI || logoURI
                }
              }
            } catch (err) {
              console.log(`Token ${mintAddress} not found in Jupiter registry`)
            }
            
            // If still unknown, try to parse on-chain metadata
            if (symbol === 'Unknown' || name === 'Unknown Token') {
              try {
                const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
                const [metadataPDA] = PublicKey.findProgramAddressSync(
                  [
                    Buffer.from('metadata'),
                    METADATA_PROGRAM_ID.toBuffer(),
                    new PublicKey(mintAddress).toBuffer(),
                  ],
                  METADATA_PROGRAM_ID
                )
                
                const metadataAccount = await connection.getAccountInfo(metadataPDA)
                
                if (metadataAccount && metadataAccount.data) {
                  // Use a more robust parsing approach
                  const data = metadataAccount.data
                  
                  // The metadata structure has fixed offsets
                  // Skip: discriminator (1) + update_authority (32) + mint (32) = 65
                  let offset = 65
                  
                  // Read name (4 bytes length + up to 32 bytes data)
                  const nameLen = data.readUInt32LE(offset)
                  offset += 4
                  if (nameLen > 0 && nameLen <= 32) {
                    const nameStr = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0/g, '').trim()
                    if (nameStr) name = nameStr
                  }
                  offset += 32 // Skip to next field regardless of actual name length
                  
                  // Read symbol (4 bytes length + up to 10 bytes data)
                  const symbolLen = data.readUInt32LE(offset)
                  offset += 4
                  if (symbolLen > 0 && symbolLen <= 10) {
                    const symbolStr = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0/g, '').trim()
                    if (symbolStr) symbol = symbolStr
                  }
                  offset += 10 // Skip to next field
                  
                  // Read URI (4 bytes length + up to 200 bytes data)
                  const uriLen = data.readUInt32LE(offset)
                  offset += 4
                  if (uriLen > 0 && uriLen <= 200) {
                    const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0/g, '').trim()
                    
                    // Fetch metadata from URI if available
                    if (uri && uri.includes('.')) {
                      try {
                        let metadataUrl = uri
                        if (uri.startsWith('ipfs://')) {
                          metadataUrl = uri.replace('ipfs://', 'https://ipfs.io/ipfs/')
                        }
                        
                        const metadataResponse = await fetch(metadataUrl, { 
                          signal: AbortSignal.timeout(3000)
                        })
                        
                        if (metadataResponse.ok) {
                          const jsonMetadata = await metadataResponse.json()
                          // Prefer off-chain metadata as it's usually more complete
                          if (jsonMetadata.symbol) symbol = jsonMetadata.symbol
                          if (jsonMetadata.name) name = jsonMetadata.name
                          if (jsonMetadata.image) {
                            logoURI = jsonMetadata.image
                            if (logoURI?.startsWith('ipfs://')) {
                              logoURI = logoURI.replace('ipfs://', 'https://ipfs.io/ipfs/')
                            }
                          }
                        }
                      } catch (err) {
                        console.log('Failed to fetch off-chain metadata')
                      }
                    }
                  }
                }
              } catch (err) {
                console.log(`Could not fetch on-chain metadata for ${mintAddress}`)
              }
            }
          }
          
          tokens.push({
            address: mintAddress,
            symbol,
            name,
            decimals: parsedInfo.tokenAmount.decimals,
            balance: balance,
            logoURI
          })
        }
      }
      
      return tokens
    } catch (error) {
      console.error('Failed to fetch SPL token balances:', error)
      return []
    }
  }
  
  // Caching methods
  private async getCachedBalance(wallet: Wallet, network: Network): Promise<any> {
    try {
      const id = `${wallet.address}_${network.id}`
      const cached = await db.walletBalances.get(id)
      return cached
    } catch (error) {
      console.error('Failed to get cached balance:', error)
      return null
    }
  }
  
  private async getCachedTokenBalances(wallet: Wallet, network: Network): Promise<TokenBalance[]> {
    try {
      const tokenBalances = await db.tokenBalances
        .where('walletAddress')
        .equals(wallet.address)
        .and(item => item.networkId === network.id)
        .toArray()
      
      return tokenBalances.map(tb => ({
        address: tb.tokenAddress,
        symbol: tb.symbol,
        name: tb.name,
        decimals: tb.decimals,
        balance: tb.balance,
        usdValue: tb.usdValue,
        logoURI: tb.logoURI
      }))
    } catch (error) {
      console.error('Failed to get cached token balances:', error)
      return []
    }
  }
  
  private async refreshBalanceInBackground(wallet: Wallet, network: Network): Promise<void> {
    const refreshKey = `${wallet.address}_${network.id}`
    
    // Mark as refreshing
    this.refreshingBalances.set(refreshKey, true)
    
    // Run in background without blocking
    setTimeout(async () => {
      try {
        // Validate network type matches wallet type
        if (wallet.type !== network.type) {
          console.error(`Network type mismatch: wallet is ${wallet.type} but network is ${network.type}`)
          this.refreshingBalances.delete(refreshKey)
          return
        }
        
        // Fetch fresh data directly without going through getBalance to avoid recursion
        const nativeBalance = wallet.type === 'EVM'
          ? await EVMWalletService.getBalance(wallet.address, network.rpcUrl)
          : await SVMWalletService.getBalance(wallet.address, network.rpcUrl)

        // Get price data
        const priceId = network.symbol.toLowerCase() === 'sol' ? 'solana' : network.symbol.toLowerCase()
        let nativePrice = 0
        let nativeUSD = 0
        
        try {
          const prices = await this.getPrices([priceId])
          nativePrice = prices[priceId]?.usd || 0
          nativeUSD = parseFloat(nativeBalance) * nativePrice
        } catch (priceError) {
          console.error('Background refresh: Failed to fetch native token price:', priceError)
          // Try to get cached price
          const cachedPrice = await db.priceData.get(priceId)
          if (cachedPrice) {
            nativePrice = cachedPrice.usdPrice
            nativeUSD = parseFloat(nativeBalance) * nativePrice
          }
        }

        // Fetch token balances
        const tokens: TokenBalance[] = []
        
        if (wallet.type === 'SVM') {
          try {
            const tokenBalances = await this.getSPLTokenBalances(wallet.address, network.rpcUrl)
            tokens.push(...tokenBalances)
          } catch (error) {
            console.error('Failed to fetch SPL token balances:', error)
          }
        } else if (wallet.type === 'EVM') {
          try {
            const tokenBalances = await this.getERC20TokenBalances(wallet.address, network)
            tokens.push(...tokenBalances)
          } catch (error) {
            console.error('Failed to fetch ERC-20 token balances:', error)
          }
        }
        
        // Calculate token USD values
        let tokensUSD = 0
        const tokenUSDValues: Record<string, number> = {} // Track USD value per token
        
        if (tokens.length > 0) {
          try {
            // Use the new price resolver for all token types
            const chainId = wallet.type === 'EVM' ? network.chainId : network.chainId
            const tokenPrices = await tokenPriceResolver.getTokenPrices(tokens, chainId)
            
            tokens.forEach(token => {
              if (tokenPrices[token.address]) {
                const tokenUSD = parseFloat(token.balance) * tokenPrices[token.address].usd
                tokenUSDValues[token.address] = tokenUSD
                tokensUSD += tokenUSD
              }
            })
          } catch (priceError) {
            console.error('Failed to fetch fresh token prices in background:', priceError)
            // Use cached balance data as fallback
            for (const token of tokens) {
              const cachedTokenBalance = await db.tokenBalances.get(
                `${wallet.address}_${network.id}_${token.address || 'native'}`
              )
              if (cachedTokenBalance?.usdValue) {
                tokenUSDValues[token.address] = cachedTokenBalance.usdValue
                tokensUSD += cachedTokenBalance.usdValue
              }
            }
          }
        }
        
        const totalUSD = nativeUSD + tokensUSD
        
        // Get previous balance
        const balanceId = `${wallet.address}_${network.id}`
        const previousBalance = await db.walletBalances.get(balanceId)
        
        // Always update cache with latest successful data
        await db.walletBalances.put({
          id: balanceId,
          walletAddress: wallet.address,
          networkId: network.id,
          nativeBalance,
          nativeUSD,
          totalUSD,
          previousTotalUSD: previousBalance?.totalUSD,
          lastUpdated: Date.now()
        })
        
        // Cache token balances with USD values
        for (const token of tokens) {
          const tokenKey = token.address || token.symbol
          await db.tokenBalances.put({
            id: `${wallet.address}_${network.id}_${token.address || 'native'}`,
            walletAddress: wallet.address,
            networkId: network.id,
            tokenAddress: token.address || 'native',
            symbol: token.symbol,
            name: token.name,
            decimals: token.decimals,
            balance: token.balance,
            usdValue: tokenUSDValues[tokenKey] || 0,
            logoURI: token.logoURI,
            lastUpdated: Date.now()
          })
        }
      } catch (error) {
        console.error('Failed to refresh balance in background:', error)
      } finally {
        // Always clear the refreshing flag
        this.refreshingBalances.delete(refreshKey)
      }
    }, 0)
  }
  
  private calculateRefreshChange(currentUSD: number, previousUSD?: number): number {
    if (!previousUSD || previousUSD === 0) return 0
    return ((currentUSD - previousUSD) / previousUSD) * 100
  }
  
  async getPrices(symbols: string[]): Promise<PriceData> {
    try {
      // Check cache first
      const cachedPrices: PriceData = {}
      const symbolsToFetch: string[] = []
      
      for (const symbol of symbols) {
        const cached = await db.priceData.get(symbol)
        if (cached && Date.now() - cached.lastUpdated < this.PRICE_CACHE_DURATION) {
          cachedPrices[symbol] = {
            usd: cached.usdPrice,
            usd_24h_change: cached.usd24hChange
          }
        } else {
          symbolsToFetch.push(symbol)
        }
      }
      
      // If all prices are cached, return them
      if (symbolsToFetch.length === 0) {
        return cachedPrices
      }
      
      // Fetch missing prices
      // Use proxy in development to avoid CORS issues
      const isDev = import.meta.env.DEV
      const apiPath = `/api/v3/simple/price?ids=${symbolsToFetch.join(',')}&vs_currencies=usd&include_24hr_change=true`
      const apiUrl = isDev 
        ? `/api/coingecko${apiPath}`
        : `https://api.coingecko.com${apiPath}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch prices')
      }
      
      const data = await response.json()
      
      // Cache the fetched prices and store history
      const now = Date.now()
      for (const [id, priceInfo] of Object.entries(data)) {
        const price = (priceInfo as any).usd || 0
        
        // Update current price
        await db.priceData.put({
          id,
          symbol: id,
          usdPrice: price,
          usd24hChange: (priceInfo as any).usd_24h_change || 0,
          lastUpdated: now
        })
        
        // Store price history (sample every hour to avoid too much data)
        const lastHistory = await db.priceHistory
          .where('symbol')
          .equals(id)
          .reverse()
          .sortBy('timestamp')
          .then(results => results[0])
        
        if (!lastHistory || now - lastHistory.timestamp > 3600000) { // 1 hour
          await db.priceHistory.put({
            id: `${id}_${now}`,
            symbol: id,
            usdPrice: price,
            timestamp: now
          })
          
          // Clean up old price history (keep only last 7 days)
          const cutoffTime = now - (7 * 24 * 60 * 60 * 1000)
          await db.priceHistory
            .where('symbol')
            .equals(id)
            .and(item => item.timestamp < cutoffTime)
            .delete()
        }
      }
      
      return { ...cachedPrices, ...data }
    } catch (error) {
      console.error('Failed to fetch prices:', error)
      
      // Return cached prices even if they're stale
      const stalePrices: PriceData = {}
      for (const symbol of symbols) {
        const cached = await db.priceData.get(symbol)
        if (cached) {
          stalePrices[symbol] = {
            usd: cached.usdPrice,
            usd_24h_change: cached.usd24hChange
          }
        }
      }
      
      return stalePrices
    }
  }
  
  async getTokenPricesByContract(
    platformId: string,
    contractAddresses: string[]
  ): Promise<PriceData> {
    try {
      // Check cache first
      const cachedPrices: PriceData = {}
      const addressesToFetch: string[] = []
      
      for (const address of contractAddresses) {
        const cacheKey = `${platformId}_${address.toLowerCase()}`
        const cached = await db.priceData.get(cacheKey)
        if (cached && Date.now() - cached.lastUpdated < this.PRICE_CACHE_DURATION) {
          cachedPrices[address] = {
            usd: cached.usdPrice,
            usd_24h_change: cached.usd24hChange
          }
        } else {
          addressesToFetch.push(address)
        }
      }
      
      // If all prices are cached, return them
      if (addressesToFetch.length === 0) {
        return cachedPrices
      }
      
      // Fetch missing prices using token price endpoint
      const isDev = import.meta.env.DEV
      const apiPath = `/api/v3/simple/token_price/${platformId}?contract_addresses=${addressesToFetch.join(',')}&vs_currencies=usd&include_24hr_change=true`
      const apiUrl = isDev 
        ? `/api/coingecko${apiPath}`
        : `https://api.coingecko.com${apiPath}`
      
      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error('Failed to fetch token prices')
      }
      
      const data = await response.json()
      
      // Cache the fetched prices
      const now = Date.now()
      for (const [address, priceInfo] of Object.entries(data)) {
        const price = (priceInfo as any).usd || 0
        const cacheKey = `${platformId}_${address.toLowerCase()}`
        
        await db.priceData.put({
          id: cacheKey,
          symbol: cacheKey,
          usdPrice: price,
          usd24hChange: (priceInfo as any).usd_24h_change || 0,
          lastUpdated: now
        })
      }
      
      return { ...cachedPrices, ...data }
    } catch (error) {
      console.error('Failed to fetch token prices by contract:', error)
      
      // Return cached prices even if they're stale
      const stalePrices: PriceData = {}
      for (const address of contractAddresses) {
        const cacheKey = `${platformId}_${address.toLowerCase()}`
        const cached = await db.priceData.get(cacheKey)
        if (cached) {
          stalePrices[address] = {
            usd: cached.usdPrice,
            usd_24h_change: cached.usd24hChange
          }
        }
      }
      
      return stalePrices
    }
  }
}

export const blockchainService = new BlockchainService()