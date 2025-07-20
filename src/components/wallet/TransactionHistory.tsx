import { Wallet } from '../../types'
import { Network } from '../../utils/networks'
import { formatAddress, formatDate, formatBalance } from '../../utils/formatters'
import { ArrowUpRight, ArrowDownLeft, ExternalLink, RefreshCw } from 'lucide-react'
import { useTransactionHistory } from '../../hooks/useTransactionHistory'

interface TransactionHistoryProps {
  wallet: Wallet
  network: Network
}

export function TransactionHistory({ wallet, network }: TransactionHistoryProps) {
  const { transactions, loading, error } = useTransactionHistory(wallet, network)
  // Get native currency info with fallback
  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18
  }
  
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <RefreshCw className="w-5 h-5 text-text-secondary animate-spin" />
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-accent">Error loading transactions</p>
        <p className="text-sm text-text-tertiary mt-1">{error}</p>
      </div>
    )
  }


  return (
    <div className="p-4">
      <div className="space-y-2">
        {transactions.map((tx) => {
          const isSent = tx.from.toLowerCase() === wallet.address.toLowerCase()
          return (
            <div
              key={tx.hash}
              className="p-4 bg-surface-base border border-border-subtle rounded-lg hover:border-border-default transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isSent
                        ? 'bg-accent/10'
                        : 'bg-green-500/10'
                    }`}
                  >
                    {isSent ? (
                      <ArrowUpRight className="w-5 h-5 text-accent" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5 text-green-500" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-text-primary">
                        {isSent ? 'Sent' : 'Received'} {nativeCurrency.symbol}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        tx.status === 'confirmed'
                          ? 'bg-green-500/10 text-green-500'
                          : tx.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-accent/10 text-accent'
                      }`}>
                        {tx.status === 'confirmed' ? 'success' : tx.status}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mt-1">
                      {isSent ? 'To: ' : 'From: '}
                      {formatAddress(isSent ? tx.to : tx.from)}
                    </p>
                    <p className="text-xs text-text-tertiary mt-1">
                      {formatDate(tx.timestamp)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`font-medium ${
                    isSent ? 'text-accent' : 'text-green-500'
                  }`}>
                    {isSent ? '-' : '+'}{formatBalance(tx.value)} {nativeCurrency.symbol}
                  </p>
                  <a
                    href={`${network.explorerUrl || network.explorer}/tx/${tx.hash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors mt-1"
                  >
                    View
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-text-secondary">No transactions yet</p>
          <p className="text-sm text-text-tertiary mt-1">
            Your transaction history will appear here
          </p>
        </div>
      )}
    </div>
  )
}