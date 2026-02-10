/**
 * Code by Xipzer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { polymarketService } from '../services/research/polymarketService'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const makeGammaMarket = (overrides: Record<string, any> = {}) => ({
  id: 'market-1',
  question: 'Will Bitcoin reach $100k by 2025?',
  description: 'A market about BTC price',
  outcomes: ['Yes', 'No'],
  outcomePrices: ['0.65', '0.35'],
  volume: '5000000',
  liquidity: '1000000',
  endDate: '2025-12-31T00:00:00Z',
  createdAt: '2024-01-01T00:00:00Z',
  active: true,
  closed: false,
  tags: [{ label: 'Crypto' }],
  slug: 'will-bitcoin-reach-100k',
  ...overrides,
})

beforeEach(() => {
  mockFetch.mockReset()
  ;(polymarketService as any).cache = new Map()
})

describe('polymarketService', () => {
  describe('searchMarkets', () => {
    it('returns mapped markets from tag search', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeGammaMarket()],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const results = await polymarketService.searchMarkets('Bitcoin', 10)

      expect(results).toHaveLength(1)
      expect(results[0].question).toBe('Will Bitcoin reach $100k by 2025?')
      expect(results[0].outcomes).toHaveLength(2)
      expect(results[0].outcomes[0].label).toBe('Yes')
      expect(results[0].outcomes[0].price).toBeCloseTo(0.65)
      expect(results[0].outcomes[0].probability).toBeCloseTo(65)
      expect(results[0].volume).toBe(5000000)
      expect(results[0].source).toBe('polymarket')
      expect(results[0].sourceUrl).toContain('polymarket.com')
    })

    it('falls back to text search when tag search returns few results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeGammaMarket({ id: 'text-result' })],
      })

      const results = await polymarketService.searchMarkets('bitcoin', 10)

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(results.length).toBeGreaterThanOrEqual(0)
    })

    it('deduplicates results from tag + text search', async () => {
      const market = makeGammaMarket()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [market],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [market, makeGammaMarket({ id: 'market-2', question: 'Another market' })],
      })

      const results = await polymarketService.searchMarkets('Crypto', 10)

      const ids = results.map((r) => r.id)
      const uniqueIds = new Set(ids)
      expect(ids.length).toBe(uniqueIds.size)
    })

    it('returns empty array on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const results = await polymarketService.searchMarkets('test')
      expect(results).toEqual([])
    })

    it('uses cache for repeated queries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [makeGammaMarket({ question: 'Will cached-query happen?' })],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      await polymarketService.searchMarkets('cached-query', 5)
      const results = await polymarketService.searchMarkets('cached-query', 5)

      expect(results).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('getMarket', () => {
    it('returns a single mapped market', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => makeGammaMarket({ id: 'specific-id' }),
      })

      const result = await polymarketService.getMarket('specific-id')

      expect(result).not.toBeNull()
      expect(result!.id).toBe('specific-id')
    })

    it('returns null on 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })

      const result = await polymarketService.getMarket('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('getSentimentForTopic', () => {
    it('returns neutral sentiment when no markets found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const sentiment = await polymarketService.getSentimentForTopic('obscure-topic-xyz')

      expect(sentiment.overallSentiment).toBe('neutral')
      expect(sentiment.relevantMarkets).toHaveLength(0)
      expect(sentiment.sentimentSummary).toContain('No active')
    })

    it('returns bullish sentiment for high-probability markets', async () => {
      const bullMarket = makeGammaMarket({
        id: 'bull-1',
        question: 'Will bitcoin-bull happen?',
        outcomePrices: ['0.80', '0.20'],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [bullMarket],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const sentiment = await polymarketService.getSentimentForTopic('bitcoin-bull')

      expect(sentiment.overallSentiment).toBe('bullish')
      expect(sentiment.relevantMarkets).toHaveLength(1)
    })

    it('returns bearish sentiment for low-probability markets', async () => {
      const bearMarket = makeGammaMarket({
        id: 'bear-1',
        question: 'Will bitcoin-bear happen?',
        outcomePrices: ['0.20', '0.80'],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [bearMarket],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const sentiment = await polymarketService.getSentimentForTopic('bitcoin-bear')

      expect(sentiment.overallSentiment).toBe('bearish')
    })

    it('includes volume summary in sentiment', async () => {
      const volMarket = makeGammaMarket({
        id: 'vol-1',
        question: 'Will volume-test happen?',
        volume: '2000000',
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [volMarket],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })

      const sentiment = await polymarketService.getSentimentForTopic('volume-test')

      expect(sentiment.sentimentSummary).toContain('$')
      expect(sentiment.dataTimestamp).toBeGreaterThan(0)
    })
  })
})
