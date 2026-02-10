/**
 * Code by Xipzer
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Loader2,
  ArrowUpDown,
  Shield,
  AlertTriangle,
  Flame,
  Sprout,
  Filter,
  Percent,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { yieldService } from '../../services/defi/yieldService'
import { EmptyState } from '../common/EmptyState'
import { formatCompactNumber } from '../../utils/formatters'
import type { YieldOpportunity, YieldSearchParams } from '../../types/defi'

const NETWORK_FILTERS = [
  { value: '', label: 'All Networks' },
  { value: 'ethereum', label: 'Ethereum' },
  { value: 'base', label: 'Base' },
  { value: 'arbitrum', label: 'Arbitrum' },
  { value: 'optimism', label: 'Optimism' },
]

const RISK_FILTERS = [
  { value: '', label: 'All Risk' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const SORT_OPTIONS = [
  { value: 'apy', label: 'APY' },
  { value: 'tvl', label: 'TVL' },
  { value: 'risk', label: 'Risk' },
]

const RISK_BADGE: Record<string, { bg: string; text: string; border: string; icon: typeof Shield }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20', icon: Shield },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20', icon: AlertTriangle },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', icon: Flame },
  degen: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: Flame },
}

function RiskBadge({ level }: { level: string }) {
  const config = RISK_BADGE[level] ?? RISK_BADGE.high
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider ${config.bg} ${config.text} border ${config.border}`}>
      <config.icon className="w-2.5 h-2.5" />
      {level}
    </span>
  )
}

export function YieldView() {
  const { theme } = useTheme()
  const styles = theme.styles.chatInterface
  const [opportunities, setOpportunities] = useState<YieldOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tokenFilter, setTokenFilter] = useState('')
  const [networkFilter, setNetworkFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [minApy, setMinApy] = useState('')
  const [sortBy, setSortBy] = useState<'apy' | 'tvl' | 'risk'>('apy')

  const fetchYields = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params: YieldSearchParams = { sortBy, limit: 50 }
      if (networkFilter) params.networkId = networkFilter
      if (tokenFilter.trim()) params.tokenSymbol = tokenFilter.trim()
      if (minApy && parseFloat(minApy) > 0) params.minApy = parseFloat(minApy)
      if (riskFilter) params.maxRisk = riskFilter as 'low' | 'medium' | 'high'
      setOpportunities(await yieldService.getYieldOpportunities(params))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch yield data')
    } finally {
      setIsLoading(false)
    }
  }, [sortBy, networkFilter, tokenFilter, riskFilter, minApy])

  useEffect(() => {
    fetchYields()
  }, [fetchYields])

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-4 pt-3 pb-4 space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={tokenFilter}
            onChange={(e) => setTokenFilter(e.target.value)}
            placeholder="Filter by token..."
            className="w-full pl-9 pr-3 py-2 bg-surface-elevated/50 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors"
            style={{ fontSize: '16px' }}
          />
        </div>
        <div className="relative">
          <Percent className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
          <input
            type="text"
            value={minApy}
            onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setMinApy(e.target.value) }}
            placeholder="Min"
            className="w-20 pl-7 pr-2 py-2 bg-surface-elevated/50 border border-border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors"
            style={{ fontSize: '16px' }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Filter className="w-3 h-3 text-text-tertiary" />
          {NETWORK_FILTERS.map((n) => (
            <button
              key={n.value}
              onClick={() => setNetworkFilter(n.value)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
                networkFilter === n.value
                  ? `bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm`
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>
        <div className="h-4 w-px bg-border-subtle" />
        {RISK_FILTERS.map((r) => (
          <button
            key={r.value}
            onClick={() => setRiskFilter(r.value)}
            className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
              riskFilter === r.value
                ? `bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm`
                : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="h-4 w-px bg-border-subtle" />
        <div className="flex items-center gap-1">
          <ArrowUpDown className="w-3 h-3 text-text-tertiary" />
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortBy(opt.value as 'apy' | 'tvl' | 'risk')}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-200 ${
                sortBy === opt.value
                  ? `bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm`
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-6 h-6 text-accent-500 animate-spin" />
          <span className="text-xs text-text-tertiary">Scanning protocols...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="text-sm text-red-400 text-center max-w-sm">{error}</div>
          <button
            onClick={fetchYields}
            className={`px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]`}
          >
            Retry
          </button>
        </div>
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No Yield Opportunities"
          description="Try adjusting your filters or check back later."
        />
      ) : (
        <div className="space-y-2">
          {opportunities.map((opp) => (
            <div key={opp.id} className="rounded-xl border border-border-subtle bg-surface-elevated/30 p-4 transition-all duration-200 hover:border-accent-500/20">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-text-primary">{opp.protocolName}</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface-elevated text-text-tertiary border border-border-subtle/50">
                      {opp.networkId}
                    </span>
                  </div>
                  <div className="text-xs text-text-tertiary">
                    {opp.tokenSymbol}
                    <span className="mx-1.5 text-text-muted">/</span>
                    <span className="capitalize">{opp.yieldType.replace('_', ' ')}</span>
                  </div>
                </div>
                <RiskBadge level={opp.riskLevel} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[9px] text-text-tertiary uppercase tracking-wider font-semibold mb-0.5">APY</div>
                  <div className={`text-base font-bold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent`}>
                    {opp.apy.toFixed(2)}%
                  </div>
                  {opp.apyReward > 0 && (
                    <div className="text-[10px] text-text-tertiary mt-0.5">
                      {opp.apyBase.toFixed(1)}% base + {opp.apyReward.toFixed(1)}% reward
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[9px] text-text-tertiary uppercase tracking-wider font-semibold mb-0.5">TVL</div>
                  <div className="text-sm font-semibold text-text-primary">{formatCompactNumber(opp.tvl)}</div>
                </div>
                <div>
                  <div className="text-[9px] text-text-tertiary uppercase tracking-wider font-semibold mb-0.5">Protocol</div>
                  <div className="text-sm font-medium text-text-secondary">{opp.protocolName}</div>
                </div>
              </div>

              {opp.riskFactors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-subtle/50">
                  <div className="flex flex-wrap gap-1.5">
                    {opp.riskFactors.map((factor, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md text-[9px] font-medium bg-orange-500/8 text-orange-400 border border-orange-500/15"
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
