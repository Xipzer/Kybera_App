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
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  networkId: string
  apy: number
  apyBase: number
  apyReward: number
  rewardTokenSymbol?: string
  yieldType: YieldType
  tvl: number
  poolAddress: string
  isAudited: boolean
  riskLevel: 'low' | 'medium' | 'high'
  riskFactors: string[]
  minDeposit?: number
  maxDeposit?: number
  lockPeriod?: number
  withdrawalDelay?: number
  lastUpdated: number
}

export interface YieldPosition {
  id: string
  protocol: DeFiProtocol
  tokenAddress: string
  tokenSymbol: string
  networkId: string
  depositedAmount: string
  depositedValueUsd: number
  currentValueUsd: number
  earnedYield: number
  earnedYieldToken: string
  apy: number
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
