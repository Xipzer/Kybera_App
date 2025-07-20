/**
 * Code by Xipzer
 */

import { Network, Wallet } from '../../types'
import { OnChainBalance, OnChainDataService } from './onChainDataService'
import { PriceData, PriceService } from './priceService'
import { db } from '../database'
import { tokenImageService } from '../tokenImageService'

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

    const chainId = typeof network.chainId === 'number' ? network.chainId : 1
    this.priceService = new PriceService(network.id, chainId, this.getNativeTokenId(network.id))
  }

  async loadCachedBalance(wallet: Wallet): Promise<AggregatedBalance | null> {
    const id = `${wallet.address}_${this.network.id}`

    try {
      const cachedWalletBalance = await db.walletBalances.get(id)
      if (!cachedWalletBalance) return null

      const cachedTokens = await db.tokenBalances
        .where('walletAddress')
        .equals(wallet.address)
        .and((item) => item.networkId === this.network.id)
        .toArray()

      const tokens: TokenWithUSD[] = cachedTokens.map((t) => ({
        address: t.tokenAddress,
        symbol: t.symbol,
        name: t.name,
        decimals: t.decimals,
        balance: t.balance,
        usdValue: t.usdValue || 0,
        usd24hChange: 0,
        fromCache: true,
        logoURI: t.logoURI,
      }))

      return {
        walletAddress: wallet.address,
        networkId: this.network.id,
        native: cachedWalletBalance.nativeBalance,
        nativeUSD: cachedWalletBalance.nativeUSD,
        native24hChange: 0,
        tokens,
        totalUSD: cachedWalletBalance.totalUSD,
        total24hChange: 0,
        lastUpdated: cachedWalletBalance.lastUpdated,
        dataQuality: {
          onChainFromCache: true,
          pricesFromCache: true,
        },
      }
    } catch (error) {
      console.error('[Aggregator] Failed to load cached balance', error)
      return null
    }
  }

  async fetchBalance(wallet: Wallet, isManualRefresh: boolean = false): Promise<AggregatedBalance> {
    const onChainData = await this.onChainService.fetchWalletBalance(wallet)
    const priceData = await this.priceService.fetchPrices(
      onChainData.tokens.map((t) => t.address),
      isManualRefresh,
    )
    const aggregated = await this.aggregateData(onChainData, priceData)
    await this.cacheAggregatedBalance(aggregated)
    this.fetchMissingTokenImages(aggregated.tokens)
    return aggregated
  }

  private async aggregateData(
    onChain: OnChainBalance,
    prices: PriceData,
  ): Promise<AggregatedBalance> {
    const nativeUSD = parseFloat(onChain.native || '0') * prices.nativePrice

    const logos = await Promise.all(onChain.tokens.map((t) => this.getTokenLogo(t.address)))

    const tokensWithUSD: TokenWithUSD[] = []
    let totalTokensUSD = 0

    for (let i = 0; i < onChain.tokens.length; i++) {
      const token = onChain.tokens[i]
      const tokenPrice = prices.tokenPrices.get(token.address.toLowerCase())
      const balance = parseFloat(token.balance || '0')
      const usdValue = balance * (tokenPrice?.usdPrice || 0)

      tokensWithUSD.push({
        ...token,
        usdValue,
        usd24hChange: tokenPrice?.usd24hChange || 0,
        logoURI: logos[i],
      })

      totalTokensUSD += usdValue
    }

    const totalUSD = nativeUSD + totalTokensUSD

    const total24hChange = this.calculateWeighted24hChange(
      nativeUSD,
      prices.native24hChange,
      tokensWithUSD,
    )

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
        onChainFromCache: onChain.tokens.some((t) => t.fromCache),
        pricesFromCache: Array.from(prices.tokenPrices.values()).some((p) => p.fromCache),
      },
    }
  }

  private calculateWeighted24hChange(
    nativeUSD: number,
    native24hChange: number,
    tokens: TokenWithUSD[],
  ): number {
    const totalUSD = nativeUSD + tokens.reduce((sum, t) => sum + t.usdValue, 0)
    if (totalUSD === 0) return 0

    let weightedChange = (nativeUSD * native24hChange) / totalUSD

    for (const token of tokens) {
      weightedChange += (token.usdValue / totalUSD) * token.usd24hChange
    }

    return weightedChange
  }

  private async cacheAggregatedBalance(balance: AggregatedBalance): Promise<void> {
    const id = `${balance.walletAddress}_${balance.networkId}`

    try {
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

      if (balance.tokens.length > 0) {
        const tokenRecords = balance.tokens.map((token) => ({
          id: `${balance.walletAddress}_${balance.networkId}_${token.address}`,
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
        }))
        await db.tokenBalances.bulkPut(tokenRecords)
      }

    } catch (error) {
      console.error('[Aggregator] Failed to cache aggregated balance', error)
    }
  }

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

  private getNativeTokenId(networkId: string): string {
    const mapping: Record<string, string> = {
      ethereum: 'ethereum',
      polygon: 'matic-network',
      arbitrum: 'ethereum',
      optimism: 'ethereum',
      bsc: 'binancecoin',
      avalanche: 'avalanche-2',
      fantom: 'fantom',
      gnosis: 'xdai',
      celo: 'celo',
      harmony: 'harmony',
      moonriver: 'moonriver',
      moonbeam: 'moonbeam',
      metis: 'metis-token',
      aurora: 'ethereum',
      base: 'ethereum',
      scroll: 'ethereum',
      linea: 'ethereum',
      'solana-mainnet': 'solana',
      'solana-devnet': 'solana',
      'solana-testnet': 'solana',
    }

    return mapping[networkId] || 'ethereum'
  }

  async updatePricesOnly(wallet: Wallet): Promise<AggregatedBalance | null> {
    const cached = await this.loadCachedBalance(wallet)
    if (!cached) return null

    const priceData = await this.priceService.fetchPrices(
      cached.tokens.map((t) => t.address),
      true,
    )

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

    const aggregated = await this.aggregateData(onChainData, priceData)
    await this.cacheAggregatedBalance(aggregated)
    return aggregated
  }

  async addToken(
    wallet: Wallet,
    tokenAddress: string,
    symbol: string,
    name: string,
    decimals: number,
  ): Promise<void> {
    await this.onChainService.addTokenToTrack(wallet.address, tokenAddress, symbol, name, decimals)
  }

  async removeToken(wallet: Wallet, tokenAddress: string): Promise<void> {
    await this.onChainService.removeTokenFromTracking(wallet.address, tokenAddress)
  }

  async clearCache(wallet: Wallet): Promise<void> {
    await this.onChainService.clearCache(wallet.address)
    await this.priceService.clearCache()
  }

  private async fetchMissingTokenImages(tokens: TokenWithUSD[]): Promise<void> {
    Promise.all(
      tokens
        .filter((token) => !token.logoURI)
        .map((token) =>
          tokenImageService
            .getTokenImage({
              address: token.address,
              chainId: typeof this.network.chainId === 'number' ? this.network.chainId : 1,
              symbol: token.symbol,
              name: token.name,
            })
            .catch(() => {}),
        ),
    ).catch(() => {})
  }
}