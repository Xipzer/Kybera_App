/**
 * Clean on-chain data fetching service
 * Handles sequential per-token balance fetching with individual cache fallback
 */

import { ethers } from 'ethers'
import { Network, Wallet } from '../../types'
import { db } from '../storage/database'
import { EVMRpcService } from './evmRpcService'
import { TokenDiscoveryService } from './tokenDiscoveryService'

export interface TokenBalance {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: string
  lastUpdated: number
  fromCache: boolean
}

export interface OnChainBalance {
  walletAddress: string
  networkId: string
  native: string
  tokens: TokenBalance[]
  lastUpdated: number
}

export class OnChainDataService {
  private rpcService: EVMRpcService
  private provider: ethers.JsonRpcProvider
  private networkId: string
  private chainId: number
  private tokenDiscovery: TokenDiscoveryService

  constructor(network: Network) {
    this.networkId = network.id
    this.chainId = typeof network.chainId === 'number' ? network.chainId : 1
    this.provider = new ethers.JsonRpcProvider(network.rpcUrl)
    this.rpcService = new EVMRpcService(network.rpcUrl)
    this.tokenDiscovery = new TokenDiscoveryService(network)
  }

  /**
   * Fetch complete balance for a wallet
   * Sequential token fetching with per-token error handling
   */
  async fetchWalletBalance(wallet: Wallet): Promise<OnChainBalance> {
    console.log(`[OnChainData] Starting balance fetch for ${wallet.address} on ${this.networkId}`)

    const result: OnChainBalance = {
      walletAddress: wallet.address,
      networkId: this.networkId,
      native: '0',
      tokens: [],
      lastUpdated: Date.now(),
    }

    // Step 1: Fetch native balance
    try {
      const nativeWei = await this.provider.getBalance(wallet.address)
      result.native = ethers.formatEther(nativeWei)
      console.log(`[OnChainData] Native balance: ${result.native}`)

      // Cache the native balance
      await this.cacheNativeBalance(wallet.address, result.native)
    } catch (error) {
      console.error(`[OnChainData] Failed to fetch native balance, using cache`, error)
      result.native = (await this.getCachedNativeBalance(wallet.address)) || '0'
    }

    // Step 2: Run automatic token discovery if available (non-blocking)
    if (this.tokenDiscovery.isAvailable()) {
      // Run discovery but don't wait for it to complete
      this.tokenDiscovery
        .discoverTokens(wallet.address)
        .then(async (newTokens) => {
          if (newTokens.length > 0) {
            console.log(`[OnChainData] Token discovery found ${newTokens.length} new tokens`)

            // Cache the balances of newly discovered tokens
            for (const token of newTokens) {
              const cacheKey = `${wallet.address}_${this.networkId}_${token.address.toLowerCase()}`
              const tokenBalance: TokenBalance = {
                address: token.address.toLowerCase(),
                symbol: token.symbol,
                name: token.name,
                decimals: token.decimals,
                balance: token.balance,
                lastUpdated: Date.now(),
                fromCache: false,
              }

              // Cache the token balance
              await this.cacheTokenBalance(cacheKey, tokenBalance)
              console.log(`[OnChainData] Cached discovered token ${token.symbol}: ${token.balance}`)
            }
          }
        })
        .catch((error) => {
          console.debug(`[OnChainData] Token discovery failed:`, error)
        })
    }

    // Step 3: Get list of tokens to check (from discovered tokens)
    const tokens = await this.getTokensToCheck(wallet.address)
    console.log(`[OnChainData] Checking ${tokens.length} tokens`)

    // Step 4: Fetch each token balance sequentially
    for (const token of tokens) {
      const tokenBalance = await this.fetchSingleTokenBalance(
        wallet.address,
        token.address,
        token.symbol,
        token.name,
        token.decimals,
      )

      if (tokenBalance) {
        result.tokens.push(tokenBalance)
      }
    }

    // Cache the complete result
    await this.cacheCompleteBalance(result)

    return result
  }

