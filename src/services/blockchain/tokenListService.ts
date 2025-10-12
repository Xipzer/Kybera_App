/**
 * Service to fetch token metadata including logos from token lists
 */

interface TokenListToken {
  chainId: number
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

interface TokenList {
  tokens: TokenListToken[]
}

class TokenListService {
  private tokenCache = new Map<string, Map<string, TokenListToken>>()
  private lastFetch = 0
  private CACHE_DURATION = 24 * 60 * 60 * 1000 // 24 hours

  /**
   * Get token metadata from various token lists
   */
  async getTokenMetadata(
    chainId: number,
    tokenAddress: string,
  ): Promise<{
    name: string
    symbol: string
    decimals: number
    logoURI?: string
  } | null> {
    const normalizedAddress = tokenAddress.toLowerCase()

    // Check if we have fresh cache
    if (Date.now() - this.lastFetch < this.CACHE_DURATION) {
      const chainCache = this.tokenCache.get(chainId.toString())
      if (chainCache) {
        const token = chainCache.get(normalizedAddress)
        if (token) {
          return {
            name: token.name,
            symbol: token.symbol,
            decimals: token.decimals,
            logoURI: token.logoURI,
          }
        }
      }
    }

    // Fetch fresh data if needed
    await this.fetchTokenLists(chainId)

    // Try again with fresh data
    const chainCache = this.tokenCache.get(chainId.toString())
    if (chainCache) {
      const token = chainCache.get(normalizedAddress)
      if (token) {
        return {
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          logoURI: token.logoURI,
        }
      }
    }

    return null
  }

  /**
   * Fetch token lists from various sources
   */
  private async fetchTokenLists(chainId: number): Promise<void> {
    const tokenListUrls: Record<number, string[]> = {
      1: [
        // Ethereum
        'https://tokens.coingecko.com/uniswap/all.json',
        'https://gateway.ipfs.io/ipns/tokens.uniswap.org',
        'https://raw.githubusercontent.com/compound-finance/token-list/master/compound.tokenlist.json',
      ],
      56: [
        // BSC
        'https://tokens.pancakeswap.finance/pancakeswap-extended.json',
        'https://raw.githubusercontent.com/pancakeswap/token-list/main/lists/pancakeswap-extended.json',
      ],
      137: [
        // Polygon
        'https://api-polygon-tokens.polygon.technology/tokenlists/default.tokenlist.json',
        'https://unpkg.com/quickswap-default-token-list@latest/build/quickswap-default.tokenlist.json',
      ],
      8453: [
        // Base
        'https://raw.githubusercontent.com/base-org/default-token-list/main/src/tokens/base.json',
        'https://tokens.coingecko.com/base/all.json',
      ],
      42161: [
        // Arbitrum
        'https://tokens.coingecko.com/arbitrum-one/all.json',
        'https://bridge.arbitrum.io/token-list-42161.json',
      ],
      10: [
        // Optimism
        'https://static.optimism.io/optimism.tokenlist.json',
        'https://tokens.coingecko.com/optimistic-ethereum/all.json',
      ],
    }

    const urls = tokenListUrls[chainId] || []

    // Also try CoinGecko's unified list
    urls.push('https://tokens.coingecko.com/uniswap/all.json')

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(5000),
        })

        if (!response.ok) continue

        const tokenList: TokenList = await response.json()

        // Process tokens for the specific chain
        const chainTokens = tokenList.tokens.filter(
          (token) => token.chainId === chainId || chainId === 1, // Include Ethereum tokens as fallback
        )

        // Store in cache
        if (!this.tokenCache.has(chainId.toString())) {
          this.tokenCache.set(chainId.toString(), new Map())
        }

        const chainCache = this.tokenCache.get(chainId.toString())!
        for (const token of chainTokens) {
          chainCache.set(token.address.toLowerCase(), token)
        }

        // If we got some tokens, consider it a success
        if (chainTokens.length > 0) {
          this.lastFetch = Date.now()
          console.log(`Loaded ${chainTokens.length} tokens for chain ${chainId} from ${url}`)
          break // Stop after first successful fetch
        }
      } catch (error) {
        console.debug(`Failed to fetch token list from ${url}:`, error)
        // Continue to next URL
      }
    }

    // Fallback: Try to get token info from Trust Wallet assets
    try {
      await this.fetchFromTrustWallet(chainId)
    } catch (error) {
      console.debug('Failed to fetch from Trust Wallet:', error)
    }
  }

  /**
   * Fetch token info from Trust Wallet's asset repository
   */
  private async fetchFromTrustWallet(chainId: number): Promise<void> {
    const chainMap: Record<number, string> = {
      1: 'ethereum',
      56: 'smartchain',
      137: 'polygon',
      8453: 'base',
      42161: 'arbitrum',
      10: 'optimism',
    }

    const chainName = chainMap[chainId]
    if (!chainName) return

    // Trust Wallet uses a different structure - we can't fetch all at once
    // This is more of a placeholder for individual token lookups
    console.debug(`Trust Wallet assets would be fetched for ${chainName} if needed`)
  }

  /**
   * Get logo URI for a specific token
   * This can be called separately to just get the logo
   */
  async getTokenLogo(chainId: number, tokenAddress: string): Promise<string | undefined> {
    // First try our cache
    const metadata = await this.getTokenMetadata(chainId, tokenAddress)
    if (metadata?.logoURI) {
      return metadata.logoURI
    }

    // Try Trust Wallet's CDN directly
    const trustWalletUrl = this.getTrustWalletLogoUrl(chainId, tokenAddress)
    if (trustWalletUrl) {
      // Check if the image exists
      try {
        const response = await fetch(trustWalletUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(2000),
        })
        if (response.ok) {
          return trustWalletUrl
        }
      } catch {
        // Image doesn't exist
      }
    }

    // Try CoinGecko's CDN
    const coingeckoUrl = `https://assets.coingecko.com/coins/images/${tokenAddress.toLowerCase()}/small`
    try {
      const response = await fetch(coingeckoUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000),
      })
      if (response.ok) {
        return coingeckoUrl
      }
    } catch {
      // Image doesn't exist
    }

    return undefined
  }

  /**
   * Get Trust Wallet logo URL for a token
   */
  private getTrustWalletLogoUrl(chainId: number, tokenAddress: string): string | null {
    const chainMap: Record<number, string> = {
      1: 'ethereum',
      56: 'smartchain',
      137: 'polygon',
      8453: 'base',
      42161: 'arbitrum',
      10: 'optimism',
    }

    const chainName = chainMap[chainId]
    if (!chainName) return null

    // Trust Wallet's asset CDN
    return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${chainName}/assets/${tokenAddress}/logo.png`
  }
}

export const tokenListService = new TokenListService()
