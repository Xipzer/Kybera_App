import { db } from '../../storage/database'
import { blockchainEventBus } from '../core/eventBus'
import { TokenBalance } from '../../../types'
import { EVMService } from '../evmService'
import { SVMService } from '../svmService'
import { AlchemyService } from '../alchemyService'

export interface TokenDiscoveryConfig {
  maxTokensPerWallet: number
  priorityFactors: {
    manual: number
    balance: number
    activity: number
    age: number
    popularity: number
  }
  discoveryStrategies: string[]
  activityWindow: number // Time window for recent activity (ms)
}

export interface TokenInfo extends Partial<TokenBalance> {
  address: string
  name?: string
  symbol?: string
  decimals?: number
  balance?: string
  logoURI?: string
  metadata?: {
    isManual?: boolean
    isHistorical?: boolean
    lastSeen?: number
    discoverySource?: string
    popularity?: number
  }
}

interface TokenScore {
  token: TokenInfo
  score: number
  factors: {
    isManual: boolean
    hasBalance: boolean
    recentActivity: boolean
    age: number
    popularity: number
  }
}

export class IntelligentTokenDiscovery {
  private config: TokenDiscoveryConfig = {
    maxTokensPerWallet: 100, // Increased from 50
    priorityFactors: {
      manual: 1000,     // Manually added tokens always highest priority
      balance: 100,     // Tokens with balance
      activity: 50,     // Recent transaction activity
      age: 10,          // How long we've known about the token
      popularity: 25    // Popular tokens get some priority
    },
    discoveryStrategies: [
      'manual',         // User-added tokens
      'historical',     // Previously seen tokens
      'alchemy',        // Alchemy automatic discovery
      'popular',        // Popular tokens on chain
      'defi'           // DeFi protocol tokens
    ],
    activityWindow: 7 * 24 * 60 * 60 * 1000 // 7 days
  }

  private popularTokensByChain: Map<number, TokenInfo[]> = new Map()
  private defiTokensByChain: Map<number, TokenInfo[]> = new Map()

  constructor(customConfig?: Partial<TokenDiscoveryConfig>) {
    if (customConfig) {
      this.config = {
        ...this.config,
        ...customConfig,
        priorityFactors: {
          ...this.config.priorityFactors,
          ...customConfig.priorityFactors
        }
      }
    }
    this.initializeTokenLists()
  }

