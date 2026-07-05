/**
 * Code by Xipzer
 */

import { ToolDefinition, ActionResult } from '../agentActions'
import { yieldService } from './yieldService'
import { YieldOpportunity, YieldSearchParams } from '../../types/defi'

function formatTvl(tvl: number): string {
  if (tvl >= 1_000_000_000) return `$${(tvl / 1_000_000_000).toFixed(2)}B`
  if (tvl >= 1_000_000) return `$${(tvl / 1_000_000).toFixed(2)}M`
  if (tvl >= 1_000) return `$${(tvl / 1_000).toFixed(1)}K`
  return `$${tvl.toFixed(0)}`
}

function formatApy(apy: number): string {
  return `${apy.toFixed(2)}%`
}

function formatOpportunity(o: YieldOpportunity): Record<string, unknown> {
  return {
    id: o.id,
    protocol: o.protocolName,
    token: o.tokenSymbol,
    network: o.networkId,
    apy: o.apy,
    apyBase: o.apyBase,
    apyReward: o.apyReward,
    tvl: formatTvl(o.tvl),
    riskLevel: o.riskLevel,
    yieldType: o.yieldType,
    riskFactors: o.riskFactors,
    poolAddress: o.poolAddress,
  }
}

function buildSummaryMessage(opportunities: YieldOpportunity[], context: string): string {
  if (opportunities.length === 0) {
    return `No yield opportunities found ${context}.`
  }

  const lines = [`Found ${opportunities.length} yield opportunities ${context}:\n`]

  lines.push('| Protocol | Token | Network | APY | TVL | Risk |')
  lines.push('|----------|-------|---------|-----|-----|------|')

  for (const o of opportunities) {
    lines.push(
      `| ${o.protocolName} | ${o.tokenSymbol} | ${o.networkId} | ${formatApy(o.apy)} | ${formatTvl(o.tvl)} | ${o.riskLevel} |`
    )
  }

  return lines.join('\n')
}

export const YIELD_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'search_yield_opportunities',
    description:
      'Search for DeFi yield opportunities across protocols. Can filter by network, token, minimum APY, and risk level.',
    parameters: {
      type: 'object',
      properties: {
        networkId: {
          type: 'string',
          description: 'Network to search on',
          enum: ['base', 'ethereum', 'solana', 'arbitrum', 'optimism'],
        },
        tokenSymbol: {
          type: 'string',
          description: 'Token symbol to find yield for (e.g., USDC, ETH, WETH)',
        },
        minApy: { type: 'number', description: 'Minimum APY percentage (e.g., 5 for 5%)' },
        maxRisk: {
          type: 'string',
          description: 'Maximum risk level',
          enum: ['low', 'medium', 'high'],
        },
        sortBy: {
          type: 'string',
          description: 'Sort results by',
          enum: ['apy', 'tvl', 'risk'],
        },
        limit: { type: 'number', description: 'Max results to return (default 10)' },
      },
      required: [],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_top_yields',
    description:
      'Get the highest-yielding opportunities on a specific network. Returns sorted by APY.',
    parameters: {
      type: 'object',
      properties: {
        networkId: {
          type: 'string',
          description: 'Network to get top yields for',
          enum: ['base', 'ethereum', 'solana', 'arbitrum', 'optimism'],
        },
        limit: { type: 'number', description: 'Number of results (default 5)' },
      },
      required: ['networkId'],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
  {
    name: 'get_yield_for_token',
    description:
      'Find all yield opportunities for a specific token across protocols and networks.',
    parameters: {
      type: 'object',
      properties: {
        tokenSymbol: {
          type: 'string',
          description: 'Token symbol (e.g., USDC, ETH, WSTETH)',
        },
        networkId: {
          type: 'string',
          description: 'Optional: limit to specific network',
          enum: ['base', 'ethereum', 'solana', 'arbitrum', 'optimism'],
        },
      },
      required: ['tokenSymbol'],
    },
    category: 'query',
    riskLevel: 'low',
    requiresConfirmation: false,
  },
]

export const yieldActionHandlers: Record<
  string,
  (params: Record<string, unknown>) => Promise<ActionResult>
> = {
  search_yield_opportunities: async (params) => {
    try {
      const searchParams: YieldSearchParams = {
        networkId: params.networkId as string | undefined,
        tokenSymbol: params.tokenSymbol as string | undefined,
        minApy: params.minApy as number | undefined,
        maxRisk: params.maxRisk as 'low' | 'medium' | 'high' | undefined,
        sortBy: (params.sortBy as 'apy' | 'tvl' | 'risk') || 'apy',
        limit: (params.limit as number) || 10,
      }

      const opportunities = await yieldService.getYieldOpportunities(searchParams)

      const filters: string[] = []
      if (searchParams.networkId) filters.push(`on ${searchParams.networkId}`)
      if (searchParams.tokenSymbol) filters.push(`for ${searchParams.tokenSymbol}`)
      if (searchParams.minApy) filters.push(`with APY >= ${searchParams.minApy}%`)
      if (searchParams.maxRisk) filters.push(`max risk: ${searchParams.maxRisk}`)
      const context = filters.length > 0 ? filters.join(', ') : 'across all protocols'

      return {
        success: true,
        message: buildSummaryMessage(opportunities, context),
        data: {
          opportunities: opportunities.map(formatOpportunity),
          count: opportunities.length,
          filters: searchParams,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to search yield opportunities',
        error: String(error),
      }
    }
  },

  get_top_yields: async (params) => {
    try {
      const networkId = params.networkId as string
      const limit = (params.limit as number) || 5

      const opportunities = await yieldService.getTopYields(networkId, limit)

      return {
        success: true,
        message: buildSummaryMessage(opportunities, `on ${networkId} (top ${limit})`),
        data: {
          opportunities: opportunities.map(formatOpportunity),
          count: opportunities.length,
          networkId,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to get top yields',
        error: String(error),
      }
    }
  },

  get_yield_for_token: async (params) => {
    try {
      const tokenSymbol = params.tokenSymbol as string
      const networkId = params.networkId as string | undefined

      const opportunities = await yieldService.getYieldForToken(tokenSymbol, networkId)

      const context = networkId
        ? `for ${tokenSymbol} on ${networkId}`
        : `for ${tokenSymbol} across all networks`

      return {
        success: true,
        message: buildSummaryMessage(opportunities, context),
        data: {
          opportunities: opportunities.map(formatOpportunity),
          count: opportunities.length,
          tokenSymbol,
          networkId: networkId || 'all',
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get yields for ${params.tokenSymbol}`,
        error: String(error),
      }
    }
  },
}
