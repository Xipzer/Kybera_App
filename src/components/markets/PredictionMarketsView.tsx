/**
 * Code by Xipzer
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  TrendingUp,
  Loader2,
  ExternalLink,
  BarChart3,
  Clock,
  Droplets,
} from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { polymarketService } from '../../services/research/polymarketService'
import { EmptyState } from '../common/EmptyState'
import { formatCompactNumber } from '../../utils/formatters'
import type { PredictionMarket, PredictionMarketSentiment } from '../../types/predictions'

const TAG_FILTERS = ['Crypto', 'Bitcoin', 'Ethereum', 'Solana', 'DeFi', 'Politics', 'AI']

const SENTIMENT_COLORS: Record<string, string> = {
  bullish: 'text-green-500',
  bearish: 'text-red-500',
  neutral: 'text-text-secondary',
  mixed: 'text-yellow-500',
}

const SENTIMENT_BG: Record<string, string> = {
  bullish: 'bg-green-500/10 border-green-500/20',
  bearish: 'bg-red-500/10 border-red-500/20',
  neutral: 'bg-white/5 border-white/10',
  mixed: 'bg-yellow-500/10 border-yellow-500/20',
}

export function PredictionMarketsView() {
  const { isDark } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string>('Crypto')
  const [markets, setMarkets] = useState<PredictionMarket[]>([])
  const [sentiment, setSentiment] = useState<PredictionMarketSentiment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)

  const loadMarkets = useCallback(async (tag: string) => {
    setIsLoading(true)
    try {
      const [marketResults, sentimentResult] = await Promise.all([
        tag.toLowerCase() === 'crypto'
          ? polymarketService.getCryptoMarkets(15)
          : polymarketService.searchMarkets(tag, 15),
        polymarketService.getSentimentForTopic(tag),
      ])
      setMarkets(marketResults)
      setSentiment(sentimentResult)
    } catch (err) {
      console.error('Failed to load markets:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMarkets(activeTag)
  }, [activeTag, loadMarkets])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const results = await polymarketService.searchMarkets(searchQuery.trim(), 15)
      setMarkets(results)
      setSentiment(null)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  const formatEndDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  const inputBg = isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <h2 className="text-base font-medium text-text-primary">Prediction Markets</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search markets..."
          className={`w-full pl-9 pr-4 py-2.5 ${inputBg} border rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors`}
          style={{ fontSize: '16px' }}
        />
        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary animate-spin" />}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {TAG_FILTERS.map((tag) => (
          <button
            key={tag}
            onClick={() => { setActiveTag(tag); setSearchQuery('') }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              activeTag === tag && !searchQuery
                ? 'bg-accent-500/20 text-accent-500'
                : `text-text-secondary ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {sentiment && !searchQuery && (
        <div className={`rounded-xl border p-4 ${isDark ? SENTIMENT_BG[sentiment.overallSentiment] : 'bg-surface-elevated border-border-subtle'}`}>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className={`w-4 h-4 ${SENTIMENT_COLORS[sentiment.overallSentiment]}`} />
            <span className="text-sm font-medium text-text-primary">
              {activeTag} Sentiment: <span className={`capitalize ${SENTIMENT_COLORS[sentiment.overallSentiment]}`}>{sentiment.overallSentiment}</span>
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">{sentiment.sentimentSummary}</p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-text-secondary animate-spin" />
        </div>
      ) : markets.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No Markets Found"
          description="Try a different search term or category."
        />
      ) : (
        <div className="space-y-3">
          {markets.map((market) => {
            const yesOutcome = market.outcomes.find((o) => o.label.toLowerCase() === 'yes')
            const noOutcome = market.outcomes.find((o) => o.label.toLowerCase() === 'no')
            const yesPct = yesOutcome ? Math.round(yesOutcome.probability) : null
            const noPct = noOutcome ? Math.round(noOutcome.probability) : null

            return (
              <div key={market.id} className="rounded-xl border border-border-subtle p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-sm font-medium text-text-primary leading-snug flex-1">{market.question}</h3>
                  <a
                    href={market.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
                  </a>
                </div>

                {yesPct !== null && noPct !== null && (
                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-green-500">Yes</span>
                        <span className="text-xs font-medium text-green-500">{yesPct}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                        <div
                          className="h-full bg-green-500 rounded-full transition-all duration-300"
                          style={{ width: `${yesPct}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-red-500">No</span>
                        <span className="text-xs font-medium text-red-500">{noPct}%</span>
                      </div>
                      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                        <div
                          className="h-full bg-red-500 rounded-full transition-all duration-300"
                          style={{ width: `${noPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {yesPct === null && market.outcomes.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {market.outcomes.map((outcome) => (
                      <div key={outcome.id} className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">{outcome.label}</span>
                        <span className="text-xs font-medium text-text-primary">{Math.round(outcome.probability)}%</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-[10px] text-text-tertiary">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    <span>Vol: {formatCompactNumber(market.volume)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    <span>Liq: {formatCompactNumber(market.liquidity)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatEndDate(market.endDate)}</span>
                  </div>
                </div>

                {market.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {market.tags.slice(0, 4).map((tag) => (
                      <span
                        key={tag}
                        className={`px-1.5 py-0.5 rounded text-[10px] ${isDark ? 'bg-white/5 text-text-tertiary' : 'bg-gray-100 text-text-tertiary'}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
