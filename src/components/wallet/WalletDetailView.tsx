import { useEffect, useMemo, useState } from 'react'
import {
  Coins,
  Copy,
  ExternalLink,
  History,
  LayoutGrid,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Clock,
  CheckCircle2,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import * as Tabs from '@radix-ui/react-tabs'
import { formatAddress, formatTimeAgo } from '../../utils/formatters'
import { SendDialog } from './SendDialog'
import { ReceiveDialog } from './ReceiveDialog'
import { TokenList } from './TokenList'
import { TransactionHistory } from './TransactionHistory'
import { NetworkSummary } from './NetworkSummary'
import { useMultiNetworkBalance } from '../../hooks/useMultiNetworkBalance'
import { useTheme } from '../../hooks/useTheme'
import { EVM_NETWORKS, SVM_NETWORKS } from '../../utils/networks'

// Theme color configurations for wallet detail view
const detailThemeColors = {
  light: {
    headerBg: 'bg-white/60',
    headerBorder: 'border-gray-200/50',
    titleGradient: 'from-cyan-600 via-teal-500 to-cyan-600',
    walletIconBg: 'bg-gradient-to-r from-cyan-500 via-teal-400 to-cyan-600',
    portfolioBg: 'bg-gradient-to-br from-white/80 to-gray-50/80',
    portfolioBorder: 'border-gray-200/50',
    portfolioGlow: '',
    valueGradient: 'from-gray-900 to-gray-700',
    sendGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
    sendShadow: 'shadow-cyan-500/20 hover:shadow-cyan-500/30',
    receiveGradient: 'from-gray-100 to-gray-200',
    receiveBorder: 'border-gray-300/50',
    receiveText: 'text-gray-700',
    tabActiveBg: 'bg-cyan-500/10',
    tabActiveBorder: 'border-cyan-500/30',
    tabActiveText: 'text-cyan-600',
    tabInactiveText: 'text-gray-500',
    tabHover: 'hover:bg-gray-100/60',
    badgeLiveBg: 'bg-green-500/10',
    badgeLiveText: 'text-green-600',
    badgeCachedBg: 'bg-yellow-500/10',
    badgeCachedText: 'text-yellow-600',
    addressBg: 'bg-gray-100/50',
    iconButtonHover: 'hover:bg-gray-100',
  },
  dark: {
    headerBg: 'bg-black/20',
    headerBorder: 'border-white/5',
    titleGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
    walletIconBg: 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-pink-500',
    portfolioBg: 'bg-gradient-to-br from-white/5 to-white/[0.02]',
    portfolioBorder: 'border-white/10',
    portfolioGlow: 'shadow-lg shadow-cyan-500/5',
    valueGradient: 'from-white to-white/80',
    sendGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
    sendShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
    receiveGradient: 'from-white/5 to-white/10',
    receiveBorder: 'border-white/10',
    receiveText: 'text-white',
    tabActiveBg: 'bg-cyan-500/10',
    tabActiveBorder: 'border-cyan-500/30',
    tabActiveText: 'text-cyan-400',
    tabInactiveText: 'text-white/50',
    tabHover: 'hover:bg-white/5',
    badgeLiveBg: 'bg-green-500/10',
    badgeLiveText: 'text-green-400',
    badgeCachedBg: 'bg-yellow-500/10',
    badgeCachedText: 'text-yellow-400',
    addressBg: 'bg-white/5',
    iconButtonHover: 'hover:bg-white/10',
  },
  xipz: {
    headerBg: 'bg-primary-900/50',
    headerBorder: 'border-primary-800/50',
    titleGradient: 'from-red-400 via-red-500 to-red-400',
    walletIconBg: 'bg-gradient-to-r from-red-500 via-red-600 to-red-500',
    portfolioBg: 'bg-gradient-to-br from-white/5 to-white/[0.02]',
    portfolioBorder: 'border-primary-800/50',
    portfolioGlow: 'shadow-lg shadow-red-500/5',
    valueGradient: 'from-white to-white/80',
    sendGradient: 'from-red-500 via-red-600 to-red-500',
    sendShadow: 'shadow-red-500/25 hover:shadow-red-500/40',
    receiveGradient: 'from-white/5 to-white/10',
    receiveBorder: 'border-primary-800/50',
    receiveText: 'text-white',
    tabActiveBg: 'bg-red-500/10',
    tabActiveBorder: 'border-red-500/30',
    tabActiveText: 'text-red-400',
    tabInactiveText: 'text-primary-400',
    tabHover: 'hover:bg-primary-800/30',
    badgeLiveBg: 'bg-green-500/10',
    badgeLiveText: 'text-green-400',
    badgeCachedBg: 'bg-yellow-500/10',
    badgeCachedText: 'text-yellow-400',
    addressBg: 'bg-primary-800/30',
    iconButtonHover: 'hover:bg-primary-800/50',
  },
}

export function WalletDetailView() {
  const { activeWalletId, wallets, activeNetwork, viewNetworks } = useWalletStore()
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, forceUpdate] = useState({})
  const { themeName } = useTheme()

  // Get theme-specific colors
  const colors = detailThemeColors[themeName] || detailThemeColors.dark

  const activeWallet = wallets.find((w) => w.id === activeWalletId)

  // Convert viewNetworks (array of network IDs) to actual Network objects
  // Default to all networks of wallet type if viewNetworks not yet initialized
  const viewNetworkObjects = useMemo(() => {
    const allNetworks = [...EVM_NETWORKS, ...SVM_NETWORKS]

    // If viewNetworks is populated, use it
    if (viewNetworks && viewNetworks.length > 0) {
      return allNetworks.filter((network) => viewNetworks.includes(network.id))
    }

    // Otherwise default to wallet type's networks (or all EVM if no wallet)
    if (activeWallet) {
      return activeWallet.type === 'EVM' ? EVM_NETWORKS : SVM_NETWORKS
    }

    return EVM_NETWORKS // Default fallback
  }, [viewNetworks, activeWallet])

  // Use multi-network balance for viewing data across multiple networks
  const {
    balances: multiNetworkBalances,
    loading: multiLoading,
    error: multiError,
    totalUSD: totalMultiUSD,
    total24hChange: total24hChangeMulti,
    refetch: refetchMulti,
  } = useMultiNetworkBalance(activeWallet ? [activeWallet] : [], viewNetworkObjects)

  // Find the execution balance from the multi-network results to avoid duplicate fetching
  const executionBalance = multiNetworkBalances.find((b) => b.networkId === activeNetwork.id) || {
    walletAddress: activeWallet?.address || '',
    networkId: activeNetwork.id,
    native: '0',
    nativeUSD: 0,
    native24hChange: 0,
    tokens: [],
    totalUSD: 0,
    total24hChange: 0,
    lastUpdated: Date.now(),
    dataQuality: {
      onChainFromCache: false,
      pricesFromCache: false,
    },
  }

  // Combine the data - use multi-network total for display, execution network for transactions
  const loading = multiLoading
  const error = multiError
  const balance = {
    ...executionBalance, // Use execution balance as base
    totalUSD: totalMultiUSD, // Override with multi-network total
    total24hChange: total24hChangeMulti, // Multi-network weighted 24h change
    lastUpdated: Date.now(),
  }

  // Update the time ago display every second
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({})
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  if (!activeWallet) {
    return (
      <div className={`h-full flex items-center justify-center p-6`}>
        <div className="text-center">
          <div
            className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${colors.walletIconBg} flex items-center justify-center shadow-lg`}
          >
            <Wallet className="w-8 h-8 text-white" />
          </div>
          <p className="text-text-secondary">Select a wallet to view details</p>
        </div>
      </div>
    )
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(activeWallet.address)
  }

  // Handle manual refresh with spinner
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetchMulti()
    } finally {
      // Keep spinner for a minimum time for better UX
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  // Get weighted 24h portfolio change
  const changePercent = balance.total24hChange || 0

  return (
    <div className={`h-full flex flex-col transition-all duration-300`}>
      {/* Wallet Header with glassmorphism */}
      <div className={`p-6 ${colors.headerBg} backdrop-blur-sm border-b ${colors.headerBorder}`}>
        {/* Wallet name and address */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${colors.walletIconBg} shadow-lg`}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h2
              className={`text-2xl font-bold bg-gradient-to-r ${colors.titleGradient} bg-clip-text text-transparent`}
            >
              {activeWallet.name}
            </h2>
          </div>

          {/* Address with copy/explorer buttons */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.addressBg}`}
          >
            <p className={`text-sm text-text-secondary font-mono`}>
              {formatAddress(activeWallet.address)}
            </p>
            <button
              onClick={copyAddress}
              className={`p-1 rounded-lg transition-all duration-200 ${colors.iconButtonHover} hover:scale-110`}
              title="Copy address"
            >
              <Copy className={`w-3.5 h-3.5 text-text-secondary`} />
            </button>
            <a
              href={`${activeNetwork.explorerUrl || activeNetwork.explorer}/address/${activeWallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1 rounded-lg transition-all duration-200 ${colors.iconButtonHover} hover:scale-110`}
              title="View on explorer"
            >
              <ExternalLink className={`w-3.5 h-3.5 text-text-secondary`} />
            </a>
          </div>
        </div>

        {/* Total Portfolio Value Card */}
        <div
          className={`mb-5 p-5 rounded-2xl ${colors.portfolioBg} border ${colors.portfolioBorder} ${colors.portfolioGlow} backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className={`text-sm text-text-secondary`}>Total Portfolio Value</p>
              {/* Data quality badge */}
              {!loading && balance.dataQuality && (
                <div className="flex items-center gap-1">
                  {balance.dataQuality.onChainFromCache ? (
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.badgeCachedBg}`}
                      title="Blockchain data from cache - refreshing..."
                    >
                      <Clock className="w-3 h-3 text-yellow-500" />
                      <span className={`text-xs ${colors.badgeCachedText}`}>Cached</span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${colors.badgeLiveBg}`}
                      title="Blockchain data fresh"
                    >
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className={`text-xs ${colors.badgeLiveText}`}>Live</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${colors.iconButtonHover} hover:scale-105`}
              title="Refresh all balances"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin' : ''} text-text-secondary`}
              />
            </button>
          </div>

          {loading && balance.totalUSD === 0 ? (
            <div className="h-10 w-40 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <>
              <p
                className={`text-3xl font-bold bg-gradient-to-r ${colors.valueGradient} bg-clip-text text-transparent`}
              >
                $
                {balance.totalUSD.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div
                  className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${changePercent >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}
                >
                  {changePercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span
                    className={`text-sm font-medium ${changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {changePercent >= 0 ? '+' : ''}
                    {changePercent.toFixed(2)}%
                  </span>
                </div>
                {balance.lastUpdated && (
                  <span className={`text-xs text-text-tertiary`}>
                    Updated {formatTimeAgo(balance.lastUpdated)}
                  </span>
                )}
                {error && balance.totalUSD > 0 && (
                  <span className={`text-xs text-text-tertiary`}>(cached)</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowSendDialog(true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${colors.sendGradient} rounded-xl font-medium text-white shadow-lg ${colors.sendShadow} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
          >
            <ArrowUpRight className="w-5 h-5" />
            Send
          </button>
          <button
            onClick={() => setShowReceiveDialog(true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${colors.receiveGradient} border ${colors.receiveBorder} rounded-xl font-medium ${colors.receiveText} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
          >
            <ArrowDownLeft className="w-5 h-5" />
            Receive
          </button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs.Root defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
        {/* Modernized tabs */}
        <Tabs.List
          className={`flex gap-1 p-2 ${colors.headerBg} backdrop-blur-sm border-b ${colors.headerBorder}`}
        >
          <Tabs.Trigger
            value="summary"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${colors.tabInactiveText} ${colors.tabHover} data-[state=active]:${colors.tabActiveBg} data-[state=active]:${colors.tabActiveText} data-[state=active]:shadow-sm`}
          >
            <LayoutGrid className="w-4 h-4" />
            Summary
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tokens"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${colors.tabInactiveText} ${colors.tabHover} data-[state=active]:${colors.tabActiveBg} data-[state=active]:${colors.tabActiveText} data-[state=active]:shadow-sm`}
          >
            <Coins className="w-4 h-4" />
            Tokens
          </Tabs.Trigger>
          <Tabs.Trigger
            value="history"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${colors.tabInactiveText} ${colors.tabHover} data-[state=active]:${colors.tabActiveBg} data-[state=active]:${colors.tabActiveText} data-[state=active]:shadow-sm`}
          >
            <History className="w-4 h-4" />
            History
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="summary" className="flex-1 overflow-y-auto">
          <NetworkSummary
            wallet={activeWallet}
            multiNetworkBalances={multiNetworkBalances}
            executionNetwork={activeNetwork}
            viewNetworks={viewNetworkObjects}
            isLoading={multiLoading}
            error={multiError}
          />
        </Tabs.Content>

        <Tabs.Content value="tokens" className="flex-1 overflow-y-auto">
          <TokenList
            network={activeNetwork}
            balanceData={balance}
            isLoading={loading}
            error={error}
          />
        </Tabs.Content>

        <Tabs.Content value="history" className="flex-1 overflow-y-auto">
          <TransactionHistory wallet={activeWallet} network={activeNetwork} />
        </Tabs.Content>
      </Tabs.Root>

      {/* Dialogs */}
      <SendDialog
        open={showSendDialog}
        onOpenChange={setShowSendDialog}
        wallet={activeWallet}
        network={activeNetwork}
      />
      <ReceiveDialog
        open={showReceiveDialog}
        onOpenChange={setShowReceiveDialog}
        wallet={activeWallet}
      />
    </div>
  )
}
