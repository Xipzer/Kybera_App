/**
 * Code by Xipzer
 */

export interface TradeRecord {
  id: string
  walletAddress: string
  networkId: string
  tokenInAddress: string
  tokenInSymbol: string
  tokenInAmount: string
  tokenOutAddress: string
  tokenOutSymbol: string
  tokenOutAmount: string
  tokenInPriceUsd: number
  tokenOutPriceUsd: number
  totalValueUsd: number
  txHash: string
  timestamp: number
  source: 'swap' | 'ape' | 'manual' | 'copy_trade'
  researchId?: string
}

export interface PortfolioSnapshot {
  id: string
  walletAddress: string
  timestamp: number
  totalValueUsd: number
  networkBreakdown: {
    networkId: string
    valueUsd: number
  }[]
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
  totalBought: number
  totalSold: number
  currentBalance: string
  currentValueUsd: number
  currentPriceUsd: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  pnlPercent: number
  avgBuyPrice: number
  avgSellPrice: number
  buyCount: number
  sellCount: number
  firstTradeAt: number
  lastTradeAt: number
}

export interface PortfolioSummary {
  totalValueUsd: number
  totalPnl: number
  totalPnlPercent: number
  change1h?: number
  change24h?: number
  change7d?: number
  change30d?: number
  bestPerformer?: { symbol: string; pnlPercent: number }
  worstPerformer?: { symbol: string; pnlPercent: number }
  topHoldings: { symbol: string; percentage: number; valueUsd: number }[]
}

export type PortfolioTimeframe = '1h' | '24h' | '7d' | '30d' | '90d' | 'all'
