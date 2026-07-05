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
    | 'goplus'
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

  securityReport?: {
    riskScore: number
    riskFlags: string[]
    isHoneypot: boolean
    isMalicious: boolean
    riskSummary: string
  }

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

export interface ActionResultData {
  actionName: string
  success: boolean
  message: string
  data?: unknown
  error?: string
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

  actionResult?: ActionResultData
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

// ─── Structured UI Blocks ───────────────────────────────────────────────────
// The agent can emit ```kybera-ui fenced blocks containing structured JSON
// that the frontend parses and renders as dedicated React components.

export type KyberaUiBlockType =
  | 'token_summary'
  | 'wallet_overview'
  | 'swap_preview'
  | 'security_report'
  | 'risk_warning'
  | 'yield_summary'

export interface KyberaUiBlockBase {
  type: KyberaUiBlockType
}

export interface TokenSummaryBlock extends KyberaUiBlockBase {
  type: 'token_summary'
  data: {
    name: string
    symbol: string
    contractAddress?: string
    network?: string
    price?: number
    change24h?: number
    marketCap?: number
    volume24h?: number
    safetyRating?: 'safe' | 'caution' | 'danger' | 'unknown'
    safetyScore?: number
    holders?: number
    liquidity?: number
  }
}

export interface WalletOverviewBlock extends KyberaUiBlockBase {
  type: 'wallet_overview'
  data: {
    address: string
    totalValueUsd?: number
    chains?: { name: string; balanceUsd: number }[]
    activeAlerts?: number
    tokens?: { symbol: string; balance: number; valueUsd?: number }[]
  }
}

export interface SwapPreviewBlock extends KyberaUiBlockBase {
  type: 'swap_preview'
  data: {
    fromToken: string
    toToken: string
    fromAmount: number
    toAmount?: number
    rate?: number
    slippage?: number
    estimatedGasUsd?: number
    network: string
    dex?: string
    priceImpact?: number
    status?: 'preview' | 'pending' | 'confirmed'
  }
}

export interface SecurityReportBlock extends KyberaUiBlockBase {
  type: 'security_report'
  data: {
    symbol: string
    contractAddress: string
    network?: string
    riskScore: number
    isHoneypot: boolean
    isMalicious: boolean
    flags: { label: string; severity: 'safe' | 'caution' | 'danger' }[]
    summary?: string
  }
}

export interface RiskWarningBlock extends KyberaUiBlockBase {
  type: 'risk_warning'
  data: {
    severity: 'info' | 'warning' | 'critical'
    title: string
    message: string
  }
}

export interface YieldSummaryBlock extends KyberaUiBlockBase {
  type: 'yield_summary'
  data: {
    opportunities: {
      protocol: string
      asset: string
      apy: number
      tvl?: number
      risk: 'low' | 'medium' | 'high'
      network: string
    }[]
  }
}

export type KyberaUiBlock =
  | TokenSummaryBlock
  | WalletOverviewBlock
  | SwapPreviewBlock
  | SecurityReportBlock
  | RiskWarningBlock
  | YieldSummaryBlock