  private initializeTokenLists(): void {
    // Initialize popular tokens for major chains
    // Ethereum mainnet (1)
    this.popularTokensByChain.set(1, [
      { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { address: '0x6b175474e89094c44da98b954eedeac495271d0f', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', symbol: 'WBTC', name: 'Wrapped BTC', decimals: 8 },
      { address: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 }
    ])

    // BSC mainnet (56)
    this.popularTokensByChain.set(56, [
      { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', symbol: 'USDC', name: 'USD Coin', decimals: 18 },
      { address: '0x55d398326f99059ff775485246999027b3197955', symbol: 'USDT', name: 'Tether USD', decimals: 18 },
      { address: '0xe9e7cea3dedca5984780bafc599bd69add087d56', symbol: 'BUSD', name: 'BUSD Token', decimals: 18 },
      { address: '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c', symbol: 'WBNB', name: 'Wrapped BNB', decimals: 18 }
    ])

    // Polygon mainnet (137)
    this.popularTokensByChain.set(137, [
      { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
      { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT', name: 'Tether USD', decimals: 6 },
      { address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', symbol: 'DAI', name: 'Dai Stablecoin', decimals: 18 },
      { address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', symbol: 'WMATIC', name: 'Wrapped Matic', decimals: 18 }
    ])

    // Initialize DeFi tokens
    this.initializeDefiTokens()
  }

  private initializeDefiTokens(): void {
    // Ethereum DeFi tokens
    this.defiTokensByChain.set(1, [
      { address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', symbol: 'UNI', name: 'Uniswap', decimals: 18 },
      { address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0', symbol: 'MATIC', name: 'Matic Token', decimals: 18 },
      { address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', symbol: 'AAVE', name: 'Aave Token', decimals: 18 },
      { address: '0xc00e94cb662c3520282e6f5717214004a7f26888', symbol: 'COMP', name: 'Compound', decimals: 18 },
      { address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', symbol: 'MKR', name: 'Maker', decimals: 18 }
    ])

    // BSC DeFi tokens
    this.defiTokensByChain.set(56, [
      { address: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82', symbol: 'CAKE', name: 'PancakeSwap Token', decimals: 18 },
      { address: '0xbf5140a22578168fd562dccf235e5d43a02ce9b1', symbol: 'UNI', name: 'Uniswap', decimals: 18 },
      { address: '0xfb6115445bff7b52feb98650c87f44907e58f802', symbol: 'AAVE', name: 'Aave Token', decimals: 18 }
    ])
  }

  async discoverTokens(
    walletAddress: string,
    chainId: number,
    network: any,
    options?: {
      forceRefresh?: boolean
      includeZeroBalance?: boolean
      strategies?: string[]
    }
  ): Promise<TokenInfo[]> {
    console.log(`[TokenDiscovery] Starting discovery for ${walletAddress} on chain ${chainId}`)
    
    // Emit start event
    blockchainEventBus.emit('token:discovery:start', {
      wallet: walletAddress,
      chainId,
      count: 0
    })

    // Use provided strategies or default
    const strategies = options?.strategies || this.config.discoveryStrategies

    // Execute discovery strategies in parallel
    const strategyPromises = strategies.map(strategy =>
      this.executeStrategy(strategy, walletAddress, chainId, network)
        .then(tokens => {
          console.log(`[TokenDiscovery] Strategy ${strategy} found ${tokens.length} tokens`)
          return tokens
        })
        .catch(error => {
          console.error(`[TokenDiscovery] Strategy ${strategy} failed:`, error)
          return []
        })
    )

    const results = await Promise.all(strategyPromises)
    const allTokens = results.flat()

    console.log(`[TokenDiscovery] Total tokens found: ${allTokens.length}`)

    // Score and sort tokens
    const scoredTokens = await this.scoreTokens(
      allTokens,
      walletAddress,
      chainId
    )

    // Filter based on options
    let filteredTokens = scoredTokens
    if (!options?.includeZeroBalance) {
      filteredTokens = scoredTokens.filter(
        st => st.factors.hasBalance || st.factors.isManual
      )
    }

    // Sort by score and limit
    filteredTokens.sort((a, b) => b.score - a.score)
    const selectedTokens = filteredTokens
      .slice(0, this.config.maxTokensPerWallet)
      .map(st => st.token)

    console.log(`[TokenDiscovery] Selected ${selectedTokens.length} tokens after scoring`)

    // Cache discovery results
    await this.cacheDiscoveryResults(
      walletAddress,
      chainId,
      selectedTokens
    )

    // Emit completion event
    blockchainEventBus.emit('token:discovery:complete', {
      wallet: walletAddress,
      chainId,
      count: selectedTokens.length
    })

    return selectedTokens
  }

  private async executeStrategy(
    strategy: string,
    walletAddress: string,
    chainId: number,
    network: any
  ): Promise<TokenInfo[]> {
    switch (strategy) {
      case 'manual':
        return this.getManualTokens(walletAddress, chainId)

      case 'historical':
        return this.getHistoricalTokens(walletAddress, chainId)

      case 'alchemy':
        return this.getAlchemyTokens(walletAddress, chainId, network)

      case 'popular':
        return this.getPopularTokens(chainId)

      case 'defi':
        return this.getDefiTokens(chainId)

      default:
        console.warn(`[TokenDiscovery] Unknown strategy: ${strategy}`)
        return []
    }
  }

  private async getManualTokens(
    walletAddress: string,
    chainId: number
  ): Promise<TokenInfo[]> {
    const tokens = await db.discoveredTokens
      .where('walletAddress').equals(walletAddress)
      .and(token => token.chainId === chainId.toString())
      .and(token => token.addedManually === true)
      .toArray()

    return tokens.map(t => ({
      address: t.tokenAddress.toLowerCase(),
      name: t.name,
      symbol: t.symbol,
      decimals: t.decimals,
      balance: '0', // Will be updated later
      logoURI: t.logoURI,
      metadata: { 
        isManual: true,
        discoverySource: 'manual'
      }
    }))
  }

  private async getHistoricalTokens(
    walletAddress: string,
    chainId: number
  ): Promise<TokenInfo[]> {
    // Get tokens from transaction history
    const transactions = await db.transactions
      .where('from').equals(walletAddress)
      .or('to').equals(walletAddress)
      .and(tx => tx.network === chainId.toString())
      .and(tx => tx.tokenAddress !== undefined)
      .toArray()

    const tokenAddresses = new Set(
      transactions
        .filter(tx => tx.tokenAddress)
        .map(tx => tx.tokenAddress!.toLowerCase())
    )

    // Get token metadata
    const tokens: TokenInfo[] = []
    for (const address of tokenAddresses) {
      const metadata = await db.tokenMetadata
        .get(`${chainId}_${address}`)

      if (metadata) {
        const lastTransaction = Math.max(...transactions
          .filter(tx => tx.tokenAddress?.toLowerCase() === address)
          .map(tx => tx.timestamp.getTime())
        )

        tokens.push({
          address,
          name: metadata.name,
          symbol: metadata.symbol,
          decimals: metadata.decimals,
          balance: '0',
          logoURI: metadata.logoURI,
          metadata: { 
            isHistorical: true,
            lastSeen: lastTransaction,
            discoverySource: 'historical'
          }
        })
      }
    }

    return tokens
  }

  private async getAlchemyTokens(
    walletAddress: string,
    chainId: number,
    network: any
  ): Promise<TokenInfo[]> {
    if (!network.alchemyRpcUrl) {
      return []
    }

    try {
      const alchemyService = AlchemyService.getInstance(network)
      if (!alchemyService || !(await alchemyService.canUseAlchemy())) {
        return []
      }

      const balances = await alchemyService.getTokenBalances(walletAddress)
      
      // Get metadata for tokens with balance
      const tokensWithBalance = balances.tokenBalances.filter(tb => {
        const balance = BigInt(tb.tokenBalance || '0')
        return balance > 0n
      })

      if (tokensWithBalance.length === 0) {
        return []
      }

      const metadata = await alchemyService.getTokenMetadata(
        tokensWithBalance.map(tb => tb.contractAddress)
      )

      return tokensWithBalance.map((tb, index) => {
        const meta = metadata[index]
        return {
          address: tb.contractAddress.toLowerCase(),
          name: meta?.name || 'Unknown Token',
          symbol: meta?.symbol || 'UNKNOWN',
          decimals: meta?.decimals || 18,
          balance: tb.tokenBalance || '0',
          logoURI: meta?.logo,
          metadata: {
            discoverySource: 'alchemy'
          }
        }
      }).filter(t => t.symbol !== 'UNKNOWN') // Filter out tokens without metadata
    } catch (error) {
      console.error('[TokenDiscovery] Alchemy discovery failed:', error)
      return []
    }
  }

  private getPopularTokens(chainId: number): TokenInfo[] {
    const popular = this.popularTokensByChain.get(chainId) || []
    return popular.map(token => ({
      ...token,
      metadata: {
        discoverySource: 'popular',
        popularity: 100 // High popularity score
      }
    }))
  }

  private getDefiTokens(chainId: number): TokenInfo[] {
    const defi = this.defiTokensByChain.get(chainId) || []
    return defi.map(token => ({
      ...token,
      metadata: {
        discoverySource: 'defi',
        popularity: 80 // Medium-high popularity score
      }
    }))
  }

  private async scoreTokens(
    tokens: TokenInfo[],
    walletAddress: string,
    chainId: number
  ): Promise<TokenScore[]> {
    const uniqueTokens = this.deduplicateTokens(tokens)

    return Promise.all(uniqueTokens.map(async token => {
      let score = 0
      const factors = {
        isManual: false,
        hasBalance: false,
        recentActivity: false,
        age: 0,
        popularity: 0
      }

      // Check if manually added
      if (token.metadata?.isManual) {
        factors.isManual = true
        score += this.config.priorityFactors.manual
      }

      // Check balance
      const balance = parseFloat(token.balance || '0')
      if (balance > 0) {
        factors.hasBalance = true
        score += this.config.priorityFactors.balance
        // Additional score based on balance magnitude (logarithmic)
        score += Math.log10(balance + 1) * 10
      }

      // Check recent activity
      const recentTx = await this.hasRecentActivity(
        walletAddress,
        token.address,
        chainId
      )
      if (recentTx) {
        factors.recentActivity = true
        score += this.config.priorityFactors.activity
      }

      // Age factor
      const discoveryRecord = await db.discoveredTokens
        .get(`${walletAddress}_${chainId}_${token.address}`)

      if (discoveryRecord) {
        factors.age = Date.now() - discoveryRecord.discoveredAt
        const daysKnown = factors.age / (1000 * 60 * 60 * 24)
        score += Math.min(
          this.config.priorityFactors.age,
          daysKnown * 2 // 2 points per day, up to max
        )
      }

      // Popularity factor
      if (token.metadata?.popularity) {
        factors.popularity = token.metadata.popularity
        score += (token.metadata.popularity / 100) * this.config.priorityFactors.popularity
      }

      return { token, score, factors }
    }))
  }

  private deduplicateTokens(tokens: TokenInfo[]): TokenInfo[] {
    const seen = new Map<string, TokenInfo>()

    for (const token of tokens) {
      const key = token.address.toLowerCase()
      const existing = seen.get(key)

      // Keep token with more metadata or manual flag
      if (!existing || 
          token.metadata?.isManual || 
          this.hasMoreMetadata(token, existing)) {
        seen.set(key, token)
      }
    }

    return Array.from(seen.values())
  }

  private hasMoreMetadata(a: TokenInfo, b: TokenInfo): boolean {
    const scoreA = (a.name ? 1 : 0) + 
                   (a.symbol ? 1 : 0) + 
                   (a.logoURI ? 1 : 0) + 
                   (a.balance && a.balance !== '0' ? 2 : 0)
    const scoreB = (b.name ? 1 : 0) + 
                   (b.symbol ? 1 : 0) + 
                   (b.logoURI ? 1 : 0) + 
                   (b.balance && b.balance !== '0' ? 2 : 0)
    return scoreA > scoreB
  }

  private async hasRecentActivity(
    walletAddress: string,
    tokenAddress: string,
    chainId: number
  ): Promise<boolean> {
    const cutoffTime = Date.now() - this.config.activityWindow

    const recentTx = await db.transactions
      .where('from').equals(walletAddress)
      .or('to').equals(walletAddress)
      .and(tx => 
        tx.network === chainId.toString() &&
        tx.tokenAddress?.toLowerCase() === tokenAddress.toLowerCase() &&
        tx.timestamp.getTime() > cutoffTime
      )
      .first()

    return !!recentTx
  }

  private async cacheDiscoveryResults(
    walletAddress: string,
    chainId: number,
    tokens: TokenInfo[]
  ): Promise<void> {
    const now = Date.now()

    const updates = tokens.map(token => ({
      id: `${walletAddress}_${chainId}_${token.address}`,
      walletAddress,
      chainId: chainId.toString(),
      tokenAddress: token.address,
      symbol: token.symbol || 'UNKNOWN',
      name: token.name || 'Unknown Token',
      decimals: token.decimals || 18,
      logoURI: token.logoURI,
      addedManually: token.metadata?.isManual || false,
      discoveredAt: now,
      lastSeen: now,
      tags: token.metadata?.discoverySource ? [token.metadata.discoverySource] : []
    }))

    if (updates.length > 0) {
      await db.discoveredTokens.bulkPut(updates)
    }
  }

  /**
   * Manually add a token for a wallet
   */
  async addManualToken(
    walletAddress: string,
    chainId: number,
    tokenAddress: string,
    tokenInfo: Partial<TokenInfo>
  ): Promise<void> {
    const now = Date.now()

    await db.discoveredTokens.put({
      id: `${walletAddress}_${chainId}_${tokenAddress.toLowerCase()}`,
      walletAddress,
      chainId: chainId.toString(),
      tokenAddress: tokenAddress.toLowerCase(),
      symbol: tokenInfo.symbol || 'UNKNOWN',
      name: tokenInfo.name || 'Unknown Token',
      decimals: tokenInfo.decimals || 18,
      logoURI: tokenInfo.logoURI,
      addedManually: true,
      discoveredAt: now,
      lastSeen: now,
      tags: ['manual']
    })

    // Emit event to trigger re-discovery
    blockchainEventBus.emit('token:manual:added', {
      wallet: walletAddress,
      chainId,
      token: tokenAddress
    })
  }

  /**
   * Remove a manually added token
   */
  async removeManualToken(
    walletAddress: string,
    chainId: number,
    tokenAddress: string
  ): Promise<void> {
    await db.discoveredTokens.delete(
      `${walletAddress}_${chainId}_${tokenAddress.toLowerCase()}`
    )

    blockchainEventBus.emit('token:manual:removed', {
      wallet: walletAddress,
      chainId,
      token: tokenAddress
    })
  }

  /**
   * Get discovery stats
   */
  async getDiscoveryStats(walletAddress: string, chainId: number): Promise<{
    totalDiscovered: number
    manualTokens: number
    tokensBySource: Record<string, number>
    lastDiscovery?: number
  }> {
    const tokens = await db.discoveredTokens
      .where('walletAddress').equals(walletAddress)
      .and(token => token.chainId === chainId.toString())
      .toArray()

    const tokensBySource: Record<string, number> = {}
    let lastDiscovery = 0

    for (const token of tokens) {
      // Count by source
      const source = token.tags?.[0] || 'unknown'
      tokensBySource[source] = (tokensBySource[source] || 0) + 1

      // Track last discovery time
      if (token.lastSeen > lastDiscovery) {
        lastDiscovery = token.lastSeen
      }
    }

    return {
      totalDiscovered: tokens.length,
      manualTokens: tokens.filter(t => t.addedManually).length,
      tokensBySource,
      lastDiscovery: lastDiscovery || undefined
    }
  }
}

// Create singleton instance
export const tokenDiscoveryService = new IntelligentTokenDiscovery()