/**
 * Code by Xipzer
 */

import { Network, ALL_NETWORKS, getNetworksByType } from '../../utils/networks'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { TrendingDown, TrendingUp, Clock, CheckCircle2, Coins } from 'lucide-react'
import { BlockchainBalance } from '../../services/blockchain/blockchainService'
import { useTheme } from '../../hooks/useTheme'
import { NativeTokenIcon, NetworkIcon } from '../NetworkIcons'
import { useWalletStore } from '../../store/walletStore'
import { ChainType } from '../../types'

interface TokenListProps {
  viewNetworks: Network[]
  multiNetworkBalances: BlockchainBalance[]
  isLoading: boolean
  error: string | null
  walletType: ChainType
}

interface TokenDisplay {
  symbol: string
  name: string
  balance: string
  usdValue: number
  change24h: number
  isNative: boolean
  address: string | undefined
  fromCache: boolean
  networkId: string
  logoURI?: string
}

export function TokenList({
  viewNetworks,
  multiNetworkBalances,
  isLoading,
  error,
  walletType,
}: TokenListProps) {
  const { theme, isDark } = useTheme()
  const styles = theme.styles.tokenList

  const networkSelectorBg = isDark
    ? 'bg-surface-elevated border border-white/10'
    : 'bg-surface-elevated border border-gray-200'
  const { setViewNetworks } = useWalletStore()

  const availableNetworks = getNetworksByType(walletType)

  const activeNetworkIds = new Set(viewNetworks.map((n) => n.id))

  const networkMap = new Map(ALL_NETWORKS.map((n) => [n.id, n]))

  const handleNetworkToggle = (networkId: string) => {
    const currentIds = viewNetworks.map((n) => n.id)
    if (activeNetworkIds.has(networkId)) {
      if (currentIds.length > 1) {
        setViewNetworks(currentIds.filter((id) => id !== networkId))
      }
    } else {
      setViewNetworks([...currentIds, networkId])
    }
  }

  if (isLoading && multiNetworkBalances.length === 0) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-32 bg-white/10 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-20 ${styles.cardBg} rounded-xl`} />
          ))}
        </div>
      </div>
    )
  }


  if (error && multiNetworkBalances.reduce((sum, b) => sum + (b.totalUSD || 0), 0) === 0) {
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

  const deduplicatedBalances = Array.from(
    multiNetworkBalances
      .reduce((map, balance) => {
        map.set(balance.networkId, balance)
        return map
      }, new Map<string, BlockchainBalance>())
      .values(),
  )

  const allTokens: TokenDisplay[] = []

  for (const balanceData of deduplicatedBalances) {
    const network = networkMap.get(balanceData.networkId)
    if (!network) continue

    const nativeCurrency = network.nativeCurrency || {
      name: network.symbol || 'ETH',
      symbol: network.symbol || 'ETH',
      decimals: 18,
    }

    allTokens.push({
      symbol: nativeCurrency.symbol,
      name: nativeCurrency.name,
      balance: balanceData.native,
      usdValue: balanceData.nativeUSD,
      change24h: balanceData.native24hChange || 0,
      isNative: true,
      address: undefined,
      fromCache: balanceData.dataQuality?.onChainFromCache || false,
      networkId: balanceData.networkId,
    })

    for (const token of balanceData.tokens) {
      allTokens.push({
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        usdValue: token.usdValue || 0,
        change24h: token.usd24hChange || 0,
        isNative: false,
        address: token.address,
        fromCache: token.fromCache || false,
        networkId: balanceData.networkId,
        logoURI: token.logoURI,
      })
    }
  }

  allTokens.sort((a, b) => b.usdValue - a.usdValue)

  const cachedCount = allTokens.filter((t) => t.fromCache).length
  const totalCount = allTokens.length
  const allFresh = cachedCount === 0
  const allCached = cachedCount === totalCount
  const partial = cachedCount > 0 && cachedCount < totalCount

  const tokensByNetwork = new Map<string, TokenDisplay[]>()
  for (const token of allTokens) {
    const existing = tokensByNetwork.get(token.networkId) || []
    existing.push(token)
    tokensByNetwork.set(token.networkId, existing)
  }

  return (
    <div className="p-3 sm:p-4">
      <div className="space-y-2 sm:space-y-3">
        <div className="flex items-center justify-between mb-2 sm:mb-3">
          <div className={`flex items-center gap-1 px-2 py-1.5 rounded-lg ${networkSelectorBg}`}>
            {availableNetworks.map((network) => {
              const isActive = activeNetworkIds.has(network.id)
              const isOnlyActive = isActive && viewNetworks.length === 1
              return (
                <button
                  key={network.id}
                  onClick={() => handleNetworkToggle(network.id)}
                  disabled={isOnlyActive}
                  className={`p-1 rounded-md transition-all duration-200 ${
                    isActive
                      ? 'opacity-100 hover:bg-white/10'
                      : 'opacity-30 hover:opacity-60 hover:bg-white/5'
                  } ${isOnlyActive ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  title={`${isActive ? 'Hide' : 'Show'} ${network.name} tokens`}
                >
                  <NetworkIcon
                    networkId={network.id}
                    size={15}
                    className="w-4 h-4 sm:w-[18px] sm:h-[18px]"
                  />
                </button>
              )
            })}
          </div>
          {!isLoading && totalCount > 0 && (
            <div className="flex items-center gap-1">
              {allFresh ? (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${styles.badgeLiveBg}`}
                >
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  <span className={`text-xs font-medium ${styles.badgeLiveText}`}>All Live</span>
                </div>
              ) : allCached ? (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${styles.badgeCachedBg}`}
                >
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className={`text-xs font-medium ${styles.badgeCachedText}`}>
                    Updating...
                  </span>
                </div>
              ) : partial ? (
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${styles.badgePartialBg}`}
                >
                  <Clock className="w-3 h-3 text-blue-500" />
                  <span className={`text-xs font-medium ${styles.badgePartialText}`}>
                    {totalCount - cachedCount}/{totalCount} Live
                  </span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {Array.from(tokensByNetwork.entries()).map(([networkId, tokens]) => {
          const network = networkMap.get(networkId)
          if (!network) return null

          return (
            <div key={networkId} className="space-y-2 sm:space-y-3">
              {viewNetworks.length > 1 && (
                <div className="flex items-center gap-2 pt-2 first:pt-0">
                  <NetworkIcon networkId={networkId} size={16} className="w-4 h-4" />
                  <span className="text-xs font-medium text-text-secondary">{network.name}</span>
                </div>
              )}

              {tokens.map((token) => (
                <div
                  key={`${networkId}-${token.symbol}-${token.isNative ? 'native' : token.address || ''}`}
                  className={`p-3 sm:p-4 ${styles.cardBg} border ${styles.cardBorder} rounded-xl ${styles.cardHover} ${styles.cardShadow} transition-all duration-200 cursor-pointer touch-manipulation`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center overflow-hidden ${
                            token.isNative ? '' : styles.iconBg
                          }`}
                        >
                          {token.isNative ? (
                            <NativeTokenIcon
                              symbol={token.symbol}
                              size={44}
                              className="w-9 h-9 sm:w-11 sm:h-11"
                            />
                          ) : token.logoURI ? (
                            <img
                              src={token.logoURI}
                              alt={token.symbol}
                              className="w-full h-full object-cover rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          {!token.isNative && (
                            <span
                              className={`text-xs sm:text-sm font-bold text-text-primary ${
                                token.logoURI ? 'hidden' : ''
                              }`}
                            >
                              {token.symbol.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-surface-base border border-border-subtle flex items-center justify-center">
                          <NetworkIcon
                            networkId={networkId}
                            size={14}
                            className="w-3 h-3 sm:w-3.5 sm:h-3.5"
                          />
                        </div>
                      </div>

                      <div>
                        <p className="text-sm sm:text-base font-semibold text-text-primary">
                          {token.symbol}
                        </p>
                        <p className="text-xs sm:text-sm text-text-secondary">{token.name}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2 mb-0.5">
                        <p className="text-sm sm:text-base font-semibold text-text-primary font-mono">
                          {formatCryptoBalance(token.balance)}
                        </p>
                        {token.fromCache ? (
                          <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-yellow-500" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
                        )}
                      </div>
                      <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                        <span className="text-xs sm:text-sm text-text-secondary">
                          {formatUSD(token.usdValue)}
                        </span>
                        {token.usdValue > 0 && (
                          <div
                            className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md ${
                              token.change24h >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
                            }`}
                          >
                            {token.change24h >= 0 ? (
                              <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                            ) : (
                              <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-red-500" />
                            )}
                            <span
                              className={`text-[10px] sm:text-xs font-medium ${
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
          )
        })}
      </div>

      {allTokens.length === 0 && (
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