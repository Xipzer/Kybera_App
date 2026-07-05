/**
 * Code by Xipzer
 *
 * Market-related result cards: PredictionMarketsCard, SentimentCard.
 */

import { TrendingUp } from 'lucide-react'
import { formatCompactNumber } from '../../../utils/formatters'
import { useCardTheme, CardShell, StatCell } from './shared'

export function PredictionMarketsCard({ data }: { data: any }) {
  const { card, iconAccent } = useCardTheme()

  return (
    <CardShell icon={TrendingUp} title={`${data.count || data.markets?.length || 0} Prediction Markets`}>
      <div className="space-y-3">
        {data.markets?.slice(0, 5).map((m: any) => (
          <div key={m.id} className={`${card.innerBg} border ${card.innerBorder} rounded-xl p-2.5 sm:p-3`}>
            <div className="text-xs sm:text-base text-text-primary font-medium leading-tight mb-2">{m.question}</div>
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              {m.outcomes?.map((o: any, i: number) => (
                <span key={i} className="text-2xs sm:text-xs px-2 py-0.5 sm:py-1 rounded-lg bg-surface-hover">
                  <span className="text-text-tertiary">{o.label}</span>{' '}
                  <span className="font-medium text-text-primary">{Math.round(o.probability)}%</span>
                </span>
              ))}
              {m.volume > 0 && (
                <span className={`text-2xs sm:text-xs ${iconAccent} ml-auto`}>{formatCompactNumber(m.volume)} vol</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

export function SentimentCard({ data }: { data: any }) {
  const sentimentColor = data.overallSentiment === 'bullish' ? 'text-green-500'
    : data.overallSentiment === 'bearish' ? 'text-red-500'
    : 'text-yellow-500'

  return (
    <CardShell icon={TrendingUp} title="Crypto Market Sentiment">
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Sentiment</div>
            <div className={`text-xs sm:text-base font-bold capitalize ${sentimentColor}`}>{data.overallSentiment}</div>
          </div>
          <StatCell label="Markets Tracked" value={String(data.marketCount || 0)} />
        </div>
        {data.summary && <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{data.summary}</p>}
      </div>
    </CardShell>
  )
}
