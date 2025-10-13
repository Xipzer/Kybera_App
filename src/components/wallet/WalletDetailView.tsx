import { useEffect, useState } from 'react'
import {
  Coins,
  Copy,
  Download,
  ExternalLink,
  History,
  LayoutGrid,
  RefreshCw,
  Send,
  TrendingDown,
  TrendingUp,
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
  const { theme: themeConfig } = useTheme()

  const activeWallet = wallets.find((w) => w.id === activeWalletId)

  // Convert viewNetworks (array of network IDs) to actual Network objects
  const viewNetworkObjects = [...EVM_NETWORKS, ...SVM_NETWORKS].filter((network) =>
    viewNetworks.includes(network.id),
  )

  // Use multi-network balance for viewing data across multiple networks
  const {
    balances: multiNetworkBalances,
    loading: multiLoading,
    error: multiError,
    totalUSD: totalMultiUSD,
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
    totalUSDChange: 0, // TODO: Calculate from multi-network data
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
      <div className={`p-6 text-center ${themeConfig.styles.textSecondary}`}>
        <p>Select a wallet to view details</p>
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

  // Get change from balance data (refresh-to-refresh)
  const changePercent = balance.totalUSDChange || 0

  return (
    <div
      className={`h-full flex flex-col transition-all duration-300 ${themeConfig.styles.mainContainer}`}
    >
      {/* Wallet Header */}
      <div className={`p-6 transition-all duration-300 ${themeConfig.styles.panelHeader}`}>
        <div className="mb-4">
          <h2 className={`text-2xl font-bold mb-1 ${themeConfig.styles.textPrimary}`}>
            {activeWallet.name}
          </h2>
          <div className="flex items-center gap-2">
            <p className={`text-sm ${themeConfig.styles.textSecondary}`}>
              {formatAddress(activeWallet.address)}
            </p>
            <button
              onClick={copyAddress}
              className={`p-1 rounded transition-all duration-300 ${themeConfig.styles.buttonIcon}`}
              title="Copy address"
            >
              <Copy className={`w-4 h-4 ${themeConfig.styles.iconSecondary}`} />
            </button>
            <a
              href={`${activeNetwork.explorerUrl || activeNetwork.explorer}/address/${activeWallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1 rounded transition-all duration-300 ${themeConfig.styles.buttonIcon}`}
              title="View on explorer"
            >
              <ExternalLink className={`w-4 h-4 ${themeConfig.styles.iconSecondary}`} />
            </a>
          </div>
        </div>

        {/* Total Portfolio Value */}
        <div className="mb-6 p-4 rounded-lg bg-surface-elevated">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm ${themeConfig.styles.textSecondary}`}>Total Portfolio Value</p>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-1 rounded transition-all duration-300 disabled:opacity-50 ${themeConfig.styles.buttonIcon}`}
              title="Refresh all balances"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing || loading ? 'animate-spin' : ''} ${themeConfig.styles.iconSecondary}`}
              />
            </button>
          </div>
          {loading && balance.totalUSD === 0 ? (
            <div className="h-8 w-32 animate-pulse rounded bg-surface-base" />
          ) : (
            <>
              <p className={`text-2xl font-bold ${themeConfig.styles.textPrimary}`}>
                ${balance.totalUSD.toFixed(2)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  {changePercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-accent" />
                  )}
                  <span
                    className={`text-sm ${changePercent >= 0 ? 'text-green-500' : 'text-accent'}`}
                  >
                    {changePercent >= 0 ? '+' : ''}
                    {changePercent.toFixed(2)}%
                  </span>
                </div>
                {balance.lastUpdated && (
                  <span className={`text-xs ${themeConfig.styles.textTertiary}`}>
                    ({formatTimeAgo(balance.lastUpdated)})
                  </span>
                )}
                {error && balance.totalUSD > 0 && (
                  <span className={`text-xs ${themeConfig.styles.textTertiary}`}>(cached)</span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowSendDialog(true)}
            className={`flex-1 flex items-center justify-center gap-2 ${themeConfig.styles.buttonPrimary}`}
            style={themeConfig.dynamicStyles.buttonPrimary}
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          <button
            onClick={() => setShowReceiveDialog(true)}
            className={`flex-1 flex items-center justify-center gap-2 ${themeConfig.styles.buttonSecondary}`}
            style={themeConfig.dynamicStyles.buttonSecondary}
          >
            <Download className="w-4 h-4" />
            Receive
          </button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs.Root defaultValue="summary" className="flex-1 flex flex-col overflow-hidden">
        <Tabs.List className={themeConfig.styles.tabs.list}>
          <Tabs.Trigger
            value="summary"
            className={`${themeConfig.styles.tabs.trigger} flex items-center justify-center gap-2`}
          >
            <LayoutGrid className="w-4 h-4" />
            Summary
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tokens"
            className={`${themeConfig.styles.tabs.trigger} flex items-center justify-center gap-2`}
          >
            <Coins className="w-4 h-4" />
            Tokens
          </Tabs.Trigger>
          <Tabs.Trigger
            value="history"
            className={`${themeConfig.styles.tabs.trigger} flex items-center justify-center gap-2`}
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