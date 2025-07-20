import { useState } from 'react'
import {
  Send,
  Download,
  History,
  Coins,
  Copy,
  ExternalLink,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import * as Tabs from '@radix-ui/react-tabs'
import { formatAddress } from '../../utils/formatters'
import { SendDialog } from './SendDialog'
import { ReceiveDialog } from './ReceiveDialog'
import { TokenList } from './TokenList'
import { TransactionHistory } from './TransactionHistory'

export function WalletDetailView() {
  const { activeWalletId, wallets, activeNetwork } = useWalletStore()
  const [showSendDialog, setShowSendDialog] = useState(false)
  const [showReceiveDialog, setShowReceiveDialog] = useState(false)

  const activeWallet = wallets.find((w) => w.id === activeWalletId)

  if (!activeWallet) {
    return (
      <div className="p-6 text-center text-text-secondary">
        <p>Select a wallet to view details</p>
      </div>
    )
  }

  const copyAddress = () => {
    navigator.clipboard.writeText(activeWallet.address)
  }

  // Mock data for now - will be replaced with real data
  const mockBalance = '1.234'
  const mockUsdValue = '2,468.00'
  const mockChange24h = 5.2

  // Get native currency info with fallback
  const nativeCurrency = activeNetwork.nativeCurrency || {
    name: activeNetwork.symbol || 'ETH',
    symbol: activeNetwork.symbol || 'ETH',
    decimals: 18
  }

  return (
    <div className="h-full flex flex-col bg-surface-base">
      {/* Wallet Header */}
      <div className="p-6 border-b border-border-subtle">
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-text-primary mb-1">{activeWallet.name}</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-text-secondary">{formatAddress(activeWallet.address)}</p>
            <button
              onClick={copyAddress}
              className="p-1 rounded hover:bg-surface-hover transition-colors"
              title="Copy address"
            >
              <Copy className="w-4 h-4 text-text-secondary" />
            </button>
            <a
              href={`${activeNetwork.explorerUrl || activeNetwork.explorer}/address/${activeWallet.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 rounded hover:bg-surface-hover transition-colors"
              title="View on explorer"
            >
              <ExternalLink className="w-4 h-4 text-text-secondary" />
            </a>
          </div>
        </div>

        {/* Balance Display */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold text-text-primary">
              {mockBalance} {nativeCurrency.symbol}
            </span>
            <span className="text-lg text-text-secondary">${mockUsdValue}</span>
          </div>
          <div className="flex items-center gap-1">
            {mockChange24h >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : (
              <TrendingDown className="w-4 h-4 text-accent-500" />
            )}
            <span
              className={`text-sm ${
                mockChange24h >= 0 ? 'text-green-500' : 'text-accent-500'
              }`}
            >
              {mockChange24h >= 0 ? '+' : ''}{mockChange24h}% (24h)
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowSendDialog(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-candy-red text-white rounded-lg hover:shadow-lg hover:shadow-accent-500/30 transition-all duration-300 font-medium"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
          <button
            onClick={() => setShowReceiveDialog(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-border-default rounded-lg hover:bg-surface-hover hover:border-accent-500/50 transition-all duration-300 text-text-primary"
          >
            <Download className="w-4 h-4 text-text-secondary" />
            Receive
          </button>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs.Root defaultValue="tokens" className="flex-1 flex flex-col overflow-hidden">
        <Tabs.List className="flex border-b border-border-subtle">
          <Tabs.Trigger
            value="tokens"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-b-2 data-[state=active]:border-accent-500 transition-colors"
          >
            <Coins className="w-4 h-4" />
            Tokens
          </Tabs.Trigger>
          <Tabs.Trigger
            value="history"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-b-2 data-[state=active]:border-accent-500 transition-colors"
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