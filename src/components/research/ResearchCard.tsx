/**
 * Code by Xipzer
 */

import { useState } from 'react'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
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
  RefreshCw,
} from 'lucide-react'
import { TokenResearch, RISK_RATING_CONFIG } from '../../types/research'
import { useTheme } from '../../hooks/useTheme'
import { formatAddress, formatCompactNumber, formatTokenPrice } from '../../utils/formatters'
import { getExplorerUrl } from '../../utils/networks'
import { dexScreenerService } from '../../services/research/dexScreenerService'
import { themeClasses, statusClasses } from '../../utils/themeClasses'

function parseInlineMarkdown(text: string, tc: ReturnType<typeof themeClasses>): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const codeMatch = remaining.match(/^`([^`]+)`/)
    if (codeMatch) {
      elements.push(
        <code key={key++} className={`px-1.5 py-0.5 rounded text-xs font-mono ${tc.codeBg}`}>
          {codeMatch[1]}
        </code>,
      )
      remaining = remaining.slice(codeMatch[0].length)
      continue
    }

    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      elements.push(
        <strong key={key++} className="font-semibold text-text-primary">
          {boldMatch[1]}
        </strong>,
      )
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      elements.push(
        <a
          key={key++}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline decoration-1 underline-offset-2 ${tc.linkAccent} transition-colors`}
        >
          {linkMatch[1]}
        </a>,
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    const nextSpecial = remaining.search(/[`*\[]/)
    if (nextSpecial === -1) {
      elements.push(<span key={key++}>{remaining}</span>)
      break
    } else if (nextSpecial === 0) {
      elements.push(<span key={key++}>{remaining[0]}</span>)
      remaining = remaining.slice(1)
    } else {
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
  onRefresh?: (research: TokenResearch) => void
  isRefreshing?: boolean
}

export function ResearchCard({
  research,
  onApe,
  onFade,
  onRefresh,
  isRefreshing,
}: ResearchCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)
  const { copied, copy: copyToClipboard } = useCopyToClipboard()
  const { themeName, theme, isDark } = useTheme()
  const tc = themeClasses(isDark)

  const getCardStyles = () => {
    switch (themeName) {
      case 'xipz':
        return {
          bg: 'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950',
          border: 'border-primary-800/50 hover:border-primary-700/50',
        }
      case 'dark':
        return {
          bg: 'bg-surface-base',
          border: 'border-[#8b8bff]/10 hover:border-[#8b8bff]/20',
        }
      case 'ogDark':
        return {
          bg: 'bg-surface-base',
          border: 'border-white/10 hover:border-white/20',
        }
      case 'light':
        return {
          bg: 'bg-surface-elevated',
          border: 'border-indigo-200/30 hover:border-indigo-300/40',
        }
      case 'ogLight':
        return {
          bg: 'bg-surface-elevated',
          border: 'border-gray-200/30 hover:border-gray-300/40',
        }
      default:
        return {
          bg: 'bg-surface-elevated',
          border: 'border-gray-200 hover:border-gray-300',
        }
    }
  }

  const cardStyles = getCardStyles()
  const cardBg = cardStyles.bg
  const cardBorder = cardStyles.border

  const handleCopyAnalysis = async () => {
    if (research.rawResponse) {
      await copyToClipboard(research.rawResponse)
    }
  }

  const iconAccent = theme.styles.iconAccent

  const ratingConfig = RISK_RATING_CONFIG[research.rating]
  const isLoading = research.status === 'pending' || research.status === 'researching'
  const hasFailed = research.status === 'failed'

  const formatNumber = formatCompactNumber
  const formatPrice = formatTokenPrice

  const dexScreenerUrl = dexScreenerService.getTokenUrl(research.contractAddress, research.network)
  const geckoTerminalUrl = `https://www.geckoterminal.com/${research.network.toLowerCase()}/pools/${research.contractAddress}`
  const explorerTokenUrl = `${getExplorerUrl(research.network)}/token/${research.contractAddress}`

  if (isLoading) {
    return (
      <div className={`${cardBg} border ${cardBorder} rounded-2xl p-4 sm:p-6 animate-pulse`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${tc.skeleton}`} />
          <div className="flex-1">
            <div className={`h-4 sm:h-5 w-24 sm:w-32 ${tc.skeleton} rounded mb-2`} />
            <div className={`h-3 sm:h-4 w-36 sm:w-48 ${tc.skeletonSubtle} rounded`} />
          </div>
          <Loader2 className={`w-5 h-5 sm:w-6 sm:h-6 ${iconAccent} animate-spin`} />
        </div>
        <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-text-secondary text-center">
          Researching token...
        </div>
      </div>
    )
  }

  if (hasFailed) {
    return (
      <div className={`${cardBg} border ${cardBorder} rounded-2xl p-4 sm:p-6`}>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-text-primary text-sm sm:text-base">
              Research Failed
            </h3>
            <p className="text-xs sm:text-sm text-red-500 truncate">
              {research.errorMessage || 'Unknown error'}
            </p>
          </div>
        </div>
        <div className="mt-3 sm:mt-4 flex justify-end">
          <button
            onClick={() => onFade?.(research)}
            className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`${cardBg} border ${cardBorder} rounded-2xl overflow-hidden transition-all duration-300`}
    >
      <div className={`p-3 sm:p-4 border-b ${tc.borderSubtle}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className={`w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center border ${tc.border} flex-shrink-0 overflow-hidden`}
            >
              {research.tokenLogo ? (
                <img
                  src={research.tokenLogo}
                  alt={research.tokenSymbol}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    e.currentTarget.nextElementSibling?.classList.remove('hidden')
                  }}
                />
              ) : null}
              <span
                className={`text-sm sm:text-lg font-bold text-text-primary ${research.tokenLogo ? 'hidden' : ''}`}
              >
                {research.tokenSymbol.slice(0, 2).toUpperCase()}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                <h3 className="font-semibold text-text-primary text-sm sm:text-lg truncate">
                  {research.tokenName}
                </h3>
                <span className="text-text-secondary text-xs sm:text-base">
                  ${research.tokenSymbol}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 text-[10px] sm:text-sm text-text-tertiary">
                <span className="uppercase">{research.network}</span>
                <span className="opacity-50 hidden sm:inline">|</span>
                <a
                  href={explorerTokenUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-0.5 sm:gap-1 hover:${iconAccent} transition-colors`}
                >
                  {formatAddress(research.contractAddress)}
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </a>
                <span className="opacity-50">|</span>
                <a
                  href={dexScreenerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity flex items-center"
                  title="View on DexScreener"
                >
                  <img
                    src="https://dexscreener.com/favicon.png"
                    alt="DexScreener"
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm"
                  />
                </a>
                <a
                  href={geckoTerminalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity flex items-center"
                  title="View on GeckoTerminal"
                >
                  <img
                    src="https://www.geckoterminal.com/favicon.ico"
                    alt="GeckoTerminal"
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-sm"
                  />
                </a>
              </div>
            </div>
          </div>

          <div
            className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full ${ratingConfig.bgColor} flex items-center gap-1 sm:gap-2 flex-shrink-0`}
          >
            <span className="text-sm sm:text-lg">{ratingConfig.emoji}</span>
            <span className={`text-[10px] sm:text-sm font-bold ${ratingConfig.color}`}>
              {ratingConfig.label}
            </span>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
          <div>
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">
              Price
            </div>
            <div className="text-text-primary font-medium text-xs sm:text-base">
              {formatPrice(research.price)}
            </div>
            {research.priceChange24h !== undefined && (
              <div
                className={`text-[10px] sm:text-xs ${research.priceChange24h >= 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {research.priceChange24h >= 0 ? '+' : ''}
                {research.priceChange24h.toFixed(2)}%
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">
              MCap
            </div>
            <div className="text-text-primary font-medium text-xs sm:text-base">
              {formatNumber(research.marketCap)}
            </div>
          </div>
          {research.volume24h && (
            <div>
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">
                24h Vol
              </div>
              <div className="text-text-primary font-medium text-xs sm:text-base">
                {formatNumber(research.volume24h)}
              </div>
            </div>
          )}
          {research.holderDistribution && (
            <div>
              <div className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide mb-0.5 sm:mb-1">
                Holders
              </div>
              <div className="text-text-primary font-medium text-xs sm:text-base">
                {research.holderDistribution.totalHolders.toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className={expanded ? '' : 'hidden'}>
        <div className="p-2.5 sm:p-4 grid sm:grid-cols-2 gap-2 sm:gap-4">
          <div
            className={`${statusClasses('green', isDark).alertBg} border ${statusClasses('green', isDark).border} rounded-xl p-3 sm:p-4`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
              </div>
              <h4 className="font-medium text-green-600 dark:text-green-400 text-sm sm:text-base">
                Pros
              </h4>
            </div>
            <ul className="space-y-1.5 sm:space-y-2">
              {research.pros.map((pro, index) => (
                <li
                  key={index}
                  className={`flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm ${statusClasses('green', isDark).text}`}
                >
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
                  <span>{pro}</span>
                </li>
              ))}
              {research.pros.length === 0 && (
                <li className="text-xs sm:text-sm text-text-tertiary italic">No pros identified</li>
              )}
            </ul>
          </div>

          <div
            className={`${statusClasses('red', isDark).alertBg} border ${statusClasses('red', isDark).border} rounded-xl p-3 sm:p-4`}
          >
            <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
              </div>
              <h4 className="font-medium text-red-600 dark:text-red-400 text-sm sm:text-base">
                Cons
              </h4>
            </div>
            <ul className="space-y-1.5 sm:space-y-2">
              {research.cons.map((con, index) => (
                <li
                  key={index}
                  className={`flex items-start gap-1.5 sm:gap-2 text-xs sm:text-sm ${statusClasses('red', isDark).text}`}
                >
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5" />
                  <span>{con}</span>
                </li>
              ))}
              {research.cons.length === 0 && (
                <li className="text-xs sm:text-sm text-text-tertiary italic">No cons identified</li>
              )}
            </ul>
          </div>
        </div>

        {research.developer && (
          <div className="px-2.5 sm:px-4 pb-3 sm:pb-4">
            <div className={`${tc.sectionBg} border rounded-xl p-3 sm:p-4`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${iconAccent}`} />
                <h4 className="font-medium text-text-primary text-sm sm:text-base">Developer</h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                {research.developer.twitterHandle && (
                  <div>
                    <div className="text-text-tertiary mb-0.5 sm:mb-1">Twitter</div>
                    <a
                      href={`https://twitter.com/${research.developer.twitterHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${iconAccent} hover:opacity-80 transition-colors truncate block`}
                    >
                      @{research.developer.twitterHandle}
                    </a>
                  </div>
                )}
                {research.developer.moniScore !== undefined && (
                  <div>
                    <div className="text-text-tertiary mb-0.5 sm:mb-1">Moni Score</div>
                    <div className="text-text-primary font-medium">
                      {research.developer.moniScore}
                    </div>
                  </div>
                )}
                <div>
                  <div className="text-text-tertiary mb-0.5 sm:mb-1">Doxxed</div>
                  <div
                    className={research.developer.isDoxxed ? 'text-green-500' : 'text-yellow-500'}
                  >
                    {research.developer.isDoxxed ? 'Yes' : 'No'}
                  </div>
                </div>
                {research.developer.ensName && (
                  <div>
                    <div className="text-text-tertiary mb-0.5 sm:mb-1">ENS</div>
                    <div className="text-text-primary truncate">{research.developer.ensName}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {research.holderDistribution && (
          <div className="px-2.5 sm:px-4 pb-3 sm:pb-4">
            <div className={`${tc.sectionBg} border rounded-xl p-3 sm:p-4`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                <Wallet className={`w-4 h-4 sm:w-5 sm:h-5 ${iconAccent}`} />
                <h4 className="font-medium text-text-primary text-sm sm:text-base">
                  Holder Distribution
                </h4>
                {research.holderDistribution.hasBotWarnings && (
                  <span className="px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-500 text-[10px] sm:text-xs">
                    Bot Activity
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-text-tertiary mb-0.5 sm:mb-1">Top 10</div>
                  <div className="text-text-primary font-medium">
                    {research.holderDistribution.top10Percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-0.5 sm:mb-1">Top 20</div>
                  <div className="text-text-primary font-medium">
                    {research.holderDistribution.top20Percentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-0.5 sm:mb-1">Deployer</div>
                  <div className="text-text-primary font-medium">
                    {research.holderDistribution.deployerHoldingsPercentage.toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-text-tertiary mb-0.5 sm:mb-1">Locked</div>
                  <div
                    className={
                      research.holderDistribution.isDeployerHoldingsLocked
                        ? 'text-green-500'
                        : 'text-yellow-500'
                    }
                  >
                    {research.holderDistribution.isDeployerHoldingsLocked ? 'Yes' : 'No'}
                    {research.holderDistribution.lockDuration && (
                      <span className="text-text-tertiary ml-1 hidden sm:inline">
                        ({research.holderDistribution.lockDuration})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {research.sources.length > 0 && (
          <div className="px-2.5 sm:px-4 pb-3 sm:pb-4">
            <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-text-tertiary" />
              <span className="text-[10px] sm:text-xs text-text-tertiary uppercase tracking-wide">
                Sources
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {research.sources.map((source, index) => (
                <a
                  key={index}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`px-1.5 py-0.5 sm:px-2 sm:py-1 ${tc.interactiveBg} border rounded-lg text-[10px] sm:text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-0.5 sm:gap-1`}
                >
                  {source.label}
                  <ExternalLink className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {research.ratingReason && (
          <div className="px-2.5 sm:px-4 pb-3 sm:pb-4">
            <div className={`${tc.sectionBg} border rounded-xl p-3 sm:p-4`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                <Info className={`w-4 h-4 sm:w-5 sm:h-5 ${iconAccent}`} />
                <h4 className="font-medium text-text-primary text-sm sm:text-base">
                  Rating Summary
                </h4>
              </div>
              <div className="flex items-start gap-2 sm:gap-3">
                <div
                  className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg ${ratingConfig.bgColor} flex items-center gap-1 sm:gap-1.5 flex-shrink-0`}
                >
                  <span className="text-xs sm:text-sm">{ratingConfig.emoji}</span>
                  <span className={`text-[10px] sm:text-xs font-bold ${ratingConfig.color}`}>
                    {ratingConfig.label}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                  {research.ratingReason}
                </p>
              </div>
            </div>
          </div>
        )}

        {research.liquidity && (
          <div className="px-2.5 sm:px-4 pb-3 sm:pb-4">
            <div className={`${tc.sectionBg} border rounded-xl p-3 sm:p-4`}>
              <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 flex-wrap">
                <Droplets className={`w-4 h-4 sm:w-5 sm:h-5 ${iconAccent}`} />
                <h4 className="font-medium text-text-primary text-sm sm:text-base">Liquidity</h4>
                {research.liquidity.isLiquidityLocked && (
                  <span className="px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-500 text-[10px] sm:text-xs flex items-center gap-0.5 sm:gap-1">
                    <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    Locked
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-text-tertiary mb-0.5 sm:mb-1">Total Liquidity</div>
                  <div className="text-text-primary font-medium">
                    {formatNumber(research.liquidity.totalLiquidityUsd)}
                  </div>
                </div>
                {research.liquidity.lockPlatform && (
                  <div>
                    <div className="text-text-tertiary mb-0.5 sm:mb-1">Lock Platform</div>
                    <div className="text-text-primary truncate">
                      {research.liquidity.lockPlatform}
                    </div>
                  </div>
                )}
                {research.liquidity.lockExpiry && (
                  <div>
                    <div className="text-text-tertiary mb-0.5 sm:mb-1">Lock Expiry</div>
                    <div className="text-text-primary">
                      {new Date(research.liquidity.lockExpiry).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
              {research.liquidity.liquidityPairs &&
                research.liquidity.liquidityPairs.length > 0 && (
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border-subtle">
                    <div className="text-[10px] sm:text-xs text-text-tertiary mb-1.5 sm:mb-2">
                      Liquidity Pairs
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {research.liquidity.liquidityPairs.map((pair, index) => (
                        <div
                          key={index}
                          className={`px-1.5 py-0.5 sm:px-2 sm:py-1 ${tc.sectionBg} border rounded-lg text-[10px] sm:text-xs`}
                        >
                          <span className="text-text-primary">{pair.token}</span>
                          <span className="text-text-tertiary mx-0.5 sm:mx-1">on</span>
                          <span className="text-text-secondary">{pair.dex}</span>
                          <span className="text-text-tertiary ml-0.5 sm:ml-1 hidden sm:inline">
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

        {research.rawResponse && (
          <div className="px-2.5 sm:px-4 pb-3 sm:pb-4">
            <button
              onClick={() => setShowFullAnalysis(!showFullAnalysis)}
              className={`w-full flex items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3 ${tc.accentToggleBg} border rounded-xl transition-all duration-200`}
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <div className={`p-1.5 sm:p-2 rounded-lg ${tc.accentIconBg}`}>
                  <FileText className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconAccent}`} />
                </div>
                <div className="text-left">
                  <span className="text-xs sm:text-sm font-medium text-text-primary block">
                    Full AI Analysis
                  </span>
                  <span className="text-[10px] sm:text-xs text-text-tertiary">
                    Detailed breakdown
                  </span>
                </div>
              </div>
              <div className={`p-1 sm:p-1.5 rounded-lg ${tc.skeletonSubtle}`}>
                {showFullAnalysis ? (
                  <ChevronUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-secondary" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-secondary" />
                )}
              </div>
            </button>

            {showFullAnalysis && (
              <div className={`mt-2 sm:mt-3 rounded-xl overflow-hidden border ${tc.border}`}>
                <div
                  className={`px-3 py-2 sm:px-4 sm:py-3 ${tc.accentHeaderBg} border-b ${tc.borderSubtle} flex items-center justify-between`}
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div
                      className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${tc.accentDot} animate-pulse`}
                    />
                    <span className="text-[10px] sm:text-xs font-medium text-text-secondary uppercase tracking-wider">
                      AI Research Report
                    </span>
                  </div>
                  <button
                    onClick={handleCopyAnalysis}
                    className={`flex items-center gap-1 sm:gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                      copied
                        ? 'bg-green-500/20 text-green-500'
                        : `${tc.interactiveBg} text-text-secondary hover:text-text-primary`
                    }`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`p-3 sm:p-5 max-h-[350px] sm:max-h-[500px] overflow-y-auto ${tc.codeBlockBg}`}
                >
                  <div className="space-y-3">
                    {(() => {
                      const lines = research.rawResponse.split('\n')
                      const elements: React.ReactNode[] = []
                      let tableLines: string[] = []
                      let inTable = false

                      const renderTable = (tableData: string[], keyPrefix: number) => {
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
                            className={`overflow-x-auto rounded-lg border ${tc.border}`}
                          >
                            <table className="w-full text-sm">
                              <thead>
                                <tr className={tc.tableHeaderBg}>
                                  {headerRow.map((cell, i) => (
                                    <th
                                      key={i}
                                      className={`px-3 py-2 text-left font-semibold text-text-primary ${i > 0 ? tc.tableCellBorder : ''}`}
                                    >
                                      {parseInlineMarkdown(cell, tc)}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {dataRows.map((row, rowIndex) => (
                                  <tr
                                    key={rowIndex}
                                    className={`${tc.tableRowBorder} ${rowIndex % 2 === 1 ? tc.tableZebra : ''}`}
                                  >
                                    {row.map((cell, cellIndex) => (
                                      <td
                                        key={cellIndex}
                                        className={`px-3 py-2 text-text-secondary ${cellIndex > 0 ? tc.tableCellBorderSubtle : ''}`}
                                      >
                                        {parseInlineMarkdown(cell, tc)}
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

                        if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
                          if (!inTable) {
                            inTable = true
                            tableLines = []
                          }
                          tableLines.push(line)
                          continue
                        } else if (inTable) {
                          elements.push(renderTable(tableLines, index))
                          inTable = false
                          tableLines = []
                        }

                        if (
                          line.match(/^-{3,}$/) ||
                          line.match(/^\*{3,}$/) ||
                          line.match(/^_{3,}$/)
                        ) {
                          elements.push(<hr key={index} className={`my-4 ${tc.border}`} />)
                          continue
                        }

                        if (line.startsWith('# ')) {
                          const headerText = line.replace(/^#+\s*/, '')
                          elements.push(
                            <div key={index} className="mb-4 first:mt-0">
                              <h3
                                className={`text-lg font-bold text-text-primary pb-2 border-b ${tc.borderSubtle}`}
                              >
                                {parseInlineMarkdown(headerText, tc)}
                              </h3>
                            </div>,
                          )
                          continue
                        }

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
                                  <div className={`w-1 h-4 rounded-full ${tc.accentBar}`} />
                                )}
                                {parseInlineMarkdown(headerText, tc)}
                              </h4>
                            </div>,
                          )
                          continue
                        }

                        if (line.startsWith('- ') || line.startsWith('* ')) {
                          const content = line.replace(/^[-*]\s*/, '')
                          const isPositive = content.includes('✅') || content.includes('🟩')
                          const isNegative =
                            content.includes('❌') ||
                            content.includes('🟥') ||
                            content.includes('⚠️') ||
                            content.includes('🚨')
                          const isWarning = content.includes('🟨') || content.includes('🟧')

                          const status = isPositive
                            ? 'green'
                            : isNegative
                              ? 'red'
                              : isWarning
                                ? 'yellow'
                                : 'neutral'
                          const sc = statusClasses(status, isDark)
                          const bgColor = sc.bg
                          const borderColor = sc.border
                          const textColor = status === 'neutral' ? 'text-text-secondary' : sc.text
                          const iconColorClass = isPositive
                            ? 'text-green-500'
                            : isNegative
                              ? 'text-red-500'
                              : isWarning
                                ? 'text-yellow-500'
                                : 'text-text-tertiary'

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
                                {parseInlineMarkdown(cleanContent, tc)}
                              </span>
                            </div>,
                          )
                          continue
                        }

                        if (line.trim() === '') {
                          elements.push(<div key={index} className="h-1" />)
                          continue
                        }

                        elements.push(
                          <p key={index} className="text-sm text-text-secondary leading-relaxed">
                            {parseInlineMarkdown(line, tc)}
                          </p>,
                        )
                      }

                      if (inTable && tableLines.length > 0) {
                        elements.push(renderTable(tableLines, lines.length))
                      }

                      return elements
                    })()}
                  </div>
                </div>

                <div
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 ${tc.analysisFooterBg} flex items-center justify-between`}
                >
                  <span className="text-[10px] sm:text-xs text-text-tertiary">
                    Powered by OpenClaw AI
                  </span>
                  <span className="text-[10px] sm:text-xs text-text-tertiary">
                    {new Date(research.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={`p-3 sm:p-4 ${tc.footerBg} border-t flex items-center justify-between`}>
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-text-tertiary">
          <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          <span className="hidden sm:inline">
            {new Date(research.timestamp).toLocaleDateString()}{' '}
            {new Date(research.timestamp).toLocaleTimeString()}
          </span>
          <span className="sm:hidden">{new Date(research.timestamp).toLocaleDateString()}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className={`p-1.5 sm:p-2 ${tc.hoverBg} rounded-lg transition-colors text-text-secondary hover:text-text-primary`}
          >
            {expanded ? (
              <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
          </button>

          <button
            onClick={() => onRefresh?.(research)}
            disabled={isRefreshing}
            className={`p-1.5 sm:p-2 ${tc.interactiveBg} border rounded-xl text-text-secondary hover:text-text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Refresh research"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>

          <button
            onClick={() => onFade?.(research)}
            className={`px-2.5 py-1.5 sm:px-4 sm:py-2 ${tc.interactiveBg} border rounded-xl text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary transition-all`}
          >
            Fade
          </button>

          <button
            onClick={() => onApe?.(research)}
            className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl text-xs sm:text-sm font-medium text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Ape In
          </button>
        </div>
      </div>
    </div>
  )
}