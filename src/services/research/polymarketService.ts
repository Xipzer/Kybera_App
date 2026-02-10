/**
 * Code by Xipzer
 */

import type { PredictionMarket, PredictionOutcome, PredictionMarketSentiment } from '../../types/predictions'

interface GammaMarket {
  id: string
  question: string
  description?: string
  outcomes: string[]
  outcomePrices: string[]
  volume: string
  liquidity: string
  endDate: string
  createdAt: string
  active: boolean
  closed: boolean
  tags: { label: string }[]
  slug: string
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

class PolymarketService {
  private readonly API_URL = 'https://gamma-api.polymarket.com'
  private readonly MARKET_LIST_TTL = 5 * 60 * 1000 // 5 minutes
  private readonly SINGLE_MARKET_TTL = 1 * 60 * 1000 // 1 minute

  private cache = new Map<string, CacheEntry<unknown>>()

  private getCached<T>(key: string, ttl: number): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.timestamp > ttl) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  private mapMarket(raw: GammaMarket): PredictionMarket {
    const outcomes: PredictionOutcome[] = raw.outcomes.map((label, i) => {
      const price = parseFloat(raw.outcomePrices[i]) || 0
      return {
        id: `${raw.id}-${i}`,
        label,
        price,
        probability: price * 100,
      }
    })

    return {
      id: raw.id,
      question: raw.question,
      description: raw.description,
      outcomes,
      volume: parseFloat(raw.volume) || 0,
      liquidity: parseFloat(raw.liquidity) || 0,
      endDate: raw.endDate,
      createdAt: raw.createdAt,
      active: raw.active,
      closed: raw.closed,
      resolved: raw.closed && !raw.active,
      tags: raw.tags?.map((t) => t.label) || [],
      source: 'polymarket',
      sourceUrl: `https://polymarket.com/event/${raw.slug}`,
    }
  }

  async searchMarkets(query: string, limit: number = 10): Promise<PredictionMarket[]> {
    const cacheKey = `search:${query}:${limit}`
    const cached = this.getCached<PredictionMarket[]>(cacheKey, this.MARKET_LIST_TTL)
    if (cached) return cached

    try {
      const tagParams = new URLSearchParams({
        tag: query,
        limit: limit.toString(),
        active: 'true',
        closed: 'false',
        order: 'volume',
        ascending: 'false',
      })

      const tagResponse = await fetch(`${this.API_URL}/markets?${tagParams}`)
      let markets: GammaMarket[] = []

      if (tagResponse.ok) {
        markets = await tagResponse.json()
      }

      if (markets.length < limit) {
        const textParams = new URLSearchParams({
          limit: limit.toString(),
          active: 'true',
          closed: 'false',
          order: 'volume',
          ascending: 'false',
        })

        const textResponse = await fetch(
          `${this.API_URL}/markets?${textParams}&slug=${encodeURIComponent(query.toLowerCase())}`,
        )

        if (textResponse.ok) {
          const textMarkets: GammaMarket[] = await textResponse.json()
          const existingIds = new Set(markets.map((m) => m.id))
          for (const m of textMarkets) {
            if (!existingIds.has(m.id)) {
              markets.push(m)
            }
          }
        }
      }

      const queryLower = query.toLowerCase()
      const relevant = markets.filter(
        (m) =>
          m.question.toLowerCase().includes(queryLower) ||
          m.tags?.some((t) => t.label.toLowerCase().includes(queryLower)),
      )

      const result = (relevant.length > 0 ? relevant : markets).slice(0, limit).map((m) => this.mapMarket(m))

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error('[Polymarket] Error searching markets:', error)
      return []
    }
  }

  async getMarket(marketId: string): Promise<PredictionMarket | null> {
    const cacheKey = `market:${marketId}`
    const cached = this.getCached<PredictionMarket>(cacheKey, this.SINGLE_MARKET_TTL)
    if (cached) return cached

    try {
      const response = await fetch(`${this.API_URL}/markets/${marketId}`)

      if (!response.ok) {
        return null
      }

      const raw: GammaMarket = await response.json()
      const mapped = this.mapMarket(raw)

      this.setCache(cacheKey, mapped)
      return mapped
    } catch (error) {
      console.error('[Polymarket] Error fetching market:', error)
      return null
    }
  }

