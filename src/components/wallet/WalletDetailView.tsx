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



export function WalletDetailView() {
  const { activeWalletId, wallets, activeNetwork, viewNetworks } = useWalletStore()
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, forceUpdate] = useState({})
  const { theme } = useTheme()

  // Get wallet detail theme styles
  const styles = theme.styles.walletDetail

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
            className={`w-16 h-16 mx-auto mb-4 rounded-2xl ${styles.walletIconBg} flex items-center justify-center shadow-lg`}
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
      <div className={`p-6 ${styles.headerBg} backdrop-blur-sm border-b ${styles.headerBorder}`}>
        {/* Wallet name and address */}
        <div className="mb-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-xl ${styles.walletIconBg} shadow-lg`}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h2
              className={`text-2xl font-bold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent`}
            >
              {activeWallet.name}
            </h2>
          </div>

          {/* Address with copy/explorer buttons */}
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${styles.addressBg}`}
          >
            <p className={`text-sm text-text-secondary font-mono`}>
              {formatAddress(activeWallet.address)}
            </p>
            <button
              onClick={copyAddress}
              className={`p-1 rounded-lg transition-all duration-200 ${styles.iconButtonHover} hover:scale-110`}
              title="Copy address"
            >
              <Copy className={`w-3.5 h-3.5 text-text-secondary`} />
            </button>
            <a
              href={`${activeNetwork.explorerUrl || activeNetwork.explorer}/address/${activeWallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1 rounded-lg transition-all duration-200 ${styles.iconButtonHover} hover:scale-110`}
              title="View on explorer"
            >
              <ExternalLink className={`w-3.5 h-3.5 text-text-secondary`} />
            </a>
          </div>
        </div>

        {/* Total Portfolio Value Card */}
        <div
          className={`mb-5 p-5 rounded-2xl ${styles.portfolioBg} border ${styles.portfolioBorder} ${styles.portfolioGlow} backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <p className={`text-sm text-text-secondary`}>Total Portfolio Value</p>
              {/* Data quality badge */}
              {!loading && balance.dataQuality && (
                <div className="flex items-center gap-1">
                  {balance.dataQuality.onChainFromCache ? (
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${styles.badgeCachedBg}`}
                      title="Blockchain data from cache - refreshing..."
                    >
                      <Clock className="w-3 h-3 text-yellow-500" />
                      <span className={`text-xs ${styles.badgeCachedText}`}>Cached</span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${styles.badgeLiveBg}`}
                      title="Blockchain data fresh"
                    >
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      <span className={`text-xs ${styles.badgeLiveText}`}>Live</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${styles.iconButtonHover} hover:scale-105`}
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
                className={`text-3xl font-bold bg-gradient-to-r ${styles.valueGradient} bg-clip-text text-transparent`}
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
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${styles.sendGradient} rounded-xl font-medium text-white shadow-lg ${styles.sendShadow} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
          >
            <ArrowUpRight className="w-5 h-5" />
            Send
          </button>
          <button
            onClick={() => setShowReceiveDialog(true)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${styles.receiveGradient} border ${styles.receiveBorder} rounded-xl font-medium ${styles.receiveText} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
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
          className={`flex gap-1 p-2 ${styles.headerBg} backdrop-blur-sm border-b ${styles.headerBorder}`}
        >
          <Tabs.Trigger
            value="summary"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${styles.tabInactiveText} ${styles.tabHover} data-[state=active]:${styles.tabActiveBg} data-[state=active]:${styles.tabActiveText} data-[state=active]:shadow-sm`}
          >
            <LayoutGrid className="w-4 h-4" />
            Summary
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tokens"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${styles.tabInactiveText} ${styles.tabHover} data-[state=active]:${styles.tabActiveBg} data-[state=active]:${styles.tabActiveText} data-[state=active]:shadow-sm`}
          >
            <Coins className="w-4 h-4" />
            Tokens
          </Tabs.Trigger>
          <Tabs.Trigger
            value="history"
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${styles.tabInactiveText} ${styles.tabHover} data-[state=active]:${styles.tabActiveBg} data-[state=active]:${styles.tabActiveText} data-[state=active]:shadow-sm`}
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
