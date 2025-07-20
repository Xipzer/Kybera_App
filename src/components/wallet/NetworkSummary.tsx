/**
 * Code by Xipzer
 */

import { Globe, Zap } from 'lucide-react'
import { BlockchainBalance } from '../../services/blockchain/blockchainService'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { useTheme } from '../../hooks/useTheme'
import { Network } from '../../utils/networks'
import { Wallet } from '../../types'
import { NetworkIcon } from '../NetworkIcons'

interface NetworkSummaryProps {
  wallet: Wallet | undefined
  multiNetworkBalances: BlockchainBalance[]
  executionNetwork: Network
  viewNetworks: Network[]
  isLoading: boolean
  error: string | null
}

export function NetworkSummary({
  wallet,
  multiNetworkBalances,
  executionNetwork,
  viewNetworks,
  isLoading,
  error,
}: NetworkSummaryProps) {
  const { theme } = useTheme()
  const styles = theme.styles.networkSummary

  if (!wallet) {
    return (
      <div className="p-6 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
          <Globe className="w-7 h-7 text-text-tertiary" />
        </div>
        <p className="text-text-secondary">No wallet selected</p>
      </div>
    )
  }

  if (isLoading && multiNetworkBalances.length === 0) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 bg-white/10 rounded-lg" />
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-28 ${styles.cardBg} rounded-xl`} />
          ))}
        </div>
      </div>
    )
  }

  if (error && multiNetworkBalances.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-red-500/10 flex items-center justify-center">
            <Globe className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-red-400 mb-2">{error}</p>
          <p className="text-sm text-text-secondary">Unable to load network data</p>
        </div>
      </div>
    )
  }

  const networkMap = new Map(viewNetworks.map((n) => [n.id, n.name]))

  const deduplicatedBalances = Array.from(
    multiNetworkBalances
      .reduce((map, balance) => {
        map.set(balance.networkId, balance)
        return map
      }, new Map<string, (typeof multiNetworkBalances)[0]>())
      .values(),
  )

  const sortedNetworks = [...deduplicatedBalances].sort((a, b) => {
    return (b.totalUSD || 0) - (a.totalUSD || 0)
  })

  const totalAcrossNetworks = sortedNetworks.reduce(
    (sum, balance) => sum + (balance.totalUSD || 0),
    0,
  )

  return (
    <div className="p-3 sm:p-4">
      <div className="space-y-2 sm:space-y-3">
        <h4
          className={`text-xs sm:text-sm font-medium mb-2 sm:mb-3 bg-gradient-to-r ${styles.headerGradient} bg-clip-text text-transparent`}
        >
          Network Breakdown
        </h4>

        {sortedNetworks.map((networkBalance) => {
          const isExecutionNetwork = networkBalance.networkId === executionNetwork.id
          const percentOfTotal =
            totalAcrossNetworks > 0 ? (networkBalance.totalUSD / totalAcrossNetworks) * 100 : 0
          const networkName = networkMap.get(networkBalance.networkId) || networkBalance.networkId

          return (
            <div
              key={networkBalance.networkId}
              className={`p-3 sm:p-4 rounded-xl border transition-all duration-200 touch-manipulation ${
                isExecutionNetwork
                  ? `${styles.execCardBg} ${styles.execCardBorder} shadow-lg ${styles.execCardGlow}`
                  : `${styles.cardBg} ${styles.cardBorder} ${styles.cardHover} ${styles.cardShadow}`
              }`}
            >
              <div className="flex items-start justify-between mb-2 sm:mb-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <NetworkIcon
                    networkId={networkBalance.networkId}
                    size={44}
                    className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl shadow-lg flex-shrink-0"
                  />
                  <div>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <p className="text-sm sm:text-base font-semibold text-text-primary">
                        {networkName}
                      </p>
                      {isExecutionNetwork && (
                        <span
                          className={`inline-flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs ${styles.execBadgeBg} text-white rounded-md font-medium shadow-sm`}
                        >
                          <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          EXEC
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-base sm:text-lg font-bold text-text-primary">
                    {formatUSD(networkBalance.totalUSD)}
                  </p>
                  <p className="text-xs sm:text-sm text-text-secondary">
                    {percentOfTotal.toFixed(1)}% of total
                  </p>
                </div>
              </div>

              <div
                className={`h-1 sm:h-1.5 ${styles.progressBg} rounded-full overflow-hidden mb-2 sm:mb-3`}
              >
                <div
                  className={`h-full ${styles.progressFill} rounded-full transition-all duration-500`}
                  style={{ width: `${percentOfTotal}%` }}
                />
              </div>

              <div className={`pt-2 sm:pt-3 border-t ${styles.dividerColor}`}>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-text-secondary">Native Balance</span>
                  <div className="text-right">
                    <span className="font-medium text-text-primary font-mono">
                      {formatCryptoBalance(networkBalance.native)}
                    </span>
                    <span className="ml-1 sm:ml-2 text-text-secondary">
                      ({formatUSD(networkBalance.nativeUSD)})
                    </span>
                  </div>
                </div>

                {networkBalance.tokens.length > 0 && (
                  <div className="flex items-center justify-between text-xs sm:text-sm mt-1.5 sm:mt-2">
                    <span className="text-text-secondary">Tokens</span>
                    <span className="font-medium text-text-primary">
                      {networkBalance.tokens.length} token
                      {networkBalance.tokens.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {networkBalance.lastUpdated && (
                <div className="mt-2 sm:mt-3 pt-1.5 sm:pt-2 text-center">
                  <span className="text-[10px] sm:text-xs text-text-tertiary">
                    Updated {new Date(networkBalance.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {sortedNetworks.length === 0 && (
        <div className="text-center py-10">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white/5 flex items-center justify-center">
            <Globe className="w-7 h-7 text-text-tertiary" />
          </div>
          <p className="text-text-secondary font-medium">No networks selected</p>
          <p className="text-sm mt-1 text-text-tertiary">Select networks to view your balances</p>
        </div>
      )}
    </div>
  )
}