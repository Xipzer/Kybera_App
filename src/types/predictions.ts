/**
 * Code by Xipzer
 */

export interface PredictionMarket {
  id: string
  question: string
  description?: string
  // Outcomes
  outcomes: PredictionOutcome[]
  // Market data
  volume: number // total volume in USD
  liquidity: number // current liquidity in USD
  // Timing
  endDate: string // ISO timestamp
  createdAt: string
  // Status
  active: boolean
  closed: boolean
  resolved: boolean
  // Tags for matching to research topics
  tags: string[]
  // Source
  source: 'polymarket' | 'other'
  sourceUrl: string
}

export interface PredictionOutcome {
  id: string
  label: string // e.g. "Yes", "No", "ETH", "BTC"
  price: number // 0.00 to 1.00 (represents probability)
  // Interpretation
  probability: number // same as price, 0-100%
}

export interface PredictionMarketSentiment {
  query: string
  relevantMarkets: PredictionMarket[]
  overallSentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed'
  sentimentSummary: string // One-line summary for AI context
  dataTimestamp: number
}
