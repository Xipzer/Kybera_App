/**
 * Code by Xipzer
 */

import { Network } from '../../types'
import { getAlchemyApiKey } from '../../utils/networks'

interface TokenBalance {
  contractAddress: string
  tokenBalance: string | null
}

interface TokenBalancesResponse {
  address: string
  tokenBalances: TokenBalance[]
}

interface TokenMetadata {
  name: string | null
  symbol: string | null
  decimals: number | null
  logo: string | null
}

const ALCHEMY_NETWORK_MAP: Record<number, string> = {
  1: 'eth-mainnet',
  137: 'polygon-mainnet',
  10: 'opt-mainnet',
  42161: 'arb-mainnet',
  8453: 'base-mainnet',
  56: 'bnb-mainnet',
}

export class AlchemyService {
  private static instances: Map<string, AlchemyService> = new Map()
  private baseUrl: string

  private constructor(network: Network, apiKey: string) {
    const chainId = typeof network.chainId === 'number' ? network.chainId : 1
    if (!ALCHEMY_NETWORK_MAP[chainId]) {
      throw new Error(`Unsupported Alchemy network for chainId ${chainId}`)
    }
    this.baseUrl = `https://${ALCHEMY_NETWORK_MAP[chainId]}.g.alchemy.com/v2/${apiKey}`
  }

  static getInstance(network: Network): AlchemyService | null {
    if (!network.alchemyRpcUrl) return null
    if (network.type !== 'EVM') return null

    const apiKey = getAlchemyApiKey()
    if (!apiKey) return null

    const chainId = typeof network.chainId === 'number' ? network.chainId : 1
    if (!ALCHEMY_NETWORK_MAP[chainId]) return null

    if (AlchemyService.instances.has(`${network.id}_${network.chainId}`))
      return AlchemyService.instances.get(`${network.id}_${network.chainId}`)!

    try {
      const instance = new AlchemyService(network, apiKey)
      AlchemyService.instances.set(`${network.id}_${network.chainId}`, instance)
      return instance
    } catch (error) {
      console.warn(`Failed to create Alchemy service for ${network.name}:`, error)
      return null
    }
  }

  private async rpc<T = unknown>(method: string, params: unknown[]): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    })

    if (!response.ok) {
      if (response.status === 429) throw new Error('RATE_LIMIT')
      throw new Error(`Alchemy RPC error: ${response.status}`)
    }

    const data = await response.json()
    if (data.error) throw new Error(data.error.message || 'Alchemy RPC error')
    return data.result
  }

  async getTokenBalances(walletAddress: string): Promise<TokenBalancesResponse> {
    try {
      const result = await this.rpc<{
        address: string
        tokenBalances?: { contractAddress: string; tokenBalance: string | null }[]
      }>('alchemy_getTokenBalances', [walletAddress, 'erc20'])
      return {
        address: result.address,
        tokenBalances: (result.tokenBalances || []).map((tb) => ({
          contractAddress: tb.contractAddress,
          tokenBalance: tb.tokenBalance,
        })),
      }
    } catch (error) {
      console.error('Alchemy getTokenBalances error:', error)
      throw error
    }
  }

  async getTokenMetadata(tokenAddresses: string[]): Promise<TokenMetadata[]> {
    try {
      return await Promise.all(
        tokenAddresses.map(async (address) => {
          const result = await this.rpc<{
            name?: string | null
            symbol?: string | null
            decimals?: number | null
            logo?: string | null
          } | null>('alchemy_getTokenMetadata', [address])
          return {
            name: result?.name || null,
            symbol: result?.symbol || null,
            decimals: result?.decimals || null,
            logo: result?.logo || null,
          }
        }),
      )
    } catch (error) {
      console.error('Alchemy getTokenMetadata error:', error)
      throw error
    }
  }
}
