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
  FileText,
  Info,
  Droplets,
  Lock,
  Copy,
  CheckCircle,
} from 'lucide-react'
import { TokenResearch, RISK_RATING_CONFIG } from '../../types/research'
import { useTheme } from '../../hooks/useTheme'

// Helper to parse inline markdown (bold, code, links)
function parseInlineMarkdown(text: string, isDark: boolean): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let remaining = text
  let key = 0
  
  while (remaining.length > 0) {
    // Check for inline code `code`
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      elements.push(
        <code 
          key={key++} 
          className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDark ? 'bg-white/10 text-accent-400' : 'bg-gray-100 text-accent-600'}`}
        >
          {codeMatch[1]}
        </code>
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }
    
    // Check for bold **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      elements.push(
        <strong key={key++} className="font-semibold text-text-primary">
          {boldMatch[1]}
        </strong>
      )
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }
    
    // Check for markdown links [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      elements.push(
        <a 
          key={key++} 
          href={linkMatch[2]} 
          target="_blank" 
          rel="noopener noreferrer"
          className={`underline decoration-1 underline-offset-2 ${isDark ? 'text-accent-400 hover:text-accent-300' : 'text-accent-600 hover:text-accent-500'} transition-colors`}
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }
    
    // Find next special character
    const nextSpecial = remaining.search(/[`*\[]/)
    if (nextSpecial === -1) {
      // No more special chars, add rest as text
      elements.push(<span key={key++}>{remaining}</span>)
      break
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match pattern, treat as text
      elements.push(<span key={key++}>{remaining[0]}</span>)
      remaining = remaining.slice(1)
    } else {
      // Add text before special char
      elements.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>)
      remaining = remaining.slice(nextSpecial)
    }
  }
  
  return elements
}

interface ResearchCardProps {
  research: TokenResearch
  onApe?: (research: TokenResearch) => void
  onFade?: (research: TokenResearch) => void
}

