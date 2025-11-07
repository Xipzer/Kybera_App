import { Network } from '../../utils/networks'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { TrendingDown, TrendingUp, Clock, CheckCircle2 } from 'lucide-react'
import { BlockchainBalance } from '../../services/blockchain/blockchainService'
import { useTheme } from '../../hooks/useTheme'

interface TokenListProps {
  network: Network
  balanceData: BlockchainBalance
  isLoading: boolean
  error: string | null
}

export function TokenList({ network, balanceData, isLoading, error }: TokenListProps) {
  const { theme } = useTheme()

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-surface-elevated rounded-lg" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-elevated rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && balanceData.totalUSD === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-accent mb-2">{error}</p>
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
      {/* Token list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between mb-2">
          <div className={`text-xs font-medium ${theme.styles.textSecondary}`}>
            Tokens on {network.name}
          </div>
          {/* Data quality summary */}
          {!isLoading && totalCount > 0 && (
            <div className="flex items-center gap-1">
              {allFresh ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">All Live</span>
                </div>
              ) : allCached ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/10">
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">Updating...</span>
                </div>
              ) : partial ? (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10">
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span className="text-xs text-blue-600 dark:text-blue-400">
                    {totalCount - cachedCount}/{totalCount} Live
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>
        {allTokens.map((token) => (
          <div
            key={token.symbol + (token.isNative ? '-native' : token.address || '')}
            className="p-4 bg-surface-base border border-border-subtle rounded-lg hover:border-border-default transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-elevated rounded-full flex items-center justify-center overflow-hidden">
                  {!token.isNative &&
                  token.address &&
                  balanceData.tokens.find((t) => t.address === token.address)?.logoURI ? (
                    <img
                      src={balanceData.tokens.find((t) => t.address === token.address)?.logoURI}
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to text if image fails to load
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <span
                    className={`text-sm font-medium text-text-primary ${
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
                <div>
                  <p className="font-medium text-text-primary">{token.symbol}</p>
                  <p className="text-sm text-text-secondary">{token.name}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5 mb-0.5">
                  <p className="font-medium text-text-primary">
                    {formatCryptoBalance(token.balance)}
                  </p>
                  {/* Staleness indicator */}
                  {token.fromCache ? (
                    <Clock
                      className="w-3.5 h-3.5 text-yellow-500"
                      title="Cached data - refreshing..."
                    />
                  ) : (
                    <CheckCircle2
                      className="w-3.5 h-3.5 text-green-500"
                      title="Fresh data from blockchain"
                    />
                  )}
                </div>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-sm text-text-secondary">{formatUSD(token.usdValue)}</span>
                  {token.usdValue > 0 && (
                    <div className="flex items-center gap-0.5">
                      {token.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-accent" />
                      )}
                      <span
                        className={`text-xs ${
                          token.change24h >= 0 ? 'text-green-500' : 'text-accent'
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

      {allTokens.length === 1 && parseFloat(balanceData.native) === 0 && (
        <div className="text-center py-8">
          <p className="text-text-secondary">No tokens found</p>
          <p className="text-sm text-text-tertiary mt-1">
            Send some funds to this wallet to see them here
          </p>
        </div>
      )}
    </div>
  )
}