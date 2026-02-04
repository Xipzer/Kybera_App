/**
 * DexScreener API Service
 * Fetches token data from DexScreener
 */

import { ResearchNetwork } from '../../types/research'

export interface DexScreenerPair {
  chainId: string
  dexId: string
  url: string
  pairAddress: string
  baseToken: {
    address: string
    name: string
    symbol: string
  }
  quoteToken: {
    address: string
    name: string
    symbol: string
  }
  priceNative: string
  priceUsd: string
  txns: {
    m5: { buys: number; sells: number }
    h1: { buys: number; sells: number }
    h6: { buys: number; sells: number }
    h24: { buys: number; sells: number }
  }
  volume: {
    m5: number
    h1: number
    h6: number
    h24: number
  }
  priceChange: {
    m5: number
    h1: number
    h6: number
    h24: number
  }
  liquidity: {
    usd: number
    base: number
    quote: number
  }
  fdv: number
  pairCreatedAt: number
}

export interface DexScreenerTokenInfo {
  address: string
  name: string
  symbol: string
  priceUsd: number
  priceChange24h: number
  volume24h: number
  liquidity: number
  marketCap: number
  fdv: number
  pairAddress: string
  dex: string
  createdAt: Date
  txns24h: {
    buys: number
    sells: number
  }
}

// Chain mapping for DexScreener API
const CHAIN_MAP: Record<ResearchNetwork, string> = {
  base: 'base',
  ethereum: 'ethereum',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  solana: 'solana',
}

class DexScreenerService {
  private readonly API_URL = 'https://api.dexscreener.com/latest'

  /**
   * Get token pairs by contract address
   */
  async getTokenPairs(
    contractAddress: string,
    network?: ResearchNetwork,
  ): Promise<DexScreenerPair[]> {
    try {
      const url = network
        ? `${this.API_URL}/dex/tokens/${contractAddress}`
        : `${this.API_URL}/dex/tokens/${contractAddress}`

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.pairs || data.pairs.length === 0) {
        throw new Error('No pairs found for this token')
      }

      // Filter by network if specified
      let pairs = data.pairs as DexScreenerPair[]
      if (network) {
        const chainId = CHAIN_MAP[network]
        pairs = pairs.filter((p) => p.chainId === chainId)
      }

      return pairs
    } catch (error) {
      console.error('[DexScreener] Error fetching token pairs:', error)
      throw error
    }
  }

  /**
   * Get token info summary (uses the highest liquidity pair)
   */
  async getTokenInfo(
    contractAddress: string,
    network?: ResearchNetwork,
  ): Promise<DexScreenerTokenInfo | null> {
    try {
      const pairs = await this.getTokenPairs(contractAddress, network)

      if (pairs.length === 0) {
        return null
      }

      // Sort by liquidity and get the best pair
      const sortedPairs = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))
      const bestPair = sortedPairs[0]

      return {
        address: bestPair.baseToken.address,
        name: bestPair.baseToken.name,
        symbol: bestPair.baseToken.symbol,
        priceUsd: parseFloat(bestPair.priceUsd) || 0,
        priceChange24h: bestPair.priceChange?.h24 || 0,
        volume24h: bestPair.volume?.h24 || 0,
        liquidity: bestPair.liquidity?.usd || 0,
        marketCap: bestPair.fdv || 0, // Using FDV as approximation
        fdv: bestPair.fdv || 0,
        pairAddress: bestPair.pairAddress,
        dex: bestPair.dexId,
        createdAt: new Date(bestPair.pairCreatedAt),
        txns24h: {
          buys: bestPair.txns?.h24?.buys || 0,
          sells: bestPair.txns?.h24?.sells || 0,
        },
      }
    } catch (error) {
      console.error('[DexScreener] Error getting token info:', error)
      return null
    }
  }

  /**
   * Search for tokens by name/symbol
   */
  async searchTokens(query: string): Promise<DexScreenerPair[]> {
    try {
      const response = await fetch(`${this.API_URL}/dex/search/?q=${encodeURIComponent(query)}`)

      if (!response.ok) {
        throw new Error(`DexScreener search error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.pairs || []
    } catch (error) {
      console.error('[DexScreener] Error searching tokens:', error)
      return []
    }
  }

  /**
   * Get trending/boosted tokens
   */
  async getTrendingTokens(network?: ResearchNetwork): Promise<DexScreenerPair[]> {
    try {
      // DexScreener has a boosted tokens endpoint
      const response = await fetch(`${this.API_URL}/dex/tokens/boosted`)

      if (!response.ok) {
        throw new Error(`DexScreener trending error: ${response.statusText}`)
      }

      const data = await response.json()
      let pairs = data.pairs || []

      // Filter by network if specified
      if (network) {
        const chainId = CHAIN_MAP[network]
        pairs = pairs.filter((p: DexScreenerPair) => p.chainId === chainId)
      }

      return pairs
    } catch (error) {
      console.error('[DexScreener] Error getting trending tokens:', error)
      return []
    }
  }

  /**
   * Get DexScreener URL for a token
   */
  getTokenUrl(contractAddress: string, network: ResearchNetwork): string {
    const chain = CHAIN_MAP[network]
    return `https://dexscreener.com/${chain}/${contractAddress}`
  }
}

export const dexScreenerService = new DexScreenerService()
