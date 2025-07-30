import { rateLimiter } from './rateLimiter'

interface TokenPrice {
  usd: number
  usd_24h_change?: number
}

interface NativeTokenPrice {
  [tokenId: string]: {
    usd: number
    usd_24h_change?: number
  }
}

export class CoinGeckoService {
  private static instance: CoinGeckoService
  private readonly API_BASE = 'https://api.coingecko.com/api/v3'
  
  private constructor() {}
  
  static getInstance(): CoinGeckoService {
    if (!CoinGeckoService.instance) {
      CoinGeckoService.instance = new CoinGeckoService()
    }
    return CoinGeckoService.instance
  }
  
  /**
   * Get platform ID for a chain
   */
  private getPlatformId(chainId: number): string | null {
    const platformIds: Record<number, string> = {
      1: 'ethereum',
      10: 'optimistic-ethereum',
      56: 'binance-smart-chain',
      137: 'polygon-pos',
      250: 'fantom',
      8453: 'base',
      42161: 'arbitrum-one',
      43114: 'avalanche'
    }
    return platformIds[chainId] || null
  }
  
  /**
   * Fetch token prices with rate limiting and deduplication
   */
  async getTokenPrices(
    chainId: number,
    tokenAddresses: string[]
  ): Promise<Record<string, TokenPrice>> {
    if (tokenAddresses.length === 0) return {}
    
    const platformId = this.getPlatformId(chainId)
    if (!platformId) return {}
    
    // Sort addresses for consistent request ID
    const sortedAddresses = [...tokenAddresses]
      .map(a => a.toLowerCase())
      .sort()
    
    const requestId = `token-prices:${platformId}:${sortedAddresses.join(',')}`
    const addresses = sortedAddresses.join(',')
    const url = `${this.API_BASE}/simple/token_price/${platformId}?contract_addresses=${addresses}&vs_currencies=usd&include_24hr_change=true`
    
    console.debug(`CoinGecko URL: ${url}`)
    
    try {
      const data = await rateLimiter.execute(requestId, async () => {
        console.debug(`Fetching prices for ${tokenAddresses.length} tokens on ${platformId}`)
        console.debug(`Token addresses: ${addresses}`)
        
        const response = await fetch(url)
        
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded')
          } else if (response.status === 400 && platformId === 'base') {
            // Base network tokens might not be on CoinGecko yet
            console.debug('Some Base tokens may not be available on CoinGecko')
            return {}
          } else {
            console.warn(`CoinGecko API error: ${response.status}`)
            return {}
          }
        }
        
        const json = await response.json()
        console.debug('CoinGecko response:', json)
        return json
      })
      
      // Transform the response
      const prices: Record<string, TokenPrice> = {}
      for (const [address, priceData] of Object.entries(data)) {
        prices[address] = {
          usd: (priceData as any).usd || 0,
          usd_24h_change: (priceData as any).usd_24h_change || 0
        }
      }
      
      // Log which tokens didn't get prices
      const tokensWithoutPrices = tokenAddresses.filter(
        addr => !prices[addr.toLowerCase()]
      )
      
      if (tokensWithoutPrices.length > 0) {
        console.debug(`No prices found for ${tokensWithoutPrices.length} tokens (not on CoinGecko):`, tokensWithoutPrices)
      }
      
      console.debug(`Parsed prices for ${Object.keys(prices).length} out of ${tokenAddresses.length} tokens`)
      
      return prices
    } catch (error) {
      console.warn('Failed to fetch token prices:', error)
      return {}
    }
  }
  
  /**
   * Fetch native token price (ETH, BNB, etc.)
   */
  async getNativeTokenPrice(tokenId: string): Promise<number> {
    const requestId = `native-price:${tokenId}`
    const url = `${this.API_BASE}/simple/price?ids=${tokenId}&vs_currencies=usd`
    
    try {
      const data = await rateLimiter.execute(requestId, async () => {
        const response = await fetch(url)
        
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded')
          }
          throw new Error(`API error: ${response.status}`)
        }
        
        return response.json() as Promise<NativeTokenPrice>
      })
      
      return data[tokenId]?.usd || 0
    } catch (error) {
      console.warn('Failed to fetch native token price:', error)
      return 0
    }
  }
  
  /**
   * Get token info by contract address
   */
  async getTokenInfo(
    chainId: number,
    contractAddress: string
  ): Promise<{ image?: { large?: string; small?: string } } | null> {
    const platformId = this.getPlatformId(chainId)
    if (!platformId) return null
    
    const requestId = `token-info:${platformId}:${contractAddress.toLowerCase()}`
    const url = `${this.API_BASE}/coins/${platformId}/contract/${contractAddress.toLowerCase()}`
    
    try {
      const data = await rateLimiter.execute(requestId, async () => {
        const response = await fetch(url)
        
        if (!response.ok) {
          if (response.status === 404) {
            return null
          }
          if (response.status === 429) {
            throw new Error('Rate limit exceeded')
          }
          throw new Error(`API error: ${response.status}`)
        }
        
        return response.json()
      })
      
      return data
    } catch (error) {
      console.warn('Failed to fetch token info:', error)
      return null
    }
  }
  
  /**
   * Search for token by symbol
   */
  async searchTokenBySymbol(symbol: string): Promise<string | null> {
    const requestId = `token-search:${symbol.toLowerCase()}`
    const url = `${this.API_BASE}/search?query=${encodeURIComponent(symbol)}`
    
    try {
      const data = await rateLimiter.execute(requestId, async () => {
        const response = await fetch(url)
        
        if (!response.ok) {
          if (response.status === 429) {
            throw new Error('Rate limit exceeded')
          }
          throw new Error(`API error: ${response.status}`)
        }
        
        return response.json()
      })
      
      // Find the most relevant coin by symbol
      const coin = data.coins?.find((c: any) => 
        c.symbol.toLowerCase() === symbol.toLowerCase()
      )
      
      return coin ? (coin.large || coin.thumb || null) : null
    } catch (error) {
      console.warn('Failed to search token:', error)
      return null
    }
  }
}

// Export singleton instance
export const coinGeckoService = CoinGeckoService.getInstance()