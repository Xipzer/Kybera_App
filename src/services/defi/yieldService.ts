/**
 * Code by Xipzer
 */

import { DeFiProtocol, YieldOpportunity, YieldSearchParams, YieldType } from '../../types/defi'

const LLAMA_CHAIN_NAMES: Record<string, string> = {
  base: 'Base',
  ethereum: 'Ethereum',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  solana: 'Solana',
}

const LLAMA_PROJECT_TO_PROTOCOL: Record<string, DeFiProtocol> = {
  'aave-v3': 'aave_v3',
  'morpho': 'morpho',
  'lido': 'lido',
  'aerodrome-v2': 'aerodrome',
  'compound-v3': 'compound_v3',
}

const PROTOCOL_DISPLAY_NAMES: Record<DeFiProtocol, string> = {
  aave_v3: 'Aave V3',
  morpho: 'Morpho',
  lido: 'Lido',
  aerodrome: 'Aerodrome',
  compound_v3: 'Compound V3',
}

const LOW_RISK_PROTOCOLS: DeFiProtocol[] = ['aave_v3', 'lido', 'compound_v3']

const CHAIN_NAME_TO_NETWORK_ID: Record<string, string> = Object.fromEntries(
  Object.entries(LLAMA_CHAIN_NAMES).map(([networkId, chainName]) => [chainName, networkId])
)

const CACHE_TTL_MS = 10 * 60 * 1000

interface LlamaPool {
  pool: string
  chain: string
  project: string
  symbol: string
  tvlUsd: number
  apy: number | null
  apyBase: number | null
  apyReward: number | null
  rewardTokens: string[] | null
  underlyingTokens: string[] | null
  poolMeta: string | null
  il7d: number | null
  apyBase7d: number | null
  apyMean30d: number | null
  volumeUsd1d: number | null
  volumeUsd7d: number | null
  apyBaseInception: number | null
  stablecoin: boolean
  ilRisk: string | null
  exposure: string | null
  predictions: Record<string, unknown> | null
  mu: number | null
  sigma: number | null
  count: number | null
  outlier: boolean | null
  category: string | null
}

interface CachedData {
  pools: LlamaPool[]
  fetchedAt: number
}

function classifyYieldType(pool: LlamaPool): YieldType {
  const project = pool.project?.toLowerCase() || ''
  const category = pool.category?.toLowerCase() || ''

  if (project === 'lido' || category.includes('staking') || category === 'liquid staking') {
    return 'staking'
  }
  if (project.includes('aerodrome') || category.includes('dex') || category === 'liquidity pool') {
    return 'liquidity_provision'
  }
  if (category.includes('vault') || category === 'yield') {
    return 'vault'
  }
  return 'lending'
}

function classifyRisk(protocol: DeFiProtocol | null, tvl: number): 'low' | 'medium' | 'high' {
  if (protocol && LOW_RISK_PROTOCOLS.includes(protocol) && tvl > 100_000_000) {
    return 'low'
  }
  if (protocol && tvl >= 10_000_000) {
    return 'medium'
  }
  return 'high'
}

function getRiskFactors(
  protocol: DeFiProtocol | null,
  tvl: number,
  apy: number,
  yieldType: YieldType
): string[] {
  const factors: string[] = []

  if (tvl < 10_000_000) factors.push('Low TVL (under $10M)')
  if (tvl < 1_000_000) factors.push('Very low TVL (under $1M)')
  if (apy > 50) factors.push('Unusually high APY — may be unsustainable')
  if (apy > 100) factors.push('Extremely high APY — likely includes short-term incentives')
  if (!protocol) factors.push('Protocol not in curated list')
  if (yieldType === 'liquidity_provision') factors.push('Impermanent loss risk')

  return factors
}

const RISK_SORT_ORDER: Record<string, number> = { low: 0, medium: 1, high: 2 }

class YieldService {
  private cache: CachedData | null = null

  private isCacheValid(): boolean {
    return !!this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS
  }

  private async fetchPools(): Promise<LlamaPool[]> {
    if (this.isCacheValid()) {
      return this.cache!.pools
    }

    const response = await fetch('https://yields.llama.fi/pools')
    if (!response.ok) {
      throw new Error(`DeFiLlama API error: ${response.status} ${response.statusText}`)
    }

    const json = (await response.json()) as { data: LlamaPool[] }
    this.cache = { pools: json.data, fetchedAt: Date.now() }
    return json.data
  }

