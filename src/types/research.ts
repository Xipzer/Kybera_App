/**
 * Code by Xipzer
 */

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

export type ResearchNetwork = 'base' | 'ethereum' | 'solana' | 'arbitrum' | 'optimism'

export interface DeveloperInfo {
  deployerAddress: string
  ensName?: string

  twitterHandle?: string
  twitterFollowers?: number
  linkedInUrl?: string

  moniScore?: number
  isDoxxed: boolean
  previousProjects?: string[]

  notableFollowers?: string[]
}

export interface HolderDistribution {
  totalHolders: number
  top10Percentage: number
  top20Percentage: number
  top50Percentage: number

  hasBotWarnings: boolean
  hasSnipersDetected: boolean

  deployerHoldingsPercentage: number
  isDeployerHoldingsLocked: boolean
  lockDuration?: string
}

export interface LiquidityInfo {
  totalLiquidityUsd: number
  isLiquidityLocked: boolean
  lockPlatform?: string
  lockExpiry?: Date
  liquidityPairs: {
    token: string
    dex: string
    liquidityUsd: number
  }[]
}

export interface DataSource {
  name:
    | 'arkham'
    | 'basescan'
    | 'etherscan'
    | 'dexscreener'
    | 'moni'
    | 'twitter'
    | 'linkedin'
    | 'polymarket'
    | 'other'
  url: string
  label: string
  timestamp: Date
}

export interface TokenResearch {
  id: string

  contractAddress: string
  network: ResearchNetwork
  tokenName: string
  tokenSymbol: string
  tokenLogo?: string

  marketCap: number
  price: number
  priceChange24h?: number
  volume24h?: number

  developer?: DeveloperInfo
  holderDistribution?: HolderDistribution
  liquidity?: LiquidityInfo

  pros: string[]
  cons: string[]
  rating: RiskRating

  timestamp: Date
  sources: DataSource[]

  status: 'pending' | 'researching' | 'completed' | 'failed'
  errorMessage?: string

  rawResponse?: string

  ratingReason?: string

  dismissed?: boolean
  traded?: boolean
  tradeAmount?: number
  tradeTxHash?: string
}

export interface ResearchRequest {
  contractAddress: string
  network: ResearchNetwork
  requestedAt: Date
}

export interface OpenClawMessage {
  type: 'research_request' | 'research_update' | 'research_complete' | 'chat' | 'error'
  payload: unknown
  timestamp: Date
  sessionId?: string
}

export interface OpenClawResearchUpdate {
  researchId: string
  status: TokenResearch['status']
  progress?: number
  currentStep?: string
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

export interface ResearchChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date

  isStreaming?: boolean

  researchId?: string
  researchSummary?: {
    tokenSymbol: string
    rating: RiskRating
    pros: string[]
    cons: string[]
  }
}

export interface ResearchSession {
  id: string
  createdAt: Date
  updatedAt: Date

  researches: TokenResearch[]

  messages: ResearchChatMessage[]

  isConnected: boolean
  lastPingAt?: Date
}