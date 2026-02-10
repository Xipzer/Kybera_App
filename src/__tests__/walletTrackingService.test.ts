/**
 * Code by Xipzer
 */

import { describe, it, expect } from 'vitest'
import { walletTrackingService } from '../services/walletTrackingService'
import type { WatchedWallet, WalletActivity, CopyTradeConfig } from '../types/watchlist'

const makeWallet = (overrides: Partial<WatchedWallet> = {}): WatchedWallet => ({
  id: 'w1',
  address: '0xTestWallet',
  label: 'Test Whale',
  tags: ['whale'],
  networks: ['ethereum'],
  trackSwaps: true,
  trackTransfers: true,
  trackApprovals: true,
  minValueUsd: 0,
  addedAt: Date.now(),
  ...overrides,
})

const makeActivity = (overrides: Partial<WalletActivity> = {}): WalletActivity => ({
  id: 'a1',
  watchedWalletId: 'w1',
  walletAddress: '0xTestWallet',
  networkId: 'ethereum',
  txHash: '0xtx1',
  blockNumber: 100,
  timestamp: Date.now(),
  activityType: 'swap',
  estimatedValueUsd: 5000,
  ...overrides,
})

const makeConfig = (overrides: Partial<CopyTradeConfig> = {}): CopyTradeConfig => ({
  enabled: true,
  watchedWalletId: 'w1',
  executionWalletId: 'my-wallet',
  executionNetworkId: 'ethereum',
  sizeMode: 'fixed',
  fixedAmountUsd: 100,
  maxTradeUsd: 500,
  minWhaleTradeUsd: 1000,
  tokenBlacklist: [],
  tokenWhitelist: [],
  requireConfirmation: false,
  maxDailyTrades: 5,
  dailyTradesUsed: 0,
  lastResetDate: new Date().toISOString().split('T')[0],
  ...overrides,
})

