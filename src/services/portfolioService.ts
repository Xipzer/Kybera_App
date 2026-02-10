/**
 * Code by Xipzer
 */

import { db, StoredTokenBalance, StoredWalletBalance } from './database'
import {
  TradeRecord,
  PortfolioSnapshot,
  TokenPnL,
  PortfolioSummary,
  PortfolioTimeframe,
} from '../types/portfolio'

const TIMEFRAME_MS: Record<PortfolioTimeframe, number> = {
  '1h': 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  all: Number.MAX_SAFE_INTEGER,
}

class PortfolioService {
  private snapshotTimer: ReturnType<typeof setInterval> | null = null

  async recordTrade(trade: Omit<TradeRecord, 'id'>): Promise<TradeRecord> {
    const id = `trade_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const record: TradeRecord = { id, ...trade }

    await db.tradeRecords.put({
      id: record.id,
      walletAddress: record.walletAddress,
      networkId: record.networkId,
      tokenInAddress: record.tokenInAddress,
      tokenInSymbol: record.tokenInSymbol,
      tokenInAmount: record.tokenInAmount,
      tokenOutAddress: record.tokenOutAddress,
      tokenOutSymbol: record.tokenOutSymbol,
      tokenOutAmount: record.tokenOutAmount,
      tokenInPriceUsd: record.tokenInPriceUsd,
      tokenOutPriceUsd: record.tokenOutPriceUsd,
      totalValueUsd: record.totalValueUsd,
      txHash: record.txHash,
      timestamp: record.timestamp,
      source: record.source,
      researchId: record.researchId,
    })

    return record
  }

  async getTradeHistory(
    walletAddress: string,
    options?: { networkId?: string; limit?: number; offset?: number },
  ): Promise<TradeRecord[]> {
    const { networkId, limit = 100, offset = 0 } = options ?? {}

    let collection = db.tradeRecords
      .where('walletAddress')
      .equals(walletAddress)

    const allRecords = await collection.reverse().sortBy('timestamp')

    const filtered = networkId
      ? allRecords.filter((r) => r.networkId === networkId)
      : allRecords

    return filtered.slice(offset, offset + limit).map((r) => ({
      ...r,
      source: r.source as TradeRecord['source'],
    }))
  }

  async takeSnapshot(walletAddress: string): Promise<PortfolioSnapshot> {
    const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
    const timestamp = Date.now()

    const walletBalances: StoredWalletBalance[] = await db.walletBalances
      .where('walletAddress')
      .equals(walletAddress)
      .toArray()

    const tokenBalances: StoredTokenBalance[] = await db.tokenBalances
      .where('walletAddress')
      .equals(walletAddress)
      .toArray()

    const networkBreakdown = walletBalances.map((wb) => ({
      networkId: wb.networkId,
      valueUsd: wb.totalUSD,
    }))

    const totalValueUsd = networkBreakdown.reduce((sum, nb) => sum + nb.valueUsd, 0)

    const tokenBreakdown = tokenBalances
      .filter((tb) => tb.usdValue !== undefined && tb.usdValue > 0)
      .sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
      .slice(0, 20)
      .map((tb) => ({
        tokenAddress: tb.tokenAddress,
        symbol: tb.symbol,
        networkId: tb.networkId,
        balance: tb.balance,
        valueUsd: tb.usdValue ?? 0,
        priceUsd: tb.usdValue && parseFloat(tb.balance) > 0
          ? tb.usdValue / parseFloat(tb.balance)
          : 0,
      }))

    const snapshot: PortfolioSnapshot = {
      id,
      walletAddress,
      timestamp,
      totalValueUsd,
      networkBreakdown,
      tokenBreakdown,
    }

    await db.portfolioSnapshots.put({
      id: snapshot.id,
      walletAddress: snapshot.walletAddress,
      timestamp: snapshot.timestamp,
      totalValueUsd: snapshot.totalValueUsd,
      networkBreakdown: JSON.stringify(snapshot.networkBreakdown),
      tokenBreakdown: JSON.stringify(snapshot.tokenBreakdown),
    })

    return snapshot
  }

  async getSnapshots(
    walletAddress: string,
    timeframe: PortfolioTimeframe,
  ): Promise<PortfolioSnapshot[]> {
    const since = timeframe === 'all' ? 0 : Date.now() - TIMEFRAME_MS[timeframe]

    const stored = await db.portfolioSnapshots
      .where('walletAddress')
      .equals(walletAddress)
      .filter((s) => s.timestamp >= since)
      .sortBy('timestamp')

    return stored.map((s) => ({
      id: s.id,
      walletAddress: s.walletAddress,
      timestamp: s.timestamp,
      totalValueUsd: s.totalValueUsd,
      networkBreakdown: JSON.parse(s.networkBreakdown),
      tokenBreakdown: JSON.parse(s.tokenBreakdown),
    }))
  }

  async calculateTokenPnL(
    walletAddress: string,
    tokenAddress: string,
    networkId: string,
  ): Promise<TokenPnL> {
    const allTrades = await db.tradeRecords
      .where('walletAddress')
      .equals(walletAddress)
      .filter((t) => t.networkId === networkId)
      .sortBy('timestamp')

    const buyTrades = allTrades.filter(
      (t) => t.tokenOutAddress.toLowerCase() === tokenAddress.toLowerCase(),
    )
    const sellTrades = allTrades.filter(
      (t) => t.tokenInAddress.toLowerCase() === tokenAddress.toLowerCase(),
    )

    const totalBought = buyTrades.reduce((sum, t) => {
      const tokenAmount = parseFloat(t.tokenOutAmount)
      return sum + tokenAmount * t.tokenOutPriceUsd
    }, 0)

    const totalSold = sellTrades.reduce((sum, t) => {
      const tokenAmount = parseFloat(t.tokenInAmount)
      return sum + tokenAmount * t.tokenInPriceUsd
    }, 0)

    const totalTokensBought = buyTrades.reduce(
      (sum, t) => sum + parseFloat(t.tokenOutAmount),
      0,
    )
    const totalTokensSold = sellTrades.reduce(
      (sum, t) => sum + parseFloat(t.tokenInAmount),
      0,
    )

    const currentBalanceRecord = await db.tokenBalances
      .where('walletAddress')
      .equals(walletAddress)
      .filter(
        (tb) =>
          tb.networkId === networkId &&
          tb.tokenAddress.toLowerCase() === tokenAddress.toLowerCase(),
      )
      .first()

    const currentBalance = currentBalanceRecord?.balance ?? '0'
    const currentValueUsd = currentBalanceRecord?.usdValue ?? 0
    const currentBalanceNum = parseFloat(currentBalance)
    const currentPriceUsd = currentBalanceNum > 0 ? currentValueUsd / currentBalanceNum : 0

    const avgBuyPrice = totalTokensBought > 0 ? totalBought / totalTokensBought : 0
    const avgSellPrice = totalTokensSold > 0 ? totalSold / totalTokensSold : 0

    const realizedPnl = totalTokensSold > 0 ? totalSold - totalTokensSold * avgBuyPrice : 0

    const remainingCostBasis = currentBalanceNum * avgBuyPrice
    const unrealizedPnl = currentValueUsd - remainingCostBasis

    const totalPnl = realizedPnl + unrealizedPnl
    const pnlPercent = totalBought > 0 ? (totalPnl / totalBought) * 100 : 0

    const allRelevantTrades = [...buyTrades, ...sellTrades].sort(
      (a, b) => a.timestamp - b.timestamp,
    )
    const firstTradeAt = allRelevantTrades.length > 0 ? allRelevantTrades[0].timestamp : 0
    const lastTradeAt =
      allRelevantTrades.length > 0
        ? allRelevantTrades[allRelevantTrades.length - 1].timestamp
        : 0

    const tokenSymbol =
      buyTrades[0]?.tokenOutSymbol ?? sellTrades[0]?.tokenInSymbol ?? currentBalanceRecord?.symbol ?? ''

    return {
      tokenAddress,
      tokenSymbol,
      networkId,
      totalBought,
      totalSold,
      currentBalance,
      currentValueUsd,
      currentPriceUsd,
      realizedPnl,
      unrealizedPnl,
      totalPnl,
      pnlPercent,
      avgBuyPrice,
      avgSellPrice,
      buyCount: buyTrades.length,
      sellCount: sellTrades.length,
      firstTradeAt,
      lastTradeAt,
    }
  }

  async getPortfolioSummary(walletAddress: string): Promise<PortfolioSummary> {
    const allTrades = await db.tradeRecords
      .where('walletAddress')
      .equals(walletAddress)
      .toArray()

    const tokenKeys = new Set<string>()
    for (const trade of allTrades) {
      tokenKeys.add(`${trade.networkId}:${trade.tokenOutAddress}`)
      tokenKeys.add(`${trade.networkId}:${trade.tokenInAddress}`)
    }

    const pnls: TokenPnL[] = []
    for (const key of tokenKeys) {
      const [networkId, tokenAddress] = key.split(':')
      const pnl = await this.calculateTokenPnL(walletAddress, tokenAddress, networkId)
      if (pnl.buyCount > 0 || pnl.sellCount > 0) {
        pnls.push(pnl)
      }
    }

    const walletBalances = await db.walletBalances
      .where('walletAddress')
      .equals(walletAddress)
      .toArray()

    const totalValueUsd = walletBalances.reduce((sum, wb) => sum + wb.totalUSD, 0)

    const totalBought = pnls.reduce((sum, p) => sum + p.totalBought, 0)
    const totalPnl = pnls.reduce((sum, p) => sum + p.totalPnl, 0)
    const totalPnlPercent = totalBought > 0 ? (totalPnl / totalBought) * 100 : 0

    const now = Date.now()
    const snapshotChanges = await this.calculateSnapshotChanges(walletAddress, now, totalValueUsd)

    const tradedPnls = pnls.filter((p) => p.totalBought > 0)
    const sorted = [...tradedPnls].sort((a, b) => b.pnlPercent - a.pnlPercent)
    const bestPerformer =
      sorted.length > 0
        ? { symbol: sorted[0].tokenSymbol, pnlPercent: sorted[0].pnlPercent }
        : undefined
    const worstPerformer =
      sorted.length > 0
        ? {
            symbol: sorted[sorted.length - 1].tokenSymbol,
            pnlPercent: sorted[sorted.length - 1].pnlPercent,
          }
        : undefined

    const tokenBalances = await db.tokenBalances
      .where('walletAddress')
      .equals(walletAddress)
      .toArray()

    const holdingsByValue = tokenBalances
      .filter((tb) => tb.usdValue !== undefined && tb.usdValue > 0)
      .sort((a, b) => (b.usdValue ?? 0) - (a.usdValue ?? 0))
      .slice(0, 10)

    const topHoldings = holdingsByValue.map((tb) => ({
      symbol: tb.symbol,
      percentage: totalValueUsd > 0 ? ((tb.usdValue ?? 0) / totalValueUsd) * 100 : 0,
      valueUsd: tb.usdValue ?? 0,
    }))

    return {
      totalValueUsd,
      totalPnl,
      totalPnlPercent,
      ...snapshotChanges,
      bestPerformer,
      worstPerformer,
      topHoldings,
    }
  }

  private async calculateSnapshotChanges(
    walletAddress: string,
    now: number,
    currentValue: number,
  ): Promise<{
    change1h?: number
    change24h?: number
    change7d?: number
    change30d?: number
  }> {
    const changes: {
      change1h?: number
      change24h?: number
      change7d?: number
      change30d?: number
    } = {}

    const timeframes = [
      { key: 'change1h' as const, ms: TIMEFRAME_MS['1h'] },
      { key: 'change24h' as const, ms: TIMEFRAME_MS['24h'] },
      { key: 'change7d' as const, ms: TIMEFRAME_MS['7d'] },
      { key: 'change30d' as const, ms: TIMEFRAME_MS['30d'] },
    ]

    for (const { key, ms } of timeframes) {
      const targetTime = now - ms
      const snapshot = await db.portfolioSnapshots
        .where('walletAddress')
        .equals(walletAddress)
        .filter((s) => s.timestamp <= targetTime)
        .reverse()
        .sortBy('timestamp')

      if (snapshot.length > 0) {
        const pastValue = snapshot[0].totalValueUsd
        if (pastValue > 0) {
          changes[key] = ((currentValue - pastValue) / pastValue) * 100
        }
      }
    }

    return changes
  }

  startSnapshotScheduler(walletAddress: string, intervalMs: number = 60 * 60 * 1000): void {
    this.stopSnapshotScheduler()
    this.snapshotTimer = setInterval(async () => {
      try {
        await this.takeSnapshot(walletAddress)
      } catch (error) {
        console.error('[PortfolioService] Snapshot failed:', error)
      }
    }, intervalMs)

    this.takeSnapshot(walletAddress).catch((error) => {
      console.error('[PortfolioService] Initial snapshot failed:', error)
    })
  }

  stopSnapshotScheduler(): void {
    if (this.snapshotTimer !== null) {
      clearInterval(this.snapshotTimer)
      this.snapshotTimer = null
    }
  }
}

export const portfolioService = new PortfolioService()
