/**
 * Code by Xipzer
 *
 * Market-related result cards: PredictionMarketsCard, SentimentCard.
 */

import { TrendingUp } from 'lucide-react'
import { formatCompactNumber } from '../../../utils/formatters'
import { useCardTheme, CardShell, StatCell } from './shared'

interface MarketOutcome {
  label: string
  probability: number
}

interface PredictionMarket {
  id: string
  question: string
  outcomes?: MarketOutcome[]
  volume?: number
}

interface PredictionMarketsData {
  count?: number
  markets?: PredictionMarket[]
}

export function PredictionMarketsCard({ data }: { data: Record<string, unknown> }) {
  const { card, iconAccent } = useCardTheme()
  const d = data as PredictionMarketsData

  return (
    <CardShell icon={TrendingUp} title={`${d.count || d.markets?.length || 0} Prediction Markets`}>
      <div className="space-y-3">
        {d.markets?.slice(0, 5).map((m) => (
          <div key={m.id} className={`${card.innerBg} border ${card.innerBorder} rounded-xl p-2.5 sm:p-3`}>
            <div className="text-xs sm:text-base text-text-primary font-medium leading-tight mb-2">{m.question}</div>
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
              {m.outcomes?.map((o, i) => (
                <span key={i} className="text-2xs sm:text-xs px-2 py-0.5 sm:py-1 rounded-lg bg-surface-hover">
                  <span className="text-text-tertiary">{o.label}</span>{' '}
                  <span className="font-medium text-text-primary">{Math.round(o.probability)}%</span>
                </span>
              ))}
              {(m.volume ?? 0) > 0 && (
                <span className={`text-2xs sm:text-xs ${iconAccent} ml-auto`}>{formatCompactNumber(m.volume)} vol</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </CardShell>
  )
}

interface SentimentData {
  overallSentiment?: string
  marketCount?: number
  summary?: string
}

export function SentimentCard({ data }: { data: Record<string, unknown> }) {
  const d = data as SentimentData
  const sentimentColor = d.overallSentiment === 'bullish' ? 'text-green-500'
    : d.overallSentiment === 'bearish' ? 'text-red-500'
    : 'text-yellow-500'

  return (
    <CardShell icon={TrendingUp} title="Crypto Market Sentiment">
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <div className="text-2xs sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">Sentiment</div>
            <div className={`text-xs sm:text-base font-bold capitalize ${sentimentColor}`}>{d.overallSentiment}</div>
          </div>
          <StatCell label="Markets Tracked" value={String(d.marketCount || 0)} />
        </div>
        {d.summary && <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">{d.summary}</p>}
      </div>
    </CardShell>
  )
}
