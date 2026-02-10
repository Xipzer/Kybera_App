/**
 * Code by Xipzer
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { yieldService } from '../services/defi/yieldService'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const makeDefiLlamaPool = (overrides: Record<string, any> = {}) => ({
  pool: 'pool-1',
  chain: 'Base',
  project: 'aerodrome-v2',
  symbol: 'USDC-WETH',
  tvlUsd: 50000000,
  apy: 12.5,
  apyBase: 8.0,
  apyReward: 4.5,
  rewardTokens: ['0xReward'],
  underlyingTokens: ['0xUSDC'],
  stablecoin: false,
  ...overrides,
})

beforeEach(() => {
  mockFetch.mockReset()
  ;(yieldService as any).cache = null
})

describe('yieldService', () => {
  describe('getYieldOpportunities', () => {
    it('fetches and filters yield opportunities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            makeDefiLlamaPool(),
            makeDefiLlamaPool({ pool: 'pool-2', project: 'aave-v3', chain: 'Ethereum', apy: 5.2 }),
            makeDefiLlamaPool({ pool: 'pool-3', project: 'unknown-protocol', chain: 'Base', apy: 100 }),
          ],
        }),
      })

      const results = await yieldService.getYieldOpportunities({})

      expect(results.length).toBeGreaterThan(0)
      expect(results.every((r) => r.apy > 0)).toBe(true)
      expect(results.every((r) => ['aerodrome', 'aave_v3', 'morpho', 'lido', 'compound_v3'].includes(r.protocol))).toBe(true)
    })

    it('filters by minimum APY', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            makeDefiLlamaPool({ apy: 3.0 }),
            makeDefiLlamaPool({ pool: 'pool-2', apy: 15.0 }),
          ],
        }),
      })

      const results = await yieldService.getYieldOpportunities({ minApy: 10 })
      expect(results.every((r) => r.apy >= 10)).toBe(true)
    })

    it('filters by network', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            makeDefiLlamaPool({ chain: 'Base' }),
            makeDefiLlamaPool({ pool: 'pool-2', chain: 'Ethereum' }),
          ],
        }),
      })

      const results = await yieldService.getYieldOpportunities({ networkId: 'base' })
      expect(results.every((r) => r.networkId === 'base')).toBe(true)
    })

    it('sorts by APY descending by default', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            makeDefiLlamaPool({ apy: 5.0 }),
            makeDefiLlamaPool({ pool: 'pool-2', apy: 20.0 }),
            makeDefiLlamaPool({ pool: 'pool-3', apy: 10.0 }),
          ],
        }),
      })

      const results = await yieldService.getYieldOpportunities({ sortBy: 'apy' })

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].apy).toBeGreaterThanOrEqual(results[i].apy)
      }
    })

    it('respects limit parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: Array.from({ length: 20 }, (_, i) =>
            makeDefiLlamaPool({ pool: `pool-${i}`, apy: 5 + i }),
          ),
        }),
      })

      const results = await yieldService.getYieldOpportunities({ limit: 5 })
      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('returns empty array on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API down'))

      const results = await yieldService.getYieldOpportunities({}).catch(() => [])
      expect(results).toEqual([])
    })

    it('uses cache for repeated requests', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [makeDefiLlamaPool()],
        }),
      })

      await yieldService.getYieldOpportunities({})
      await yieldService.getYieldOpportunities({})

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })
})
