/**
 * Code by Xipzer
 */

export type DeFiProtocol = 'aave_v3' | 'morpho' | 'lido' | 'aerodrome' | 'compound_v3'

export type YieldType = 'lending' | 'staking' | 'liquidity_provision' | 'vault'

export interface YieldOpportunity {
  id: string
  protocol: DeFiProtocol
  protocolName: string
  protocolLogoUrl?: string
  // What to deposit
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  networkId: string
  // Yield info
  apy: number // annual percentage yield
  apyBase: number // base APY without rewards
  apyReward: number // reward token APY
  rewardTokenSymbol?: string
  yieldType: YieldType
  // Pool info
  tvl: number // total value locked in USD
  poolAddress: string
  // Risk
  isAudited: boolean
  riskLevel: 'low' | 'medium' | 'high'
  riskFactors: string[]
  // Limits
  minDeposit?: number // in token units
  maxDeposit?: number
  // Additional info
  lockPeriod?: number // in days, 0 = no lock
  withdrawalDelay?: number // in days
  lastUpdated: number
}

export interface YieldPosition {
  id: string
  protocol: DeFiProtocol
  tokenAddress: string
  tokenSymbol: string
  networkId: string
  // Position data
  depositedAmount: string
  depositedValueUsd: number
  currentValueUsd: number
  earnedYield: number // in USD
  earnedYieldToken: string // in token units
  apy: number
  // Tracking
  depositTxHash: string
  depositTimestamp: number
  lastUpdated: number
}

export interface DeFiAction {
  type: 'deposit' | 'withdraw' | 'claim_rewards'
  protocol: DeFiProtocol
  tokenAddress: string
  tokenSymbol: string
  networkId: string
  amount: string
  poolAddress: string
  // For UI
  estimatedGasUsd?: number
  estimatedApy?: number
}

export interface YieldSearchParams {
  networkId?: string
  tokenSymbol?: string
  minApy?: number
  maxRisk?: 'low' | 'medium' | 'high'
  yieldType?: YieldType
  sortBy?: 'apy' | 'tvl' | 'risk'
  limit?: number
}
