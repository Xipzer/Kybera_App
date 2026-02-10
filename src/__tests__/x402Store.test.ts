/**
 * Code by Xipzer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useX402Store } from '../store/x402Store'

beforeEach(() => {
  useX402Store.setState({
    config: {
      enabled: false,
      maxPerRequestUsd: 0.10,
      dailyBudgetUsd: 5.00,
      dailySpentUsd: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      approvedDomains: [],
      blockedDomains: [],
      totalLifetimeSpentUsd: 0,
      totalPaymentCount: 0,
    },
    paymentHistory: [],
    isProcessingPayment: false,
  })
})

describe('x402Store', () => {
  describe('config management', () => {
    it('enables/disables x402', () => {
      useX402Store.getState().setEnabled(true)
      expect(useX402Store.getState().config.enabled).toBe(true)
      useX402Store.getState().setEnabled(false)
      expect(useX402Store.getState().config.enabled).toBe(false)
    })

    it('sets max per request amount', () => {
      useX402Store.getState().setMaxPerRequest(0.25)
      expect(useX402Store.getState().config.maxPerRequestUsd).toBe(0.25)
    })

    it('sets daily budget', () => {
      useX402Store.getState().setDailyBudget(10)
      expect(useX402Store.getState().config.dailyBudgetUsd).toBe(10)
    })

    it('sets payment wallet', () => {
      useX402Store.getState().setPaymentWallet('wallet-123')
      expect(useX402Store.getState().config.paymentWalletId).toBe('wallet-123')
    })
  })

  describe('domain management', () => {
    it('adds approved domain (deduplicates)', () => {
      useX402Store.getState().addApprovedDomain('api.example.com')
      useX402Store.getState().addApprovedDomain('api.example.com')

      expect(useX402Store.getState().config.approvedDomains).toEqual(['api.example.com'])
    })

    it('removes approved domain', () => {
      useX402Store.getState().addApprovedDomain('api.example.com')
      useX402Store.getState().addApprovedDomain('api.other.com')
      useX402Store.getState().removeApprovedDomain('api.example.com')

      expect(useX402Store.getState().config.approvedDomains).toEqual(['api.other.com'])
    })

    it('adds blocked domain (deduplicates)', () => {
      useX402Store.getState().addBlockedDomain('evil.com')
      useX402Store.getState().addBlockedDomain('evil.com')

      expect(useX402Store.getState().config.blockedDomains).toEqual(['evil.com'])
    })

    it('removes blocked domain', () => {
      useX402Store.getState().addBlockedDomain('evil.com')
      useX402Store.getState().removeBlockedDomain('evil.com')

      expect(useX402Store.getState().config.blockedDomains).toEqual([])
    })
  })

  describe('payment recording', () => {
    it('records a payment and updates daily spending', () => {
      useX402Store.getState().recordPayment({
        id: 'pay-1',
        resourceUrl: 'https://api.example.com/data',
        domain: 'api.example.com',
        description: 'Data access',
        amountUsd: 0.05,
        amountRaw: '50000',
        tokenSymbol: 'USDC',
        network: 'base',
        payToAddress: '0xpay',
        timestamp: Date.now(),
        status: 'completed',
      })

      const state = useX402Store.getState()
      expect(state.paymentHistory).toHaveLength(1)
      expect(state.config.dailySpentUsd).toBe(0.05)
      expect(state.config.totalLifetimeSpentUsd).toBe(0.05)
      expect(state.config.totalPaymentCount).toBe(1)
    })

    it('accumulates daily spending across payments', () => {
      for (let i = 0; i < 3; i++) {
        useX402Store.getState().recordPayment({
          id: `pay-${i}`,
          resourceUrl: 'https://api.example.com/data',
          domain: 'api.example.com',
          description: 'Data access',
          amountUsd: 0.10,
          amountRaw: '100000',
          tokenSymbol: 'USDC',
          network: 'base',
          payToAddress: '0xpay',
          timestamp: Date.now(),
          status: 'completed',
        })
      }

      const state = useX402Store.getState()
      expect(state.config.dailySpentUsd).toBeCloseTo(0.30)
      expect(state.config.totalPaymentCount).toBe(3)
    })

    it('caps payment history at 200', () => {
      for (let i = 0; i < 210; i++) {
        useX402Store.getState().recordPayment({
          id: `pay-${i}`,
          resourceUrl: 'https://api.example.com/data',
          domain: 'api.example.com',
          description: 'test',
          amountUsd: 0.01,
          amountRaw: '10000',
          tokenSymbol: 'USDC',
          network: 'base',
          payToAddress: '0xpay',
          timestamp: Date.now(),
          status: 'completed',
        })
      }

      expect(useX402Store.getState().paymentHistory.length).toBeLessThanOrEqual(200)
    })
  })

  describe('daily reset', () => {
    it('resets daily spending', () => {
      useX402Store.getState().recordPayment({
        id: 'pay-1',
        resourceUrl: 'https://api.example.com',
        domain: 'api.example.com',
        description: 'test',
        amountUsd: 2.50,
        amountRaw: '2500000',
        tokenSymbol: 'USDC',
        network: 'base',
        payToAddress: '0xpay',
        timestamp: Date.now(),
        status: 'completed',
      })

      useX402Store.getState().resetDaily()

      expect(useX402Store.getState().config.dailySpentUsd).toBe(0)
    })
  })

  describe('spending summary', () => {
    it('returns correct spending summary', () => {
      useX402Store.getState().recordPayment({
        id: 'pay-1',
        resourceUrl: 'https://api.example.com',
        domain: 'api.example.com',
        description: 'test',
        amountUsd: 1.00,
        amountRaw: '1000000',
        tokenSymbol: 'USDC',
        network: 'base',
        payToAddress: '0xpay',
        timestamp: Date.now(),
        status: 'completed',
      })

      const summary = useX402Store.getState().getSpendingSummary()

      expect(summary.todaySpent).toBe(1.00)
      expect(summary.todayBudget).toBe(5.00)
      expect(summary.lifetimeSpent).toBe(1.00)
      expect(summary.paymentCount).toBe(1)
    })
  })

  describe('processing state', () => {
    it('sets processing payment state', () => {
      useX402Store.getState().setIsProcessingPayment(true)
      expect(useX402Store.getState().isProcessingPayment).toBe(true)
      useX402Store.getState().setIsProcessingPayment(false)
      expect(useX402Store.getState().isProcessingPayment).toBe(false)
    })
  })
})
