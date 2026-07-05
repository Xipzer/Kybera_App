/**
 * Code by Xipzer
 *
 * Portfolio-related result cards: PortfolioCard, TradeHistoryCard.
 */

import { BarChart3, ArrowRightLeft } from 'lucide-react'
import { formatUSD } from '../../../utils/formatters'
import { useCardTheme, CardShell, StatCell } from './shared'

export function PortfolioCard({ data }: { data: any }) {
  const pnlColor = (data.totalPnl || 0) >= 0 ? 'text-green-500' : 'text-red-500'

  return (
    <CardShell icon={BarChart3} title="Portfolio P/L">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
        <StatCell label="Total Value" value={formatUSD(Number(data.totalValueUsd || 0))} />
        <div>
          <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">P/L</div>
          <div className={`text-xs sm:text-base font-bold ${pnlColor}`}>
            {(data.totalPnl || 0) >= 0 ? '+' : ''}{formatUSD(Number(data.totalPnl || 0))} ({Number(data.totalPnlPercent || 0).toFixed(1)}%)
          </div>
        </div>
        {data.bestPerformer && <StatCell label="Best" value={`${data.bestPerformer.symbol} +${data.bestPerformer.pnlPercent?.toFixed(1)}%`} />}
        {data.worstPerformer && <StatCell label="Worst" value={`${data.worstPerformer.symbol} ${data.worstPerformer.pnlPercent?.toFixed(1)}%`} />}
      </div>
    </CardShell>
  )
}

export function TradeHistoryCard({ data }: { data: any }) {
  const { card, iconAccent } = useCardTheme()

  return (
    <CardShell icon={ArrowRightLeft} title={`${data.count || data.trades?.length || 0} Recent Trades`}>
      {data.trades?.length > 0 ? (
        <div className={`${card.innerBg} border ${card.innerBorder} rounded-xl overflow-hidden`}>
          {data.trades.slice(0, 5).map((t: any, i: number) => (
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
