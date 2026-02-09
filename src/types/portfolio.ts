/**
 * Code by Xipzer
 */

export interface TradeRecord {
  id: string
  walletAddress: string
  networkId: string
  // What was traded
  tokenInAddress: string
  tokenInSymbol: string
  tokenInAmount: string
  // What was received
  tokenOutAddress: string
  tokenOutSymbol: string
  tokenOutAmount: string
  // Prices at time of trade
  tokenInPriceUsd: number
  tokenOutPriceUsd: number
  totalValueUsd: number
  // Metadata
  txHash: string
  timestamp: number
  source: 'swap' | 'ape' | 'manual' | 'copy_trade'
  researchId?: string // Link to research if trade originated from research
}

export interface PortfolioSnapshot {
  id: string
  walletAddress: string
  timestamp: number
  totalValueUsd: number
  // Per-network breakdown
  networkBreakdown: {
    networkId: string
    valueUsd: number
  }[]
  // Per-token breakdown (top 20 by value)
  tokenBreakdown: {
    tokenAddress: string
    symbol: string
    networkId: string
    balance: string
    valueUsd: number
    priceUsd: number
  }[]
}

export interface TokenPnL {
  tokenAddress: string
  tokenSymbol: string
  networkId: string
  // Cost basis
  totalBought: number // total USD spent buying this token
  totalSold: number // total USD received selling this token
  // Current position
  currentBalance: string
  currentValueUsd: number
  currentPriceUsd: number
  // P&L
  realizedPnl: number // totalSold - portion of totalBought
  unrealizedPnl: number // currentValue - remaining cost basis
  totalPnl: number // realized + unrealized
  pnlPercent: number // totalPnl / totalBought * 100
  // Averages
  avgBuyPrice: number
  avgSellPrice: number
  // Trade count
  buyCount: number
  sellCount: number
  firstTradeAt: number
  lastTradeAt: number
}

export interface PortfolioSummary {
  totalValueUsd: number
  totalPnl: number
  totalPnlPercent: number
  // Time-based changes
  change1h?: number
  change24h?: number
  change7d?: number
  change30d?: number
  // Best/worst performers
  bestPerformer?: { symbol: string; pnlPercent: number }
  worstPerformer?: { symbol: string; pnlPercent: number }
  // Allocation
  topHoldings: { symbol: string; percentage: number; valueUsd: number }[]
}

export type PortfolioTimeframe = '1h' | '24h' | '7d' | '30d' | '90d' | 'all'
