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
  networks: string[]
  trackSwaps: boolean
  trackTransfers: boolean
  trackApprovals: boolean
  minValueUsd: number
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
  txHash: string
  blockNumber: number
  timestamp: number
  activityType: ActivityType
  tokenInSymbol?: string
  tokenInAddress?: string
  tokenInAmount?: string
  tokenOutSymbol?: string
  tokenOutAddress?: string
  tokenOutAmount?: string
  counterpartyAddress?: string
  tokenSymbol?: string
  tokenAddress?: string
  amount?: string
  estimatedValueUsd?: number
  methodId?: string
  methodName?: string
}

export interface CopyTradeConfig {
  enabled: boolean
  watchedWalletId: string
  executionWalletId: string
  executionNetworkId: string
  sizeMode: 'fixed' | 'proportional' | 'percentage'
  fixedAmountUsd?: number
  proportionalMultiplier?: number
  maxTradeUsd: number
  minWhaleTradeUsd: number
  tokenBlacklist: string[]
  tokenWhitelist: string[]
  requireConfirmation: boolean
  maxDailyTrades: number
  dailyTradesUsed: number
  lastResetDate: string
}
