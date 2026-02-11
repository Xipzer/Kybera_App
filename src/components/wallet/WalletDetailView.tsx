/**
 * Code by Xipzer
 */

import { useEffect, useMemo, useState } from 'react'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
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
import { EVM_NETWORKS, SVM_NETWORKS, getNetworksByType } from '../../utils/networks'

let lastActiveTab = 'summary'

export function WalletDetailView() {
  const { activeWalletId, wallets, activeNetwork, viewNetworks } = useWalletStore()
  const [activeTab, setActiveTabState] = useState(lastActiveTab)
  const setActiveTab = (tab: string) => {
    lastActiveTab = tab
    setActiveTabState(tab)
  }
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, forceUpdate] = useState({})
  const { theme } = useTheme()

  const styles = theme.styles.walletDetail

  const activeWallet = activeWalletId ? wallets.find((w) => w.id === activeWalletId) : undefined

  const viewNetworkObjects = useMemo(() => {
    if (viewNetworks && viewNetworks.length > 0) {
      return [...EVM_NETWORKS, ...SVM_NETWORKS].filter((network) =>
        viewNetworks.includes(network.id),
      )
    }
    if (activeWallet) return getNetworksByType(activeWallet.type)
    return EVM_NETWORKS
  }, [viewNetworks, activeWallet])

  const {
    balances: multiNetworkBalances,
    loading: multiLoading,
    error: multiError,
    totalUSD: totalMultiUSD,
    total24hChange: total24hChangeMulti,
    refetch: refetchMulti,
  } = useMultiNetworkBalance(activeWallet ? [activeWallet] : [], viewNetworkObjects)

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate({})
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { copied, copy: copyToClipboard } = useCopyToClipboard()

  if (!activeWalletId || !activeWallet) return null

  const executionBalance = multiNetworkBalances.find((b) => b.networkId === activeNetwork.id) || {
    walletAddress: activeWallet.address,
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

  const balance = {
    ...executionBalance,
    totalUSD: totalMultiUSD,
    total24hChange: total24hChangeMulti,
  }
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refetchMulti()
    } finally {
      setTimeout(() => setIsRefreshing(false), 500)
    }
  }

  const changePercent = balance.total24hChange || 0

  return (
    <div className={`h-full flex flex-col transition-all duration-300`}>
      <div
        className={`p-4 sm:p-6 ${styles.headerBg} backdrop-blur-sm border-b ${styles.headerBorder}`}
      >
        <div className="mb-4 sm:mb-5">
          <h2
            className={`text-xl sm:text-2xl font-bold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent mb-2`}
          >
            {activeWallet.name}
          </h2>

          <div
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg ${styles.addressBg}`}
          >
            <p className={`text-xs sm:text-sm text-text-secondary font-mono`}>
              {formatAddress(activeWallet.address)}
            </p>
            <button
              onClick={() => copyToClipboard(activeWallet.address)}
              className={`p-1 rounded-lg transition-all duration-200 ${styles.iconButtonHover} hover:scale-110`}
              title="Copy address"
            >
              {copied ? (
                <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-secondary" />
              )}
            </button>
            <a
              href={`${activeNetwork.explorerUrl}/address/${activeWallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1 rounded-lg transition-all duration-200 ${styles.iconButtonHover} hover:scale-110`}
              title="View on explorer"
            >
              <ExternalLink className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-text-secondary`} />
            </a>
          </div>
        </div>

        <div
          className={`mb-4 sm:mb-5 p-3 sm:p-5 rounded-2xl ${styles.portfolioBg} border ${styles.portfolioBorder} ${styles.portfolioGlow} backdrop-blur-sm`}
        >
          <div className="flex items-center justify-between mb-1.5 sm:mb-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <p className={`text-xs sm:text-sm text-text-secondary`}>Total Portfolio Value</p>
              {!multiLoading && balance.dataQuality && (
                <div className="flex items-center gap-1">
                  {balance.dataQuality.onChainFromCache ? (
                    <div
                      className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full ${styles.badgeCachedBg}`}
                      title="Blockchain data from cache - refreshing..."
                    >
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-500" />
                      <span className={`text-[10px] sm:text-xs ${styles.badgeCachedText}`}>
                        Cached
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-0.5 rounded-full ${styles.badgeLiveBg}`}
                      title="Blockchain data fresh"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-green-500" />
                      <span className={`text-[10px] sm:text-xs ${styles.badgeLiveText}`}>Live</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={`p-1.5 sm:p-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${styles.iconButtonHover} hover:scale-105`}
              title="Refresh all balances"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isRefreshing || multiLoading ? 'animate-spin' : ''} text-text-secondary`}
              />
            </button>
          </div>

          {multiLoading && balance.totalUSD === 0 ? (
            <div className="h-8 sm:h-10 w-32 sm:w-40 animate-pulse rounded-lg bg-white/10" />
          ) : (
            <>
              <p
                className={`text-2xl sm:text-3xl font-bold bg-gradient-to-r ${styles.valueGradient} bg-clip-text text-transparent`}
              >
                $
                {balance.totalUSD.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div className="flex items-center gap-2 sm:gap-3 mt-1.5 sm:mt-2 flex-wrap">
                <div
                  className={`flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg ${changePercent >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}
                >
                  {changePercent >= 0 ? (
                    <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500" />
                  )}
                  <span
                    className={`text-xs sm:text-sm font-medium ${changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}
                  >
                    {changePercent >= 0 ? '+' : ''}
                    {changePercent.toFixed(2)}%
                  </span>
                </div>
                {balance.lastUpdated && (
                  <span className={`text-[10px] sm:text-xs text-text-tertiary`}>
                    Updated {formatTimeAgo(balance.lastUpdated)}
                  </span>
                )}
                {multiError && balance.totalUSD > 0 && (
                  <span className={`text-[10px] sm:text-xs text-text-tertiary`}>(cached)</span>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setShowSendDialog(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r ${styles.sendGradient} rounded-xl font-medium text-white text-sm sm:text-base shadow-lg ${styles.sendShadow} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
          >
            <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5" />
            Send
          </button>
          <button
            onClick={() => setShowReceiveDialog(true)}
            className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r ${styles.receiveGradient} border ${styles.receiveBorder} rounded-xl font-medium text-sm sm:text-base ${styles.receiveText} transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]`}
          >
            <ArrowDownLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Receive
          </button>
        </div>
      </div>

      <Tabs.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <Tabs.List
          className={`flex gap-1 p-1.5 sm:p-2 ${styles.headerBg} backdrop-blur-sm border-b ${styles.headerBorder}`}
        >
          <Tabs.Trigger
            value="summary"
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${styles.tabInactiveText} ${styles.tabHover} data-[state=active]:${styles.tabActiveBg} data-[state=active]:${styles.tabActiveText} data-[state=active]:shadow-sm`}
          >
            <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Summary
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tokens"
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${styles.tabInactiveText} ${styles.tabHover} data-[state=active]:${styles.tabActiveBg} data-[state=active]:${styles.tabActiveText} data-[state=active]:shadow-sm`}
          >
            <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Tokens
          </Tabs.Trigger>
          <Tabs.Trigger
            value="history"
            className={`flex-1 flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${styles.tabInactiveText} ${styles.tabHover} data-[state=active]:${styles.tabActiveBg} data-[state=active]:${styles.tabActiveText} data-[state=active]:shadow-sm`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
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
            viewNetworks={viewNetworkObjects}
            multiNetworkBalances={multiNetworkBalances}
            isLoading={multiLoading}
            error={multiError}
            walletType={activeWallet.type}
          />
        </Tabs.Content>

        <Tabs.Content value="history" className="flex-1 overflow-y-auto">
          <TransactionHistory wallet={activeWallet} network={activeNetwork} />
        </Tabs.Content>
      </Tabs.Root>

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