/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchedWallet, WalletActivity, CopyTradeConfig } from '../types/watchlist'

interface WatchlistState {
  watchedWallets: WatchedWallet[]
  activities: WalletActivity[] // last 500 activities across all watched wallets
  copyTradeConfigs: CopyTradeConfig[]
  isMonitoring: boolean

  // Wallet actions
  addWallet: (wallet: Omit<WatchedWallet, 'id' | 'addedAt'>) => string
  removeWallet: (id: string) => void
  updateWallet: (id: string, updates: Partial<WatchedWallet>) => void

  // Activity actions
  addActivity: (activity: Omit<WalletActivity, 'id'>) => void
  clearActivities: (watchedWalletId?: string) => void

  // Copy trade actions
  addCopyTradeConfig: (config: Omit<CopyTradeConfig, 'dailyTradesUsed' | 'lastResetDate'>) => void
  removeCopyTradeConfig: (watchedWalletId: string) => void
  updateCopyTradeConfig: (watchedWalletId: string, updates: Partial<CopyTradeConfig>) => void

  // Queries
  getWalletByAddress: (address: string) => WatchedWallet | undefined
  getActivitiesForWallet: (watchedWalletId: string, limit?: number) => WalletActivity[]

  // Monitoring state
  setMonitoring: (isMonitoring: boolean) => void
}

const MAX_ACTIVITIES = 500

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      watchedWallets: [],
      activities: [],
      copyTradeConfigs: [],
      isMonitoring: false,

      addWallet: (wallet) => {
        const id = crypto.randomUUID()
        const newWallet: WatchedWallet = {
          ...wallet,
          id,
          addedAt: Date.now(),
        }
        set((state) => ({
          watchedWallets: [...state.watchedWallets, newWallet],
        }))
        return id
      },

      removeWallet: (id) => {
        set((state) => ({
          watchedWallets: state.watchedWallets.filter((w) => w.id !== id),
          activities: state.activities.filter((a) => a.watchedWalletId !== id),
          copyTradeConfigs: state.copyTradeConfigs.filter((c) => c.watchedWalletId !== id),
        }))
      },

      updateWallet: (id, updates) => {
        set((state) => ({
          watchedWallets: state.watchedWallets.map((w) =>
            w.id === id ? { ...w, ...updates } : w,
          ),
        }))
      },

      addActivity: (activity) => {
        const id = crypto.randomUUID()
        const newActivity: WalletActivity = { ...activity, id }
        set((state) => ({
          activities: [newActivity, ...state.activities].slice(0, MAX_ACTIVITIES),
        }))
      },

      clearActivities: (watchedWalletId) => {
        set((state) => ({
          activities: watchedWalletId
            ? state.activities.filter((a) => a.watchedWalletId !== watchedWalletId)
            : [],
        }))
      },

      addCopyTradeConfig: (config) => {
        const newConfig: CopyTradeConfig = {
          ...config,
          dailyTradesUsed: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
        }
        set((state) => ({
          copyTradeConfigs: [...state.copyTradeConfigs, newConfig],
        }))
      },

      removeCopyTradeConfig: (watchedWalletId) => {
        set((state) => ({
          copyTradeConfigs: state.copyTradeConfigs.filter(
            (c) => c.watchedWalletId !== watchedWalletId,
          ),
        }))
      },

      updateCopyTradeConfig: (watchedWalletId, updates) => {
        set((state) => ({
          copyTradeConfigs: state.copyTradeConfigs.map((c) =>
            c.watchedWalletId === watchedWalletId ? { ...c, ...updates } : c,
          ),
        }))
      },

      getWalletByAddress: (address) => {
        return get().watchedWallets.find(
          (w) => w.address.toLowerCase() === address.toLowerCase(),
        )
      },

      getActivitiesForWallet: (watchedWalletId, limit) => {
        const activities = get().activities.filter(
          (a) => a.watchedWalletId === watchedWalletId,
        )
        return limit ? activities.slice(0, limit) : activities
      },

      setMonitoring: (isMonitoring) => {
        set({ isMonitoring })
      },
    }),
    {
      name: 'watchlist-store',
      partialize: (state) => ({
        watchedWallets: state.watchedWallets,
        copyTradeConfigs: state.copyTradeConfigs,
      }),
    },
  ),
)
