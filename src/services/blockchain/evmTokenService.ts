import { ethers, Contract, JsonRpcProvider } from 'ethers'
import { db } from '../storage/database'

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

export class EVMTokenService {
  private provider: JsonRpcProvider
  private chainId: number
  private tokenCache: Map<string, TokenCache> = new Map()
  
  constructor(rpcUrl: string, chainId: number) {
    this.provider = new JsonRpcProvider(rpcUrl)
    this.chainId = chainId
  }
  
  /**
   * Get all token balances for a wallet address
   * @param walletAddress The wallet address to query
   * @param tokenAddresses Array of token contract addresses to check
   */
  async getTokenBalances(walletAddress: string, tokenAddresses: string[]): Promise<TokenInfo[]> {
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
        } catch (error) {
          console.error(`Failed to fetch token ${tokenAddress}:`, error)
          // Try to use cached data if available
          const cached = await this.getCachedTokenInfo(tokenAddress)
          if (cached) {
            // Still need to get current balance
            try {
              const balance = await this.getTokenBalance(tokenAddress, walletAddress)
              return {
                ...cached,
                address: tokenAddress,
                balance
              }
            } catch (balanceError) {
              console.error(`Failed to fetch balance for cached token ${tokenAddress}`)
            }
          }
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
    
    const contract = new Contract(tokenAddress, ERC20_ABI, this.provider)
    
    try {
      // Try to get metadata - some contracts may not implement all methods
      let name = 'Unknown Token'
      let symbol = 'UNKNOWN'
      let decimals = 18
      
      try {
        // Try to fetch metadata individually with fallbacks
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
      } catch (metadataError) {
        console.warn(`Failed to fetch metadata for token ${tokenAddress}, using defaults`)
      }
      
      // Get balance after metadata
      const balance = await contract.balanceOf(walletAddress)
      
      const tokenInfo: TokenInfo = {
        address: tokenAddress.toLowerCase(),
        name,
        symbol,
        decimals,
        balance: ethers.formatUnits(balance, decimals)
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
    if (tokenAddresses.length === 0) return {}
    
    const platformId = this.getPlatformId()
    if (!platformId) return {}
    
    try {
      // CoinGecko expects lowercase addresses
      const addresses = tokenAddresses.map(a => a.toLowerCase()).join(',')
      const url = `https://api.coingecko.com/api/v3/simple/token_price/${platformId}?contract_addresses=${addresses}&vs_currencies=usd&include_24hr_change=true`
      
      const response = await fetch(url)
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('CoinGecko rate limit hit for token prices')
        } else {
          console.warn(`CoinGecko API error: ${response.status}`)
        }
        return {}
      }
      
      const data = await response.json()
      const prices: PriceData = {}
      
      for (const [address, priceData] of Object.entries(data)) {
        prices[address] = {
          usd: (priceData as any).usd || 0,
          usd_24h_change: (priceData as any).usd_24h_change || 0
        }
      }
      
      return prices
    } catch (error) {
      console.warn('Failed to fetch token prices:', error.message || error)
      return {}
    }
  }
  
  /**
   * Get CoinGecko platform ID for the current chain
   */
  private getPlatformId(): string | null {
    const platformIds: Record<number, string> = {
      1: 'ethereum',
      56: 'binance-smart-chain',
      137: 'polygon-pos',
      8453: 'base',
      42161: 'arbitrum-one',
      10: 'optimistic-ethereum'
    }
    
    return platformIds[this.chainId] || null
  }
}