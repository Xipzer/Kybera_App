/**
 * Code by Xipzer
 */

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  RefreshCw,
  Loader2,
  Trophy,
  ThumbsDown,
  BarChart3,
  Activity,
  Layers,
} from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { usePortfolioStore } from '../store/portfolioStore'
import { useWalletStore } from '../store/walletStore'
import { EmptyState } from './common/EmptyState'
import { formatUSD, formatTokenPrice } from '../utils/formatters'

type TimeRange = '24h' | '7d' | '30d' | 'all'

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'All' },
]

function PnlText({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`${value >= 0 ? 'text-green-400' : 'text-red-400'} ${className}`}>
      {value >= 0 ? '+' : ''}
      {formatUSD(value)}
    </span>
  )
}

function PnlPercent({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${value >= 0 ? 'text-green-400' : 'text-red-400'} ${className}`}
    >
      {value >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {value >= 0 ? '+' : ''}
      {value.toFixed(2)}%
    </span>
  )
}

export function PortfolioView() {
  const { theme } = useTheme()
  const styles = theme.styles.chatInterface
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [isLoading, setIsLoading] = useState(false)

  const activeWalletId = useWalletStore((s) => s.activeWalletId)
  const wallets = useWalletStore((s) => s.wallets)
  const activeWallet = wallets.find((w) => w.id === activeWalletId)

  const summary = usePortfolioStore((s) => s.currentSummary)
  const isCalculating = usePortfolioStore((s) => s.isCalculating)
  const tokenPnLs = usePortfolioStore((s) => s.tokenPnLs)
  const refreshSummary = usePortfolioStore((s) => s.refreshSummary)
  const loadTradeHistory = usePortfolioStore((s) => s.loadTradeHistory)

  const handleRefresh = useCallback(async () => {
    if (!activeWallet || isLoading) return
    setIsLoading(true)
    try {
      await Promise.all([
        refreshSummary(activeWallet.address),
        loadTradeHistory(activeWallet.address),
      ])
    } finally {
      setIsLoading(false)
    }
  }, [activeWallet, isLoading, refreshSummary, loadTradeHistory])

  useEffect(() => {
    if (activeWallet) handleRefresh()
  }, [activeWallet?.id])

  const getChangeForRange = (): number | undefined => {
    if (!summary) return undefined
    const map: Record<TimeRange, number | undefined> = {
      '24h': summary.change24h,
      '7d': summary.change7d,
      '30d': summary.change30d,
      all: summary.totalPnlPercent,
    }
    return map[timeRange]
  }

  const pnlEntries = Array.from(tokenPnLs.values()).filter((p) => p.buyCount > 0)
  const winners = [...pnlEntries]
    .filter((p) => p.totalPnl > 0)
    .sort((a, b) => b.pnlPercent - a.pnlPercent)
    .slice(0, 5)
  const losers = [...pnlEntries]
    .filter((p) => p.totalPnl < 0)
    .sort((a, b) => a.pnlPercent - b.pnlPercent)
    .slice(0, 5)
  const loading = isLoading || isCalculating

  if (!activeWallet) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Wallet Selected"
        description="Select or create a wallet to view your portfolio P/L."
      />
    )
  }

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-4 pt-3 pb-4 space-y-3">
      <div className={`${styles.inputSolidBg} border ${styles.inputBorder} rounded-xl p-4`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-text-tertiary" />
            <span className="text-xs text-text-tertiary uppercase tracking-wider font-medium">
              Total Value
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`${theme.styles.buttonIcon} p-1.5 rounded-lg disabled:opacity-40`}
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 text-text-secondary animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 text-text-secondary" />
            )}
          </button>
        </div>
        <div className="flex items-baseline gap-3 mb-3">
          <span
            className={`text-2xl font-bold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent`}
          >
            {summary ? formatUSD(summary.totalValueUsd) : '$0.00'}
          </span>
          {getChangeForRange() !== undefined && (
            <PnlPercent value={getChangeForRange()!} className="text-sm font-medium" />
          )}
        </div>
        <div className="flex gap-1">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                timeRange === tr.value
                  ? `bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm`
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: 'Realized',
            icon: DollarSign,
            value: pnlEntries.reduce((s, p) => s + p.realizedPnl, 0),
          },
          {
            label: 'Unrealized',
            icon: Activity,
            value: pnlEntries.reduce((s, p) => s + p.unrealizedPnl, 0),
          },
          { label: 'Total P/L', icon: Layers, value: summary?.totalPnl ?? 0 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-border-subtle bg-surface-elevated/50 p-3"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <card.icon className="w-3 h-3 text-text-tertiary" />
              <span className="text-2xs text-text-tertiary uppercase tracking-wider font-medium">
                {card.label}
              </span>
            </div>
            <PnlText value={card.value} className="text-sm font-bold" />
          </div>
        ))}
      </div>

      {(summary?.bestPerformer || summary?.worstPerformer) && (
        <div className="grid grid-cols-2 gap-2">
          {summary?.bestPerformer && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy className="w-3 h-3 text-green-400" />
                <span className="text-2xs text-green-400/80 uppercase tracking-wider font-medium">
                  Best
                </span>
              </div>
              <div className="text-sm font-semibold text-text-primary">
                ${summary.bestPerformer.symbol}
              </div>
              <PnlPercent value={summary.bestPerformer.pnlPercent} className="text-xs" />
            </div>
          )}
          {summary?.worstPerformer && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <ThumbsDown className="w-3 h-3 text-red-400" />
                <span className="text-2xs text-red-400/80 uppercase tracking-wider font-medium">
                  Worst
                </span>
              </div>
              <div className="text-sm font-semibold text-text-primary">
                ${summary.worstPerformer.symbol}
              </div>
              <PnlPercent value={summary.worstPerformer.pnlPercent} className="text-xs" />
            </div>
          )}
        </div>
      )}

      {pnlEntries.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${styles.sendGradient}`} />
            <h3 className="text-sm font-semibold text-text-primary">Token Breakdown</h3>
          </div>
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-elevated/50">
                    <th className="text-left px-4 py-2.5 text-2xs font-semibold text-text-tertiary uppercase tracking-wider">
                      Token
                    </th>
                    <th className="text-right px-4 py-2.5 text-2xs font-semibold text-text-tertiary uppercase tracking-wider">
                      Avg Cost
                    </th>
                    <th className="text-right px-4 py-2.5 text-2xs font-semibold text-text-tertiary uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-right px-4 py-2.5 text-2xs font-semibold text-text-tertiary uppercase tracking-wider">
                      P/L
                    </th>
                    <th className="text-right px-4 py-2.5 text-2xs font-semibold text-text-tertiary uppercase tracking-wider">
                      P/L %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pnlEntries
                    .sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl))
                    .map((pnl, i) => (
                      <tr
                        key={`${pnl.networkId}:${pnl.tokenAddress}`}
                        className={`border-t border-border-subtle transition-colors hover:bg-surface-hover/50 ${i === 0 ? 'border-t-0' : ''}`}
                      >
                        <td className="px-4 py-2.5">
                          <div className="font-medium text-text-primary text-sm">
                            ${pnl.tokenSymbol}
                          </div>
                          <div className="text-2xs text-text-tertiary">{pnl.networkId}</div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-text-secondary text-xs">
                          {formatTokenPrice(pnl.avgBuyPrice)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-text-secondary text-xs">
                          {formatTokenPrice(pnl.currentPriceUsd)}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <PnlText value={pnl.totalPnl} className="text-xs font-medium" />
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <PnlPercent value={pnl.pnlPercent} className="text-xs font-medium" />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {(winners.length > 0 || losers.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {winners.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3.5 rounded-full bg-green-500" />
                <h3 className="text-sm font-semibold text-text-primary">Winners</h3>
              </div>
              <div className="space-y-1.5">
                {winners.map((w, i) => (
                  <div
                    key={`${w.networkId}:${w.tokenAddress}`}
                    className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-text-tertiary font-mono">#{i + 1}</span>
                      <span className="text-xs font-medium text-text-primary">
                        ${w.tokenSymbol}
                      </span>
                    </div>
                    <PnlPercent value={w.pnlPercent} className="text-xs font-semibold" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {losers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-3.5 rounded-full bg-red-500" />
                <h3 className="text-sm font-semibold text-text-primary">Losers</h3>
              </div>
              <div className="space-y-1.5">
                {losers.map((l, i) => (
                  <div
                    key={`${l.networkId}:${l.tokenAddress}`}
                    className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface-elevated/30 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xs text-text-tertiary font-mono">#{i + 1}</span>
                      <span className="text-xs font-medium text-text-primary">
                        ${l.tokenSymbol}
                      </span>
                    </div>
                    <PnlPercent value={l.pnlPercent} className="text-xs font-semibold" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {pnlEntries.length === 0 && !loading && (
        <EmptyState
          icon={BarChart3}
          title="No Trade History"
          description="Execute trades through the Chat tab to start tracking your P/L."
        />
      )}
    </div>
  )
}
