import { db } from '../storage/database'
import { coinGeckoService } from '../api/coinGeckoService'

interface TokenImageInfo {
  address: string
  chainId: number
  symbol: string
  name: string
}

export class TokenImageService {
  private fetchQueue: Array<{ token: TokenImageInfo; resolve: (url: string | null) => void }> = []
  private isProcessing = false

  /**
   * Get token image URL, fetching from CoinGecko if not cached
   */
  async getTokenImage(token: TokenImageInfo): Promise<string | null> {
    const metadataId = `${token.chainId}_${token.address.toLowerCase()}`
    
    // Check if we already have a cached image
    const cached = await db.tokenMetadata.get(metadataId)
    if (cached?.logoURI) {
      return cached.logoURI
    }

    // Queue the fetch request
    return new Promise((resolve) => {
      this.fetchQueue.push({ token, resolve })
      this.processQueue()
    })
  }

  /**
   * Process the fetch queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.fetchQueue.length === 0) {
      return
    }

    this.isProcessing = true

    while (this.fetchQueue.length > 0) {
      const { token, resolve } = this.fetchQueue.shift()!

      try {
        const imageUrl = await this.fetchTokenImageFromCoinGecko(token)
        resolve(imageUrl)
        
        // Cache the result
        if (imageUrl) {
          await this.cacheTokenImage(token, imageUrl)
        }
      } catch (error) {
        console.error('Failed to fetch token image:', error)
        resolve(null)
      }
    }

    this.isProcessing = false
  }

  /**
   * Fetch token image from CoinGecko
   */
  private async fetchTokenImageFromCoinGecko(token: TokenImageInfo): Promise<string | null> {
    try {
      // First, try to get the token info by contract address
      const tokenInfo = await coinGeckoService.getTokenInfo(token.chainId, token.address)
      
      if (tokenInfo?.image) {
        return tokenInfo.image.large || tokenInfo.image.small || null
      }

      // If that fails, try searching by symbol
      return coinGeckoService.searchTokenBySymbol(token.symbol)
    } catch (error) {
      console.error('Failed to fetch token image:', error)
      return null
    }
  }


  /**
   * Cache token image URL
   */
  private async cacheTokenImage(token: TokenImageInfo, logoURI: string): Promise<void> {
    const metadataId = `${token.chainId}_${token.address.toLowerCase()}`
    
    const existing = await db.tokenMetadata.get(metadataId)
    
    await db.tokenMetadata.put({
      id: metadataId,
      chainId: token.chainId,
      address: token.address.toLowerCase(),
      name: token.name,
      symbol: token.symbol,
      decimals: existing?.decimals || 18, // Keep existing decimals if available
      logoURI,
      lastUpdated: Date.now()
    })
  }

  /**
   * Batch fetch and cache token images
   */
  async fetchAndCacheTokenImages(tokens: TokenImageInfo[]): Promise<void> {
    // Filter out tokens that already have cached images
    const tokensNeedingImages: TokenImageInfo[] = []
    
    for (const token of tokens) {
      const metadataId = `${token.chainId}_${token.address.toLowerCase()}`
      const cached = await db.tokenMetadata.get(metadataId)
      
      if (!cached?.logoURI) {
        tokensNeedingImages.push(token)
      }
    }

    // Fetch images for tokens that need them
    for (const token of tokensNeedingImages) {
      await this.getTokenImage(token)
    }
  }
}

// Export singleton instance
export const tokenImageService = new TokenImageService()