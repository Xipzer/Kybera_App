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

const RISK_BADGE: Record<string, { bg: string; text: string; icon: typeof Shield }> = {
  low: { bg: 'bg-green-500/15', text: 'text-green-500', icon: Shield },
  medium: { bg: 'bg-yellow-500/15', text: 'text-yellow-500', icon: AlertTriangle },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-500', icon: Flame },
  degen: { bg: 'bg-red-500/15', text: 'text-red-500', icon: Flame },
}

function RiskBadge({ level }: { level: string }) {
  const config = RISK_BADGE[level] ?? RISK_BADGE.high
  const Icon = config.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  )
}

export function YieldView() {
  const { isDark } = useTheme()
  const [opportunities, setOpportunities] = useState<YieldOpportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tokenFilter, setTokenFilter] = useState('')
  const [networkFilter, setNetworkFilter] = useState('')
  const [riskFilter, setRiskFilter] = useState('')
  const [minApy, setMinApy] = useState('')
  const [sortBy, setSortBy] = useState<'apy' | 'tvl' | 'risk'>('apy')

  const fetchYields = useCallback(async () => {
    setIsLoading(true)
    try {
      const params: YieldSearchParams = {
        sortBy,
        limit: 50,
      }
      if (networkFilter) params.networkId = networkFilter
      if (tokenFilter.trim()) params.tokenSymbol = tokenFilter.trim()
      if (minApy && parseFloat(minApy) > 0) params.minApy = parseFloat(minApy)
      if (riskFilter) params.maxRisk = riskFilter as 'low' | 'medium' | 'high'

      setOpportunities(await yieldService.getYieldOpportunities(params))
    } catch (err) {
      console.error('Failed to fetch yields:', err)
    } finally {
      setIsLoading(false)
    }
  }, [sortBy, networkFilter, tokenFilter, riskFilter, minApy])

  useEffect(() => {
    fetchYields()
  }, [fetchYields])

  const inputBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'
  const selectBg = isDark ? 'bg-white/5 border-white/10 text-text-primary' : 'bg-white border-gray-200 text-text-primary'

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h2 className="text-base font-medium text-text-primary">DeFi Yield Opportunities</h2>

      <div className="rounded-xl border border-border-subtle p-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              value={tokenFilter}
              onChange={(e) => setTokenFilter(e.target.value)}
              placeholder="Filter by token..."
              className={`w-full pl-9 pr-3 py-2 ${inputBg} border rounded-lg text-sm placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors`}
              style={{ fontSize: '16px' }}
            />
          </div>
          <input
            type="text"
            value={minApy}
            onChange={(e) => { if (e.target.value === '' || /^\d*\.?\d*$/.test(e.target.value)) setMinApy(e.target.value) }}
            placeholder="Min APY %"
            className={`w-28 px-3 py-2 ${inputBg} border rounded-lg text-sm placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors`}
            style={{ fontSize: '16px' }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            className={`px-3 py-1.5 ${selectBg} border rounded-lg text-xs focus:outline-none`}
          >
            {NETWORK_FILTERS.map((n) => (
              <option key={n.value} value={n.value}>{n.label}</option>
            ))}
          </select>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className={`px-3 py-1.5 ${selectBg} border rounded-lg text-xs focus:outline-none`}
          >
            {RISK_FILTERS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 ml-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-text-tertiary" />
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value as 'apy' | 'tvl' | 'risk')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === opt.value
                    ? 'bg-accent-500/20 text-accent-500'
                    : `text-text-secondary ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
        </div>
      ) : opportunities.length === 0 ? (
        <EmptyState
          icon={Sprout}
          title="No Yield Opportunities"
          description="Try adjusting your filters or check back later."
        />
      ) : (
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <div key={opp.id} className="rounded-xl border border-border-subtle p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-text-primary">{opp.protocolName}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-white/5 text-text-tertiary' : 'bg-gray-100 text-text-tertiary'}`}>
                      {opp.networkId}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary">{opp.tokenSymbol} &middot; {opp.yieldType.replace('_', ' ')}</div>
                </div>
                <RiskBadge level={opp.riskLevel} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wide mb-0.5">APY</div>
                  <div className="text-sm font-semibold text-green-500">{opp.apy.toFixed(2)}%</div>
                  {opp.apyReward > 0 && (
                    <div className="text-[10px] text-text-tertiary">
                      Base {opp.apyBase.toFixed(1)}% + Reward {opp.apyReward.toFixed(1)}%
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wide mb-0.5">TVL</div>
                  <div className="text-sm font-medium text-text-primary">{formatCompactNumber(opp.tvl)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-text-tertiary uppercase tracking-wide mb-0.5">Protocol</div>
                  <div className="text-sm font-medium text-text-primary">{opp.protocolName}</div>
                </div>
              </div>

              {opp.riskFactors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border-subtle">
                  <div className="flex flex-wrap gap-1.5">
                    {opp.riskFactors.map((factor, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded text-[10px] ${isDark ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-50 text-orange-600'}`}
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
