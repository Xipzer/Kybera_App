/**
 * Balance Aggregator Service
 * Single source of truth for combining on-chain data with price data
 */

import { Network, Wallet } from '../../types'
import { OnChainBalance, OnChainDataService } from './onChainDataService'
import { PriceData, PriceService } from './priceService'
import { db } from '../storage/database'
import { tokenImageService } from '../tokens/tokenImageService'

export interface TokenWithUSD {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: string
  usdValue: number
  usd24hChange: number
  fromCache: boolean
  logoURI?: string
}

export interface AggregatedBalance {
  walletAddress: string
  networkId: string
  native: string
  nativeUSD: number
  native24hChange: number
  tokens: TokenWithUSD[]
  totalUSD: number
  total24hChange: number
  lastUpdated: number
  dataQuality: {
    onChainFromCache: boolean
    pricesFromCache: boolean
  }
}

export class BalanceAggregator {
  private onChainService: OnChainDataService
  private priceService: PriceService
  private network: Network

  constructor(network: Network) {
    this.network = network
    this.onChainService = new OnChainDataService(network)

    // Map network to CoinGecko native token ID
    const nativeTokenId = this.getNativeTokenId(network.id)
    const chainId = typeof network.chainId === 'number' ? network.chainId : 1
    this.priceService = new PriceService(network.id, chainId, nativeTokenId)
  }

  /**
   * Load cached balance immediately without fetching fresh data
   * Returns null if no cache exists
   */
  async loadCachedBalance(wallet: Wallet): Promise<AggregatedBalance | null> {
    const id = `${wallet.address}_${this.network.id}`

    try {
      // Load cached wallet balance summary
      const cachedWalletBalance = await db.walletBalances.get(id)
      if (!cachedWalletBalance) {
        return null
      }

      // Load cached token balances
      const cachedTokens = await db.tokenBalances
        .where('walletAddress')
        .equals(wallet.address)
        .and((item) => item.networkId === this.network.id)
        .toArray()

      // Get cached price data
      const tokenAddresses = cachedTokens.map((t) => t.tokenAddress)
      const priceData = await this.priceService.fetchPrices(tokenAddresses, false) // Only use cache

      // Build the aggregated balance from cache
      const tokens: TokenWithUSD[] = cachedTokens.map((t) => ({
        address: t.tokenAddress,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        balance: t.balance,
        usdValue: t.usdValue || 0,
        usd24hChange: priceData.tokenPrices.get(t.tokenAddress.toLowerCase())?.usd24hChange || 0,
        fromCache: true,
        logoURI: t.logoURI,
      }))

      const aggregated: AggregatedBalance = {
        walletAddress: wallet.address,
        networkId: this.network.id,
        native: cachedWalletBalance.nativeBalance,
        nativeUSD: cachedWalletBalance.nativeUSD,
        native24hChange: priceData.native24hChange,
        tokens,
        totalUSD: cachedWalletBalance.totalUSD,
        total24hChange: this.calculateWeighted24hChange(
          cachedWalletBalance.nativeUSD,
          priceData.native24hChange,
          tokens,
        ),
        lastUpdated: cachedWalletBalance.lastUpdated,
        dataQuality: {
          onChainFromCache: true,
          pricesFromCache: true,
        },
      }

      console.log(`[Aggregator] Loaded cached balance for ${wallet.address}`)

      // Trigger background image fetching for tokens without logos
      this.fetchMissingTokenImages(aggregated.tokens)

      return aggregated
    } catch (error) {
      console.error('[Aggregator] Failed to load cached balance', error)
      return null
    }
  }

  /**
   * Main method: Fetch complete balance with USD values
   * @param wallet - Wallet to fetch balance for
   * @param isManualRefresh - If true, only fetches on-chain data (not prices)
   */
  async fetchBalance(wallet: Wallet, isManualRefresh: boolean = false): Promise<AggregatedBalance> {
    console.log(`[Aggregator] Fetching balance for ${wallet.address} on ${this.network.name}`)
    console.log(`[Aggregator] Manual refresh: ${isManualRefresh}`)

    // Step 1: Fetch on-chain data (sequential per-token with cache fallback)
    const onChainData = await this.onChainService.fetchWalletBalance(wallet)

    // Step 2: Determine if we need to fetch prices
    const shouldFetchPrices = !isManualRefresh // Auto-refresh fetches prices
    const tokenAddresses = onChainData.tokens.map((t) => t.address)

    // Step 3: Fetch or get cached prices
    const priceData = await this.priceService.fetchPrices(tokenAddresses, shouldFetchPrices)

    // Step 4: Combine on-chain data with prices
    const aggregated = await this.aggregateData(onChainData, priceData)

    // Step 5: Cache the aggregated result
    await this.cacheAggregatedBalance(aggregated)

    // Step 6: Trigger background image fetching for tokens without logos
    this.fetchMissingTokenImages(aggregated.tokens)

    console.log(`[Aggregator] Total USD: $${aggregated.totalUSD.toFixed(2)}`)
    return aggregated
  }

