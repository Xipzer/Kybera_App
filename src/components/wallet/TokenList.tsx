import { Network } from '../../utils/networks'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { TrendingDown, TrendingUp, Clock, CheckCircle2, Coins } from 'lucide-react'
import { BlockchainBalance } from '../../services/blockchain/blockchainService'
import { useTheme } from '../../hooks/useTheme'

// Theme color configurations for token list
const tokenThemeColors = {
  light: {
    cardBg: 'bg-white/70',
    cardBorder: 'border-gray-200/50',
    cardHover: 'hover:border-gray-300/60 hover:shadow-md',
    cardShadow: 'shadow-sm',
    iconBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
    badgeLiveBg: 'bg-green-500/10',
    badgeLiveText: 'text-green-600',
    badgeCachedBg: 'bg-yellow-500/10',
    badgeCachedText: 'text-yellow-600',
    badgePartialBg: 'bg-blue-500/10',
    badgePartialText: 'text-blue-600',
    headerGradient: 'from-cyan-600 to-teal-500',
  },
  dark: {
    cardBg: 'bg-white/5',
    cardBorder: 'border-white/10',
    cardHover: 'hover:border-white/20 hover:bg-white/[0.07]',
    cardShadow: '',
    iconBg: 'bg-gradient-to-br from-white/10 to-white/5',
    badgeLiveBg: 'bg-green-500/10',
    badgeLiveText: 'text-green-400',
    badgeCachedBg: 'bg-yellow-500/10',
    badgeCachedText: 'text-yellow-400',
    badgePartialBg: 'bg-blue-500/10',
    badgePartialText: 'text-blue-400',
    headerGradient: 'from-cyan-400 to-pink-400',
  },
  xipz: {
    cardBg: 'bg-primary-800/30',
    cardBorder: 'border-primary-800/50',
    cardHover: 'hover:border-primary-700/50 hover:bg-primary-800/50',
    cardShadow: '',
    iconBg: 'bg-gradient-to-br from-primary-800/50 to-primary-900/50',
    badgeLiveBg: 'bg-green-500/10',
    badgeLiveText: 'text-green-400',
    badgeCachedBg: 'bg-yellow-500/10',
    badgeCachedText: 'text-yellow-400',
    badgePartialBg: 'bg-blue-500/10',
    badgePartialText: 'text-blue-400',
    headerGradient: 'from-red-400 via-red-500 to-red-400',
  },
}

interface TokenListProps {
  network: Network
  balanceData: BlockchainBalance
  isLoading: boolean
  error: string | null
}

export function TokenList({ network, balanceData, isLoading, error }: TokenListProps) {
  const { themeName } = useTheme()
  const colors = tokenThemeColors[themeName] || tokenThemeColors.dark

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-32 bg-white/10 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-20 ${colors.cardBg} rounded-xl`} />
          ))}
        </div>
      </div>
    )
  }

  if (error && balanceData.totalUSD === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Coins className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-sm text-text-secondary">Unable to load token data</p>
        </div>
      </div>
    )
  }

  // Get native currency info
  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18,
  }

  // Create token list including native currency
  const allTokens = [
    {
      symbol: nativeCurrency.symbol,
      name: nativeCurrency.name,
      balance: balanceData.native,
      usdValue: balanceData.nativeUSD,
      change24h: balanceData.native24hChange || 0,
      isNative: true,
      address: undefined,
      fromCache: balanceData.dataQuality?.onChainFromCache || false,
    },
    ...balanceData.tokens.map((token) => ({
      symbol: token.symbol,
      name: token.name,
      balance: token.balance,
      usdValue: token.usdValue || 0,
      change24h: token.usd24hChange || 0,
      isNative: false,
      address: token.address,
      fromCache: token.fromCache || false,
    })),
  ]

  // Calculate data quality summary
  const cachedCount = allTokens.filter((t) => t.fromCache).length
  const totalCount = allTokens.length
  const allFresh = cachedCount === 0
  const allCached = cachedCount === totalCount
  const partial = cachedCount > 0 && cachedCount < totalCount

  return (
    <div className="p-4">
      {/* Token list header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between mb-3">
          <div
            className={`text-sm font-medium bg-gradient-to-r ${colors.headerGradient} bg-clip-text text-transparent`}
          >
            Tokens on {network.name}
          </div>
          {/* Data quality summary badge */}
          {!isLoading && totalCount > 0 && (
            <div className="flex items-center gap-1">
              {allFresh ? (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${colors.badgeLiveBg}`}
                >
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className={`text-xs font-medium ${colors.badgeLiveText}`}>All Live</span>
                </div>
              ) : allCached ? (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${colors.badgeCachedBg}`}
                >
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className={`text-xs font-medium ${colors.badgeCachedText}`}>
                    Updating...
                  </span>
                </div>
              ) : partial ? (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${colors.badgePartialBg}`}
                >
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span className={`text-xs font-medium ${colors.badgePartialText}`}>
                    {totalCount - cachedCount}/{totalCount} Live
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Token cards */}
        {allTokens.map((token) => (
          <div
            key={token.symbol + (token.isNative ? '-native' : token.address || '')}
            className={`p-4 ${colors.cardBg} border ${colors.cardBorder} rounded-xl ${colors.cardHover} ${colors.cardShadow} transition-all duration-200 cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Token icon */}
                <div
                  className={`w-11 h-11 ${colors.iconBg} rounded-xl flex items-center justify-center overflow-hidden`}
                >
                  {!token.isNative &&
                  token.address &&
                  balanceData.tokens.find((t) => t.address === token.address)?.logoURI ? (
                    <img
                      src={balanceData.tokens.find((t) => t.address === token.address)?.logoURI}
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <span
                    className={`text-sm font-bold text-text-primary ${
                      !token.isNative &&
                      token.address &&
                      balanceData.tokens.find((t) => t.address === token.address)?.logoURI
                        ? 'hidden'
                        : ''
                    }`}
                  >
                    {token.symbol.slice(0, 2).toUpperCase()}
                  </span>
                </div>

                {/* Token info */}
                <div>
                  <p className="font-semibold text-text-primary">{token.symbol}</p>
                  <p className="text-sm text-text-secondary">{token.name}</p>
                </div>
              </div>

              {/* Token value */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-0.5">
                  <p className="font-semibold text-text-primary font-mono">
                    {formatCryptoBalance(token.balance)}
                  </p>
                  {/* Staleness indicator */}
                  {token.fromCache ? (
                    <Clock className="w-3.5 h-3.5 text-yellow-500" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <span className="text-sm text-text-secondary">{formatUSD(token.usdValue)}</span>
                  {token.usdValue > 0 && (
                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${
                        token.change24h >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}
                    >
                      {token.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                      <span
                        className={`text-xs font-medium ${
                          token.change24h >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}
                      >
                        {token.change24h >= 0 ? '+' : ''}
                        {token.change24h.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {allTokens.length === 1 && parseFloat(balanceData.native) === 0 && (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
            <Coins className="w-7 h-7 text-text-tertiary" />
          </div>
          <p className="text-text-secondary font-medium">No tokens found</p>
          <p className="text-sm text-text-tertiary mt-1">
            Send some funds to this wallet to see them here
          </p>
        </div>
      )}
    </div>
  )
}