  private mapPoolToOpportunity(pool: LlamaPool): YieldOpportunity | null {
    const protocol = LLAMA_PROJECT_TO_PROTOCOL[pool.project] || null
    if (!protocol) return null

    const networkId = CHAIN_NAME_TO_NETWORK_ID[pool.chain]
    if (!networkId) return null

    const apy = pool.apy ?? 0
    const apyBase = pool.apyBase ?? 0
    const apyReward = pool.apyReward ?? 0
    const tvl = pool.tvlUsd ?? 0

    if (apy <= 0) return null

    const yieldType = classifyYieldType(pool)
    const riskLevel = classifyRisk(protocol, tvl)
    const riskFactors = getRiskFactors(protocol, tvl, apy, yieldType)

    const tokenSymbol = pool.symbol?.split('-')[0] || pool.symbol || 'UNKNOWN'

    return {
      id: pool.pool,
      protocol,
      protocolName: PROTOCOL_DISPLAY_NAMES[protocol],
      tokenAddress: pool.underlyingTokens?.[0] || '',
      tokenSymbol,
      tokenDecimals: 18,
      networkId,
      apy,
      apyBase,
      apyReward,
      rewardTokenSymbol: pool.rewardTokens?.[0] || undefined,
      yieldType,
      tvl,
      poolAddress: pool.pool,
      isAudited: true,
      riskLevel,
      riskFactors,
      lockPeriod: 0,
      withdrawalDelay: 0,
      lastUpdated: Date.now(),
    }
  }

  private filterOpportunities(
    opportunities: YieldOpportunity[],
    params?: YieldSearchParams
  ): YieldOpportunity[] {
    let filtered = opportunities

    if (params?.networkId) {
      filtered = filtered.filter((o) => o.networkId === params.networkId)
    }

    if (params?.tokenSymbol) {
      const symbol = params.tokenSymbol.toUpperCase()
      filtered = filtered.filter((o) => o.tokenSymbol.toUpperCase().includes(symbol))
    }

    if (params?.minApy !== undefined) {
      filtered = filtered.filter((o) => o.apy >= params.minApy!)
    }

    if (params?.maxRisk) {
      const maxOrder = RISK_SORT_ORDER[params.maxRisk]
      filtered = filtered.filter((o) => RISK_SORT_ORDER[o.riskLevel] <= maxOrder)
    }

    if (params?.yieldType) {
      filtered = filtered.filter((o) => o.yieldType === params.yieldType)
    }

    const sortBy = params?.sortBy || 'apy'
    if (sortBy === 'apy') {
      filtered.sort((a, b) => b.apy - a.apy)
    } else if (sortBy === 'tvl') {
      filtered.sort((a, b) => b.tvl - a.tvl)
    } else if (sortBy === 'risk') {
      filtered.sort((a, b) => RISK_SORT_ORDER[a.riskLevel] - RISK_SORT_ORDER[b.riskLevel])
    }

    const limit = params?.limit || 20
    return filtered.slice(0, limit)
  }

  async getYieldOpportunities(params?: YieldSearchParams): Promise<YieldOpportunity[]> {
    const pools = await this.fetchPools()
    const opportunities = pools
      .map((p) => this.mapPoolToOpportunity(p))
      .filter((o): o is YieldOpportunity => o !== null)

    return this.filterOpportunities(opportunities, params)
  }

  async getTopYields(networkId: string, limit: number = 5): Promise<YieldOpportunity[]> {
    return this.getYieldOpportunities({
      networkId,
      sortBy: 'apy',
      limit,
    })
  }

  async getYieldForToken(tokenSymbol: string, networkId?: string): Promise<YieldOpportunity[]> {
    return this.getYieldOpportunities({
      tokenSymbol,
      networkId,
      sortBy: 'apy',
      limit: 20,
    })
  }

  async getProtocolYields(protocol: DeFiProtocol): Promise<YieldOpportunity[]> {
    const pools = await this.fetchPools()
    const protocolProject = Object.entries(LLAMA_PROJECT_TO_PROTOCOL).find(
      ([, p]) => p === protocol
    )?.[0]

    if (!protocolProject) return []

    const opportunities = pools
      .filter((p) => p.project === protocolProject)
      .map((p) => this.mapPoolToOpportunity(p))
      .filter((o): o is YieldOpportunity => o !== null)
      .sort((a, b) => b.apy - a.apy)

    return opportunities
  }

  async refreshYieldData(): Promise<void> {
    this.cache = null
    await this.fetchPools()
  }
}

export const yieldService = new YieldService()
