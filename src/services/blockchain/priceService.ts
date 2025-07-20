/**
 * Code by Xipzer
 */

import { db } from '../database'
import { coinGeckoService } from '../api/coinGeckoService'

export interface TokenPrice {
  address: string
  symbol: string
  usdPrice: number
  usd24hChange: number
  lastUpdated: number
  fromCache: boolean
}

export interface PriceData {
  networkId: string
  nativePrice: number
  native24hChange: number
  tokenPrices: Map<string, TokenPrice>
  lastUpdated: number
}

export class PriceService {
  private networkId: string
  private chainId: number
  private nativeTokenId: string

  private CACHE_DURATION = 5 * 60 * 1000

  constructor(networkId: string, chainId: number, nativeTokenId: string) {
    this.networkId = networkId
    this.chainId = chainId
    this.nativeTokenId = nativeTokenId
  }

  async fetchPrices(tokenAddresses: string[], forceRefresh: boolean = false): Promise<PriceData> {
    if (!forceRefresh) {
      const cachedPrices = await this.getCachedPrices(tokenAddresses)
      if (cachedPrices && this.isCacheFresh(cachedPrices.lastUpdated)) {
        return cachedPrices
      }
    }

    const result: PriceData = {
      networkId: this.networkId,
      nativePrice: 0,
      native24hChange: 0,
      tokenPrices: new Map(),
      lastUpdated: Date.now(),
    }

    try {
      const nativeData = await coinGeckoService.getNativeTokenPrice(this.nativeTokenId)
      result.nativePrice = nativeData.usd
      result.native24hChange = nativeData.usd_24h_change
    } catch (error) {
      console.error(`[PriceService] Native price fetch failed for ${this.nativeTokenId}`, error)
      const cached = await this.getCachedPrices(tokenAddresses)
      if (cached) return cached
      throw error
    }

    if (tokenAddresses.length > 0) {
      try {
        result.tokenPrices = await this.fetchTokenPrices(tokenAddresses)
      } catch (error) {
        console.error('[PriceService] Token price fetch failed, merging with cache', error)
        const cached = await this.getCachedPrices(tokenAddresses)
        if (cached) result.tokenPrices = cached.tokenPrices
      }
    }

    await this.cachePrices(result)
    return result
  }

  private async fetchTokenPrices(tokenAddresses: string[]): Promise<Map<string, TokenPrice>> {
    const prices = new Map<string, TokenPrice>()

    for (const [address, data] of Object.entries(
      await coinGeckoService.getTokenPrices(this.chainId, tokenAddresses),
    )) {
      prices.set(address.toLowerCase(), {
        address: address.toLowerCase(),
        symbol: '',
        usdPrice: data.usd || 0,
        usd24hChange: data.usd_24h_change || 0,
        lastUpdated: Date.now(),
        fromCache: false,
      })
    }

    return prices
  }

  private async getCachedPrices(tokenAddresses: string[]): Promise<PriceData | null> {
    try {
      const nativeCached = await db.priceData.get(this.nativeTokenId)

      const result: PriceData = {
        networkId: this.networkId,
        nativePrice: nativeCached?.usdPrice || 0,
        native24hChange: nativeCached?.usd24hChange || 0,
        tokenPrices: new Map(),
        lastUpdated: nativeCached?.lastUpdated || 0,
      }

      for (const address of tokenAddresses) {
        const cached = await db.priceData.get(address.toLowerCase())
        if (cached) {
          result.tokenPrices.set(address.toLowerCase(), {
            address: address.toLowerCase(),
            symbol: cached.symbol,
            usdPrice: cached.usdPrice,
            usd24hChange: cached.usd24hChange,
            lastUpdated: cached.lastUpdated,
            fromCache: true,
          })
        }
      }

      return result
    } catch (error) {
      console.error('[PriceService] Failed to get cached prices', error)
      return null
    }
  }

  private async cachePrices(prices: PriceData): Promise<void> {
    try {
      await db.priceData.put({
        id: this.nativeTokenId,
        symbol: this.nativeTokenId,
        usdPrice: prices.nativePrice,
        usd24hChange: prices.native24hChange,
        lastUpdated: prices.lastUpdated,
      })

      for (const [address, price] of prices.tokenPrices) {
        await db.priceData.put({
          id: address,
          symbol: price.symbol || address.substring(0, 6),
          usdPrice: price.usdPrice,
          usd24hChange: price.usd24hChange,
          lastUpdated: price.lastUpdated,
        })
      }
    } catch (error) {
      console.error('[PriceService] Failed to cache prices', error)
    }
  }

  private isCacheFresh(lastUpdated: number): boolean {
    return Date.now() - lastUpdated < this.CACHE_DURATION
  }

  async clearCache(): Promise<void> {
    try {
      await db.priceData.clear()
    } catch (error) {
      console.error('[PriceService] Failed to clear cache', error)
    }
  }

  async getCachedTokenPrice(tokenAddress: string): Promise<number | null> {
    try {
      const cached = await db.priceData.get(tokenAddress.toLowerCase())
      return cached?.usdPrice || null
    } catch (error) {
      console.error('[PriceService] Failed to get cached token price', error)
      return null
    }
  }
}