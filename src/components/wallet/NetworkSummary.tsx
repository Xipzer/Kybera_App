import { Globe, Zap } from 'lucide-react'
import { BlockchainBalance } from '../../services/blockchain/blockchainService'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { useTheme } from '../../hooks/useTheme'
import { Network } from '../../utils/networks'
import { Wallet } from '../../types'



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

  // Create a map of network ID to network name for quick lookup
  const networkMap = new Map(viewNetworks.map((n) => [n.id, n.name]))

  // Deduplicate by networkId (keep the most recent/last entry) and sort by USD value
  const deduplicatedBalances = Array.from(
    multiNetworkBalances
      .reduce((map, balance) => {
        map.set(balance.networkId, balance)
        return map
      }, new Map<string, (typeof multiNetworkBalances)[0]>())
      .values(),
  )

  const sortedNetworks = [...deduplicatedBalances].sort((a, b) => {
    // Sort by total USD value, highest first
    return (b.totalUSD || 0) - (a.totalUSD || 0)
  })

  const totalAcrossNetworks = sortedNetworks.reduce(
    (sum, balance) => sum + (balance.totalUSD || 0),
    0,
  )

  return (
    <div className="p-4">
      {/* Network Breakdown Header */}
      <div className="space-y-3">
        <h4
          className={`text-sm font-medium mb-3 bg-gradient-to-r ${styles.headerGradient} bg-clip-text text-transparent`}
        >
          Network Breakdown
        </h4>

        {/* Network Cards */}
        {sortedNetworks.map((networkBalance) => {
          const isExecutionNetwork = networkBalance.networkId === executionNetwork.id
          const percentOfTotal =
            totalAcrossNetworks > 0 ? (networkBalance.totalUSD / totalAcrossNetworks) * 100 : 0
          const networkName = networkMap.get(networkBalance.networkId) || networkBalance.networkId

          return (
            <div
              key={networkBalance.networkId}
              className={`p-4 rounded-xl border transition-all duration-200 ${
                isExecutionNetwork
                  ? `${styles.execCardBg} ${styles.execCardBorder} shadow-lg ${styles.execCardGlow}`
                  : `${styles.cardBg} ${styles.cardBorder} ${styles.cardHover} ${styles.cardShadow}`
              }`}
            >
              {/* Network header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${
                      isExecutionNetwork ? styles.execIconBg : styles.iconBg
                    }`}
                  >
                    <Globe
                      className={`w-5 h-5 ${isExecutionNetwork ? 'text-white' : 'text-text-secondary'}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-text-primary">{networkName}</p>
                      {isExecutionNetwork && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs ${styles.execBadgeBg} text-white rounded-md font-medium shadow-sm`}
                        >
                          <Zap className="w-3 h-3" />
                          EXEC
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-text-primary">
                    {formatUSD(networkBalance.totalUSD)}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {percentOfTotal.toFixed(1)}% of total
                  </p>
                </div>
              </div>

              {/* Progress bar showing percentage */}
              <div className={`h-1.5 ${styles.progressBg} rounded-full overflow-hidden mb-3`}>
                <div
                  className={`h-full ${styles.progressFill} rounded-full transition-all duration-500`}
                  style={{ width: `${percentOfTotal}%` }}
                />
              </div>

              {/* Token details */}
              <div className={`pt-3 border-t ${styles.dividerColor}`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Native Balance</span>
                  <div className="text-right">
                    <span className="font-medium text-text-primary font-mono">
                      {formatCryptoBalance(networkBalance.native)}
                    </span>
                    <span className="ml-2 text-text-secondary">
                      ({formatUSD(networkBalance.nativeUSD)})
                    </span>
                  </div>
                </div>

                {/* Token Count */}
                {networkBalance.tokens.length > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className="text-text-secondary">Tokens</span>
                    <span className="font-medium text-text-primary">
                      {networkBalance.tokens.length} token
                      {networkBalance.tokens.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Last Updated */}
              {networkBalance.lastUpdated && (
                <div className="mt-3 pt-2 text-center">
                  <span className="text-xs text-text-tertiary">
                    Updated {new Date(networkBalance.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* No Networks Selected */}
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