  /**
   * Combine on-chain data with price data to calculate USD values
   * This is the SINGLE source of truth for USD calculations
   */
  private async aggregateData(
    onChain: OnChainBalance,
    prices: PriceData,
  ): Promise<AggregatedBalance> {
    // Calculate native USD value
    const nativeBalance = parseFloat(onChain.native || '0')
    const nativeUSD = nativeBalance * prices.nativePrice

    // Calculate token USD values
    const tokensWithUSD: TokenWithUSD[] = []
    let totalTokensUSD = 0

    for (const token of onChain.tokens) {
      const tokenPrice = prices.tokenPrices.get(token.address.toLowerCase())
      const balance = parseFloat(token.balance || '0')
      const usdValue = balance * (tokenPrice?.usdPrice || 0)
      const logoURI = await this.getTokenLogo(token.address)

      tokensWithUSD.push({
        ...token,
        usdValue,
        usd24hChange: tokenPrice?.usd24hChange || 0,
        logoURI,
      })

      totalTokensUSD += usdValue
    }

    // Calculate total USD (single source of truth)
    const totalUSD = nativeUSD + totalTokensUSD

    // Calculate weighted 24h change
    const total24hChange = this.calculateWeighted24hChange(
      nativeUSD,
      prices.native24hChange,
      tokensWithUSD,
    )

    // Determine data quality
    const onChainFromCache = onChain.tokens.some((t) => t.fromCache)
    const pricesFromCache = Array.from(prices.tokenPrices.values()).some((p) => p.fromCache)

    return {
      walletAddress: onChain.walletAddress,
      networkId: onChain.networkId,
      native: onChain.native,
      nativeUSD,
      native24hChange: prices.native24hChange,
      tokens: tokensWithUSD,
      totalUSD,
      total24hChange,
      lastUpdated: Date.now(),
      dataQuality: {
        onChainFromCache,
        pricesFromCache,
      },
    }
  }

  /**
   * Calculate weighted 24h change based on USD values
   */
  private calculateWeighted24hChange(
    nativeUSD: number,
    native24hChange: number,
    tokens: TokenWithUSD[],
  ): number {
    const totalUSD = nativeUSD + tokens.reduce((sum, t) => sum + t.usdValue, 0)
    if (totalUSD === 0) return 0

    let weightedChange = (nativeUSD * native24hChange) / totalUSD

    for (const token of tokens) {
      const weight = token.usdValue / totalUSD
      weightedChange += weight * token.usd24hChange
    }

    return weightedChange
  }

  /**
   * Cache the aggregated balance
   */
  private async cacheAggregatedBalance(balance: AggregatedBalance): Promise<void> {
    const id = `${balance.walletAddress}_${balance.networkId}`

    try {
      // Update wallet balance summary
      await db.walletBalances.put({
        id,
        walletAddress: balance.walletAddress,
        networkId: balance.networkId,
        nativeBalance: balance.native,
        nativeUSD: balance.nativeUSD,
        totalUSD: balance.totalUSD,
        lastUpdated: balance.lastUpdated,
        previousTotalUSD: (await db.walletBalances.get(id))?.totalUSD,
      })

      // Update individual token balances with USD values
      for (const token of balance.tokens) {
        const tokenId = `${balance.walletAddress}_${balance.networkId}_${token.address}`
        await db.tokenBalances.put({
          id: tokenId,
          walletAddress: balance.walletAddress,
          networkId: balance.networkId,
          tokenAddress: token.address,
          symbol: token.symbol,
          name: token.name,
          decimals: token.decimals,
          balance: token.balance,
          usdValue: token.usdValue,
          logoURI: token.logoURI,
          lastUpdated: balance.lastUpdated,
        })
      }

      console.log('[Aggregator] Cached aggregated balance')
    } catch (error) {
      console.error('[Aggregator] Failed to cache aggregated balance', error)
    }
  }

  /**
   * Get token logo from metadata
   */
  private async getTokenLogo(tokenAddress: string): Promise<string | undefined> {
    try {
      const metadata = await db.tokenMetadata.get(
        `${this.network.chainId}_${tokenAddress.toLowerCase()}`,
      )
      return metadata?.logoURI
    } catch {
      return undefined
    }
  }

