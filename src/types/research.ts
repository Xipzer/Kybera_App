/**
 * Token Research Types
 * Types for AI-powered token research and analysis
 */

// Risk rating levels with emoji representation
export type RiskRating = 'green' | 'orange' | 'yellow' | 'red'

export const RISK_RATING_CONFIG: Record<
  RiskRating,
  { emoji: string; label: string; color: string; bgColor: string }
> = {
  green: { emoji: '🟩', label: 'SAFE', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  yellow: {
    emoji: '🟨',
    label: 'POTENTIAL',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
  },
  orange: {
    emoji: '🟧',
    label: 'HIGH RISK',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
  },
  red: { emoji: '🟥', label: 'AVOID', color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

// Supported networks for research
export type ResearchNetwork = 'base' | 'ethereum' | 'solana' | 'arbitrum' | 'optimism'

// Developer information from OSINT research
export interface DeveloperInfo {
  // Wallet info
  deployerAddress: string
  ensName?: string

  // Social presence
  twitterHandle?: string
  twitterFollowers?: number
  linkedInUrl?: string

  // Credibility metrics
  moniScore?: number // KOL score from Moni
  isDoxxed: boolean
  previousProjects?: string[]

  // KOL followers (notable accounts following this dev)
  notableFollowers?: string[]
}

// Token holder distribution analysis
export interface HolderDistribution {
  totalHolders: number
  top10Percentage: number // Percentage held by top 10 wallets
  top20Percentage: number
  top50Percentage: number

  // Warnings
  hasBotWarnings: boolean
  hasSnipersDetected: boolean

  // Deployer holdings
  deployerHoldingsPercentage: number
  isDeployerHoldingsLocked: boolean
  lockDuration?: string // e.g., "6 months", "1 year"
}

// Liquidity information
export interface LiquidityInfo {
  totalLiquidityUsd: number
  isLiquidityLocked: boolean
  lockPlatform?: string // e.g., "Uncx", "Team Finance"
  lockExpiry?: Date
  liquidityPairs: {
    token: string
    dex: string
    liquidityUsd: number
  }[]
}

// Data source used in research
export interface DataSource {
  name:
    | 'arkham'
    | 'basescan'
    | 'etherscan'
    | 'dexscreener'
    | 'moni'
    | 'twitter'
    | 'linkedin'
    | 'other'
  url: string
  label: string
  timestamp: Date
}

// Main token research result
export interface TokenResearch {
  id: string

  // Token identification
  contractAddress: string
  network: ResearchNetwork
  tokenName: string
  tokenSymbol: string

  // Market data
  marketCap: number
  price: number
  priceChange24h?: number
  volume24h?: number

  // Research findings
  developer?: DeveloperInfo
  holderDistribution?: HolderDistribution
  liquidity?: LiquidityInfo

  // Analysis summary
  pros: string[]
  cons: string[]
  rating: RiskRating

  // Metadata
  timestamp: Date
  sources: DataSource[]

  // Research status
  status: 'pending' | 'researching' | 'completed' | 'failed'
  errorMessage?: string

  // User actions
  dismissed?: boolean // User clicked "Fade"
  traded?: boolean // User clicked "Ape"
  tradeAmount?: number
  tradeTxHash?: string
}

// Research request sent to OpenClaw
export interface ResearchRequest {
  contractAddress: string
  network: ResearchNetwork
  requestedAt: Date
}

// OpenClaw WebSocket message types
export interface OpenClawMessage {
  type: 'research_request' | 'research_update' | 'research_complete' | 'chat' | 'error'
  payload: unknown
  timestamp: Date
  sessionId?: string
}

export interface OpenClawResearchUpdate {
  researchId: string
  status: TokenResearch['status']
  progress?: number // 0-100
  currentStep?: string // e.g., "Analyzing holder distribution..."
  partialData?: Partial<TokenResearch>
}

export interface OpenClawResearchComplete {
  researchId: string
  research: TokenResearch
}

export interface OpenClawError {
  code: string
  message: string
  researchId?: string
}

// Chat message with potential research context
export interface ResearchChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date

  // Streaming state
  isStreaming?: boolean

  // Research context
  researchId?: string
  researchSummary?: {
    tokenSymbol: string
    rating: RiskRating
    pros: string[]
    cons: string[]
  }
}

// Research session state
export interface ResearchSession {
  id: string
  createdAt: Date
  updatedAt: Date

  // Active researches
  researches: TokenResearch[]

  // Chat history
  messages: ResearchChatMessage[]

  // Session status
  isConnected: boolean
  lastPingAt?: Date
}
