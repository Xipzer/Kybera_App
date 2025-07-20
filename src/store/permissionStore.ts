/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ActionPermissions } from '../types'

interface PermissionState extends ActionPermissions {
  trustAction: (actionName: string) => void
  untrustAction: (actionName: string) => void
  blockAction: (actionName: string) => void
  unblockAction: (actionName: string) => void
  setMaxTransferWithoutPassword: (amount: number) => void
  setDailyTransferLimit: (amount: number) => void
  recordTransfer: (amount: number) => void
  resetDailyLimit: () => void
  isActionTrusted: (actionName: string) => boolean
  isActionBlocked: (actionName: string) => boolean
  canTransferWithoutPassword: (amountUSD: number) => boolean
  canTransferToday: (amountUSD: number) => boolean
}

export const usePermissionStore = create<PermissionState>()(
  persist(
    (set, get) => ({
      trustedActions: [
        'list_wallets',
        'list_networks',
        'get_wallet_balance',
        'get_token_price',
        'get_transaction_history',
        'search_token',
        'estimate_gas',
        'get_swap_quote',
        'get_bridge_quote',
      ],
      maxTransferWithoutPassword: 0,
      dailyTransferLimit: 10000,
      dailyTransferUsed: 0,
      lastResetDate: new Date().toISOString().split('T')[0],
      blockedActions: [],

      trustAction: (actionName) => {
        set((state) => ({
          trustedActions: [...new Set([...state.trustedActions, actionName])],
        }))
      },

      untrustAction: (actionName) => {
        set((state) => ({
          trustedActions: state.trustedActions.filter((a) => a !== actionName),
        }))
      },

      blockAction: (actionName) => {
        set((state) => ({
          blockedActions: [...new Set([...state.blockedActions, actionName])],
        }))
      },

      unblockAction: (actionName) => {
        set((state) => ({
          blockedActions: state.blockedActions.filter((a) => a !== actionName),
        }))
      },

      setMaxTransferWithoutPassword: (amount) => {
        set({ maxTransferWithoutPassword: amount })
      },

      setDailyTransferLimit: (amount) => {
        set({ dailyTransferLimit: amount })
      },

      recordTransfer: (amount) => {
        const state = get()
        const today = new Date().toISOString().split('T')[0]

        if (state.lastResetDate !== today) {
          set({
            dailyTransferUsed: amount,
            lastResetDate: today,
          })
        } else {
          set({
            dailyTransferUsed: state.dailyTransferUsed + amount,
          })
        }
      },

      resetDailyLimit: () => {
        set({
          dailyTransferUsed: 0,
          lastResetDate: new Date().toISOString().split('T')[0],
        })
      },

      isActionTrusted: (actionName) => {
        return get().trustedActions.includes(actionName)
      },

      isActionBlocked: (actionName) => {
        return get().blockedActions.includes(actionName)
      },

      canTransferWithoutPassword: (amountUSD) => {
        const state = get()
        return amountUSD <= state.maxTransferWithoutPassword
      },

      canTransferToday: (amountUSD) => {
        const state = get()

        if (state.lastResetDate !== new Date().toISOString().split('T')[0]) {
          return amountUSD <= state.dailyTransferLimit
        }

        return state.dailyTransferUsed + amountUSD <= state.dailyTransferLimit
      },
    }),
    {
      name: 'permission-store',
    },
  ),
)