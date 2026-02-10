/**
 * Code by Xipzer
 */

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  DollarSign,
  RefreshCw,
  Loader2,
  Trophy,
  ThumbsDown,
  BarChart3,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { usePortfolioStore } from '../../store/portfolioStore'
import { useWalletStore } from '../../store/walletStore'
import { EmptyState } from '../common/EmptyState'
import { formatUSD, formatTokenPrice } from '../../utils/formatters'

type TimeRange = '24h' | '7d' | '30d' | 'all'

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24H' },
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: 'all', label: 'All' },
]

function PnlText({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`${value >= 0 ? 'text-green-500' : 'text-red-500'} ${className}`}>
      {value >= 0 ? '+' : ''}{formatUSD(value)}
    </span>
  )
}

function PnlPercent({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`${value >= 0 ? 'text-green-500' : 'text-red-500'} ${className}`}>
      {value >= 0 ? '+' : ''}{value.toFixed(2)}%
    </span>
  )
}

export function PortfolioView() {
  const { isDark } = useTheme()
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
  const winners = [...pnlEntries].filter((p) => p.totalPnl > 0).sort((a, b) => b.pnlPercent - a.pnlPercent).slice(0, 5)
  const losers = [...pnlEntries].filter((p) => p.totalPnl < 0).sort((a, b) => a.pnlPercent - b.pnlPercent).slice(0, 5)

  if (!activeWallet) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No Wallet Selected"
        description="Select or create a wallet to view your portfolio P/L."
      />
    )
  }

  const loading = isLoading || isCalculating

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-text-primary">Portfolio</h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} disabled:opacity-50`}
        >
          {loading
            ? <Loader2 className="w-4 h-4 text-text-secondary animate-spin" />
            : <RefreshCw className="w-4 h-4 text-text-secondary" />}
        </button>
      </div>

      <div className="rounded-xl border border-border-subtle p-4">
        <div className="text-xs text-text-secondary mb-1">Total Value</div>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-text-primary">
            {summary ? formatUSD(summary.totalValueUsd) : '$0.00'}
          </span>
          {getChangeForRange() !== undefined && (
            <PnlPercent value={getChangeForRange()!} className="text-sm font-medium" />
          )}
        </div>
        <div className="flex gap-1 mt-3">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => setTimeRange(tr.value)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                timeRange === tr.value
                  ? 'bg-accent-500/20 text-accent-500'
                  : `text-text-secondary ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border-subtle p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <DollarSign className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-xs text-text-secondary">Realized</span>
          </div>
          <PnlText
            value={pnlEntries.reduce((s, p) => s + p.realizedPnl, 0)}
            className="text-sm font-semibold"
          />
        </div>
        <div className="rounded-xl border border-border-subtle p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-xs text-text-secondary">Unrealized</span>
          </div>
          <PnlText
            value={pnlEntries.reduce((s, p) => s + p.unrealizedPnl, 0)}
            className="text-sm font-semibold"
          />
        </div>
        <div className="rounded-xl border border-border-subtle p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <BarChart3 className="w-3.5 h-3.5 text-text-secondary" />
            <span className="text-xs text-text-secondary">Total P/L</span>
          </div>
          <PnlText
            value={summary?.totalPnl ?? 0}
            className="text-sm font-semibold"
          />
        </div>
      </div>

      {(summary?.bestPerformer || summary?.worstPerformer) && (
        <div className="grid grid-cols-2 gap-3">
          {summary.bestPerformer && (
            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Trophy className="w-3.5 h-3.5 text-green-500" />
                <span className="text-xs text-text-secondary">Best Performer</span>
              </div>
              <div className="text-sm font-medium text-text-primary">${summary.bestPerformer.symbol}</div>
              <PnlPercent value={summary.bestPerformer.pnlPercent} className="text-xs" />
            </div>
          )}
          {summary.worstPerformer && (
            <div className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ThumbsDown className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs text-text-secondary">Worst Performer</span>
              </div>
              <div className="text-sm font-medium text-text-primary">${summary.worstPerformer.symbol}</div>
              <PnlPercent value={summary.worstPerformer.pnlPercent} className="text-xs" />
            </div>
          )}
        </div>
      )}

      {pnlEntries.length > 0 && (
        <div>
          <h3 className="text-base font-medium text-text-primary mb-4">Token Breakdown</h3>
          <div className="rounded-xl border border-border-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={isDark ? 'bg-white/5' : 'bg-gray-50'}>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary">Token</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-text-secondary">Avg Cost</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-text-secondary">Price</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-text-secondary">P/L</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-text-secondary">P/L %</th>
                  </tr>
                </thead>
                <tbody>
                  {pnlEntries.sort((a, b) => Math.abs(b.totalPnl) - Math.abs(a.totalPnl)).map((pnl) => (
                    <tr key={`${pnl.networkId}:${pnl.tokenAddress}`} className={`border-t ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-text-primary">${pnl.tokenSymbol}</div>
                        <div className="text-xs text-text-secondary">{pnl.networkId}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">
                        {formatTokenPrice(pnl.avgBuyPrice)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">
                        {formatTokenPrice(pnl.currentPriceUsd)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <PnlText value={pnl.totalPnl} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <PnlPercent value={pnl.pnlPercent} />
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
        <div className="grid grid-cols-2 gap-4">
          {winners.length > 0 && (
            <div>
              <h3 className="text-base font-medium text-text-primary mb-4">Winners</h3>
              <div className="space-y-2">
                {winners.map((w) => (
                  <div key={`${w.networkId}:${w.tokenAddress}`} className="rounded-xl border border-border-subtle p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">${w.tokenSymbol}</span>
                    <PnlPercent value={w.pnlPercent} className="text-sm font-medium" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {losers.length > 0 && (
            <div>
              <h3 className="text-base font-medium text-text-primary mb-4">Losers</h3>
              <div className="space-y-2">
                {losers.map((l) => (
                  <div key={`${l.networkId}:${l.tokenAddress}`} className="rounded-xl border border-border-subtle p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">${l.tokenSymbol}</span>
                    <PnlPercent value={l.pnlPercent} className="text-sm font-medium" />
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
          description="Execute trades through the Research tab to start tracking your P/L."
        />
      )}
    </div>
  )
}