  /**
   * Fetch balance for a single token with cache fallback
   */
  private async fetchSingleTokenBalance(
    walletAddress: string,
    tokenAddress: string,
    symbol: string,
    name: string,
    decimals: number,
  ): Promise<TokenBalance | null> {
    const cacheKey = `${walletAddress}_${this.networkId}_${tokenAddress.toLowerCase()}`

    try {
      console.log(`[OnChainData] Fetching balance for ${symbol}`)

      // Attempt to fetch fresh balance from blockchain
      const balanceWei = await this.rpcService.getTokenBalance(tokenAddress, walletAddress)
      const balance = ethers.formatUnits(balanceWei, decimals)

      const tokenBalance: TokenBalance = {
        address: tokenAddress.toLowerCase(),
        symbol,
        name,
        decimals,
        balance,
        lastUpdated: Date.now(),
        fromCache: false,
      }

      // Cache the fresh balance
      await this.cacheTokenBalance(cacheKey, tokenBalance)

      console.log(`[OnChainData] ${symbol} balance: ${balance} (fresh)`)
      return tokenBalance
    } catch (error) {
      // Fetch failed, try to use cached balance
      console.warn(`[OnChainData] Failed to fetch ${symbol}, checking cache`, error)

      const cached = await this.getCachedTokenBalance(cacheKey)
      if (cached) {
        console.log(`[OnChainData] ${symbol} balance: ${cached.balance} (cached)`)
        return {
          ...cached,
          fromCache: true,
        }
      }

      // No cache available, return zero balance
      console.log(`[OnChainData] ${symbol} balance: 0 (no cache)`)
      return {
        address: tokenAddress.toLowerCase(),
        symbol,
        name,
        decimals,
        balance: '0',
        lastUpdated: Date.now(),
        fromCache: false,
      }
    }
  }

  /**
   * Get list of tokens to check for a wallet
   */
  private async getTokensToCheck(walletAddress: string): Promise<
    Array<{
      address: string
      symbol: string
      name: string
      decimals: number
    }>
  > {
    const tokensToCheck = new Map<
      string,
      {
        address: string
        symbol: string
        name: string
        decimals: number
      }
    >()

    // First, get discovered tokens from database
    const discovered = await db.discoveredTokens
      .where('walletAddress')
      .equals(walletAddress)
      .and((item) => item.chainId === this.chainId)
      .toArray()

    for (const token of discovered) {
      tokensToCheck.set(token.tokenAddress.toLowerCase(), {
        address: token.tokenAddress,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
      })
    }

    // Also check cached token balances for this wallet/network
    // This ensures we don't lose tokens that were previously fetched
    const cachedTokens = await db.tokenBalances
      .where('walletAddress')
      .equals(walletAddress)
      .and((item) => item.networkId === this.networkId)
      .toArray()

    for (const cached of cachedTokens) {
      // Add to tokens to check if not already present
      if (!tokensToCheck.has(cached.tokenAddress.toLowerCase())) {
        tokensToCheck.set(cached.tokenAddress.toLowerCase(), {
          address: cached.tokenAddress,
          symbol: cached.symbol,
          name: cached.name,
          decimals: cached.decimals,
        })
      }
    }

    console.log(
      `[OnChainData] Found ${tokensToCheck.size} unique tokens to check (${discovered.length} discovered, ${cachedTokens.length} cached)`,
    )

    return Array.from(tokensToCheck.values())
  }

  /**
   * Cache native balance
   */
  private async cacheNativeBalance(walletAddress: string, balance: string): Promise<void> {
    const id = `${walletAddress}_${this.networkId}`

    try {
      // Get existing cache to preserve other fields
      const existing = await db.walletBalances.get(id)

      await db.walletBalances.put({
        id,
        walletAddress,
        networkId: this.networkId,
        nativeBalance: balance,
        nativeUSD: existing?.nativeUSD || 0,
        totalUSD: existing?.totalUSD || 0,
        lastUpdated: Date.now(),
      })
    } catch (error) {
      console.error('[OnChainData] Failed to cache native balance', error)
    }
  }

  /**
   * Get cached native balance
   */
  private async getCachedNativeBalance(walletAddress: string): Promise<string | null> {
    try {
      const cached = await db.walletBalances.get(`${walletAddress}_${this.networkId}`)
      return cached?.nativeBalance || null
    } catch (error) {
      console.error('[OnChainData] Failed to get cached native balance', error)
      return null
    }
  }