describe('walletTrackingService', () => {
  describe('classifyTransaction', () => {
    it('classifies approval transactions', () => {
      const result = walletTrackingService.classifyTransaction(
        { from: '0xuser', to: '0xtoken', input: '0x095ea7b3abcdef', value: '0' },
        '0xuser',
      )
      expect(result).toBe('approval')
    })

    it('classifies incoming native transfer', () => {
      const result = walletTrackingService.classifyTransaction(
        { from: '0xsender', to: '0xuser', input: '0x', value: '1000000000000000000' },
        '0xuser',
      )
      expect(result).toBe('transfer_in')
    })

    it('classifies swap to known DEX router', () => {
      const result = walletTrackingService.classifyTransaction(
        {
          from: '0xuser',
          to: '0x7a250d5630b4cf539739df2c5dacb4c659f2488d',
          input: '0x38ed1739abcdef',
          value: '1000000000000000000',
        },
        '0xuser',
      )
      expect(result).toBe('swap')
    })

    it('classifies outgoing transfer', () => {
      const result = walletTrackingService.classifyTransaction(
        { from: '0xuser', to: '0xrecipient', input: '0x', value: '500000000000000000' },
        '0xuser',
      )
      expect(result).toBe('transfer_out')
    })

    it('classifies contract interaction for non-empty input', () => {
      const result = walletTrackingService.classifyTransaction(
        { from: '0xuser', to: '0xcontract', input: '0xdeadbeef', value: '0' },
        '0xuser',
      )
      expect(result).toBe('contract_interaction')
    })

    it('classifies unknown for zero-value empty-input to non-user', () => {
      const result = walletTrackingService.classifyTransaction(
        { from: '0xother', to: '0xanother', input: '0x', value: '0' },
        '0xuser',
      )
      expect(result).toBe('unknown')
    })

    it('handles case-insensitive address comparison', () => {
      const result = walletTrackingService.classifyTransaction(
        { from: '0xSENDER', to: '0xUSER', input: '0x', value: '1000' },
        '0xuser',
      )
      expect(result).toBe('transfer_in')
    })
  })

  describe('parseSwapFromTx', () => {
    it('parses ETH-input swap (swapExactETHForTokens)', () => {
      const result = walletTrackingService.parseSwapFromTx({
        input: '0x7ff36ab5' + '0'.repeat(128),
        value: '1000000000000000000',
      })

      expect(result).not.toBeNull()
      expect(result!.tokenIn).toBe('ETH')
      expect(result!.tokenOut).toBe('TOKEN')
    })

    it('parses token-input swap (swapExactTokensForETH)', () => {
      const result = walletTrackingService.parseSwapFromTx({
        input: '0x18cbafe5' + '0'.repeat(128),
        value: '0',
      })

      expect(result).not.toBeNull()
      expect(result!.tokenIn).toBe('TOKEN')
      expect(result!.tokenOut).toBe('ETH')
    })

    it('parses Universal Router execute', () => {
      const result = walletTrackingService.parseSwapFromTx({
        input: '0x3593564c' + '0'.repeat(128),
        value: '500000000000000000',
      })

      expect(result).not.toBeNull()
    })

    it('returns null for non-swap transactions', () => {
      const result = walletTrackingService.parseSwapFromTx({
        input: '0x',
        value: '0',
      })
      expect(result).toBeNull()
    })

    it('returns null for unknown method IDs', () => {
      const result = walletTrackingService.parseSwapFromTx({
        input: '0xabcdef12' + '0'.repeat(128),
        value: '0',
      })
      expect(result).toBeNull()
    })
  })

  describe('shouldTriggerAlert', () => {
    it('triggers for swap when trackSwaps is true', () => {
      expect(
        walletTrackingService.shouldTriggerAlert(makeActivity({ activityType: 'swap' }), makeWallet()),
      ).toBe(true)
    })

    it('skips swap when trackSwaps is false', () => {
      expect(
        walletTrackingService.shouldTriggerAlert(
          makeActivity({ activityType: 'swap' }),
          makeWallet({ trackSwaps: false }),
        ),
      ).toBe(false)
    })

    it('skips transfer when trackTransfers is false', () => {
      expect(
        walletTrackingService.shouldTriggerAlert(
          makeActivity({ activityType: 'transfer_in' }),
          makeWallet({ trackTransfers: false }),
        ),
      ).toBe(false)
    })

    it('skips approval when trackApprovals is false', () => {
      expect(
        walletTrackingService.shouldTriggerAlert(
          makeActivity({ activityType: 'approval' }),
          makeWallet({ trackApprovals: false }),
        ),
      ).toBe(false)
    })

    it('skips when value below minimum', () => {
      expect(
        walletTrackingService.shouldTriggerAlert(
          makeActivity({ estimatedValueUsd: 500 }),
          makeWallet({ minValueUsd: 1000 }),
        ),
      ).toBe(false)
    })

    it('triggers when value meets minimum', () => {
      expect(
        walletTrackingService.shouldTriggerAlert(
          makeActivity({ estimatedValueUsd: 1000 }),
          makeWallet({ minValueUsd: 1000 }),
        ),
      ).toBe(true)
    })
  })

  describe('evaluateCopyTrade', () => {
    it('rejects non-swap activities', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity({ activityType: 'transfer_in' }),
        makeConfig(),
      )
      expect(result.shouldCopy).toBe(false)
      expect(result.reason).toContain('not a swap')
    })

    it('rejects when config is disabled', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity(),
        makeConfig({ enabled: false }),
      )
      expect(result.shouldCopy).toBe(false)
    })

    it('rejects when daily limit is reached', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity(),
        makeConfig({ dailyTradesUsed: 5, maxDailyTrades: 5 }),
      )
      expect(result.shouldCopy).toBe(false)
      expect(result.reason).toContain('Daily trade limit')
    })

    it('rejects when trade value below minimum', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity({ estimatedValueUsd: 500 }),
        makeConfig({ minWhaleTradeUsd: 1000 }),
      )
      expect(result.shouldCopy).toBe(false)
      expect(result.reason).toContain('below minimum')
    })

    it('rejects when token is blacklisted', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity({ tokenInAddress: '0xBADTOKEN' }),
        makeConfig({ tokenBlacklist: ['0xbadtoken'] }),
      )
      expect(result.shouldCopy).toBe(false)
      expect(result.reason).toContain('blacklisted')
    })

    it('rejects when token not in whitelist', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity({ tokenInAddress: '0xUnknown' }),
        makeConfig({ tokenWhitelist: ['0xallowed'] }),
      )
      expect(result.shouldCopy).toBe(false)
      expect(result.reason).toContain('whitelisted')
    })

    it('rejects when network does not match', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity({ networkId: 'base' }),
        makeConfig({ executionNetworkId: 'ethereum' }),
      )
      expect(result.shouldCopy).toBe(false)
      expect(result.reason).toContain('network')
    })

    it('approves valid copy trade (requireConfirmation=false)', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity({ estimatedValueUsd: 5000 }),
        makeConfig({ requireConfirmation: false }),
      )
      expect(result.shouldCopy).toBe(true)
      expect(result.reason).toBe('All checks passed')
    })

    it('approves with confirmation flag when requireConfirmation=true', () => {
      const result = walletTrackingService.evaluateCopyTrade(
        makeActivity({ estimatedValueUsd: 5000 }),
        makeConfig({ requireConfirmation: true }),
      )
      expect(result.shouldCopy).toBe(true)
      expect(result.reason).toContain('confirmation')
    })
  })
})
