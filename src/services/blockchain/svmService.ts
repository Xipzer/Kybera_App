import { Connection, ParsedAccountData, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { db } from '../storage/database'
import { AlchemyService } from './alchemyService'
import { Network } from '../../types'

interface TokenInfo {
  address: string // Token mint address
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

// Well-known Solana token list
const KNOWN_SOLANA_TOKENS: Record<
  string,
  { symbol: string; name: string; decimals: number; coingeckoId?: string }
> = {
  So11111111111111111111111111111111111111112: {
    // Wrapped SOL
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
    coingeckoId: 'solana',
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    // USDC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    coingeckoId: 'usd-coin',
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    // USDT
    symbol: 'USDT',
    name: 'Tether',
    decimals: 6,
    coingeckoId: 'tether',
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    // mSOL
    symbol: 'mSOL',
    name: 'Marinade Staked SOL',
    decimals: 9,
    coingeckoId: 'marinade-staked-sol',
  },
  '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': {
    // ETH (Wormhole)
    symbol: 'ETH',
    name: 'Ethereum (Wormhole)',
    decimals: 8,
    coingeckoId: 'ethereum',
  },
}

export class SVMService {
  private connection: Connection
  private alchemyService?: AlchemyService
  private tokenCache: Map<string, TokenCache> = new Map()

  constructor(rpcUrl: string, _network: Network) {
    this.connection = new Connection(rpcUrl, 'confirmed')

    // Try to initialize Alchemy service if network has Alchemy RPC
    if (_network?.alchemyRpcUrl) {
      this.alchemyService = AlchemyService.getInstance(_network) || undefined
      if (this.alchemyService) {
        console.log(`✅ Alchemy SDK initialized for ${_network.name} (Solana)`)
      } else {
        console.warn(
          `⚠️ Failed to initialize Alchemy SDK for ${_network.name} despite having alchemyRpcUrl`,
        )
      }
    }
  }

  /**
   * Get all SPL token balances for a wallet address
   */
  async getTokenBalances(walletAddress: string): Promise<TokenInfo[]> {
    try {
      const pubkey = new PublicKey(walletAddress)

      // Get all token accounts for this wallet
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(pubkey, {
        programId: TOKEN_PROGRAM_ID,
      })

      const tokens: TokenInfo[] = []

      for (const { account } of tokenAccounts.value) {
        const parsedData = account.data as ParsedAccountData
        const tokenData = parsedData.parsed.info

        if (!tokenData || tokenData.tokenAmount.uiAmount === 0) {
          continue // Skip empty token accounts
        }

        const mintAddress = tokenData.mint
        const balance = tokenData.tokenAmount.uiAmountString || '0'
        const decimals = tokenData.tokenAmount.decimals

        // Get token metadata
        const metadata = await this.getTokenMetadata(mintAddress)

        tokens.push({
          address: mintAddress,
          symbol: metadata.symbol,
          name: metadata.name,
          decimals: decimals,
          balance: balance,
          logoURI: metadata.logoURI,
        })
      }

      console.debug(`Found ${tokens.length} SPL tokens for ${walletAddress}`)
      return tokens
    } catch (error) {
      console.error('Failed to fetch SPL token balances:', error)
      return []
    }
  }

  /**
   * Get token metadata from cache or known tokens
   */
  private async getTokenMetadata(mintAddress: string): Promise<{
    symbol: string
    name: string
    logoURI?: string
  }> {
    // Check if it's a known token
    const knownToken = KNOWN_SOLANA_TOKENS[mintAddress]
    if (knownToken) {
      return {
        symbol: knownToken.symbol,
        name: knownToken.name,
        logoURI: await this.getTokenLogo(mintAddress),
      }
    }

    // Check cache
    const cached = await this.getCachedTokenInfo(mintAddress)
    if (cached) {
      return {
        symbol: cached.symbol,
        name: cached.name,
        logoURI: cached.logoURI,
      }
    }

    // For unknown tokens, try to fetch from chain (this is limited on Solana)
    // Most tokens need external metadata services
    return {
      symbol: 'UNKNOWN',
      name: 'Unknown Token',
      logoURI: undefined,
    }
  }

  /**
   * Get cached token metadata
   */
  private async getCachedTokenInfo(mintAddress: string): Promise<TokenCache | null> {
    // Check memory cache first
    const cached = this.tokenCache.get(mintAddress)
    if (cached) {
      return cached
    }

    // Check database
    try {
      // Use a special chainId for Solana (999999)
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
        // Add to memory cache
        this.tokenCache.set(mintAddress, cacheData)
        return cacheData
      }
    } catch (error) {
      console.error('Failed to get cached token metadata:', error)
    }

    return null
  }

  /**
   * Get token logo from various sources
   */
  private async getTokenLogo(mintAddress: string): Promise<string | undefined> {
    // Check known tokens
    const knownToken = KNOWN_SOLANA_TOKENS[mintAddress]
    if (knownToken?.coingeckoId) {
      // We could fetch from CoinGecko here
      // For now, return undefined and let the image service handle it
      return undefined
    }

    // Check cached logo
    const cached = await this.getCachedTokenInfo(mintAddress)
    return cached?.logoURI
  }

  /**
   * Fetch USD prices for Solana tokens
   */
  async fetchTokenPrices(mintAddresses: string[]): Promise<PriceData> {
    const prices: PriceData = {}

    // Map mint addresses to CoinGecko IDs
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
      // Fetch prices from CoinGecko by IDs
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoIds.join(',')}&vs_currencies=usd&include_24hr_change=true`
      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()

        // Map back to mint addresses
        for (const [mint, coingeckoId] of Object.entries(mintToCoingecko)) {
          if (data[coingeckoId]) {
            prices[mint] = {
              usd: data[coingeckoId].usd || 0,
              usd_24h_change: data[coingeckoId].usd_24h_change || 0,
            }
          }
        }
      }
    } catch (error) {
      console.warn('Failed to fetch Solana token prices:', error)
    }

    return prices
  }

  /**
   * Check if a token account exists for a specific mint
   */
  async hasTokenAccount(walletAddress: string, mintAddress: string): Promise<boolean> {
    try {
      const walletPubkey = new PublicKey(walletAddress)
      const mintPubkey = new PublicKey(mintAddress)

      const accounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
        mint: mintPubkey,
      })

      return accounts.value.length > 0
    } catch (error) {
      console.error('Failed to check token account:', error)
      return false
    }
  }

  /**
   * Get a specific token balance
   */
  async getTokenBalance(walletAddress: string, mintAddress: string): Promise<string> {
    try {
      const walletPubkey = new PublicKey(walletAddress)
      const mintPubkey = new PublicKey(mintAddress)

      const accounts = await this.connection.getParsedTokenAccountsByOwner(walletPubkey, {
        mint: mintPubkey,
      })

      if (accounts.value.length === 0) {
        return '0'
      }

      // Sum all token accounts (in case there are multiple)
      let totalBalance = 0
      for (const { account } of accounts.value) {
        const parsedData = account.data as ParsedAccountData
        const tokenData = parsedData.parsed.info
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