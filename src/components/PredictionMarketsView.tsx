/**
 * Code by Xipzer
 */

import { useState, useEffect, useCallback } from 'react'
import { Search, Loader2, ExternalLink, BarChart3, Clock, Droplets, Activity } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'
import { polymarketService } from '../services/research/polymarketService'
import { EmptyState } from './common/EmptyState'
import { formatCompactNumber } from '../utils/formatters'
import type { PredictionMarket, PredictionMarketSentiment } from '../types/predictions'

const TAG_FILTERS = ['Crypto', 'Bitcoin', 'Ethereum', 'Solana', 'DeFi', 'Politics', 'AI']

const SENTIMENT_CONFIG: Record<string, { text: string; glow: string; label: string }> = {
  bullish: { text: 'text-green-400', glow: 'shadow-green-500/20', label: 'Bullish' },
  bearish: { text: 'text-red-400', glow: 'shadow-red-500/20', label: 'Bearish' },
  neutral: { text: 'text-text-secondary', glow: '', label: 'Neutral' },
  mixed: { text: 'text-yellow-400', glow: 'shadow-yellow-500/20', label: 'Mixed' },
}

export function PredictionMarketsView() {
  const { theme } = useTheme()
  const styles = theme.styles.chatInterface
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
      setMarkets(await polymarketService.searchMarkets(searchQuery.trim(), 15))
      setSentiment(null)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery])

  const formatEndDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="h-full overflow-y-auto px-3 sm:px-4 pt-3 pb-4 space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch()
          }}
          placeholder="Search markets..."
          className="w-full pl-9 pr-10 py-2.5 bg-surface-elevated/50 border border-border-subtle rounded-xl text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-500/50 transition-colors"
          style={{ fontSize: '16px' }}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-accent-500 animate-spin" />
        )}
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {TAG_FILTERS.map((tag) => (
          <button
            key={tag}
            onClick={() => {
              setActiveTag(tag)
              setSearchQuery('')
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeTag === tag && !searchQuery
                ? `bg-gradient-to-r ${styles.sendGradient} text-white shadow-sm`
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {sentiment && !searchQuery && (
        <div
          className={`${styles.inputSolidBg} border ${styles.inputBorder} rounded-xl p-4 ${SENTIMENT_CONFIG[sentiment.overallSentiment]?.glow ?? ''}`}
        >
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                sentiment.overallSentiment === 'bullish'
                  ? 'bg-green-500/15'
                  : sentiment.overallSentiment === 'bearish'
                    ? 'bg-red-500/15'
                    : sentiment.overallSentiment === 'mixed'
                      ? 'bg-yellow-500/15'
                      : 'bg-surface-elevated'
              }`}
            >
              <Activity
                className={`w-3.5 h-3.5 ${SENTIMENT_CONFIG[sentiment.overallSentiment]?.text ?? 'text-text-secondary'}`}
              />
            </div>
            <span className="text-sm font-semibold text-text-primary">
              {activeTag}
              <span
                className={`ml-1.5 ${SENTIMENT_CONFIG[sentiment.overallSentiment]?.text ?? ''}`}
              >
                {SENTIMENT_CONFIG[sentiment.overallSentiment]?.label ?? sentiment.overallSentiment}
              </span>
            </span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            {sentiment.sentimentSummary}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-6 h-6 text-accent-500 animate-spin" />
          <span className="text-xs text-text-tertiary">Loading markets...</span>
        </div>
      ) : markets.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No Markets Found"
          description="Try a different search term or category."
        />
      ) : (
        <div className="space-y-2">
          {markets.map((market) => {
            const yesOutcome = market.outcomes.find((o) => o.label.toLowerCase() === 'yes')
            const noOutcome = market.outcomes.find((o) => o.label.toLowerCase() === 'no')
            const yesPct = yesOutcome ? Math.round(yesOutcome.probability) : null
            const noPct = noOutcome ? Math.round(noOutcome.probability) : null

            return (
              <div
                key={market.id}
                className="rounded-xl border border-border-subtle bg-surface-elevated/30 p-4 transition-all duration-200 hover:border-accent-500/20"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h3 className="text-sm font-medium text-text-primary leading-snug flex-1">
                    {market.question}
                  </h3>
                  <a
                    href={market.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-shrink-0 ${theme.styles.buttonIcon} p-1.5 rounded-lg`}
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-text-tertiary" />
                  </a>
                </div>

                {yesPct !== null && noPct !== null && (
                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-green-400 uppercase tracking-wider">
                          Yes
                        </span>
                        <span className="text-xs font-bold text-green-400">{yesPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-surface-elevated">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                          style={{ width: `${yesPct}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-2xs font-semibold text-red-400 uppercase tracking-wider">
                          No
                        </span>
                        <span className="text-xs font-bold text-red-400">{noPct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden bg-surface-elevated">
                        <div
                          className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                          style={{ width: `${noPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {yesPct === null && market.outcomes.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {market.outcomes.map((outcome) => (
                      <div key={outcome.id} className="flex items-center justify-between py-1">
                        <span className="text-xs text-text-secondary">{outcome.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 rounded-full overflow-hidden bg-surface-elevated">
                            <div
                              className={`h-full bg-gradient-to-r ${styles.sendGradient} rounded-full`}
                              style={{ width: `${Math.round(outcome.probability)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-text-primary w-8 text-right">
                            {Math.round(outcome.probability)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-2xs text-text-tertiary pt-2 border-t border-border-subtle/50">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    <span>{formatCompactNumber(market.volume)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    <span>{formatCompactNumber(market.liquidity)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatEndDate(market.endDate)}</span>
                  </div>
                  {market.tags.length > 0 && (
                    <div className="flex gap-1 ml-auto">
                      {market.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-1.5 py-0.5 rounded text-2xs font-medium bg-surface-elevated text-text-tertiary border border-border-subtle/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
