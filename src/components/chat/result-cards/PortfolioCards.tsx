/**
 * Code by Xipzer
 *
 * Portfolio-related result cards: PortfolioCard, TradeHistoryCard.
 */

import { BarChart3, ArrowRightLeft } from 'lucide-react'
import { formatUSD } from '../../../utils/formatters'
import { useCardTheme, CardShell, StatCell } from './shared'

interface PerformerData {
  symbol: string
  pnlPercent?: number
}

interface PortfolioData {
  totalValueUsd?: number
  totalPnl?: number
  totalPnlPercent?: number
  bestPerformer?: PerformerData
  worstPerformer?: PerformerData
}

export function PortfolioCard({ data }: { data: Record<string, unknown> }) {
  const d = data as PortfolioData
  const pnlColor = (d.totalPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <CardShell icon={BarChart3} title="Portfolio P/L">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCell label="Total Value" value={formatUSD(Number(d.totalValueUsd || 0))} />
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">P/L</div>
          <div className={`text-xs sm:text-base font-bold ${pnlColor}`}>
            {(d.totalPnl || 0) >= 0 ? '+' : ''}{formatUSD(Number(d.totalPnl || 0))} ({Number(d.totalPnlPercent || 0).toFixed(1)}%)
          </div>
        </div>
        {d.bestPerformer && <StatCell label="Best" value={`${d.bestPerformer.symbol} +${d.bestPerformer.pnlPercent?.toFixed(1)}%`} />}
        {d.worstPerformer && <StatCell label="Worst" value={`${d.worstPerformer.symbol} ${d.worstPerformer.pnlPercent?.toFixed(1)}%`} />}
      </div>
    </CardShell>
  )
}

interface TradeItem {
  id: string
  tokenInSymbol?: string
  tokenOutSymbol?: string
  totalValueUsd?: number
}

interface TradeHistoryData {
  count?: number
  trades?: TradeItem[]
}

export function TradeHistoryCard({ data }: { data: Record<string, unknown> }) {
  const { card, iconAccent } = useCardTheme()
  const d = data as TradeHistoryData

  return (
    <CardShell icon={ArrowRightLeft} title={`${d.count || d.trades?.length || 0} Recent Trades`}>
      {d.trades && d.trades.length > 0 ? (
        <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
          {d.trades.slice(0, 5).map((t, i) => (
            <div key={t.id} className={`flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 ${i > 0 ? `border-t ${card.innerBorder}` : ''}`}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-base text-text-primary">{t.tokenInSymbol}</span>
                <ArrowRightLeft className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${iconAccent}`} />
                <span className="text-xs sm:text-base text-text-primary">{t.tokenOutSymbol}</span>
              </div>
              <span className="text-2xs sm:text-xs text-text-tertiary">{formatUSD(Number(t.totalValueUsd || 0))}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs sm:text-sm text-text-tertiary">No recent trades</span>
      )}
    </CardShell>
  )
}
