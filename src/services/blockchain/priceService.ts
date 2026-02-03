/**
 * Price fetching service with caching
 * Handles price data separately from on-chain data
 */

import { db } from '../storage/database'
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
  private nativeTokenId: string // CoinGecko ID for native token

  // Cache duration: 5 minutes to align with price refresh interval
  private CACHE_DURATION = 5 * 60 * 1000

  constructor(networkId: string, chainId: number, nativeTokenId: string) {
    this.networkId = networkId
    this.chainId = chainId
    this.nativeTokenId = nativeTokenId
  }

  /**
   * Fetch prices for native token and a list of token addresses
   * Always tries cache first, only fetches if cache is stale
   */
  async fetchPrices(tokenAddresses: string[], forceRefresh: boolean = false): Promise<PriceData> {
    console.log(
      `[PriceService] Fetching prices for ${tokenAddresses.length} tokens, force: ${forceRefresh}`,
    )

    const result: PriceData = {
      networkId: this.networkId,
      nativePrice: 0,
      native24hChange: 0,
      tokenPrices: new Map(),
      lastUpdated: Date.now(),
    }

    // Step 1: Check if we should use cache
    if (!forceRefresh) {
      const cachedPrices = await this.getCachedPrices(tokenAddresses)
      if (cachedPrices && this.isCacheFresh(cachedPrices.lastUpdated)) {
        console.log('[PriceService] Using cached prices (still fresh)')
        return cachedPrices
      }
    }

    // Step 2: Fetch fresh prices from API
    try {
      // Fetch native token price
      result.nativePrice = await this.fetchNativePrice()
      result.native24hChange = await this.fetchNative24hChange()

      // Fetch token prices (if any)
      if (tokenAddresses.length > 0) {
        const tokenPrices = await this.fetchTokenPrices(tokenAddresses)
        result.tokenPrices = tokenPrices
      }

      // Cache the fresh prices
      await this.cachePrices(result)

      console.log(`[PriceService] Fetched fresh prices - Native: $${result.nativePrice}`)
      return result
    } catch (error) {
      console.error('[PriceService] Failed to fetch fresh prices, using cache', error)

      // Fall back to cache even if stale
      const cached = await this.getCachedPrices(tokenAddresses)
      if (cached) {
        console.log('[PriceService] Using stale cache due to API error')
        return cached
      }

      // No cache available, return zero prices
      console.log('[PriceService] No prices available')
      return result
    }
  }

  /**
   * Fetch native token price
   */
  private async fetchNativePrice(): Promise<number> {
    try {
      const priceData = await coinGeckoService.getNativeTokenPrice(this.nativeTokenId)
      // The API might return a number directly or an object with usd property
      if (typeof priceData === 'number') {
        return priceData
      }
      return (priceData as any)?.usd || 0
    } catch (error) {
      console.error(`[PriceService] Failed to fetch native price for ${this.nativeTokenId}`, error)
      return 0
    }
  }

  /**
   * Fetch native token 24h change
   */
  private async fetchNative24hChange(): Promise<number> {
    try {
      const priceData = await coinGeckoService.getNativeTokenPrice(this.nativeTokenId)
      // For 24h change, we need the full object, not just the price
      if (typeof priceData === 'object' && priceData !== null) {
        return (priceData as any).usd_24h_change || 0
      }
      return 0
    } catch (error) {
      console.error(`[PriceService] Failed to fetch native 24h change`, error)
      return 0
    }
  }

  /**
   * Fetch prices for multiple tokens
   */
  private async fetchTokenPrices(tokenAddresses: string[]): Promise<Map<string, TokenPrice>> {
    const prices = new Map<string, TokenPrice>()

    try {
      // Use CoinGecko batch endpoint
      const priceData = await coinGeckoService.getTokenPrices(this.chainId, tokenAddresses)

      for (const [address, data] of Object.entries(priceData)) {
        prices.set(address.toLowerCase(), {
          address: address.toLowerCase(),
          symbol: '', // Will be filled from token metadata
          usdPrice: data.usd || 0,
          usd24hChange: data.usd_24h_change || 0,
          lastUpdated: Date.now(),
          fromCache: false,
        })
      }
    } catch (error) {
      console.error('[PriceService] Failed to fetch token prices', error)
    }

    return prices
  }

  /**
   * Get cached prices
   */
  private async getCachedPrices(tokenAddresses: string[]): Promise<PriceData | null> {
    try {
      // Get native price from cache
      const nativeCached = await db.priceData.get(this.nativeTokenId)

      const result: PriceData = {
        networkId: this.networkId,
        nativePrice: nativeCached?.usdPrice || 0,
        native24hChange: nativeCached?.usd24hChange || 0,
        tokenPrices: new Map(),
        lastUpdated: nativeCached?.lastUpdated || 0,
      }

      // Get token prices from cache
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

  /**
   * Cache prices to database
   */
  private async cachePrices(prices: PriceData): Promise<void> {
    try {
      // Cache native price
      await db.priceData.put({
        id: this.nativeTokenId,
        symbol: this.nativeTokenId,
        usdPrice: prices.nativePrice,
        usd24hChange: prices.native24hChange,
        lastUpdated: prices.lastUpdated,
      })

      // Cache token prices
      for (const [address, price] of prices.tokenPrices) {
        await db.priceData.put({
          id: address,
          symbol: price.symbol || address.substring(0, 6),
          usdPrice: price.usdPrice,
          usd24hChange: price.usd24hChange,
          lastUpdated: price.lastUpdated,
        })
      }

      console.log('[PriceService] Cached prices to database')
    } catch (error) {
      console.error('[PriceService] Failed to cache prices', error)
    }
  }

  /**
   * Check if cache is still fresh
   */
  private isCacheFresh(lastUpdated: number): boolean {
    const age = Date.now() - lastUpdated
    return age < this.CACHE_DURATION
  }

  /**
   * Clear all price cache for this network
   */
  async clearCache(): Promise<void> {
    try {
      // Clear native price
      await db.priceData.delete(this.nativeTokenId)

      console.log(`[PriceService] Cleared price cache for ${this.networkId}`)
    } catch (error) {
      console.error('[PriceService] Failed to clear cache', error)
    }
  }

  /**
   * Get price for a specific token from cache only
   */
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
