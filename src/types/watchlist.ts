/**
 * Code by Xipzer
 */

export type WatchedWalletTag = 'whale' | 'kol' | 'smart_money' | 'developer' | 'fund' | 'custom'

export interface WatchedWallet {
  id: string
  address: string
  label: string
  tags: WatchedWalletTag[]
  notes?: string
  // Tracking config
  networks: string[] // which networks to monitor
  trackSwaps: boolean
  trackTransfers: boolean
  trackApprovals: boolean
  minValueUsd: number // minimum transaction value to alert on
  // State
  addedAt: number
  lastCheckedAt?: number
  lastActivityAt?: number
}

export type ActivityType =
  | 'swap'
  | 'transfer_in'
  | 'transfer_out'
  | 'approval'
  | 'contract_interaction'
  | 'unknown'

export interface WalletActivity {
  id: string
  watchedWalletId: string
  walletAddress: string
  networkId: string
  // Transaction info
  txHash: string
  blockNumber: number
  timestamp: number
  // Activity classification
  activityType: ActivityType
  // For swaps
  tokenInSymbol?: string
  tokenInAddress?: string
  tokenInAmount?: string
  tokenOutSymbol?: string
  tokenOutAddress?: string
  tokenOutAmount?: string
  // For transfers
  counterpartyAddress?: string
  tokenSymbol?: string
  tokenAddress?: string
  amount?: string
  // Value
  estimatedValueUsd?: number
  // Raw
  methodId?: string
  methodName?: string
}

export interface CopyTradeConfig {
  enabled: boolean
  // Source
  watchedWalletId: string
  // Execution
  executionWalletId: string // which of the user's wallets to trade from
  executionNetworkId: string
  // Sizing
  sizeMode: 'fixed' | 'proportional' | 'percentage'
  fixedAmountUsd?: number // for fixed mode
  proportionalMultiplier?: number // for proportional mode (e.g., 0.1 = 10% of whale's trade size)
  maxTradeUsd: number // safety cap
  // Filters
  minWhaleTradeUsd: number // minimum whale trade size to copy
  tokenBlacklist: string[] // tokens to never copy
  tokenWhitelist: string[] // if set, only copy these tokens
  // Safety
  requireConfirmation: boolean // if true, asks user before executing
  maxDailyTrades: number
  dailyTradesUsed: number
  lastResetDate: string
}
