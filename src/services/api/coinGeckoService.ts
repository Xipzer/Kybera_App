/**
 * Code by Xipzer
 */

import { rateLimiter } from './rateLimiter'
import { useSettingsStore } from '../../store/settingsStore'

const ENV_CG_KEY = import.meta.env.VITE_COINGECKO_API_KEY || ''

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
  private readonly API_BASE = '/api/coingecko/api/v3'

  private constructor() {}

  static getInstance(): CoinGeckoService {
    if (!CoinGeckoService.instance) {
      CoinGeckoService.instance = new CoinGeckoService()
    }
    return CoinGeckoService.instance
  }

  private getHeaders(): Record<string, string> {
    const apiKey = useSettingsStore.getState().coinGeckoApiKey || ENV_CG_KEY
    const headers: Record<string, string> = {}
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey
    }
    return headers
  }

  private getPlatformId(chainId: number): string | null {
    const platformIds: Record<number, string> = {
      1: 'ethereum',
      10: 'optimistic-ethereum',
      56: 'binance-smart-chain',
      137: 'polygon-pos',
      250: 'fantom',
      8453: 'base',
      42161: 'arbitrum-one',
      43114: 'avalanche',
    }
    return platformIds[chainId] || null
  }

  async getTokenPrices(
    chainId: number,
    tokenAddresses: string[],
  ): Promise<Record<string, TokenPrice>> {
    if (tokenAddresses.length === 0) return {}

    const platformId = this.getPlatformId(chainId)
    if (!platformId) return {}

    const sortedAddresses = [...tokenAddresses]
      .map((a) => a.toLowerCase())
      .filter((a) => a && a !== 'native' && a !== '0x0000000000000000000000000000000000000000')
      .sort()

    if (sortedAddresses.length === 0) {
      return {}
    }

    const MAX_ADDRESSES_PER_REQUEST = 30

    if (sortedAddresses.length > MAX_ADDRESSES_PER_REQUEST) {
      return await this.fetchTokenPricesInBatches(
        platformId,
        sortedAddresses,
        MAX_ADDRESSES_PER_REQUEST,
      )
    }

    const url = `${this.API_BASE}/simple/token_price/${platformId}?contract_addresses=${sortedAddresses.join(',')}&vs_currencies=usd&include_24hr_change=true`

    try {
      const data = await rateLimiter.execute(
        `token-prices:${platformId}:${sortedAddresses.join(',')}`,
        async () => {
          const response = await fetch(url, { headers: this.getHeaders() })

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Rate limit exceeded')
            } else if (response.status === 400) {
              const errorText = await response.text()
              console.error(`CoinGecko API 400 error:`, errorText)
              console.error(`Request URL: ${url}`)
              console.error(`Platform: ${platformId}, Addresses: ${sortedAddresses.join(',')}`)
              throw new Error(`CoinGecko API error 400: ${errorText}`)
            } else {
              console.warn(`CoinGecko API error: ${response.status}`)
              throw new Error(`CoinGecko API error: ${response.status}`)
            }
          }

          return await response.json()
        },
      )

      const prices: Record<string, TokenPrice> = {}
      for (const [address, priceData] of Object.entries(data as Record<string, Partial<TokenPrice>>)) {
        prices[address] = {
          usd: priceData.usd || 0,
          usd_24h_change: priceData.usd_24h_change || 0,
        }
      }

    return prices
    } catch (error) {
      console.warn('Failed to fetch token prices:', error)
      throw error
    }
  }

  private async fetchTokenPricesInBatches(
    platformId: string,
    sortedAddresses: string[],
    batchSize: number,
  ): Promise<Record<string, TokenPrice>> {
    const batches: string[][] = []

    for (let i = 0; i < sortedAddresses.length; i += batchSize) {
      batches.push(sortedAddresses.slice(i, i + batchSize))
    }

    const batchPromises = batches.map(async (batch, index) => {
      const requestId = `token-prices:${platformId}:batch-${index}:${batch.join(',')}`
      const addresses = batch.join(',')
      const url = `${this.API_BASE}/simple/token_price/${platformId}?contract_addresses=${addresses}&vs_currencies=usd&include_24hr_change=true`

      try {
        const data = await rateLimiter.execute(requestId, async () => {
          const response = await fetch(url, { headers: this.getHeaders() })

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Rate limit exceeded')
            } else if (response.status === 400) {
              const errorText = await response.text()
              console.error(`CoinGecko API 400 error (batch ${index + 1}):`, errorText)
              throw new Error(`CoinGecko API error 400: ${errorText}`)
            } else {
              console.warn(`CoinGecko API error (batch ${index + 1}): ${response.status}`)
              throw new Error(`CoinGecko API error: ${response.status}`)
            }
          }

          return response.json()
        })

        const batchPrices: Record<string, TokenPrice> = {}
        for (const [address, priceData] of Object.entries(data as Record<string, Partial<TokenPrice>>)) {
          batchPrices[address] = {
            usd: priceData.usd || 0,
            usd_24h_change: priceData.usd_24h_change || 0,
          }
        }

        return batchPrices
      } catch (error) {
        console.warn(`Batch ${index + 1}/${batches.length} failed:`, error)
        return {}
      }
    })

    const allPrices: Record<string, TokenPrice> = {}
    for (const batchResult of await Promise.all(batchPromises)) {
      Object.assign(allPrices, batchResult)
    }

    return allPrices
  }

  async getNativeTokenPrice(tokenId: string): Promise<{ usd: number; usd_24h_change: number }> {
    const url = `${this.API_BASE}/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true`

    const data = await rateLimiter.execute(`native-price:${tokenId}`, async () => {
      const response = await fetch(url, { headers: this.getHeaders() })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded')
        }
        throw new Error(`API error: ${response.status}`)
      }

      return response.json() as Promise<NativeTokenPrice>
    })

    return {
      usd: data[tokenId]?.usd ?? 0,
      usd_24h_change: data[tokenId]?.usd_24h_change ?? 0,
    }
  }

  async getPricesByIds(
    ids: string[],
  ): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
    if (ids.length === 0) return {}

    const requestId = `prices-by-ids:${[...ids].sort().join(',')}`
    const url = `${this.API_BASE}/simple/price?ids=${ids.join(',')}&vs_currencies=usd&include_24hr_change=true`

    try {
      const data = await rateLimiter.execute(requestId, async () => {
        const response = await fetch(url, { headers: this.getHeaders() })
        if (!response.ok) {
          if (response.status === 429) throw new Error('Rate limit exceeded')
          throw new Error(`API error: ${response.status}`)
        }
        return response.json() as Promise<NativeTokenPrice>
      })

      const result: Record<string, { usd: number; usd_24h_change: number }> = {}
      for (const id of ids) {
        if (data[id]) {
          result[id] = { usd: data[id].usd || 0, usd_24h_change: data[id].usd_24h_change || 0 }
        }
      }
      return result
    } catch (error) {
      console.warn('Failed to fetch prices by IDs:', error)
      return {}
    }
  }

  async getTokenInfo(
    chainId: number,
    contractAddress: string,
  ): Promise<{ image?: { large?: string; small?: string } } | null> {
    const platformId = this.getPlatformId(chainId)
    if (!platformId) return null

    const requestId = `token-info:${platformId}:${contractAddress.toLowerCase()}`
    const url = `${this.API_BASE}/coins/${platformId}/contract/${contractAddress.toLowerCase()}`

    try {
      const data = await rateLimiter.execute(
        requestId,
        async () => {
          const response = await fetch(url, { headers: this.getHeaders() })

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
        },
        'low',
      )

      return data
    } catch (error) {
      console.warn('Failed to fetch token info:', error)
      return null
    }
  }

  async searchTokenBySymbol(symbol: string): Promise<string | null> {
    try {
      const data = await rateLimiter.execute(
        `token-search:${symbol.toLowerCase()}`,
        async () => {
          const response = await fetch(
            `${this.API_BASE}/search?query=${encodeURIComponent(symbol)}`,
            { headers: this.getHeaders() },
          )

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Rate limit exceeded')
            }
            throw new Error(`API error: ${response.status}`)
          }

          return response.json()
        },
        'low',
      )

      const coin = data.coins?.find((c: { symbol: string; large?: string; thumb?: string }) => c.symbol.toLowerCase() === symbol.toLowerCase())

      return coin ? coin.large || coin.thumb || null : null
    } catch (error) {
      console.warn('Failed to search token:', error)
      return null
    }
  }
}

export const coinGeckoService = CoinGeckoService.getInstance()