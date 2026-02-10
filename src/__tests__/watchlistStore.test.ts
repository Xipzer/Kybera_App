/**
 * Code by Xipzer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useWatchlistStore } from '../store/watchlistStore'

beforeEach(() => {
  useWatchlistStore.setState({
    watchedWallets: [],
    activities: [],
    copyTradeConfigs: [],
    isMonitoring: false,
  })
})

describe('watchlistStore', () => {
  describe('wallet management', () => {
    it('adds a watched wallet and returns its id', () => {
      const id = useWatchlistStore.getState().addWallet({
        address: '0xWhale123',
        label: 'Big Whale',
        tags: ['whale'],
        networks: ['ethereum', 'base'],
        trackSwaps: true,
        trackTransfers: true,
        trackApprovals: false,
        minValueUsd: 1000,
      })

      expect(id).toBeTruthy()
      const wallets = useWatchlistStore.getState().watchedWallets
      expect(wallets).toHaveLength(1)
      expect(wallets[0].label).toBe('Big Whale')
      expect(wallets[0].addedAt).toBeDefined()
    })

    it('removes a wallet and its activities and copy trade configs', () => {
      const walletId = useWatchlistStore.getState().addWallet({
        address: '0xRemoveMe',
        label: 'Remove',
        tags: [],
        networks: ['ethereum'],
        trackSwaps: true,
        trackTransfers: true,
        trackApprovals: true,
        minValueUsd: 0,
      })

      useWatchlistStore.getState().addActivity({
        watchedWalletId: walletId,
        walletAddress: '0xRemoveMe',
        networkId: 'ethereum',
        txHash: '0xtx1',
        blockNumber: 1,
        timestamp: Date.now(),
        activityType: 'swap',
      })

      useWatchlistStore.getState().addCopyTradeConfig({
        enabled: true,
        watchedWalletId: walletId,
        executionWalletId: 'my-wallet',
        executionNetworkId: 'ethereum',
        sizeMode: 'fixed',
        fixedAmountUsd: 100,
        maxTradeUsd: 500,
        minWhaleTradeUsd: 1000,
        tokenBlacklist: [],
        tokenWhitelist: [],
        requireConfirmation: true,
        maxDailyTrades: 5,
      })

      useWatchlistStore.getState().removeWallet(walletId)

      expect(useWatchlistStore.getState().watchedWallets).toHaveLength(0)
      expect(useWatchlistStore.getState().activities).toHaveLength(0)
      expect(useWatchlistStore.getState().copyTradeConfigs).toHaveLength(0)
    })

    it('updates a wallet', () => {
      const id = useWatchlistStore.getState().addWallet({
        address: '0xUpdate',
        label: 'Old Label',
        tags: [],
        networks: ['ethereum'],
        trackSwaps: false,
        trackTransfers: true,
        trackApprovals: false,
        minValueUsd: 0,
      })

      useWatchlistStore.getState().updateWallet(id, { label: 'New Label', trackSwaps: true })

      const wallet = useWatchlistStore.getState().watchedWallets[0]
      expect(wallet.label).toBe('New Label')
      expect(wallet.trackSwaps).toBe(true)
    })

    it('finds wallet by address (case-insensitive)', () => {
      useWatchlistStore.getState().addWallet({
        address: '0xAbCdEf',
        label: 'Test',
        tags: [],
        networks: ['ethereum'],
        trackSwaps: true,
        trackTransfers: true,
        trackApprovals: true,
        minValueUsd: 0,
      })

      const found = useWatchlistStore.getState().getWalletByAddress('0xabcdef')
      expect(found).toBeDefined()
      expect(found!.label).toBe('Test')
    })
  })

  describe('activities', () => {
    it('adds an activity with generated id', () => {
      useWatchlistStore.getState().addActivity({
        watchedWalletId: 'w1',
        walletAddress: '0x123',
        networkId: 'ethereum',
        txHash: '0xtx1',
        blockNumber: 100,
        timestamp: Date.now(),
        activityType: 'swap',
      })

      const activities = useWatchlistStore.getState().activities
      expect(activities).toHaveLength(1)
      expect(activities[0].id).toBeTruthy()
    })

    it('caps activities at 500', () => {
      for (let i = 0; i < 510; i++) {
        useWatchlistStore.getState().addActivity({
          watchedWalletId: 'w1',
          walletAddress: '0x123',
          networkId: 'ethereum',
          txHash: `0xtx${i}`,
          blockNumber: i,
          timestamp: Date.now(),
          activityType: 'transfer_in',
        })
      }

      expect(useWatchlistStore.getState().activities.length).toBeLessThanOrEqual(500)
    })

    it('clears activities for a specific wallet', () => {
      useWatchlistStore.getState().addActivity({
        watchedWalletId: 'w1',
        walletAddress: '0x1',
        networkId: 'ethereum',
        txHash: '0xtx1',
        blockNumber: 1,
        timestamp: Date.now(),
        activityType: 'swap',
      })
      useWatchlistStore.getState().addActivity({
        watchedWalletId: 'w2',
        walletAddress: '0x2',
        networkId: 'base',
        txHash: '0xtx2',
        blockNumber: 2,
        timestamp: Date.now(),
        activityType: 'transfer_out',
      })

      useWatchlistStore.getState().clearActivities('w1')

      expect(useWatchlistStore.getState().activities).toHaveLength(1)
      expect(useWatchlistStore.getState().activities[0].watchedWalletId).toBe('w2')
    })

    it('clears all activities when no walletId provided', () => {
      useWatchlistStore.getState().addActivity({
        watchedWalletId: 'w1',
        walletAddress: '0x1',
        networkId: 'ethereum',
        txHash: '0x1',
        blockNumber: 1,
        timestamp: Date.now(),
        activityType: 'swap',
      })

      useWatchlistStore.getState().clearActivities()
      expect(useWatchlistStore.getState().activities).toHaveLength(0)
    })

    it('gets activities for a specific wallet with limit', () => {
      for (let i = 0; i < 10; i++) {
        useWatchlistStore.getState().addActivity({
          watchedWalletId: 'target',
          walletAddress: '0x1',
          networkId: 'ethereum',
          txHash: `0xtx${i}`,
          blockNumber: i,
          timestamp: Date.now(),
          activityType: 'swap',
        })
      }

      const limited = useWatchlistStore.getState().getActivitiesForWallet('target', 3)
      expect(limited).toHaveLength(3)
    })
  })

  describe('copy trade configs', () => {
    it('adds a copy trade config with reset date', () => {
      useWatchlistStore.getState().addCopyTradeConfig({
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
        requireConfirmation: true,
        maxDailyTrades: 5,
      })

      const configs = useWatchlistStore.getState().copyTradeConfigs
      expect(configs).toHaveLength(1)
      expect(configs[0].dailyTradesUsed).toBe(0)
      expect(configs[0].lastResetDate).toBe(new Date().toISOString().split('T')[0])
    })

    it('removes a copy trade config by wallet id', () => {
      useWatchlistStore.getState().addCopyTradeConfig({
        enabled: true,
        watchedWalletId: 'w1',
        executionWalletId: 'my-wallet',
        executionNetworkId: 'ethereum',
        sizeMode: 'fixed',
        maxTradeUsd: 500,
        minWhaleTradeUsd: 1000,
        tokenBlacklist: [],
        tokenWhitelist: [],
        requireConfirmation: false,
        maxDailyTrades: 10,
      })

      useWatchlistStore.getState().removeCopyTradeConfig('w1')
      expect(useWatchlistStore.getState().copyTradeConfigs).toHaveLength(0)
    })

    it('updates copy trade config', () => {
      useWatchlistStore.getState().addCopyTradeConfig({
        enabled: true,
        watchedWalletId: 'w1',
        executionWalletId: 'my-wallet',
        executionNetworkId: 'ethereum',
        sizeMode: 'fixed',
        maxTradeUsd: 500,
        minWhaleTradeUsd: 1000,
        tokenBlacklist: [],
        tokenWhitelist: [],
        requireConfirmation: false,
        maxDailyTrades: 10,
      })

      useWatchlistStore.getState().updateCopyTradeConfig('w1', { dailyTradesUsed: 3, enabled: false })

      const config = useWatchlistStore.getState().copyTradeConfigs[0]
      expect(config.dailyTradesUsed).toBe(3)
      expect(config.enabled).toBe(false)
    })
  })

  describe('monitoring state', () => {
    it('toggles monitoring state', () => {
      useWatchlistStore.getState().setMonitoring(true)
      expect(useWatchlistStore.getState().isMonitoring).toBe(true)
      useWatchlistStore.getState().setMonitoring(false)
      expect(useWatchlistStore.getState().isMonitoring).toBe(false)
    })
  })
})
