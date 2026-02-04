/**
 * ResearchCard Component
 * Displays token research results with pros/cons and risk rating
 */

import { useState } from 'react'
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Users,
  Wallet,
  Shield,
  AlertTriangle,
  Check,
  X,
  TrendingUp,
  Clock,
  Loader2,
} from 'lucide-react'
import { TokenResearch, RISK_RATING_CONFIG } from '../../types/research'
import { useTheme } from '../../hooks/useTheme'

interface ResearchCardProps {
  research: TokenResearch
  onApe?: (research: TokenResearch) => void
  onFade?: (research: TokenResearch) => void
  compact?: boolean
}

export function ResearchCard({ research, onApe, onFade, compact = false }: ResearchCardProps) {
  const [expanded, setExpanded] = useState(!compact)
  const { themeName } = useTheme()
  const isDark = themeName === 'dark' || themeName === 'xipz'

  const ratingConfig = RISK_RATING_CONFIG[research.rating]
  const isLoading = research.status === 'pending' || research.status === 'researching'
  const hasFailed = research.status === 'failed'

  // Format large numbers
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`
    return `$${num.toFixed(2)}`
  }

  // Format price with appropriate decimals (always decimal, never scientific)
  const formatPrice = (price: number): string => {
    if (price === 0) return '$0.00'
    if (price < 0.00000001) return `$${price.toFixed(12)}`
    if (price < 0.000001) return `$${price.toFixed(10)}`
    if (price < 0.0001) return `$${price.toFixed(8)}`
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toFixed(2)}`
  }

  // Get DexScreener URL for the token
  const getDexScreenerUrl = (): string => {
    const chain = research.network.toLowerCase()
    return `https://dexscreener.com/${chain}/${research.contractAddress}`
  }

  // Get GeckoTerminal URL for the token
  const getGeckoTerminalUrl = (): string => {
    const chain = research.network.toLowerCase()
    return `https://www.geckoterminal.com/${chain}/pools/${research.contractAddress}`
  }

  // Truncate address (with safety check)
  const truncateAddress = (address: string | undefined): string => {
    if (!address) return '...'
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (isLoading) {
    return (
      <div
        className={`bg-surface-elevated border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-2xl p-6 animate-pulse`}
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />
          <div className="flex-1">
            <div className={`h-5 w-32 ${isDark ? 'bg-white/10' : 'bg-gray-200'} rounded mb-2`} />
            <div className={`h-4 w-48 ${isDark ? 'bg-white/5' : 'bg-gray-100'} rounded`} />
          </div>
          <Loader2 className="w-6 h-6 text-cyan-500 animate-spin" />
        </div>
        <div className="mt-4 text-sm text-text-secondary text-center">Researching token...</div>
      </div>
    )
  }

  if (hasFailed) {
    return (
      <div className="bg-surface-elevated border border-red-500/30 rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">Research Failed</h3>
            <p className="text-sm text-red-500">{research.errorMessage || 'Unknown error'}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onFade?.(research)}
            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-surface-elevated border ${isDark ? 'border-white/10 hover:border-white/20' : 'border-gray-200 hover:border-gray-300'} rounded-2xl overflow-hidden transition-all duration-300`}
    >
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Token icon placeholder */}
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border ${isDark ? 'border-white/10' : 'border-gray-200'}`}
            >
              <span className="text-lg font-bold text-text-primary">
                {research.tokenSymbol.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-text-primary text-lg">{research.tokenName}</h3>
                <span className="text-text-secondary">${research.tokenSymbol}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <span className="uppercase">{research.network}</span>
                <span className="opacity-50">|</span>
                <a
                  href={`https://basescan.org/token/${research.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-cyan-500 transition-colors"
                >
                  {truncateAddress(research.contractAddress)}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="opacity-50">|</span>
                <a
                  href={getDexScreenerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-500 transition-colors"
                  title="View on DexScreener"
                >
                  DexScreener
                </a>
                <span className="opacity-50">|</span>
                <a
                  href={getGeckoTerminalUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-500 transition-colors"
                  title="View on GeckoTerminal"
                >
                  GeckoTerminal
                </a>
              </div>
            </div>
          </div>

          {/* Rating badge */}
          <div
            className={`px-3 py-1.5 rounded-full ${ratingConfig.bgColor} flex items-center gap-2`}
          >
            <span className="text-lg">{ratingConfig.emoji}</span>
            <span className={`text-sm font-bold ${ratingConfig.color}`}>{ratingConfig.label}</span>
          </div>
        </div>

        {/* Market data */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Price</div>
            <div className="text-text-primary font-medium">{formatPrice(research.price)}</div>
            {research.priceChange24h !== undefined && (
              <div
                className={`text-xs ${research.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {research.priceChange24h >= 0 ? '+' : ''}
                {research.priceChange24h.toFixed(2)}%
              </div>
            )}
          </div>
          <div>
            <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">
              Market Cap
            </div>
            <div className="text-text-primary font-medium">{formatNumber(research.marketCap)}</div>
          </div>
          {research.volume24h && (
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">24h Vol</div>
              <div className="text-text-primary font-medium">
                {formatNumber(research.volume24h)}
              </div>
            </div>
          )}
          {research.holderDistribution && (
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Holders</div>
              <div className="text-text-primary font-medium">
                {research.holderDistribution.totalHolders.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expandable content */}
      <div className={expanded ? '' : 'hidden'}>
        {/* Pros & Cons */}
        <div className="p-3 sm:p-4 grid sm:grid-cols-2 gap-3 sm:gap-4">
          {/* Pros */}
          <div
            className={`${isDark ? 'bg-green-500/5' : 'bg-green-50'} border ${isDark ? 'border-green-500/20' : 'border-green-200'} rounded-xl p-4`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-500" />
              </div>
              <h4 className="font-medium text-green-600 dark:text-green-400">Pros</h4>
            </div>
            <ul className="space-y-2">
              {research.pros.map((pro, index) => (
                <li
                  key={index}
                  className={`flex items-start gap-2 text-sm ${isDark ? 'text-green-300/80' : 'text-green-700'}`}
                >
                  <TrendingUp className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{pro}</span>
                </li>
              ))}
              {research.pros.length === 0 && (
                <li className="text-sm text-text-tertiary italic">No pros identified</li>
              )}
            </ul>
          </div>

          {/* Cons */}
          <div
            className={`${isDark ? 'bg-red-500/5' : 'bg-red-50'} border ${isDark ? 'border-red-500/20' : 'border-red-200'} rounded-xl p-4`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-4 h-4 text-red-500" />
              </div>
              <h4 className="font-medium text-red-600 dark:text-red-400">Cons</h4>
            </div>
            <ul className="space-y-2">
              {research.cons.map((con, index) => (
                <li
                  key={index}
                  className={`flex items-start gap-2 text-sm ${isDark ? 'text-red-300/80' : 'text-red-700'}`}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{con}</span>
                </li>
              ))}
              {research.cons.length === 0 && (
                <li className="text-sm text-text-tertiary italic">No cons identified</li>
              )}
            </ul>
          </div>
        </div>

        {/* Developer info */}
        {research.developer && (
          <div className="px-4 pb-4">
            <div
              className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-cyan-500" />
                <h4 className="font-medium text-text-primary">Developer</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                {research.developer.twitterHandle && (
                  <div>
                    <div className="text-text-tertiary mb-1">Twitter</div>
                    <a
                      href={`https://twitter.com/${research.developer.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-500 hover:text-cyan-600 transition-colors"
                    >
                      @{research.developer.twitterHandle}
                    </a>
                  </div>
                )}
                {research.developer.moniScore !== undefined && (
                  <div>
                    <div className="text-text-tertiary mb-1">Moni Score</div>
                    <div className="text-text-primary font-medium">
                      {research.developer.moniScore}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-text-tertiary mb-1">Doxxed</div>
                  <div
                    className={research.developer.isDoxxed ? 'text-green-500' : 'text-yellow-500'}
                  >
                    {research.developer.isDoxxed ? 'Yes' : 'No'}
                  </div>
                </div>
                {research.developer.ensName && (
                  <div>
                    <div className="text-text-tertiary mb-1">ENS</div>
                    <div className="text-text-primary">{research.developer.ensName}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Holder distribution */}
        {research.holderDistribution && (
          <div className="px-4 pb-4">
            <div
              className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-5 h-5 text-cyan-500" />
                <h4 className="font-medium text-text-primary">Holder Distribution</h4>
                {research.holderDistribution.hasBotWarnings && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-500 text-xs">
                    Bot Activity
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-sm">
                <div>
                  <div className="text-text-tertiary mb-1">Top 10</div>
                  <div className="text-text-primary font-medium">
                    {research.holderDistribution.top10Percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Top 20</div>
                  <div className="text-text-primary font-medium">
                    {research.holderDistribution.top20Percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Deployer Holdings</div>
                  <div className="text-text-primary font-medium">
                    {research.holderDistribution.deployerHoldingsPercentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Locked</div>
                  <div
                    className={
                      research.holderDistribution.isDeployerHoldingsLocked
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {research.holderDistribution.isDeployerHoldingsLocked ? 'Yes' : 'No'}
                    {research.holderDistribution.lockDuration && (
                      <span className="text-text-tertiary ml-1">
                        ({research.holderDistribution.lockDuration})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sources */}
        {research.sources.length > 0 && (
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-text-tertiary" />
              <span className="text-xs text-text-tertiary uppercase tracking-wide">Sources</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {research.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-2 py-1 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1`}
                >
                  {source.label}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div
        className={`p-4 ${isDark ? 'bg-black/20 border-white/5' : 'bg-gray-50 border-gray-100'} border-t flex items-center justify-between`}
      >
        <div className="flex items-center gap-2 text-xs text-text-tertiary">
          <Clock className="w-3 h-3" />
          <span>
            {new Date(research.timestamp).toLocaleDateString()}{' '}
            {new Date(research.timestamp).toLocaleTimeString()}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Expand/collapse button */}
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-2 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-200'} rounded-lg transition-colors text-text-secondary hover:text-text-primary`}
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {/* Fade button */}
          <button
            onClick={() => onFade?.(research)}
            className={`px-4 py-2 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border rounded-xl text-sm font-medium text-text-secondary hover:text-text-primary transition-all`}
          >
            Fade
          </button>

          {/* Ape button */}
          <button
            onClick={() => onApe?.(research)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl text-sm font-medium text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Ape In
          </button>
        </div>
      </div>
    </div>
  )
}
