/**
 * Code by Xipzer
 */

import { db } from './database'
import { coinGeckoService } from './api/coinGeckoService'

interface TokenImageInfo {
  address: string
  chainId: number
  symbol: string
  name: string
}

export class TokenImageService {
  private fetchQueue: Array<{ token: TokenImageInfo; resolve: (url: string | null) => void }> = []
  private isProcessing = false

  async getTokenImage(token: TokenImageInfo): Promise<string | null> {
    const metadataId = `${token.chainId}_${token.address.toLowerCase()}`

    const cached = await db.tokenMetadata.get(metadataId)
    if (cached?.logoURI) {
      return cached.logoURI
    }

    return new Promise((resolve) => {
      this.fetchQueue.push({ token, resolve })
      this.processQueue()
    })
  }

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

  private async fetchTokenImageFromCoinGecko(token: TokenImageInfo): Promise<string | null> {
    try {
      const tokenInfo = await coinGeckoService.getTokenInfo(token.chainId, token.address)

      if (tokenInfo?.image) {
        return tokenInfo.image.large || tokenInfo.image.small || null
      }

      return coinGeckoService.searchTokenBySymbol(token.symbol)
    } catch (error) {
      console.error('Failed to fetch token image:', error)
      return null
    }
  }

  private async cacheTokenImage(token: TokenImageInfo, logoURI: string): Promise<void> {
    const metadataId = `${token.chainId}_${token.address.toLowerCase()}`

    const existing = await db.tokenMetadata.get(metadataId)

    await db.tokenMetadata.put({
      id: metadataId,
      chainId: token.chainId,
      address: token.address.toLowerCase(),
      name: token.name,
      symbol: token.symbol,
      decimals: existing?.decimals || 18,
      logoURI,
      lastUpdated: Date.now(),
    })
  }

  async fetchAndCacheTokenImages(tokens: TokenImageInfo[]): Promise<void> {
    const tokensNeedingImages: TokenImageInfo[] = []

    for (const token of tokens) {
      const existing = await db.tokenMetadata.get(`${token.chainId}_${token.address.toLowerCase()}`)
      if (!existing?.logoURI) {
        tokensNeedingImages.push(token)
      }
    }

    for (const token of tokensNeedingImages) {
      await this.getTokenImage(token)
    }
  }
}

export const tokenImageService = new TokenImageService()