  async getTrendingMarkets(limit: number = 10): Promise<PredictionMarket[]> {
    const cacheKey = `trending:${limit}`
    const cached = this.getCached<PredictionMarket[]>(cacheKey, this.MARKET_LIST_TTL)
    if (cached) return cached

    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        active: 'true',
        closed: 'false',
        order: 'volume',
        ascending: 'false',
      })

      const response = await fetch(`${this.API_URL}/markets?${params}`)

      if (!response.ok) {
        return []
      }

      const raw: GammaMarket[] = await response.json()
      const result = raw.map((m) => this.mapMarket(m))

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error('[Polymarket] Error fetching trending markets:', error)
      return []
    }
  }

  async getCryptoMarkets(limit: number = 10): Promise<PredictionMarket[]> {
    const cacheKey = `crypto:${limit}`
    const cached = this.getCached<PredictionMarket[]>(cacheKey, this.MARKET_LIST_TTL)
    if (cached) return cached

    try {
      const params = new URLSearchParams({
        tag: 'Crypto',
        limit: limit.toString(),
        active: 'true',
        closed: 'false',
        order: 'volume',
        ascending: 'false',
      })

      const response = await fetch(`${this.API_URL}/markets?${params}`)

      if (!response.ok) {
        return []
      }

      const raw: GammaMarket[] = await response.json()
      const result = raw.map((m) => this.mapMarket(m))

      this.setCache(cacheKey, result)
      return result
    } catch (error) {
      console.error('[Polymarket] Error fetching crypto markets:', error)
      return []
    }
  }

  async getSentimentForTopic(topic: string): Promise<PredictionMarketSentiment> {
    const markets = await this.searchMarkets(topic, 10)

    if (markets.length === 0) {
      return {
        query: topic,
        relevantMarkets: [],
        overallSentiment: 'neutral',
        sentimentSummary: `No active Polymarket markets found for "${topic}".`,
        dataTimestamp: Date.now(),
      }
    }

    const bullishProbabilities: number[] = []

    for (const market of markets) {
      const yesOutcome = market.outcomes.find(
        (o) => o.label.toLowerCase() === 'yes',
      )
      if (yesOutcome) {
        bullishProbabilities.push(yesOutcome.price)
      } else if (market.outcomes.length > 0) {
        const maxOutcome = market.outcomes.reduce((max, o) =>
          o.price > max.price ? o : max,
        )
        bullishProbabilities.push(maxOutcome.price)
      }
    }

    const avgProbability =
      bullishProbabilities.length > 0
        ? bullishProbabilities.reduce((sum, p) => sum + p, 0) / bullishProbabilities.length
        : 0.5

    let overallSentiment: PredictionMarketSentiment['overallSentiment']
    if (avgProbability > 0.6) {
      overallSentiment = 'bullish'
    } else if (avgProbability < 0.4) {
      overallSentiment = 'bearish'
    } else {
      const variance =
        bullishProbabilities.length > 1
          ? bullishProbabilities.reduce((sum, p) => sum + Math.pow(p - avgProbability, 2), 0) /
            bullishProbabilities.length
          : 0
      overallSentiment = variance > 0.04 ? 'mixed' : 'neutral'
    }

    const totalVolume = markets.reduce((sum, m) => sum + m.volume, 0)
    const volumeStr =
      totalVolume >= 1_000_000
        ? `$${(totalVolume / 1_000_000).toFixed(1)}M`
        : `$${(totalVolume / 1_000).toFixed(0)}K`

    const topMarket = markets.reduce((top, m) =>
      m.volume > top.volume ? m : top,
    )
    const topYes = topMarket.outcomes.find(
      (o) => o.label.toLowerCase() === 'yes',
    )
    const topProbStr = topYes
      ? `${Math.round(topYes.probability)}%`
      : `${Math.round(topMarket.outcomes[0]?.probability ?? 0)}%`

    const sentimentSummary = `Polymarket gives ${topProbStr} odds on "${topMarket.question}". ${markets.length} active market${markets.length === 1 ? '' : 's'} with ${volumeStr} total volume.`

    return {
      query: topic,
      relevantMarkets: markets,
      overallSentiment,
      sentimentSummary,
      dataTimestamp: Date.now(),
    }
  }
}

export const polymarketService = new PolymarketService()
