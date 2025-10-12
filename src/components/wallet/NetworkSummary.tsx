import { Globe, Layers } from 'lucide-react'
import { MultiNetworkBalance } from '../../hooks/useMultiNetworkBalance'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { useTheme } from '../../hooks/useTheme'
import { Network } from '../../utils/networks'
import { Wallet } from '../../types'

interface NetworkSummaryProps {
  wallet: Wallet | undefined
  multiNetworkBalances: MultiNetworkBalance
  executionNetwork: Network
  isLoading: boolean
  error: string | null
}

export function NetworkSummary({
  wallet,
  multiNetworkBalances,
  executionNetwork,
  isLoading,
  error,
}: NetworkSummaryProps) {
  const { theme } = useTheme()

  if (!wallet) {
    return (
      <div className="p-6 text-center">
        <p className={theme.styles.textSecondary}>No wallet selected</p>
      </div>
    )
  }

  if (isLoading && Object.keys(multiNetworkBalances).length === 0) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-surface-elevated rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error && Object.keys(multiNetworkBalances).length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-accent mb-2">{error}</p>
          <p className="text-sm text-text-secondary">Unable to load network data</p>
        </div>
      </div>
    )
  }

  const sortedNetworks = Object.entries(multiNetworkBalances).sort((a, b) => {
    // Sort by total USD value, highest first
    return (b[1].totalUSD || 0) - (a[1].totalUSD || 0)
  })

  const totalAcrossNetworks = sortedNetworks.reduce(
    (sum, [_, balance]) => sum + (balance.totalUSD || 0),
    0,
  )

  return (
    <div className="p-4">
      {/* Total Summary Card */}
      <div className="mb-6 p-4 bg-surface-elevated rounded-lg border border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
            <h3 className={`text-lg font-semibold ${theme.styles.textPrimary}`}>
              Total Across {sortedNetworks.length} Network{sortedNetworks.length !== 1 ? 's' : ''}
            </h3>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${theme.styles.textPrimary}`}>
              {formatUSD(totalAcrossNetworks)}
            </p>
            <p className={`text-xs ${theme.styles.textTertiary}`}>Portfolio Value</p>
          </div>
        </div>
      </div>

      {/* Network Breakdown */}
      <div className="space-y-3">
        <h4 className={`text-sm font-medium mb-3 ${theme.styles.textSecondary}`}>
          Network Breakdown
        </h4>

        {sortedNetworks.map(([networkId, networkBalance]) => {
          const isExecutionNetwork = networkBalance.network.id === executionNetwork.id
          const percentOfTotal =
            totalAcrossNetworks > 0 ? (networkBalance.totalUSD / totalAcrossNetworks) * 100 : 0

          return (
            <div
              key={networkId}
              className={`p-4 rounded-lg border transition-all ${
                isExecutionNetwork
                  ? 'bg-accent/5 border-accent/30'
                  : 'bg-surface-base border-border-subtle hover:border-border-default'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isExecutionNetwork ? 'bg-accent/10' : 'bg-surface-elevated'
                    }`}
                  >
                    <Globe
                      className={`w-5 h-5 ${
                        isExecutionNetwork ? 'text-accent' : theme.styles.iconSecondary
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className={`font-medium ${theme.styles.textPrimary}`}>
                        {networkBalance.network.name}
                      </p>
                      {isExecutionNetwork && (
                        <span className="px-1.5 py-0.5 text-xs bg-accent/10 text-accent rounded font-medium">
                          EXEC
                        </span>
                      )}
                    </div>
                    <p className={`text-sm ${theme.styles.textSecondary}`}>
                      {networkBalance.network.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${theme.styles.textPrimary}`}>
                    {formatUSD(networkBalance.totalUSD)}
                  </p>
                  <p className={`text-sm ${theme.styles.textSecondary}`}>
                    {percentOfTotal.toFixed(1)}% of total
                  </p>
                </div>
              </div>

              {/* Native Token Balance */}
              <div className="mt-3 pt-3 border-t border-border-subtle">
                <div className="flex items-center justify-between text-sm">
                  <span className={theme.styles.textSecondary}>Native Balance</span>
                  <div className="text-right">
                    <span className={theme.styles.textPrimary}>
                      {formatCryptoBalance(networkBalance.native)} {networkBalance.network.symbol}
                    </span>
                    <span className={`ml-2 ${theme.styles.textSecondary}`}>
                      ({formatUSD(networkBalance.nativeUSD)})
                    </span>
                  </div>
                </div>

                {/* Token Count */}
                {networkBalance.tokens.length > 0 && (
                  <div className="flex items-center justify-between text-sm mt-2">
                    <span className={theme.styles.textSecondary}>Tokens</span>
                    <span className={theme.styles.textPrimary}>
                      {networkBalance.tokens.length} token
                      {networkBalance.tokens.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>

              {/* Last Updated */}
              {networkBalance.lastUpdated && (
                <div className="mt-2 text-xs text-center">
                  <span className={theme.styles.textTertiary}>
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
        <div className="text-center py-8">
          <Globe className={`w-12 h-12 mx-auto mb-3 ${theme.styles.textTertiary}`} />
          <p className={theme.styles.textSecondary}>No networks selected</p>
          <p className={`text-sm mt-1 ${theme.styles.textTertiary}`}>
            Select networks to view your balances
          </p>
        </div>
      )}
    </div>
  )
}
