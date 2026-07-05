/**
 * Code by Xipzer
 *
 * Token Summary UI Block — curated token overview with price, market cap,
 * safety rating, and key metrics.
 */

import { TrendingUp, TrendingDown, Shield } from 'lucide-react'
import { CardShell, StatCell } from '../result-cards/shared'
import { formatCompactNumber, formatTokenPrice } from '../../../utils/formatters'
import type { TokenSummaryBlock } from '../../../types/research'

const SAFETY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  safe: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'SAFE' },
  caution: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'CAUTION' },
  danger: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'DANGER' },
  unknown: { color: 'text-text-tertiary', bg: 'bg-surface-elevated/50', label: 'UNKNOWN' },
}

export function TokenSummaryCard({ block }: { block: TokenSummaryBlock }) {
  const d = block.data
  const safety = SAFETY_CONFIG[d.safetyRating ?? 'unknown']

  return (
    <CardShell
      icon={TrendingUp}
      title={
        <span className="inline-flex items-baseline gap-2 min-w-0">
          <span className="truncate">{d.name}</span>
          <span className="text-xs text-text-tertiary font-medium">${d.symbol}</span>
        </span>
      }
      trailing={d.safetyRating && (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${safety.bg}`}>
          <Shield className={`w-3 h-3 ${safety.color}`} />
          <span className={`text-2xs font-bold ${safety.color}`}>{safety.label}</span>
        </div>
      )}
    >
      <div className="space-y-3">
        {d.price != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-2xl font-bold text-text-primary">
              {formatTokenPrice(d.price)}
            </span>
            {d.change24h != null && (
              <span className={`flex items-center gap-0.5 text-xs sm:text-sm font-medium ${d.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {d.change24h >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {d.change24h >= 0 ? '+' : ''}{d.change24h.toFixed(2)}%
              </span>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3">
          {d.marketCap != null && <StatCell label="Market Cap" value={formatCompactNumber(d.marketCap)} />}
          {d.volume24h != null && <StatCell label="24h Volume" value={formatCompactNumber(d.volume24h)} />}
          {d.holders != null && <StatCell label="Holders" value={d.holders.toLocaleString()} />}
          {d.liquidity != null && <StatCell label="Liquidity" value={formatCompactNumber(d.liquidity)} />}
          {d.safetyScore != null && <StatCell label="Safety Score" value={`${d.safetyScore}/100`} valueClassName={safety.color} />}
          {d.network && <StatCell label="Network" value={d.network} valueClassName="text-text-primary capitalize" />}
        </div>
      </div>
    </CardShell>
  )
}
