import { useState, useEffect } from 'react'
import {
  Send,
  Download,
  History,
  Coins,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import * as Tabs from '@radix-ui/react-tabs'
import { formatAddress, formatCryptoBalance, formatTimeAgo } from '../../utils/formatters'
import { SendDialog } from './SendDialog'
import { ReceiveDialog } from './ReceiveDialog'
import { TokenList } from './TokenList'
import { TransactionHistory } from './TransactionHistory'
import { useWalletBalance } from '../../hooks/useWalletBalance'
import { useTheme } from '../../hooks/useTheme'

export function WalletDetailView() {
  const { activeWalletId, wallets, activeNetwork } = useWalletStore()
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)
  const { theme: themeConfig, themeName } = useTheme()

  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const { balance, loading, error, refetch } = useWalletBalance(activeWallet, activeNetwork)

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

  // Get native currency info with fallback
  const nativeCurrency = activeNetwork.nativeCurrency || {
    name: activeNetwork.symbol || 'ETH',
    symbol: activeNetwork.symbol || 'ETH',
    decimals: 18
  }
  
  // Get change from balance data (refresh-to-refresh)
  const changePercent = balance.totalUSDChange || 0

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${themeConfig.styles.mainContainer}`}>
      {/* Wallet Header */}
      <div className={`p-6 transition-all duration-300 ${themeConfig.styles.panelHeader}`}>
        <div className="mb-4">
          <h2 className={`text-2xl font-bold mb-1 ${themeConfig.styles.textPrimary}`}>{activeWallet.name}</h2>
          <div className="flex items-center gap-2">
            <p className={`text-sm ${themeConfig.styles.textSecondary}`}>{formatAddress(activeWallet.address)}</p>
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
              onClick={refetch}
              disabled={loading}
              className={`p-1 rounded transition-all duration-300 disabled:opacity-50 ${themeConfig.styles.buttonIcon}`}
              title="Refresh all balances"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''} ${themeConfig.styles.iconSecondary}`} />
            </button>
          </div>
          {loading ? (
            <div className="h-8 w-32 animate-pulse rounded bg-surface-base" />
          ) : error ? (
            <p className="text-lg font-bold text-accent">Error loading</p>
          ) : (
            <>
              <p className={`text-2xl font-bold ${themeConfig.styles.textPrimary}`}>${balance.totalUSD.toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  {changePercent >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-accent" />
                  )}
                  <span
                    className={`text-sm ${
                      changePercent >= 0 ? 'text-green-500' : 'text-accent'
                    }`}
                  >
                    {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
                  </span>
                </div>
                {balance.lastUpdated && (
                  <span className={`text-xs ${themeConfig.styles.textTertiary}`}>
                    ({formatTimeAgo(balance.lastUpdated)})
                  </span>
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
      <Tabs.Root defaultValue="tokens" className="flex-1 flex flex-col overflow-hidden">
        <Tabs.List className={themeConfig.styles.tabs.list}>
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

        <Tabs.Content value="tokens" className="flex-1 overflow-y-auto">
          <TokenList wallet={activeWallet} network={activeNetwork} />
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