import { TokenDiscoveryProvider, TokenInfo, TokenList } from '../types'

interface TokenListSource {
  name: string
  url: string
  chainIds: number[]
}

export class TokenListProvider implements TokenDiscoveryProvider {
  name = 'TokenLists'
  supportedChains = [1, 56, 137, 42161, 10, 8453]
  
  private tokenLists: TokenListSource[] = [
    {
      name: 'Uniswap via Cloudflare',
      url: 'https://wispy-bird-88a7.uniswap.workers.dev/?url=http://tokens.uniswap.org',
      chainIds: [1, 137, 42161, 10, 8453]
    },
    {
      name: 'CoinGecko',
      url: 'https://tokens.coingecko.com/uniswap/all.json',
      chainIds: [1, 56, 137, 42161, 10, 8453]
    },
    {
      name: 'Uniswap Ethereum',
      url: 'https://tokens.coingecko.com/ethereum/all.json',
      chainIds: [1]
    },
    {
      name: 'Uniswap Polygon',
      url: 'https://tokens.coingecko.com/polygon-pos/all.json',
      chainIds: [137]
    },
    {
      name: 'Uniswap Arbitrum',
      url: 'https://tokens.coingecko.com/arbitrum-one/all.json',
      chainIds: [42161]
    },
    {
      name: 'Uniswap Optimism',
      url: 'https://tokens.coingecko.com/optimistic-ethereum/all.json',
      chainIds: [10]
    },
    {
      name: 'Uniswap Base',
      url: 'https://tokens.coingecko.com/base/all.json',
      chainIds: [8453]
    },
    {
      name: 'Uniswap BSC',
      url: 'https://tokens.coingecko.com/binance-smart-chain/all.json',
      chainIds: [56]
    }
  ]
  
  private cachedTokens: Map<number, TokenInfo[]> = new Map()
  private lastCacheUpdate: Map<number, number> = new Map()
  private CACHE_DURATION = 3600000 // 1 hour
  
  async discoverTokens(walletAddress: string, chainId: string | number): Promise<TokenInfo[]> {
    const numericChainId = typeof chainId === 'string' ? parseInt(chainId) : chainId
    
    if (!this.supportedChains.includes(numericChainId)) {
      return []
    }
    
    try {
      // Check cache first
      const cached = this.getCachedTokens(numericChainId)
      if (cached.length > 0) {
        // Filter tokens that the wallet actually holds
        return await this.filterTokensWithBalance(walletAddress, cached, numericChainId)
      }
      
      // Fetch token lists for this chain
      const allTokens: Map<string, TokenInfo> = new Map()
      
      for (const source of this.tokenLists) {
        if (!source.chainIds.includes(numericChainId)) continue
        
        try {
          const response = await fetch(source.url)
          if (!response.ok) {
            console.warn(`Failed to fetch token list from ${source.name}: ${response.status} ${response.statusText}`)
            continue
          }
          
          const tokenList: TokenList = await response.json()
          
          // Filter tokens for this chain
          const chainTokens = tokenList.tokens.filter(
            token => token.chainId === numericChainId
          )
          
          // Deduplicate by address
          for (const token of chainTokens) {
            const key = token.address.toLowerCase()
            if (!allTokens.has(key)) {
              allTokens.set(key, token)
            }
          }
          
          // Only log in development mode
          if (import.meta.env.DEV) {
            console.log(`Loaded ${chainTokens.length} tokens from ${source.name} for chain ${numericChainId}`)
          }
        } catch (error: any) {
          // Check if it's a CORS error
          if (error.message?.includes('CORS') || error.message?.includes('Failed to fetch')) {
            console.warn(`${source.name} blocked by CORS - skipping this source`)
          } else {
            console.error(`Failed to fetch token list from ${source.name}:`, error)
          }
        }
      }
      
      const tokens = Array.from(allTokens.values())
      
      // Cache the token list
      this.cachedTokens.set(numericChainId, tokens)
      this.lastCacheUpdate.set(numericChainId, Date.now())
      
      // Filter tokens that the wallet actually holds
      return await this.filterTokensWithBalance(walletAddress, tokens, numericChainId)
    } catch (error) {
      console.error('TokenList discovery error:', error)
      return []
    }
  }
  
  private getCachedTokens(chainId: number): TokenInfo[] {
    const lastUpdate = this.lastCacheUpdate.get(chainId) || 0
    const cached = this.cachedTokens.get(chainId) || []
    
    if (Date.now() - lastUpdate < this.CACHE_DURATION) {
      return cached
    }
    
    return []
  }
  
  private async filterTokensWithBalance(
    _walletAddress: string,
    tokens: TokenInfo[],
    chainId: number
  ): Promise<TokenInfo[]> {
    // Return all tokens from the list without balance checking
    // The blockchain service will handle balance checking when needed
    // Only log in development mode
    if (import.meta.env.DEV) {
      console.log(`Token list loaded for chain ${chainId}: ${tokens.length} tokens available`)
    }
    
    return tokens
  }
}