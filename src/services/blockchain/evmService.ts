import { ethers, Contract, JsonRpcProvider } from 'ethers'
import { db } from '../storage/database'
import { coinGeckoService } from '../api/coinGeckoService'
import { AlchemyService } from './alchemyService'
import { Network } from '../../types'

// Minimal ERC20 ABI for token queries
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)', 
  'function decimals() view returns (uint8)',
  'function balanceOf(address) view returns (uint256)',
  'function totalSupply() view returns (uint256)'
]

interface TokenInfo {
  address: string
  name: string
  symbol: string
  decimals: number
  balance: string
  logoURI?: string
}

interface TokenCache {
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
  lastUpdated: number
}

interface PriceData {
  [address: string]: {
    usd: number
    usd_24h_change?: number
  }
}

export class EVMService
{
  private provider: JsonRpcProvider
  private chainId: number
  private networkId?: string
  private network?: Network
  private alchemyService?: AlchemyService
  private tokenCache: Map<string, TokenCache> = new Map()
  
  constructor(rpcUrl: string, chainId: number, networkId?: string, network?: Network) {
    this.provider = new JsonRpcProvider(rpcUrl)
    this.chainId = chainId
    this.networkId = networkId
    this.network = network
    
    // Try to initialize Alchemy service if network has Alchemy RPC
    if (network?.alchemyRpcUrl) {
      this.alchemyService = AlchemyService.getInstance(network) || undefined
      if (this.alchemyService) {
        console.log(`✅ Alchemy SDK initialized for ${network.name} (Chain ID: ${network.chainId})`)
      } else {
        console.warn(`⚠️ Failed to initialize Alchemy SDK for ${network.name} despite having alchemyRpcUrl`)
      }
    } else if (network) {
      console.debug(`ℹ️ No Alchemy RPC configured for ${network.name}`)
    }
  }
  
  /**
   * Get all token balances for a wallet address
   * @param walletAddress The wallet address to query
   * @param tokenAddresses Array of token contract addresses to check
   */
  async getTokenBalances(walletAddress: string, tokenAddresses: string[]): Promise<TokenInfo[]> {
    // Try Alchemy first if available
    if (this.alchemyService) {
      try {
        const canUse = await this.alchemyService.canUseAlchemy()
        if (canUse) {
          console.debug('Attempting to use Alchemy for token discovery')
          return await this.getTokenBalancesViaAlchemy(walletAddress, tokenAddresses)
        }
      } catch (error: any) {
        if (error.message === 'RATE_LIMIT') {
          this.alchemyService.markRateLimited()
          console.warn('Alchemy rate limited, falling back to standard RPC')
        } else {
          console.error('Alchemy error, falling back to standard RPC:', error)
        }
      }
    }
    
    // Fallback to standard RPC method
    console.debug('Using standard RPC for token balances')
    return await this.getTokenBalancesViaRPC(walletAddress, tokenAddresses)
  }
  
  /**
   * Get token balances using Alchemy SDK - much more efficient
   */
  private async getTokenBalancesViaAlchemy(walletAddress: string, tokenAddresses: string[]): Promise<TokenInfo[]> {
    if (!this.alchemyService) {
      throw new Error('Alchemy service not initialized')
    }
    
    // Get all token balances from Alchemy
    const alchemyBalances = await this.alchemyService.getTokenBalances(walletAddress)
    
    // Convert Alchemy response to our format
    const tokens: TokenInfo[] = []
    const addressSet = new Set(tokenAddresses.map(a => a.toLowerCase()))
    
    // Get metadata for tokens with balances
    const tokensWithBalance = alchemyBalances.tokenBalances.filter(tb => {
      const balance = BigInt(tb.tokenBalance || '0')
      return balance > 0n || addressSet.has(tb.contractAddress.toLowerCase())
    })
    
    if (tokensWithBalance.length > 0) {
      const metadata = await this.alchemyService.getTokenMetadata(
        tokensWithBalance.map(tb => tb.contractAddress)
      )
      
      for (let i = 0; i < tokensWithBalance.length; i++) {
        const tokenBalance = tokensWithBalance[i]
        const meta = metadata[i]
        
        if (meta) {
          const balance = tokenBalance.tokenBalance 
            ? ethers.formatUnits(tokenBalance.tokenBalance, meta.decimals || 18)
            : '0'
            
          tokens.push({
            address: tokenBalance.contractAddress.toLowerCase(),
            name: meta.name || 'Unknown Token',
            symbol: meta.symbol || 'UNKNOWN',
            decimals: meta.decimals || 18,
            balance,
            logoURI: meta.logo
          })
        }
      }
    }
    
    // Also include manually added tokens that might have 0 balance
    for (const address of tokenAddresses) {
      if (!tokens.find(t => t.address === address.toLowerCase())) {
        const cached = await this.getCachedTokenInfo(address)
        if (cached) {
          tokens.push({
            address: address.toLowerCase(),
            name: cached.name,
            symbol: cached.symbol,
            decimals: cached.decimals,
            balance: '0',
            logoURI: cached.logoURI
          })
        }
      }
    }
    
    console.debug(`Alchemy returned ${tokens.length} tokens`)
    return tokens
  }
  
