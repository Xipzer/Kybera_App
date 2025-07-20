/**
 * Code by Xipzer
 */

import { ethers } from 'ethers'
import { Network, Wallet } from '../../types'
import { db } from '../database'
import { EVMRpcService } from './evmRpcService'
import { createProviderFromNetwork, getBestRpcUrl } from './provider'
import { TokenDiscoveryService } from './tokenDiscovery'

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
    this.provider = createProviderFromNetwork(network)
    this.rpcService = new EVMRpcService(getBestRpcUrl(network))
    this.tokenDiscovery = new TokenDiscoveryService(network)
  }

  async fetchWalletBalance(wallet: Wallet): Promise<OnChainBalance> {
    const result: OnChainBalance = {
      walletAddress: wallet.address,
      networkId: this.networkId,
      native: '0',
      tokens: [],
      lastUpdated: Date.now(),
    }

    try {
      result.native = ethers.formatEther(await this.provider.getBalance(wallet.address))
      await this.cacheNativeBalance(wallet.address, result.native)
    } catch (error) {
      console.error(`[OnChainData] Failed to fetch native balance, using cache`, error)
      result.native = (await this.getCachedNativeBalance(wallet.address)) || '0'
    }

    if (this.tokenDiscovery.isAvailable()) {
      this.tokenDiscovery.discoverTokens(wallet.address).catch(() => {})
    }

    const tokens = await this.getTokensToCheck(wallet.address)
    const BATCH_SIZE = 5
    for (let i = 0; i < tokens.length; i += BATCH_SIZE) {
      const batchResults = await Promise.all(
        tokens
          .slice(i, i + BATCH_SIZE)
          .map((token) =>
            this.fetchSingleTokenBalance(
              wallet.address,
              token.address,
              token.symbol,
              token.name,
              token.decimals,
            ),
          ),
      )

      for (const tokenBalance of batchResults) {
        if (tokenBalance) {
          result.tokens.push(tokenBalance)
        }
      }
    }

    await this.cacheCompleteBalance(result)

    return result
  }

  private async fetchSingleTokenBalance(
    walletAddress: string,
    tokenAddress: string,
    symbol: string,
    name: string,
    decimals: number,
  ): Promise<TokenBalance | null> {
    const cacheKey = `${walletAddress}_${this.networkId}_${tokenAddress.toLowerCase()}`

    try {
      const balance = ethers.formatUnits(
        await this.rpcService.getTokenBalance(tokenAddress, walletAddress),
        decimals,
      )

      const tokenBalance: TokenBalance = {
        address: tokenAddress.toLowerCase(),
        symbol,
        name,
        decimals,
        balance,
        lastUpdated: Date.now(),
        fromCache: false,
      }

      await this.cacheTokenBalance(cacheKey, tokenBalance)

      return tokenBalance
    } catch (error) {
      console.warn(`[OnChainData] Failed to fetch ${symbol}, checking cache`, error)

      const cached = await this.getCachedTokenBalance(cacheKey)
      if (cached) {
        return {
          ...cached,
          fromCache: true,
        }
      }

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

    const [discovered, cachedTokens] = await Promise.all([
      db.discoveredTokens
        .where('walletAddress')
        .equals(walletAddress)
        .and((item) => item.chainId === this.chainId)
        .toArray(),
      db.tokenBalances
        .where('walletAddress')
        .equals(walletAddress)
        .and((item) => item.networkId === this.networkId)
        .toArray(),
    ])

    for (const token of discovered) {
      tokensToCheck.set(token.tokenAddress.toLowerCase(), {
        address: token.tokenAddress,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
      })
    }

    for (const cached of cachedTokens) {
      if (!tokensToCheck.has(cached.tokenAddress.toLowerCase())) {
        tokensToCheck.set(cached.tokenAddress.toLowerCase(), {
          address: cached.tokenAddress,
          symbol: cached.symbol,
          name: cached.name,
          decimals: cached.decimals,
        })
      }
    }

    return Array.from(tokensToCheck.values())
  }

  private async cacheNativeBalance(walletAddress: string, balance: string): Promise<void> {
    const id = `${walletAddress}_${this.networkId}`

    try {
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

  private async getCachedNativeBalance(walletAddress: string): Promise<string | null> {
    try {
      const cached = await db.walletBalances.get(`${walletAddress}_${this.networkId}`)
      return cached?.nativeBalance || null
    } catch (error) {
      console.error('[OnChainData] Failed to get cached native balance', error)
      return null
    }
  }

  private async cacheTokenBalance(cacheKey: string, balance: TokenBalance): Promise<void> {
    try {

      if (parseFloat(balance.balance) === 0 || balance.balance === '0') {
        await db.tokenBalances.delete(cacheKey)

        const discoveredTokenId = `${cacheKey.split('_')[0]}_${this.chainId}_${balance.address.toLowerCase()}`
        const discoveredToken = await db.discoveredTokens.get(discoveredTokenId)

        if (discoveredToken && !discoveredToken.addedManually) {
          await db.discoveredTokens.delete(discoveredTokenId)
        }

        return
      }

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
        logoURI: undefined,
      })
    } catch (error) {
      console.error(`[OnChainData] Failed to cache token balance for ${balance.symbol}`, error)
    }
  }

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

  private async cacheCompleteBalance(balance: OnChainBalance): Promise<void> {
    try {
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

    } catch (error) {
      console.error(`[OnChainData] Failed to add token ${symbol}`, error)
    }
  }

  async removeTokenFromTracking(walletAddress: string, tokenAddress: string): Promise<void> {
    const id = `${walletAddress}_${this.chainId}_${tokenAddress.toLowerCase()}`

    try {
      await db.discoveredTokens.delete(id)
    } catch (error) {
      console.error(`[OnChainData] Failed to remove token`, error)
    }
  }

  async clearCache(walletAddress: string): Promise<void> {
    try {
      await db.walletBalances.delete(`${walletAddress}_${this.networkId}`)

      const tokens = await db.tokenBalances
        .where('walletAddress')
        .equals(walletAddress)
        .and((item) => item.networkId === this.networkId)
        .toArray()

      for (const token of tokens) {
        await db.tokenBalances.delete(token.id)
      }

    } catch (error) {
      console.error('[OnChainData] Failed to clear cache', error)
    }
  }
}