/**
 * Code by Xipzer
 */

import { Connection, ParsedAccountData, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { db } from '../database'
import { Network } from '../../types'
import { coinGeckoService } from '../api/coinGeckoService'

interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: string
  logoURI?: string
}

interface TokenCache {
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
  lastUpdated: number
}

interface PriceData {
  [address: string]: {
    usd: number
    usd_24h_change?: number
  }
}

const KNOWN_SOLANA_TOKENS: Record<
  string,
  { symbol: string; name: string; decimals: number; coingeckoId?: string }
> = {
  So11111111111111111111111111111111111111112: {
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
    coingeckoId: 'solana',
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    coingeckoId: 'tether',
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    symbol: 'mSOL',
    name: 'Marinade Staked SOL',
    decimals: 9,
    coingeckoId: 'marinade-staked-sol',
  },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': {
    symbol: 'ETH',
    name: 'Ethereum (Wormhole)',
    decimals: 8,
    coingeckoId: 'ethereum',
  },
}

export class SVMService {
  private connection: Connection
  private tokenCache: Map<string, TokenCache> = new Map()

  constructor(rpcUrl: string, _network: Network) {
    this.connection = new Connection(rpcUrl, 'confirmed')
  }

  async getTokenBalances(walletAddress: string): Promise<TokenInfo[]> {
    try {

      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(walletAddress),
        {
          programId: TOKEN_PROGRAM_ID,
        },
      )

      const tokens: TokenInfo[] = []

      for (const { account } of tokenAccounts.value) {
        const tokenData = (account.data as ParsedAccountData).parsed.info

        if (!tokenData || tokenData.tokenAmount.uiAmount === 0) {
          continue
        }

        const mintAddress = tokenData.mint
        const metadata = await this.getTokenMetadata(mintAddress)

        tokens.push({
          address: mintAddress,
          symbol: metadata.symbol,
          name: metadata.name,
          decimals: tokenData.tokenAmount.decimals,
          balance: tokenData.tokenAmount.uiAmountString || '0',
          logoURI: metadata.logoURI,
        })
      }

      return tokens
    } catch (error) {
      console.error('Failed to fetch SPL token balances:', error)
      return []
    }
  }

  private async getTokenMetadata(mintAddress: string): Promise<{
    symbol: string
    name: string
    logoURI?: string
  }> {
    const knownToken = KNOWN_SOLANA_TOKENS[mintAddress]
    if (knownToken) {
      return {
        symbol: knownToken.symbol,
        name: knownToken.name,
        logoURI: await this.getTokenLogo(mintAddress),
      }
    }

    const cached = await this.getCachedTokenInfo(mintAddress)
    if (cached) {
      return {
        symbol: cached.symbol,
        name: cached.name,
        logoURI: cached.logoURI,
      }
    }

    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      logoURI: undefined,
    }
  }

  private async getCachedTokenInfo(mintAddress: string): Promise<TokenCache | null> {
    const cached = this.tokenCache.get(mintAddress)
    if (cached) {
      return cached
    }

    try {
      const dbCached = await db.tokenMetadata.get(`999999_${mintAddress.toLowerCase()}`)
      if (dbCached) {
        const cacheData: TokenCache = {
          address: dbCached.address,
          name: dbCached.name,
          symbol: dbCached.symbol,
          decimals: dbCached.decimals,
          logoURI: dbCached.logoURI,
          lastUpdated: dbCached.lastUpdated,
        }
        this.tokenCache.set(mintAddress, cacheData)
        return cacheData
      }
    } catch (error) {
      console.error('Failed to get cached token metadata:', error)
    }

    return null
  }

  private async getTokenLogo(mintAddress: string): Promise<string | undefined> {
    if (KNOWN_SOLANA_TOKENS[mintAddress]?.coingeckoId) {
      return undefined
    }

    const cached = await this.getCachedTokenInfo(mintAddress)
    return cached?.logoURI
  }

  async fetchTokenPrices(mintAddresses: string[]): Promise<PriceData> {
    const prices: PriceData = {}

    const coingeckoIds: string[] = []
    const mintToCoingecko: Record<string, string> = {}

    for (const mint of mintAddresses) {
      const known = KNOWN_SOLANA_TOKENS[mint]
      if (known?.coingeckoId) {
        coingeckoIds.push(known.coingeckoId)
        mintToCoingecko[mint] = known.coingeckoId
      }
    }

    if (coingeckoIds.length === 0) {
      return prices
    }

    try {
      const data = await coinGeckoService.getPricesByIds(coingeckoIds)

      for (const [mint, coingeckoId] of Object.entries(mintToCoingecko)) {
        if (data[coingeckoId]) {
          prices[mint] = data[coingeckoId]
        }
      }
    } catch (error) {
      console.warn('Failed to fetch Solana token prices:', error)
    }

    return prices
  }

  async hasTokenAccount(walletAddress: string, mintAddress: string): Promise<boolean> {
    try {
      const accounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(walletAddress),
        {
          mint: new PublicKey(mintAddress),
        },
      )

      return accounts.value.length > 0
    } catch (error) {
      console.error('Failed to check token account:', error)
      return false
    }
  }

  async getTokenBalance(walletAddress: string, mintAddress: string): Promise<string> {
    try {

      const accounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(walletAddress),
        {
          mint: new PublicKey(mintAddress),
        },
      )

      if (accounts.value.length === 0) {
        return '0'
      }

      let totalBalance = 0
      for (const { account } of accounts.value) {
        const tokenData = (account.data as ParsedAccountData).parsed.info
        if (tokenData?.tokenAmount?.uiAmount) {
          totalBalance += tokenData.tokenAmount.uiAmount
        }
      }

      return totalBalance.toString()
    } catch (error) {
      console.error('Failed to get token balance:', error)
      return '0'
    }
  }
}