  /**
   * Get token balances using standard RPC calls (fallback method)
   */
  private async getTokenBalancesViaRPC(walletAddress: string, tokenAddresses: string[]): Promise<TokenInfo[]> {
    const tokens: TokenInfo[] = []
    const BATCH_SIZE = 10 // Process in batches to avoid RPC rate limits
    
    // Process tokens in batches
    for (let i = 0; i < tokenAddresses.length; i += BATCH_SIZE) {
      const batch = tokenAddresses.slice(i, i + BATCH_SIZE)
      
      const promises = batch.map(async (tokenAddress) => {
        try {
          const tokenInfo = await this.getTokenInfo(tokenAddress, walletAddress)
          if (tokenInfo) {
            return tokenInfo
          }
          return null
        } catch (error: any) {
          // For manually added tokens, always show them even if fetch fails
          const discoveredToken = await db.discoveredTokens
            .where('id')
            .equals(`${walletAddress}_${this.chainId}_${tokenAddress.toLowerCase()}`)
            .first()
          
          if (discoveredToken && discoveredToken.addedManually) {
            // Don't spam console with expected errors
            if (error.code !== 'CALL_EXCEPTION') {
              console.error(`Failed to fetch token ${tokenAddress}:`, error)
            }
            
            // Try to use cached metadata first
            const cached = await this.getCachedTokenInfo(tokenAddress)
            
            // Get the last cached balance for this token
            const cachedBalance = this.networkId 
              ? await db.tokenBalances
                  .where('id')
                  .equals(`${walletAddress}_${this.networkId}_${tokenAddress.toLowerCase()}`)
                  .first()
              : null
            
            const balance = cachedBalance?.balance || '0'
            
            if (cachedBalance?.balance) {
              console.debug(`Using cached balance for ${cached?.symbol || discoveredToken.symbol}: ${balance}`)
            }
            
            return {
              address: tokenAddress.toLowerCase(),
              name: cached?.name || discoveredToken.name || 'Unknown Token',
              symbol: cached?.symbol || discoveredToken.symbol || 'UNKNOWN',
              decimals: cached?.decimals || discoveredToken.decimals || 18,
              balance,
              logoURI: cached?.logoURI || discoveredToken.logoURI
            }
          }
          
          console.error(`Failed to fetch token ${tokenAddress}:`, error)
          return null
        }
      })
      
      const batchResults = await Promise.all(promises)
      const validTokens = batchResults.filter((token): token is TokenInfo => token !== null)
      tokens.push(...validTokens)
    }
    
    return tokens
  }
  
