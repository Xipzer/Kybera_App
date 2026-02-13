/**
 * Code by Xipzer
 *
 * Yield Summary UI Block — comparison table of yield opportunities
 * across protocols with APY, TVL, and risk level.
 */

import { Sprout, Shield, AlertTriangle, Flame } from 'lucide-react'
import { useTheme } from '../../../hooks/useTheme'
import type { YieldSummaryBlock } from '../../../types/research'

const RISK_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; icon: typeof Shield }> = {
  low: { color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', label: 'LOW', icon: Shield },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'MED', icon: AlertTriangle },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'HIGH', icon: Flame },
  degen: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'DEGEN', icon: Flame },
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function YieldSummaryCard({ block }: { block: YieldSummaryBlock }) {
  const { theme } = useTheme()
  const d = block.data
  const sendGradient = theme.styles.chatInterface.sendGradient

  if (!d.opportunities || d.opportunities.length === 0) return null

  return (
    <div className="bg-surface-elevated/30 border border-border-subtle rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-border-subtle/50">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${sendGradient} flex items-center justify-center flex-shrink-0`}>
          <Sprout className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <span className="text-sm sm:text-lg font-semibold text-text-primary">Yield Opportunities</span>
        <span className="ml-auto text-[10px] sm:text-xs text-text-tertiary">
          {d.opportunities.length} found
        </span>
      </div>

      <div className="p-3 sm:p-4">
        <div className="space-y-2">
          {d.opportunities.map((opp, i) => {
            const risk = RISK_CONFIG[opp.risk] ?? RISK_CONFIG.medium
            return (
              <div
                key={i}
                className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-semibold text-text-primary">{opp.protocol}</span>
                    <span className="text-[10px] sm:text-xs text-text-tertiary">{opp.asset}</span>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${risk.bg} ${risk.color} border ${risk.border}`}>
                    <risk.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    {risk.label}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">APY</div>
                    <div className="text-xs sm:text-base text-green-400 font-bold">{opp.apy.toFixed(2)}%</div>
                  </div>
                  {opp.tvl != null && (
                    <div>
                      <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">TVL</div>
                      <div className="text-xs sm:text-base text-text-primary font-medium">{formatCompact(opp.tvl)}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">Network</div>
                    <div className="text-xs sm:text-base text-text-primary font-medium capitalize">{opp.network}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
