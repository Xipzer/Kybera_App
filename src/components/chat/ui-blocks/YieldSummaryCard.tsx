/**
 * Code by Xipzer
 *
 * Yield Summary UI Block — comparison table of yield opportunities
 * across protocols with APY, TVL, and risk level.
 */

import { Sprout } from 'lucide-react'
import { CardShell, StatCell, YieldRiskBadge } from '../result-cards/shared'
import { formatCompactNumber } from '../../../utils/formatters'
import type { YieldSummaryBlock } from '../../../types/research'

export function YieldSummaryCard({ block }: { block: YieldSummaryBlock }) {
  const d = block.data

  if (!d.opportunities || d.opportunities.length === 0) return null

  return (
    <CardShell
      icon={Sprout}
      title="Yield Opportunities"
      trailing={
        <span className="text-2xs sm:text-xs text-text-tertiary">
          {d.opportunities.length} found
        </span>
      }
    >
      <div className="space-y-2">
        {d.opportunities.map((opp, i) => (
          <div
            key={i}
            className="bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3"
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-semibold text-text-primary">{opp.protocol}</span>
                <span className="text-2xs sm:text-xs text-text-tertiary">{opp.asset}</span>
              </div>
              <YieldRiskBadge level={opp.risk} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <StatCell label="APY" value={`${opp.apy.toFixed(2)}%`} valueClassName="text-green-400 font-bold" />
              {opp.tvl != null && <StatCell label="TVL" value={formatCompactNumber(opp.tvl)} />}
              <StatCell label="Network" value={opp.network} valueClassName="text-text-primary capitalize" />
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}
