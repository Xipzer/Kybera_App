/**
 * Code by Xipzer
 *
 * Token Summary UI Block — curated token overview with price, market cap,
 * safety rating, and key metrics.
 */

import { TrendingUp, TrendingDown, Shield } from 'lucide-react'
import { useTheme } from '../../../hooks/useTheme'
import type { TokenSummaryBlock } from '../../../types/research'

const SAFETY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  safe: { color: 'text-green-400', bg: 'bg-green-500/20', label: 'SAFE' },
  caution: { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'CAUTION' },
  danger: { color: 'text-red-400', bg: 'bg-red-500/20', label: 'DANGER' },
  unknown: { color: 'text-text-tertiary', bg: 'bg-surface-elevated/50', label: 'UNKNOWN' },
}

function formatCompact(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(2)}`
}

function formatPrice(n: number): string {
  if (n < 0.0001) return `$${n.toExponential(2)}`
  if (n < 1) return `$${n.toFixed(6)}`
  return `$${n.toFixed(2)}`
}

export function TokenSummaryCard({ block }: { block: TokenSummaryBlock }) {
  const { theme } = useTheme()
  const d = block.data
  const safety = SAFETY_CONFIG[d.safetyRating ?? 'unknown']
  const sendGradient = theme.styles.chatInterface.sendGradient

  return (
    <div className="bg-surface-elevated/30 border border-border-subtle rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 sm:py-3 border-b border-border-subtle/50">
        <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-r ${sendGradient} flex items-center justify-center flex-shrink-0`}>
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm sm:text-lg font-semibold text-text-primary truncate">
            {d.name}
          </span>
          <span className="text-xs text-text-tertiary font-medium">${d.symbol}</span>
        </div>
        {d.safetyRating && (
          <div className={`ml-auto flex items-center gap-1 px-2 py-0.5 rounded-full ${safety.bg}`}>
            <Shield className={`w-3 h-3 ${safety.color}`} />
            <span className={`text-[10px] font-bold ${safety.color}`}>{safety.label}</span>
          </div>
        )}
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Price hero */}
        {d.price != null && (
          <div className="flex items-baseline gap-2">
            <span className="text-lg sm:text-2xl font-bold text-text-primary">
              {formatPrice(d.price)}
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

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-surface-elevated/50 border border-border-subtle/50 rounded-xl p-2.5 sm:p-3">
          {d.marketCap != null && (
            <div>
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">Market Cap</div>
              <div className="text-xs sm:text-base text-text-primary font-medium">{formatCompact(d.marketCap)}</div>
            </div>
          )}
          {d.volume24h != null && (
            <div>
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">24h Volume</div>
              <div className="text-xs sm:text-base text-text-primary font-medium">{formatCompact(d.volume24h)}</div>
            </div>
          )}
          {d.holders != null && (
            <div>
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">Holders</div>
              <div className="text-xs sm:text-base text-text-primary font-medium">{d.holders.toLocaleString()}</div>
            </div>
          )}
          {d.liquidity != null && (
            <div>
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">Liquidity</div>
              <div className="text-xs sm:text-base text-text-primary font-medium">{formatCompact(d.liquidity)}</div>
            </div>
          )}
          {d.safetyScore != null && (
            <div>
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">Safety Score</div>
              <div className={`text-xs sm:text-base font-medium ${safety.color}`}>{d.safetyScore}/100</div>
            </div>
          )}
          {d.network && (
            <div>
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5">Network</div>
              <div className="text-xs sm:text-base text-text-primary font-medium capitalize">{d.network}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
