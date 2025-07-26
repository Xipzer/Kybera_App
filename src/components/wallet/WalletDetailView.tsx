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
import { formatAddress, formatCryptoBalance } from '../../utils/formatters'
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
  const [theme, setTheme] = useState(() => {
    if (document.documentElement.classList.contains('xipz')) return 'xipz'
    if (document.documentElement.classList.contains('dark')) return 'dark'
    return 'light'
  })

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (document.documentElement.classList.contains('xipz')) {
        setTheme('xipz')
      } else if (document.documentElement.classList.contains('dark')) {
        setTheme('dark')
      } else {
        setTheme('light')
      }
    })
    
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    })
    
    return () => observer.disconnect()
  }, [])

  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const { balance, loading, error, refetch } = useWalletBalance(activeWallet, activeNetwork)

  if (!activeWallet) {
    return (
      <div className={`p-6 text-center ${
        theme === 'xipz' ? 'text-primary-300' : 'text-text-secondary'
      }`}>
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
  
  // Calculate 24h change (will be 0 if price data is not available)
  const change24h = 0 // TODO: Get from price data

  return (
    <div className={`h-full flex flex-col transition-all duration-300 ${
      theme === 'xipz'
        ? 'bg-gradient-to-br from-primary-950 via-primary-900 to-primary-950'
        : 'bg-surface-base'
    }`}>
      {/* Wallet Header */}
      <div className={`p-6 transition-all duration-300 ${
        theme === 'xipz'
          ? 'border-b border-primary-800/50 bg-primary-900/30'
          : 'border-b border-border-subtle'
      }`}>
        <div className="mb-4">
          <h2 className={`text-2xl font-bold mb-1 ${
            theme === 'xipz' ? 'text-primary-100' : 'text-text-primary'
          }`}>{activeWallet.name}</h2>
          <div className="flex items-center gap-2">
            <p className={`text-sm ${
              theme === 'xipz' ? 'text-primary-300' : 'text-text-secondary'
            }`}>{formatAddress(activeWallet.address)}</p>
            <button
              onClick={copyAddress}
              className={`p-1 rounded transition-all duration-300 ${
                theme === 'xipz' ? 'hover:bg-primary-800/50' : 'hover:bg-surface-hover'
              }`}
              title="Copy address"
            >
              <Copy className={`w-4 h-4 ${
                theme === 'xipz' ? 'text-primary-400' : 'text-text-secondary'
              }`} />
            </button>
            <a
              href={`${activeNetwork.explorerUrl || activeNetwork.explorer}/address/${activeWallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-1 rounded transition-all duration-300 ${
                theme === 'xipz' ? 'hover:bg-primary-800/50' : 'hover:bg-surface-hover'
              }`}
              title="View on explorer"
            >
              <ExternalLink className={`w-4 h-4 ${
                theme === 'xipz' ? 'text-primary-400' : 'text-text-secondary'
              }`} />
            </a>
          </div>
        </div>

        {/* Balance Display */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-1">
            {loading ? (
              <div className="flex items-center gap-2">
                <div className={`w-32 h-8 animate-pulse rounded ${
                  theme === 'xipz' ? 'bg-primary-800/50' : 'bg-surface-elevated'
                }`} />
                <RefreshCw className={`w-4 h-4 animate-spin ${
                  theme === 'xipz' ? 'text-primary-400' : 'text-text-secondary'
                }`} />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2">
                <span className={`${
                  theme === 'xipz' ? 'text-accent-400' : 'text-accent'
                }`}>Error loading balance</span>
                <button
                  onClick={refetch}
                  className={`p-1 rounded transition-all duration-300 ${
                theme === 'xipz' ? 'hover:bg-primary-800/50' : 'hover:bg-surface-hover'
              }`}
                  title="Retry"
                >
                  <RefreshCw className={`w-4 h-4 ${
                    theme === 'xipz' ? 'text-primary-400' : 'text-text-secondary'
                  }`} />
                </button>
              </div>
            ) : (
              <>
                <span className={`text-3xl font-bold ${
                  theme === 'xipz' ? 'text-primary-100' : 'text-text-primary'
                }`}>
                  {formatCryptoBalance(balance.native)} {nativeCurrency.symbol}
                </span>
                <span className={`text-lg ${
                  theme === 'xipz' ? 'text-primary-300' : 'text-text-secondary'
                }`}>
                  ${balance.nativeUSD.toFixed(2)}
                </span>
                <button
                  onClick={refetch}
                  className={`p-1 rounded transition-all duration-300 ml-2 ${
                    theme === 'xipz' ? 'hover:bg-primary-800/50' : 'hover:bg-surface-hover'
                  }`}
                  title="Refresh balance"
                >
                  <RefreshCw className={`w-3 h-3 ${
                    theme === 'xipz' ? 'text-primary-400' : 'text-text-secondary'
                  }`} />
                </button>
              </>
            )}
          </div>
          {!loading && !error && change24h !== 0 && (
            <div className="flex items-center gap-1">
              {change24h >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-accent" />
              )}
              <span
                className={`text-sm ${
                  change24h >= 0 ? 'text-green-500' : 'text-accent'
                }`}
              >
                {change24h >= 0 ? '+' : ''}{change24h}% (24h)
              </span>
            </div>
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
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = themeName === 'xipz' 
                ? 'rgba(239, 68, 68, 0.1)' 
                : 'rgba(255, 0, 153, 0.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
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