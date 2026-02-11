/**
 * Code by Xipzer
 */

export interface PredictionMarket {
  id: string
  question: string
  description?: string
  outcomes: PredictionOutcome[]
  volume: number
  liquidity: number
  endDate: string
  createdAt: string
  active: boolean
  closed: boolean
  resolved: boolean
  tags: string[]
  source: 'polymarket' | 'other'
  sourceUrl: string
}

export interface PredictionOutcome {
  id: string
  label: string
  price: number
  probability: number
}

export interface PredictionMarketSentiment {
  query: string
  relevantMarkets: PredictionMarket[]
  overallSentiment: 'bullish' | 'bearish' | 'neutral' | 'mixed'
  sentimentSummary: string
  dataTimestamp: number
}
