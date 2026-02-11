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
  ChevronDown,
  Check,
} from 'lucide-react'
import * as Popover from '@radix-ui/react-popover'
import { useTheme } from '../../hooks/useTheme'
import { themeClasses } from '../../utils/themeClasses'
import { NetworkIcon } from '../NetworkIcons'
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${config.bg} ${config.text} border ${config.border}`}>
      <config.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
      {level}
    </span>
  )
}

function getCardStyles(themeName: string) {
  switch (themeName) {
    case 'xipz':
      return {
        bg: 'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950',
        border: 'border-primary-800/50 hover:border-primary-700/50',
      }
    case 'dark':
      return {
        bg: 'bg-surface-base',
        border: 'border-[#8b8bff]/10 hover:border-[#8b8bff]/20',
      }
    case 'ogDark':
      return {
        bg: 'bg-surface-base',
        border: 'border-white/10 hover:border-white/20',
      }
    case 'light':
      return {
        bg: 'bg-surface-elevated',
        border: 'border-indigo-200/30 hover:border-indigo-300/40',
      }
    case 'ogLight':
      return {
        bg: 'bg-surface-elevated',
        border: 'border-gray-200/30 hover:border-gray-300/40',
      }
    default:
      return {
        bg: 'bg-surface-elevated',
        border: 'border-gray-200 hover:border-gray-300',
      }
  }
}

function NetworkFilterDropdown({
  networkFilter,
  setNetworkFilter,
  theme,
}: {
  networkFilter: string
  setNetworkFilter: (v: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  const [open, setOpen] = useState(false)
  const selected = NETWORK_FILTERS.find((n) => n.value === networkFilter) ?? NETWORK_FILTERS[0]

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors bg-surface-elevated ${theme.styles.listItemHover}`}>
          {selected.value
            ? <NetworkIcon networkId={selected.value} size={14} className="flex-shrink-0" />
            : <Filter className="w-3.5 h-3.5 text-text-tertiary" />
          }
          <span className={`text-[11px] font-medium ${theme.styles.textPrimary}`}>{selected.label}</span>
          <ChevronDown className={`w-3 h-3 ${theme.styles.iconSecondary} transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className={`${theme.styles.dropdown.content} w-[180px] max-h-[300px] overflow-hidden flex flex-col z-[9999]`}
          sideOffset={5}
          align="start"
          side="bottom"
          avoidCollisions={true}
          collisionPadding={16}
        >
          <div className="flex-1 overflow-y-auto py-1">
            {NETWORK_FILTERS.map((n) => (
              <button
                key={n.value}
                onClick={() => { setNetworkFilter(n.value); setOpen(false) }}
                className={`w-full ${theme.styles.dropdown.item} ${
                  networkFilter === n.value ? 'bg-accent/10' : theme.styles.dropdown.itemHover
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    {n.value
                      ? <NetworkIcon networkId={n.value} size={16} className="flex-shrink-0" />
                      : <Filter className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                    }
                    <span className={`text-xs ${networkFilter === n.value ? 'text-accent font-medium' : theme.styles.textPrimary}`}>
                      {n.label}
                    </span>
                  </div>
                  {networkFilter === n.value && <Check className="w-3 h-3 text-accent flex-shrink-0" />}
                </div>
              </button>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function YieldView() {
  const { theme, themeName, isDark } = useTheme()
  const styles = theme.styles.chatInterface
  const iconAccent = theme.styles.iconAccent
  const tc = themeClasses(isDark)
  const card = getCardStyles(themeName)
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
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 px-3 sm:px-4 pt-3">
        <div className={`${card.bg} border ${card.border} rounded-xl p-3 space-y-2.5`}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                value={tokenFilter}
                onChange={(e) => setTokenFilter(e.target.value)}
                placeholder="Filter by token..."
                className={`w-full pl-9 pr-3 py-2 ${tc.inputBg} border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors`}
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
                className={`w-20 pl-7 pr-2 py-2 ${tc.inputBg} border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors`}
                style={{ fontSize: '16px' }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <NetworkFilterDropdown
              networkFilter={networkFilter}
              setNetworkFilter={setNetworkFilter}
              theme={theme}
            />
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-3 pb-4">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className={`w-6 h-6 ${iconAccent} animate-spin`} />
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
        <div className="space-y-3">
          {opportunities.map((opp) => (
            <div
              key={opp.id}
              className={`${card.bg} border ${card.border} rounded-2xl overflow-hidden transition-all duration-300`}
            >
              <div className={`p-3 sm:p-4 border-b ${tc.borderSubtle}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm sm:text-lg font-semibold text-text-primary">{opp.protocolName}</span>
                      <NetworkIcon networkId={opp.networkId} size={14} className="flex-shrink-0" />
                    </div>
                    <div className="text-xs sm:text-sm text-text-tertiary">
                      {opp.tokenSymbol}
                      <span className="mx-1.5 opacity-40">/</span>
                      <span className="capitalize">{opp.yieldType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  <RiskBadge level={opp.riskLevel} />
                </div>
              </div>

              <div className="p-3 sm:p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div>
                    <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">APY</div>
                    <div className={`text-xs sm:text-base font-bold ${iconAccent}`}>
                      {opp.apy.toFixed(2)}%
                    </div>
                    {opp.apyReward > 0 && (
                      <div className="text-[10px] sm:text-xs text-text-tertiary mt-0.5">
                        {opp.apyBase.toFixed(1)}% base + {opp.apyReward.toFixed(1)}% reward
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">TVL</div>
                    <div className="text-xs sm:text-base font-medium text-text-primary">{formatCompactNumber(opp.tvl)}</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Type</div>
                    <div className="text-xs sm:text-base font-medium text-text-secondary capitalize">{opp.yieldType.replace('_', ' ')}</div>
                  </div>
                </div>
              </div>

              {opp.riskFactors.length > 0 && (
                <div className={`px-3 sm:px-4 pb-3 sm:pb-4`}>
                  <div className={`${tc.sectionBg} border rounded-xl p-2.5 sm:p-3`}>
                    <div className="flex flex-wrap gap-1.5">
                      {opp.riskFactors.map((factor, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-orange-500/20 text-orange-500 border border-orange-500/15"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