export function ResearchCard({ research, onApe, onFade }: ResearchCardProps) {
  // Collapsed by default - user expands to see details
  const [expanded, setExpanded] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)
  const [copied, setCopied] = useState(false)
  const { themeName, theme } = useTheme()
  const isDark = themeName === 'dark' || themeName === 'xipz' || themeName === 'ogDark'

  // Copy analysis to clipboard
  const handleCopyAnalysis = async () => {
    if (research.rawResponse) {
      await navigator.clipboard.writeText(research.rawResponse)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  // Get theme-aware accent color class
  const iconAccent = theme.styles.iconAccent

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
          <Loader2 className={`w-6 h-6 ${iconAccent} animate-spin`} />
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
              className={`w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center border ${isDark ? 'border-white/10' : 'border-gray-200'}`}
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
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-tertiary">
                <span className="uppercase">{research.network}</span>
                <span className="opacity-50 hidden sm:inline">|</span>
                <a
                  href={`https://basescan.org/token/${research.contractAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 hover:${iconAccent} transition-colors`}
                >
                  {truncateAddress(research.contractAddress)}
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span className="opacity-50 hidden sm:inline">|</span>
                <a
                  href={getDexScreenerUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:${iconAccent} transition-colors`}
                  title="View on DexScreener"
                >
                  DexScreener
                </a>
                <span className="opacity-50 hidden sm:inline">|</span>
                <a
                  href={getGeckoTerminalUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`hover:${iconAccent} transition-colors`}
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
                <Users className={`w-5 h-5 ${iconAccent}`} />
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
                      className={`${iconAccent} hover:opacity-80 transition-colors`}
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
                <Wallet className={`w-5 h-5 ${iconAccent}`} />
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

        {/* Rating Summary */}
        {research.ratingReason && (
          <div className="px-4 pb-4">
            <div
              className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Info className={`w-5 h-5 ${iconAccent}`} />
                <h4 className="font-medium text-text-primary">Rating Summary</h4>
              </div>
              <div className="flex items-start gap-3">
                <div
                  className={`px-2 py-1 rounded-lg ${ratingConfig.bgColor} flex items-center gap-1.5 flex-shrink-0`}
                >
                  <span className="text-sm">{ratingConfig.emoji}</span>
                  <span className={`text-xs font-bold ${ratingConfig.color}`}>
                    {ratingConfig.label}
                  </span>
                </div>
                <p className="text-sm text-text-secondary leading-relaxed">
                  {research.ratingReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Liquidity Info */}
        {research.liquidity && (
          <div className="px-4 pb-4">
            <div
              className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Droplets className={`w-5 h-5 ${iconAccent}`} />
                <h4 className="font-medium text-text-primary">Liquidity</h4>
                {research.liquidity.isLiquidityLocked && (
                  <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Locked
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                <div>
                  <div className="text-text-tertiary mb-1">Total Liquidity</div>
                  <div className="text-text-primary font-medium">
                    {formatNumber(research.liquidity.totalLiquidityUsd)}
                  </div>
                </div>
                {research.liquidity.lockPlatform && (
                  <div>
                    <div className="text-text-tertiary mb-1">Lock Platform</div>
                    <div className="text-text-primary">{research.liquidity.lockPlatform}</div>
                  </div>
                )}
                {research.liquidity.lockExpiry && (
                  <div>
                    <div className="text-text-tertiary mb-1">Lock Expiry</div>
                    <div className="text-text-primary">
                      {new Date(research.liquidity.lockExpiry).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
              {research.liquidity.liquidityPairs &&
                research.liquidity.liquidityPairs.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    <div className="text-xs text-text-tertiary mb-2">Liquidity Pairs</div>
                    <div className="flex flex-wrap gap-2">
                      {research.liquidity.liquidityPairs.map((pair, index) => (
                        <div
                          key={index}
                          className={`px-2 py-1 ${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-100 border-gray-200'} border rounded-lg text-xs`}
                        >
                          <span className="text-text-primary">{pair.token}</span>
                          <span className="text-text-tertiary mx-1">on</span>
                          <span className="text-text-secondary">{pair.dex}</span>
                          <span className="text-text-tertiary ml-1">
                            ({formatNumber(pair.liquidityUsd)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Full Analysis Toggle */}
        {research.rawResponse && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowFullAnalysis(!showFullAnalysis)}
              className={`w-full flex items-center justify-between px-4 py-3 ${isDark ? 'bg-gradient-to-r from-accent-500/10 to-accent-600/5 hover:from-accent-500/15 hover:to-accent-600/10 border-accent-500/20' : 'bg-gradient-to-r from-accent-50 to-accent-100/50 hover:from-accent-100 hover:to-accent-100 border-accent-200'} border rounded-xl transition-all duration-200`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${isDark ? 'bg-accent-500/20' : 'bg-accent-500/10'}`}
                >
                  <FileText className={`w-4 h-4 ${iconAccent}`} />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium text-text-primary block">
                    Full AI Analysis
                  </span>
                  <span className="text-xs text-text-tertiary">Detailed research breakdown</span>
                </div>
              </div>
              <div className={`p-1.5 rounded-lg ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                {showFullAnalysis ? (
                  <ChevronUp className="w-4 h-4 text-text-secondary" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                )}
              </div>
            </button>

            {showFullAnalysis && (
              <div
                className={`mt-3 rounded-xl overflow-hidden border ${isDark ? 'border-white/10' : 'border-gray-200'}`}
              >
                {/* Analysis Header with Copy Button */}
                <div
                  className={`px-4 py-3 ${isDark ? 'bg-gradient-to-r from-accent-500/10 to-transparent' : 'bg-gradient-to-r from-accent-50 to-white'} border-b ${isDark ? 'border-white/10' : 'border-gray-100'} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-accent-400' : 'bg-accent-500'} animate-pulse`}
                    />
                    <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
                      AI Research Report
                    </span>
                  </div>
                  <button
                    onClick={handleCopyAnalysis}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      copied
                        ? 'bg-green-500/20 text-green-500'
                        : isDark
                          ? 'bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary'
                          : 'bg-gray-100 hover:bg-gray-200 text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3.5 h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Analysis Content */}
                <div
                  className={`p-5 max-h-[500px] overflow-y-auto ${isDark ? 'bg-black/20' : 'bg-white'}`}
                >
                  <div className="space-y-3">
                    {(() => {
                      const lines = research.rawResponse.split('\n')
                      const elements: React.ReactNode[] = []
                      let tableLines: string[] = []
                      let inTable = false

                      const renderTable = (tableData: string[], keyPrefix: number) => {
                        // Parse table rows
                        const rows = tableData.filter((l) => l.trim() && !l.match(/^\|[-:| ]+\|$/))
                        if (rows.length === 0) return null

                        const parseRow = (row: string) => {
                          return row
                            .split('|')
                            .map((cell) => cell.trim())
                            .filter((cell) => cell)
                        }

                        const headerRow = parseRow(rows[0])
                        const dataRows = rows.slice(1).map(parseRow)

                        return (
                          <div
                            key={`table-${keyPrefix}`}
                            className={`overflow-x-auto rounded-lg border ${isDark ? 'border-white/10' : 'border-gray-200'}`}
                          >
                            <table className="w-full text-sm">
                              <thead>
                                <tr className={isDark ? 'bg-white/5' : 'bg-gray-50'}>
                                  {headerRow.map((cell, i) => (
                                    <th
                                      key={i}
                                      className={`px-3 py-2 text-left font-semibold text-text-primary ${i > 0 ? (isDark ? 'border-l border-white/10' : 'border-l border-gray-200') : ''}`}
                                    >
                                      {parseInlineMarkdown(cell, isDark)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {dataRows.map((row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className={`${isDark ? 'border-t border-white/5' : 'border-t border-gray-100'} ${rowIndex % 2 === 1 ? (isDark ? 'bg-white/[0.02]' : 'bg-gray-50/50') : ''}`}
                                  >
                                    {row.map((cell, cellIndex) => (
                                      <td
                                        key={cellIndex}
                                        className={`px-3 py-2 text-text-secondary ${cellIndex > 0 ? (isDark ? 'border-l border-white/5' : 'border-l border-gray-100') : ''}`}
                                      >
                                        {parseInlineMarkdown(cell, isDark)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      }

                      for (let index = 0; index < lines.length; index++) {
                        const line = lines[index]

                        // Check if line is part of a table
                        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                          if (!inTable) {
                            inTable = true
                            tableLines = []
                          }
                          tableLines.push(line)
                          continue
                        } else if (inTable) {
                          // End of table
                          elements.push(renderTable(tableLines, index))
                          inTable = false
                          tableLines = []
                        }

                        // Horizontal rule
                        if (
                          line.match(/^-{3,}$/) ||
                          line.match(/^\*{3,}$/) ||
                          line.match(/^_{3,}$/)
                        ) {
                          elements.push(
                            <hr
                              key={index}
                              className={`my-4 ${isDark ? 'border-white/10' : 'border-gray-200'}`}
                            />,
                          )
                          continue
                        }

                        // Main headers (# )
                        if (line.startsWith('# ')) {
                          const headerText = line.replace(/^#+\s*/, '')
                          elements.push(
                            <div key={index} className="mb-4 first:mt-0">
                              <h3
                                className={`text-lg font-bold text-text-primary pb-2 border-b ${isDark ? 'border-white/10' : 'border-gray-100'}`}
                              >
                                {parseInlineMarkdown(headerText, isDark)}
                              </h3>
                            </div>,
                          )
                          continue
                        }

                        // Sub headers (## or ###)
                        if (line.startsWith('## ') || line.startsWith('### ')) {
                          const headerText = line.replace(/^#+\s*/, '')
                          const isRatingHeader =
                            headerText.toLowerCase().includes('rating') ||
                            headerText.includes('🟩') ||
                            headerText.includes('🟨') ||
                            headerText.includes('🟧') ||
                            headerText.includes('🟥')
                          elements.push(
                            <div key={index} className="mt-5 mb-3 first:mt-0">
                              <h4
                                className={`text-sm font-semibold uppercase tracking-wide ${isRatingHeader ? iconAccent : 'text-text-primary'} flex items-center gap-2`}
                              >
                                {!isRatingHeader && (
                                  <div
                                    className={`w-1 h-4 rounded-full bg-gradient-to-b ${isDark ? 'from-accent-400 to-accent-600' : 'from-accent-500 to-accent-600'}`}
                                  />
                                )}
                                {parseInlineMarkdown(headerText, isDark)}
                              </h4>
                            </div>,
                          )
                          continue
                        }

                        // Bullet points
                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          const content = line.replace(/^[-*]\s*/, '')
                          const isPositive = content.includes('✅') || content.includes('🟩')
                          const isNegative =
                            content.includes('❌') ||
                            content.includes('🟥') ||
                            content.includes('⚠️') ||
                            content.includes('🚨')
                          const isWarning = content.includes('🟨') || content.includes('🟧')

                          let bgColor = isDark ? 'bg-white/5' : 'bg-gray-50'
                          let borderColor = isDark ? 'border-white/10' : 'border-gray-200'
                          let textColor = 'text-text-secondary'
                          let iconColorClass = 'text-text-tertiary'

                          if (isPositive) {
                            bgColor = isDark ? 'bg-green-500/10' : 'bg-green-50'
                            borderColor = isDark ? 'border-green-500/20' : 'border-green-200'
                            textColor = isDark ? 'text-green-300' : 'text-green-700'
                            iconColorClass = 'text-green-500'
                          } else if (isNegative) {
                            bgColor = isDark ? 'bg-red-500/10' : 'bg-red-50'
                            borderColor = isDark ? 'border-red-500/20' : 'border-red-200'
                            textColor = isDark ? 'text-red-300' : 'text-red-700'
                            iconColorClass = 'text-red-500'
                          } else if (isWarning) {
                            bgColor = isDark ? 'bg-yellow-500/10' : 'bg-yellow-50'
                            borderColor = isDark ? 'border-yellow-500/20' : 'border-yellow-200'
                            textColor = isDark ? 'text-yellow-300' : 'text-yellow-700'
                            iconColorClass = 'text-yellow-500'
                          }

                          const cleanContent = content.replace(/[✅🟩❌🟥⚠️🚨🟨🟧]/g, '').trim()

                          elements.push(
                            <div
                              key={index}
                              className={`flex items-start gap-3 p-3 rounded-lg ${bgColor} border ${borderColor} transition-colors`}
                            >
                              <div className={`mt-0.5 flex-shrink-0 ${iconColorClass}`}>
                                {isPositive ? (
                                  <Check className="w-4 h-4" />
                                ) : isNegative ? (
                                  <X className="w-4 h-4" />
                                ) : isWarning ? (
                                  <AlertTriangle className="w-4 h-4" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-current mt-1.5" />
                                )}
                              </div>
                              <span className={`text-sm leading-relaxed ${textColor}`}>
                                {parseInlineMarkdown(cleanContent, isDark)}
                              </span>
                            </div>,
                          )
                          continue
                        }

                        // Empty lines
                        if (line.trim() === '') {
                          elements.push(<div key={index} className="h-1" />)
                          continue
                        }

                        // Regular text with inline markdown parsing
                        elements.push(
                          <p key={index} className="text-sm text-text-secondary leading-relaxed">
                            {parseInlineMarkdown(line, isDark)}
                          </p>,
                        )
                      }

                      // Render any remaining table
                      if (inTable && tableLines.length > 0) {
                        elements.push(renderTable(tableLines, lines.length))
                      }

                      return elements
                    })()}
                  </div>
                </div>

                {/* Analysis Footer */}
                <div
                  className={`px-4 py-2.5 ${isDark ? 'bg-black/30' : 'bg-gray-50'} border-t ${isDark ? 'border-white/10' : 'border-gray-100'} flex items-center justify-between`}
                >
                  <span className="text-xs text-text-tertiary">Powered by OpenClaw AI</span>
                  <span className="text-xs text-text-tertiary">
                    {new Date(research.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
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
