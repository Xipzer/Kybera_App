import { Globe, Zap } from 'lucide-react'
import { BlockchainBalance } from '../../services/blockchain/blockchainService'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { useTheme } from '../../hooks/useTheme'
import { Network } from '../../utils/networks'
import { Wallet } from '../../types'

// Theme color configurations for network summary
const summaryThemeColors = {
  light: {
    cardBg: 'bg-white/70',
    cardBorder: 'border-gray-200/50',
    cardHover: 'hover:border-gray-300/60 hover:shadow-md',
    cardShadow: 'shadow-sm',
    execCardBg: 'bg-gradient-to-br from-cyan-50/80 to-teal-50/80',
    execCardBorder: 'border-cyan-300/50',
    execCardGlow: 'shadow-cyan-200/30',
    execIconBg: 'bg-gradient-to-br from-cyan-500 to-teal-400',
    execBadgeBg: 'bg-cyan-500',
    iconBg: 'bg-gradient-to-br from-gray-100 to-gray-200',
    dividerColor: 'border-gray-200/50',
    progressBg: 'bg-gray-200/50',
    progressFill: 'bg-gradient-to-r from-cyan-500 to-teal-400',
    headerGradient: 'from-cyan-600 to-teal-500',
  },
  dark: {
    cardBg: 'bg-white/5',
    cardBorder: 'border-white/10',
    cardHover: 'hover:border-white/20 hover:bg-white/[0.07]',
    cardShadow: '',
    execCardBg: 'bg-gradient-to-br from-cyan-500/10 to-pink-500/5',
    execCardBorder: 'border-cyan-500/30',
    execCardGlow: 'shadow-cyan-500/10',
    execIconBg: 'bg-gradient-to-br from-cyan-500 to-pink-500',
    execBadgeBg: 'bg-cyan-500',
    iconBg: 'bg-gradient-to-br from-white/10 to-white/5',
    dividerColor: 'border-white/10',
    progressBg: 'bg-white/10',
    progressFill: 'bg-gradient-to-r from-cyan-500 to-pink-500',
    headerGradient: 'from-cyan-400 to-pink-400',
  },
  xipz: {
    cardBg: 'bg-primary-800/30',
    cardBorder: 'border-primary-800/50',
    cardHover: 'hover:border-primary-700/50 hover:bg-primary-800/50',
    cardShadow: '',
    execCardBg: 'bg-gradient-to-br from-red-500/10 to-red-600/5',
    execCardBorder: 'border-red-500/30',
    execCardGlow: 'shadow-red-500/10',
    execIconBg: 'bg-gradient-to-br from-red-500 to-red-600',
    execBadgeBg: 'bg-red-500',
    iconBg: 'bg-gradient-to-br from-primary-800/50 to-primary-900/50',
    dividerColor: 'border-primary-800/50',
    progressBg: 'bg-primary-800/50',
    progressFill: 'bg-gradient-to-r from-red-500 to-red-600',
    headerGradient: 'from-red-400 via-red-500 to-red-400',
  },
}

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
  const { themeName } = useTheme()
  const colors = summaryThemeColors[themeName] || summaryThemeColors.dark

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
            <div key={i} className={`h-28 ${colors.cardBg} rounded-xl`} />
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
          className={`text-sm font-medium mb-3 bg-gradient-to-r ${colors.headerGradient} bg-clip-text text-transparent`}
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
                  ? `${colors.execCardBg} ${colors.execCardBorder} shadow-lg ${colors.execCardGlow}`
                  : `${colors.cardBg} ${colors.cardBorder} ${colors.cardHover} ${colors.cardShadow}`
              }`}
            >
              {/* Network header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${
                      isExecutionNetwork ? colors.execIconBg : colors.iconBg
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
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs ${colors.execBadgeBg} text-white rounded-md font-medium shadow-sm`}
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
              <div className={`h-1.5 ${colors.progressBg} rounded-full overflow-hidden mb-3`}>
                <div
                  className={`h-full ${colors.progressFill} rounded-full transition-all duration-500`}
                  style={{ width: `${percentOfTotal}%` }}
                />
              </div>

              {/* Token details */}
              <div className={`pt-3 border-t ${colors.dividerColor}`}>
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