  /**
   * Get token information including balance for a specific token
   */
  private async getTokenInfo(tokenAddress: string, walletAddress: string): Promise<TokenInfo | null> {
    // Validate address
    if (!ethers.isAddress(tokenAddress) || tokenAddress === ethers.ZeroAddress) {
      return null
    }
    
    // Check if contract exists
    const code = await this.provider.getCode(tokenAddress)
    if (code === '0x' || code === '0x0') {
      return null
    }
    
    // Check if we have cached metadata first
    const cached = await this.getCachedTokenInfo(tokenAddress)
    let name = cached?.name || 'Unknown Token'
    let symbol = cached?.symbol || 'UNKNOWN'
    let decimals = cached?.decimals || 18
    let logoURI = cached?.logoURI
    
    const contract = new Contract(tokenAddress, ERC20_ABI, this.provider)
    
    try {
      // Only fetch metadata if not cached
      if (!cached) {
        try {
          name = await contract.name()
        } catch {
          // Fallback to unknown
        }
        
        try {
          symbol = await contract.symbol()
        } catch {
          // Fallback to unknown
        }
        
        try {
          decimals = await contract.decimals()
        } catch {
          // Fallback to 18
        }
      }
      
      // Get balance with retry for intermittent failures
      let balance: bigint = BigInt(0)
      let balanceFetchSucceeded = false
      
      // Try up to 3 times for intermittent RPC failures
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          balance = await contract.balanceOf(walletAddress)
          balanceFetchSucceeded = true
          break // Success, exit loop
        } catch (balanceError: any) {
          // If it's a CALL_EXCEPTION, don't retry - this is a contract issue
          if (balanceError.code === 'CALL_EXCEPTION') {
            throw balanceError
          }
          
          // For other errors (network, timeout, etc), retry
          if (attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, 100 * attempt)) // Brief delay
          } else {
            console.error(`Failed to fetch balance for ${tokenAddress} after 3 attempts:`, balanceError)
            // Don't throw here - we'll check for cached balance below
          }
        }
      }
      
      // If balance fetch failed, try to use cached balance
      let balanceString: string
      if (!balanceFetchSucceeded) {
        // Get cached balance
        const cachedBalance = this.networkId 
          ? await db.tokenBalances
              .where('id')
              .equals(`${walletAddress}_${this.networkId}_${tokenAddress.toLowerCase()}`)
              .first()
          : null
          
        if (cachedBalance?.balance) {
          balanceString = cachedBalance.balance
          console.debug(`Using cached balance for ${symbol} due to fetch error: ${balanceString}`)
        } else {
          // No cached balance available, have to throw
          throw new Error('Failed to fetch balance and no cached balance available')
        }
      } else {
        balanceString = ethers.formatUnits(balance, decimals)
      }
      
      const tokenInfo: TokenInfo = {
        address: tokenAddress.toLowerCase(),
        name,
        symbol,
        decimals,
        balance: balanceString,
        logoURI
      }
      
      // Cache the token metadata (not balance)
      await this.cacheTokenInfo(tokenInfo)
      
      return tokenInfo
    } catch (error) {
      // If we can't even get the balance, this is not a valid ERC20 token
      throw error
    }
  }
  
  /**
   * Get just the balance for a token (used when metadata is cached)
   */
  private async getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
    const contract = new Contract(tokenAddress, ERC20_ABI, this.provider)
    const cached = await this.getCachedTokenInfo(tokenAddress)
    const decimals = cached?.decimals || 18
    
    const balance = await contract.balanceOf(walletAddress)
    
    return ethers.formatUnits(balance, decimals)
  }
  
  /**
   * Cache token metadata (not balance)
   */
  private async cacheTokenInfo(tokenInfo: TokenInfo): Promise<void> {
    const cacheData: TokenCache = {
      address: tokenInfo.address,
      name: tokenInfo.name,
      symbol: tokenInfo.symbol,
      decimals: tokenInfo.decimals,
      logoURI: tokenInfo.logoURI,
      lastUpdated: Date.now()
    }
    
    this.tokenCache.set(tokenInfo.address, cacheData)
    
    // Also persist to database
    try {
      await db.tokenMetadata.put({
        id: `${this.chainId}_${tokenInfo.address}`,
        chainId: this.chainId,
        address: tokenInfo.address,
        name: tokenInfo.name,
        symbol: tokenInfo.symbol,
        decimals: tokenInfo.decimals,
        logoURI: tokenInfo.logoURI,
        lastUpdated: Date.now()
      })
    } catch (error) {
      console.error('Failed to cache token metadata:', error)
    }
  }
  
  /**
   * Get cached token metadata
   */
  private async getCachedTokenInfo(tokenAddress: string): Promise<TokenCache | null> {
    // Check memory cache first
    const cached = this.tokenCache.get(tokenAddress.toLowerCase())
    if (cached) {
      return cached
    }
    
    // Check database
    try {
      const dbCached = await db.tokenMetadata.get(`${this.chainId}_${tokenAddress.toLowerCase()}`)
      if (dbCached) {
        const cacheData: TokenCache = {
          address: dbCached.address,
          name: dbCached.name,
          symbol: dbCached.symbol,
          decimals: dbCached.decimals,
          logoURI: dbCached.logoURI,
          lastUpdated: dbCached.lastUpdated
        }
        // Add to memory cache
        this.tokenCache.set(tokenAddress.toLowerCase(), cacheData)
        return cacheData
      }
    } catch (error) {
      console.error('Failed to get cached token metadata:', error)
    }
    
    return null
  }
  
  /**
   * Fetch USD prices for tokens from CoinGecko
   */
  async fetchTokenPrices(tokenAddresses: string[]): Promise<PriceData> {
    const prices = await coinGeckoService.getTokenPrices(this.chainId, tokenAddresses)
    
    // Convert to expected format
    const priceData: PriceData = {}
    for (const [address, price] of Object.entries(prices)) {
      priceData[address] = {
        usd: price.usd,
        usd_24h_change: price.usd_24h_change
      }
    }
    
    return priceData
  }
}