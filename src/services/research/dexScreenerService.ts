/**
 * Code by Xipzer
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
  info?: {
    imageUrl?: string
    websites?: { label: string; url: string }[]
    socials?: { type: string; url: string }[]
  }
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

const CHAIN_MAP: Record<ResearchNetwork, string> = {
  base: 'base',
  ethereum: 'ethereum',
  arbitrum: 'arbitrum',
  optimism: 'optimism',
  solana: 'solana',
}

class DexScreenerService {
  private readonly API_URL = 'https://api.dexscreener.com/latest'

  async getTokenPairs(
    contractAddress: string,
    network?: ResearchNetwork,
  ): Promise<DexScreenerPair[]> {
    try {
      const response = await fetch(
        network
          ? `${this.API_URL}/dex/tokens/${contractAddress}`
          : `${this.API_URL}/dex/tokens/${contractAddress}`,
      )

      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.statusText}`)
      }

      const data = await response.json()

      if (!data.pairs || data.pairs.length === 0) {
        throw new Error('No pairs found for this token')
      }

      let pairs = data.pairs as DexScreenerPair[]
      if (network) {
        pairs = pairs.filter((p) => p.chainId === CHAIN_MAP[network])
      }

      return pairs
    } catch (error) {
      console.error('[DexScreener] Error fetching token pairs:', error)
      throw error
    }
  }

  async getTokenInfo(
    contractAddress: string,
    network?: ResearchNetwork,
  ): Promise<DexScreenerTokenInfo | null> {
    try {
      const pairs = await this.getTokenPairs(contractAddress, network)

      if (pairs.length === 0) {
        return null
      }

      const bestPair = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0]

      return {
        address: bestPair.baseToken.address,
        name: bestPair.baseToken.name,
        symbol: bestPair.baseToken.symbol,
        priceUsd: parseFloat(bestPair.priceUsd) || 0,
        priceChange24h: bestPair.priceChange?.h24 || 0,
        volume24h: bestPair.volume?.h24 || 0,
        liquidity: bestPair.liquidity?.usd || 0,
        marketCap: bestPair.fdv || 0,
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

  async getTrendingTokens(network?: ResearchNetwork): Promise<DexScreenerPair[]> {
    try {
      const response = await fetch(`${this.API_URL}/dex/tokens/boosted`)

      if (!response.ok) {
        throw new Error(`DexScreener trending error: ${response.statusText}`)
      }

      const data = await response.json()
      let pairs = data.pairs || []

      if (network) {
        pairs = pairs.filter((p: DexScreenerPair) => p.chainId === CHAIN_MAP[network])
      }

      return pairs
    } catch (error) {
      console.error('[DexScreener] Error getting trending tokens:', error)
      return []
    }
  }

  getTokenUrl(contractAddress: string, network: ResearchNetwork): string {
    return `https://dexscreener.com/${CHAIN_MAP[network]}/${contractAddress}`
  }

  async getTokenLogo(contractAddress: string, network: ResearchNetwork): Promise<string | null> {
    try {
      const pairs = await this.getTokenPairs(contractAddress, network)
      if (pairs.length > 0 && pairs[0].info?.imageUrl) {
        return pairs[0].info.imageUrl
      }
      return null
    } catch (error) {
      console.error('[DexScreener] Error getting token logo:', error)
      return null
    }
  }
}

export const dexScreenerService = new DexScreenerService()