/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { X402PaymentRecord, X402SpendingConfig } from '../types/x402'

const MAX_PAYMENT_HISTORY = 200

interface X402State {
  config: X402SpendingConfig
  paymentHistory: X402PaymentRecord[]
  isProcessingPayment: boolean

  setEnabled: (enabled: boolean) => void
  setMaxPerRequest: (amount: number) => void
  setDailyBudget: (amount: number) => void
  setPaymentWallet: (walletId: string) => void
  addApprovedDomain: (domain: string) => void
  removeApprovedDomain: (domain: string) => void
  addBlockedDomain: (domain: string) => void
  removeBlockedDomain: (domain: string) => void
  recordPayment: (record: X402PaymentRecord) => void
  resetDaily: () => void
  setIsProcessingPayment: (processing: boolean) => void
  getSpendingSummary: () => {
    todaySpent: number
    todayBudget: number
    lifetimeSpent: number
    paymentCount: number
  }
}

export const useX402Store = create<X402State>()(
  persist(
    (set, get) => ({
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

      setEnabled: (enabled: boolean) => {
        set((state) => ({
          config: { ...state.config, enabled },
        }))
      },

      setMaxPerRequest: (amount: number) => {
        set((state) => ({
          config: { ...state.config, maxPerRequestUsd: amount },
        }))
      },

      setDailyBudget: (amount: number) => {
        set((state) => ({
          config: { ...state.config, dailyBudgetUsd: amount },
        }))
      },

      setPaymentWallet: (walletId: string) => {
        set((state) => ({
          config: { ...state.config, paymentWalletId: walletId },
        }))
      },

      addApprovedDomain: (domain: string) => {
        set((state) => ({
          config: {
            ...state.config,
            approvedDomains: [...new Set([...state.config.approvedDomains, domain])],
          },
        }))
      },

      removeApprovedDomain: (domain: string) => {
        set((state) => ({
          config: {
            ...state.config,
            approvedDomains: state.config.approvedDomains.filter((d) => d !== domain),
          },
        }))
      },

      addBlockedDomain: (domain: string) => {
        set((state) => ({
          config: {
            ...state.config,
            blockedDomains: [...new Set([...state.config.blockedDomains, domain])],
          },
        }))
      },

      removeBlockedDomain: (domain: string) => {
        set((state) => ({
          config: {
            ...state.config,
            blockedDomains: state.config.blockedDomains.filter((d) => d !== domain),
          },
        }))
      },

      recordPayment: (record: X402PaymentRecord) => {
        set((state) => {
          const today = new Date().toISOString().split('T')[0]
          const isNewDay = state.config.lastResetDate !== today

          const updatedHistory = [record, ...state.paymentHistory].slice(0, MAX_PAYMENT_HISTORY)

          const dailySpentUsd = isNewDay
            ? record.amountUsd
            : state.config.dailySpentUsd + record.amountUsd

          return {
            paymentHistory: updatedHistory,
            config: {
              ...state.config,
              dailySpentUsd,
              lastResetDate: today,
              totalLifetimeSpentUsd: state.config.totalLifetimeSpentUsd + record.amountUsd,
              totalPaymentCount: state.config.totalPaymentCount + 1,
            },
          }
        })
      },

      resetDaily: () => {
        set((state) => ({
          config: {
            ...state.config,
            dailySpentUsd: 0,
            lastResetDate: new Date().toISOString().split('T')[0],
          },
        }))
      },

      setIsProcessingPayment: (processing: boolean) => {
        set({ isProcessingPayment: processing })
      },

      getSpendingSummary: () => {
        const { config } = get()
        const today = new Date().toISOString().split('T')[0]
        const todaySpent = config.lastResetDate === today ? config.dailySpentUsd : 0

        return {
          todaySpent,
          todayBudget: config.dailyBudgetUsd,
          lifetimeSpent: config.totalLifetimeSpentUsd,
          paymentCount: config.totalPaymentCount,
        }
      },
    }),
    {
      name: 'x402-store',
      partialize: (state) => ({
        config: state.config,
        paymentHistory: state.paymentHistory,
      }),
    },
  ),
)
