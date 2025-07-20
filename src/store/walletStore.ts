import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Wallet, Network, Transaction } from '../types'
import { EVM_NETWORKS } from '../utils/networks'
import { db } from '../services/storage/database'

interface WalletState {
  wallets: Wallet[]
  activeWalletId: string | null
  activeNetwork: Network
  isLocked: boolean
  password: string | null
  transactions: Transaction[]

  // Actions
  addWallet: (wallet: Wallet) => Promise<void>
  removeWallet: (id: string) => Promise<void>
  setActiveWallet: (id: string) => void
  setActiveNetwork: (network: Network) => void
  lock: () => void
  unlock: (password: string) => void
  loadWallets: () => Promise<void>
  updateWallet: (id: string, updates: Partial<Wallet>) => Promise<void>
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set) => ({
      wallets: [],
      activeWalletId: null,
      activeNetwork: EVM_NETWORKS[0],
      isLocked: true,
      password: null,
      transactions: [],

      addWallet: async (wallet) => {
        await db.wallets.add({
          ...wallet,
          createdAt: wallet.createdAt.getTime(),
        })
        set((state) => ({
          wallets: [...state.wallets, wallet],
        }))
      },

      removeWallet: async (id) => {
        await db.wallets.delete(id)
        set((state) => ({
          wallets: state.wallets.filter((w) => w.id !== id),
          activeWalletId: state.activeWalletId === id ? null : state.activeWalletId,
        }))
      },

      setActiveWallet: (id) => {
        set({ activeWalletId: id })
      },

      setActiveNetwork: (network) => {
        set({ activeNetwork: network })
      },

      lock: () => {
        set({ isLocked: true, password: null })
      },

      unlock: (password) => {
        set({ isLocked: false, password })
      },

      loadWallets: async () => {
        const storedWallets = await db.wallets.toArray()
        const wallets = storedWallets.map((w) => ({
          ...w,
          createdAt: new Date(w.createdAt),
        }))
        set({ wallets })
      },

      updateWallet: async (id, updates) => {
        const updateData: any = {}
        if (updates.createdAt) {
          updateData.createdAt = updates.createdAt.getTime()
        }
        Object.keys(updates).forEach((key) => {
          if (key !== 'createdAt') {
            updateData[key] = (updates as any)[key]
          }
        })
        await db.wallets.update(id, updateData)
        set((state) => ({
          wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }))
      },
    }),
    {
      name: 'wallet-store',
      partialize: (state) => ({
        activeWalletId: state.activeWalletId,
        activeNetwork: state.activeNetwork,
      }),
    },
  ),
)