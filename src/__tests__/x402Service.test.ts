/**
 * Code by Xipzer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { x402Service } from '../services/x402Service'
import { useX402Store } from '../store/x402Store'

beforeEach(() => {
  useX402Store.setState({
    config: {
      enabled: true,
      maxPerRequestUsd: 0.10,
      dailyBudgetUsd: 5.00,
      dailySpentUsd: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      approvedDomains: [],
      blockedDomains: [],
      paymentWalletId: 'wallet-1',
      totalLifetimeSpentUsd: 0,
      totalPaymentCount: 0,
    },
    paymentHistory: [],
    isProcessingPayment: false,
  })
})

describe('x402Service', () => {
  describe('isEnabled', () => {
    it('returns true when enabled with wallet set', () => {
      expect(x402Service.isEnabled()).toBe(true)
    })

    it('returns false when disabled', () => {
      useX402Store.getState().setEnabled(false)
      expect(x402Service.isEnabled()).toBe(false)
    })

    it('returns false when no payment wallet is set', () => {
      useX402Store.setState((state) => ({
        config: { ...state.config, paymentWalletId: undefined },
      }))
      expect(x402Service.isEnabled()).toBe(false)
    })
  })

  describe('canAfford', () => {
    it('returns true for affordable payment', () => {
      expect(x402Service.canAfford(0.05)).toBe(true)
    })

    it('returns false when exceeds per-request limit', () => {
      expect(x402Service.canAfford(0.20)).toBe(false)
    })

    it('returns false when exceeds daily budget', () => {
      useX402Store.setState((state) => ({
        config: { ...state.config, dailySpentUsd: 4.95 },
      }))
      expect(x402Service.canAfford(0.10)).toBe(false)
    })

    it('returns true when exactly at budget', () => {
      useX402Store.setState((state) => ({
        config: { ...state.config, dailySpentUsd: 4.90 },
      }))
      expect(x402Service.canAfford(0.10)).toBe(true)
    })
  })

  describe('getDailySpending', () => {
    it('returns correct spending data', () => {
      useX402Store.setState((state) => ({
        config: { ...state.config, dailySpentUsd: 2.50 },
      }))

      const spending = x402Service.getDailySpending()
      expect(spending.spent).toBe(2.50)
      expect(spending.budget).toBe(5.00)
      expect(spending.remaining).toBe(2.50)
    })

    it('resets spending for a new day', () => {
      useX402Store.setState((state) => ({
        config: { ...state.config, dailySpentUsd: 3.00, lastResetDate: '2020-01-01' },
      }))

      const spending = x402Service.getDailySpending()
      expect(spending.spent).toBe(0)
      expect(spending.remaining).toBe(5.00)
    })
  })

  describe('parsePaymentRequirement', () => {
    it('parses valid x-payment header', () => {
      const headers = new Headers({
        'x-payment': JSON.stringify({
          scheme: 'exact',
          network: 'base',
          maxAmountRequired: '100000',
          payToAddress: '0xpay',
          tokenAddress: '0xUSDC',
          tokenSymbol: 'USDC',
          tokenDecimals: 6,
          resource: 'https://api.example.com/data',
          description: 'Premium data',
        }),
      })

      const response = new Response(null, { status: 402, headers })
      const result = x402Service.parsePaymentRequirement(response)

      expect(result).not.toBeNull()
      expect(result!.scheme).toBe('exact')
      expect(result!.network).toBe('base')
      expect(result!.maxAmountRequired).toBe('100000')
      expect(result!.payToAddress).toBe('0xpay')
    })

    it('returns null when no payment header exists', () => {
      const response = new Response(null, { status: 402 })
      expect(x402Service.parsePaymentRequirement(response)).toBeNull()
    })

    it('returns null for invalid/incomplete header', () => {
      const headers = new Headers({
        'x-payment': JSON.stringify({ scheme: 'exact' }),
      })
      const response = new Response(null, { status: 402, headers })
      expect(x402Service.parsePaymentRequirement(response)).toBeNull()
    })

    it('returns null for malformed JSON', () => {
      const headers = new Headers({ 'x-payment': 'not-json' })
      const response = new Response(null, { status: 402, headers })
      expect(x402Service.parsePaymentRequirement(response)).toBeNull()
    })

    it('uses fallback values for optional fields', () => {
      const headers = new Headers({
        'x-payment': JSON.stringify({
          scheme: 'exact',
          network: 'base',
          maxAmountRequired: '50000',
          payToAddress: '0xpay',
        }),
      })

      const response = new Response(null, {
        status: 402,
        headers,
      })
      Object.defineProperty(response, 'url', { value: 'https://fallback.com/resource' })

      const result = x402Service.parsePaymentRequirement(response)

      expect(result).not.toBeNull()
      expect(result!.tokenSymbol).toBe('USDC')
      expect(result!.tokenDecimals).toBe(6)
      expect(result!.description).toBe('Premium data access')
    })
  })

  describe('domain management', () => {
    it('approves a domain', () => {
      x402Service.approveDomain('api.example.com')
      expect(useX402Store.getState().config.approvedDomains).toContain('api.example.com')
    })

    it('blocks a domain', () => {
      x402Service.blockDomain('evil.com')
      expect(useX402Store.getState().config.blockedDomains).toContain('evil.com')
    })
  })

  describe('recordPayment', () => {
    it('records a payment into the store', () => {
      x402Service.recordPayment({
        resourceUrl: 'https://api.example.com/data',
        domain: 'api.example.com',
        description: 'test',
        amountUsd: 0.05,
        amountRaw: '50000',
        tokenSymbol: 'USDC',
        network: 'base',
        payToAddress: '0xpay',
        status: 'completed',
      })

      const history = useX402Store.getState().paymentHistory
      expect(history).toHaveLength(1)
      expect(history[0].id).toBeTruthy()
      expect(history[0].timestamp).toBeDefined()
    })
  })

  describe('getPaymentHistory', () => {
    it('returns payment history with optional limit', () => {
      for (let i = 0; i < 5; i++) {
        x402Service.recordPayment({
          resourceUrl: `https://api.example.com/${i}`,
          domain: 'api.example.com',
          description: `test-${i}`,
          amountUsd: 0.01,
          amountRaw: '10000',
          tokenSymbol: 'USDC',
          network: 'base',
          payToAddress: '0xpay',
          status: 'completed',
        })
      }

      expect(x402Service.getPaymentHistory()).toHaveLength(5)
      expect(x402Service.getPaymentHistory(3)).toHaveLength(3)
    })
  })
})