  /**
   * Cache a single token balance
   */
  private async cacheTokenBalance(cacheKey: string, balance: TokenBalance): Promise<void> {
    try {
      await db.tokenBalances.put({
        id: cacheKey,
        walletAddress: cacheKey.split('_')[0],
        networkId: this.networkId,
        tokenAddress: balance.address,
        symbol: balance.symbol,
        name: balance.name,
        decimals: balance.decimals,
        balance: balance.balance,
        lastUpdated: balance.lastUpdated,
        logoURI: undefined, // Will be handled by separate service
      })
    } catch (error) {
      console.error(`[OnChainData] Failed to cache token balance for ${balance.symbol}`, error)
    }
  }

  /**
   * Get cached token balance
   */
  private async getCachedTokenBalance(cacheKey: string): Promise<TokenBalance | null> {
    try {
      const cached = await db.tokenBalances.get(cacheKey)
      if (!cached) return null

      return {
        address: cached.tokenAddress,
        symbol: cached.symbol,
        name: cached.name,
        decimals: cached.decimals,
        balance: cached.balance,
        lastUpdated: cached.lastUpdated,
        fromCache: true,
      }
    } catch (error) {
      console.error('[OnChainData] Failed to get cached token balance', error)
      return null
    }
  }

  /**
   * Cache the complete balance result
   */
  private async cacheCompleteBalance(balance: OnChainBalance): Promise<void> {
    try {
      // This is just for tracking last update time
      const id = `${balance.walletAddress}_${this.networkId}`
      const existing = await db.walletBalances.get(id)

      await db.walletBalances.put({
        id,
        walletAddress: balance.walletAddress,
        networkId: this.networkId,
        nativeBalance: balance.native,
        nativeUSD: existing?.nativeUSD || 0,
        totalUSD: existing?.totalUSD || 0,
        lastUpdated: balance.lastUpdated,
      })
    } catch (error) {
      console.error('[OnChainData] Failed to cache complete balance', error)
    }
  }

  /**
   * Add a token to be tracked for a wallet
   */
  async addTokenToTrack(
    walletAddress: string,
    tokenAddress: string,
    symbol: string,
    name: string,
    decimals: number,
  ): Promise<void> {
    const id = `${walletAddress}_${this.chainId}_${tokenAddress.toLowerCase()}`

    try {
      await db.discoveredTokens.put({
        id,
        walletAddress,
        chainId: this.chainId,
        tokenAddress: tokenAddress.toLowerCase(),
        name,
        symbol,
        decimals,
        addedManually: true,
        discoveredAt: Date.now(),
      })

      console.log(`[OnChainData] Added ${symbol} to tracked tokens for ${walletAddress}`)
    } catch (error) {
      console.error(`[OnChainData] Failed to add token ${symbol}`, error)
    }
  }

  /**
   * Remove a token from tracking
   */
  async removeTokenFromTracking(walletAddress: string, tokenAddress: string): Promise<void> {
    const id = `${walletAddress}_${this.chainId}_${tokenAddress.toLowerCase()}`

    try {
      await db.discoveredTokens.delete(id)
      console.log(`[OnChainData] Removed token ${tokenAddress} from tracking`)
    } catch (error) {
      console.error(`[OnChainData] Failed to remove token`, error)
    }
  }

  /**
   * Clear all cached data for a wallet on this network
   */
  async clearCache(walletAddress: string): Promise<void> {
    try {
      // Clear native balance cache
      await db.walletBalances.delete(`${walletAddress}_${this.networkId}`)

      // Clear token balance caches
      const tokens = await db.tokenBalances
        .where('walletAddress')
        .equals(walletAddress)
        .and((item) => item.networkId === this.networkId)
        .toArray()

      for (const token of tokens) {
        await db.tokenBalances.delete(token.id)
      }

      console.log(`[OnChainData] Cleared cache for ${walletAddress} on ${this.networkId}`)
    } catch (error) {
      console.error('[OnChainData] Failed to clear cache', error)
    }
  }
}
