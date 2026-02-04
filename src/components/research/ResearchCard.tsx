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

interface ResearchCardProps {
  research: TokenResearch
  onApe?: (research: TokenResearch) => void
  onFade?: (research: TokenResearch) => void
  compact?: boolean
}

export function ResearchCard({ research, onApe, onFade, compact = false }: ResearchCardProps) {
  const [expanded, setExpanded] = useState(!compact)

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

  // Format price with appropriate decimals
  const formatPrice = (price: number): string => {
    if (price < 0.00001) return `$${price.toExponential(2)}`
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toFixed(2)}`
  }

  // Truncate address
  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (isLoading) {
    return (
      <div className="bg-surface-elevated border border-white/10 rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/10" />
          <div className="flex-1">
            <div className="h-5 w-32 bg-white/10 rounded mb-2" />
            <div className="h-4 w-48 bg-white/5 rounded" />
          </div>
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
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
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-white">Research Failed</h3>
            <p className="text-sm text-red-400">{research.errorMessage || 'Unknown error'}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => onFade?.(research)}
            className="px-4 py-2 text-sm text-text-secondary hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-elevated border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Token icon placeholder */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-pink-500/20 flex items-center justify-center border border-white/10">
              <span className="text-lg font-bold text-white">
                {research.tokenSymbol.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white text-lg">{research.tokenName}</h3>
                <span className="text-text-secondary">${research.tokenSymbol}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-text-tertiary">
                <span className="uppercase">{research.network}</span>
                <span className="opacity-50">|</span>
                <a
                  href={`https://basescan.org/token/${research.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
                >
                  {truncateAddress(research.contractAddress)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          {/* Rating badge */}
          <div
            className={`px-3 py-1.5 rounded-full ${ratingConfig.bgColor} flex items-center gap-2`}
          >
            <span className="text-lg">{ratingConfig.emoji}</span>
            <span className={`text-sm font-medium ${ratingConfig.color}`}>
              {ratingConfig.label}
            </span>
          </div>
        </div>

        {/* Market data */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Price</div>
            <div className="text-white font-medium">{formatPrice(research.price)}</div>
            {research.priceChange24h !== undefined && (
              <div
                className={`text-xs ${research.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}
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
            <div className="text-white font-medium">{formatNumber(research.marketCap)}</div>
          </div>
          {research.volume24h && (
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">24h Vol</div>
              <div className="text-white font-medium">{formatNumber(research.volume24h)}</div>
            </div>
          )}
          {research.holderDistribution && (
            <div>
              <div className="text-xs text-text-tertiary uppercase tracking-wide mb-1">Holders</div>
              <div className="text-white font-medium">
                {research.holderDistribution.totalHolders.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expandable content */}
      <div className={expanded ? '' : 'hidden'}>
        {/* Pros & Cons */}
        <div className="p-4 grid md:grid-cols-2 gap-4">
          {/* Pros */}
          <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-4 h-4 text-green-400" />
              </div>
              <h4 className="font-medium text-green-400">Pros</h4>
            </div>
            <ul className="space-y-2">
              {research.pros.map((pro, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-green-300/80">
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
          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-4 h-4 text-red-400" />
              </div>
              <h4 className="font-medium text-red-400">Cons</h4>
            </div>
            <ul className="space-y-2">
              {research.cons.map((con, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-red-300/80">
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
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-cyan-400" />
                <h4 className="font-medium text-white">Developer</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {research.developer.twitterHandle && (
                  <div>
                    <div className="text-text-tertiary mb-1">Twitter</div>
                    <a
                      href={`https://twitter.com/${research.developer.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      @{research.developer.twitterHandle}
                    </a>
                  </div>
                )}
                {research.developer.moniScore !== undefined && (
                  <div>
                    <div className="text-text-tertiary mb-1">Moni Score</div>
                    <div className="text-white font-medium">{research.developer.moniScore}</div>
                  </div>
                )}
                <div>
                  <div className="text-text-tertiary mb-1">Doxxed</div>
                  <div
                    className={research.developer.isDoxxed ? 'text-green-400' : 'text-yellow-400'}
                  >
                    {research.developer.isDoxxed ? 'Yes' : 'No'}
                  </div>
                </div>
                {research.developer.ensName && (
                  <div>
                    <div className="text-text-tertiary mb-1">ENS</div>
                    <div className="text-white">{research.developer.ensName}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Holder distribution */}
        {research.holderDistribution && (
          <div className="px-4 pb-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-5 h-5 text-cyan-400" />
                <h4 className="font-medium text-white">Holder Distribution</h4>
                {research.holderDistribution.hasBotWarnings && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                    Bot Activity
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-text-tertiary mb-1">Top 10</div>
                  <div className="text-white font-medium">
                    {research.holderDistribution.top10Percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Top 20</div>
                  <div className="text-white font-medium">
                    {research.holderDistribution.top20Percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Deployer Holdings</div>
                  <div className="text-white font-medium">
                    {research.holderDistribution.deployerHoldingsPercentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-1">Locked</div>
                  <div
                    className={
                      research.holderDistribution.isDeployerHoldingsLocked
                        ? 'text-green-400'
                        : 'text-yellow-400'
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
                  className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-text-secondary hover:text-white transition-colors flex items-center gap-1"
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
      <div className="p-4 bg-black/20 border-t border-white/5 flex items-center justify-between">
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
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-text-secondary hover:text-white"
          >
            {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {/* Fade button */}
          <button
            onClick={() => onFade?.(research)}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-text-secondary hover:text-white transition-all"
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