  /**
   * Map network ID to CoinGecko native token ID
   */
  private getNativeTokenId(networkId: string): string {
    const mapping: Record<string, string> = {
      ethereum: 'ethereum',
      polygon: 'matic-network',
      arbitrum: 'ethereum', // Uses ETH
      optimism: 'ethereum', // Uses ETH
      bsc: 'binancecoin',
      avalanche: 'avalanche-2',
      fantom: 'fantom',
      gnosis: 'xdai',
      celo: 'celo',
      harmony: 'harmony',
      moonriver: 'moonriver',
      moonbeam: 'moonbeam',
      metis: 'metis-token',
      aurora: 'ethereum', // Uses ETH
      base: 'ethereum', // Uses ETH
      scroll: 'ethereum', // Uses ETH
      linea: 'ethereum', // Uses ETH
      'solana-mainnet': 'solana',
      'solana-devnet': 'solana',
      'solana-testnet': 'solana',
    }

    return mapping[networkId] || 'ethereum'
  }

  /**
   * Update only prices for cached blockchain data
   * This is called on a slower interval to respect CoinGecko rate limits
   * @param wallet - Wallet to update prices for
   * @returns Updated balance with fresh prices, or null if no cached data exists
   */
  async updatePricesOnly(wallet: Wallet): Promise<AggregatedBalance | null> {
    console.log(`[Aggregator] Updating prices only for ${wallet.address} on ${this.network.name}`)

    // Step 1: Load cached blockchain data
    const cached = await this.loadCachedBalance(wallet)
    if (!cached) {
      console.log('[Aggregator] No cached data to update prices for')
      return null
    }

    // Step 2: Extract token addresses from cached data
    const tokenAddresses = cached.tokens.map((t) => t.address)

    // Step 3: Fetch fresh prices (force refresh)
    const priceData = await this.priceService.fetchPrices(tokenAddresses, true)

    // Step 4: Rebuild on-chain data structure from cache
    const onChainData: OnChainBalance = {
      walletAddress: cached.walletAddress,
      networkId: cached.networkId,
      native: cached.native,
      tokens: cached.tokens.map((t) => ({
        address: t.address,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        balance: t.balance,
        fromCache: true,
        lastUpdated: cached.lastUpdated,
      })),
      lastUpdated: cached.lastUpdated,
    }

    // Step 5: Recalculate USD values with fresh prices
    const aggregated = await this.aggregateData(onChainData, priceData)

    // Step 6: Update cache with new USD values
    await this.cacheAggregatedBalance(aggregated)

    console.log(`[Aggregator] Updated prices only - Total USD: $${aggregated.totalUSD.toFixed(2)}`)
    return aggregated
  }

  /**
   * Add a token to track for this wallet
   */
  async addToken(
    wallet: Wallet,
    tokenAddress: string,
    symbol: string,
    name: string,
    decimals: number,
  ): Promise<void> {
    await this.onChainService.addTokenToTrack(wallet.address, tokenAddress, symbol, name, decimals)
  }

  /**
   * Remove a token from tracking
   */
  async removeToken(wallet: Wallet, tokenAddress: string): Promise<void> {
    await this.onChainService.removeTokenFromTracking(wallet.address, tokenAddress)
  }

  /**
   * Clear all cached data
   */
  async clearCache(wallet: Wallet): Promise<void> {
    await this.onChainService.clearCache(wallet.address)
    await this.priceService.clearCache()
  }

  /**
   * Fetch missing token images in the background
   * Only fetches images for tokens that don't have a cached logo
   */
  private async fetchMissingTokenImages(tokens: TokenWithUSD[]): Promise<void> {
    // Process each token in the background without blocking
    Promise.all(
      tokens.map(async (token) => {
        try {
          // Skip if we already have a logo
          if (token.logoURI) {
            return
          }

          // Use tokenImageService which handles caching internally
          // This will only fetch from CoinGecko if not already cached
          const logoURI = await tokenImageService.getTokenImage({
            address: token.address,
            chainId: typeof this.network.chainId === 'number' ? this.network.chainId : 1,
            symbol: token.symbol,
            name: token.name,
          })

          if (logoURI) {
            console.log(`[Aggregator] Fetched logo for ${token.symbol}`)
          }
        } catch (error) {
          // Silently fail - images are not critical for functionality
          console.debug(`[Aggregator] Failed to fetch logo for ${token.symbol}:`, error)
        }
      }),
    ).catch((error) => {
      // Log but don't throw - this is a background operation
      console.debug('[Aggregator] Background image fetching error:', error)
    })
  }
}
