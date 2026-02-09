/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TradeRecord, TokenPnL, PortfolioSummary } from '../types/portfolio'
import { portfolioService } from '../services/portfolioService'

interface PortfolioState {
  trades: TradeRecord[]
  currentSummary: PortfolioSummary | null
  tokenPnLs: Map<string, TokenPnL>
  isCalculating: boolean
  lastUpdated: number | null

  recordTrade: (trade: Omit<TradeRecord, 'id'>) => Promise<void>
  refreshSummary: (walletAddress: string) => Promise<void>
  refreshTokenPnL: (
    walletAddress: string,
    tokenAddress: string,
    networkId: string,
  ) => Promise<void>
  loadTradeHistory: (walletAddress: string) => Promise<void>
  clearAll: () => void
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, _get) => ({
      trades: [],
      currentSummary: null,
      tokenPnLs: new Map(),
      isCalculating: false,
      lastUpdated: null,

      recordTrade: async (trade) => {
        const recorded = await portfolioService.recordTrade(trade)

        set((state) => {
          const updated = [recorded, ...state.trades].slice(0, 100)
          return { trades: updated, lastUpdated: Date.now() }
        })
      },

      refreshSummary: async (walletAddress) => {
        set({ isCalculating: true })
        try {
          const summary = await portfolioService.getPortfolioSummary(walletAddress)
          set({ currentSummary: summary, isCalculating: false, lastUpdated: Date.now() })
        } catch (error) {
          console.error('[PortfolioStore] Failed to refresh summary:', error)
          set({ isCalculating: false })
        }
      },

      refreshTokenPnL: async (walletAddress, tokenAddress, networkId) => {
        try {
          const pnl = await portfolioService.calculateTokenPnL(
            walletAddress,
            tokenAddress,
            networkId,
          )
          set((state) => {
            const updated = new Map(state.tokenPnLs)
            updated.set(`${networkId}:${tokenAddress}`, pnl)
            return { tokenPnLs: updated, lastUpdated: Date.now() }
          })
        } catch (error) {
          console.error('[PortfolioStore] Failed to refresh token P&L:', error)
        }
      },

      loadTradeHistory: async (walletAddress) => {
        try {
          const trades = await portfolioService.getTradeHistory(walletAddress, { limit: 100 })
          set({ trades, lastUpdated: Date.now() })
        } catch (error) {
          console.error('[PortfolioStore] Failed to load trade history:', error)
        }
      },

      clearAll: () => {
        set({
          trades: [],
          currentSummary: null,
          tokenPnLs: new Map(),
          isCalculating: false,
          lastUpdated: null,
        })
      },
    }),
    {
      name: 'portfolio-store',
      partialize: (state) => ({
        lastUpdated: state.lastUpdated,
      }),
    },
  ),
)
