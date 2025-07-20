import { Wallet } from '../../types'
import { Network } from '../../utils/networks'
import { formatAddress, formatDate, formatBalance } from '../../utils/formatters'
import { ArrowUpRight, ArrowDownLeft, ExternalLink } from 'lucide-react'

interface TransactionHistoryProps {
  wallet: Wallet
  network: Network
}

interface Transaction {
  id: string
  type: 'send' | 'receive'
  amount: string
  symbol: string
  to?: string
  from?: string
  status: 'success' | 'pending' | 'failed'
  timestamp: Date
  hash: string
}

export function TransactionHistory({ network }: TransactionHistoryProps) {
  // Get native currency info with fallback
  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18
  }

  // Mock transaction data - will be replaced with real data from API
  const mockTransactions: Transaction[] = [
    {
      id: '1',
      type: 'receive',
      amount: '0.5',
      symbol: nativeCurrency.symbol,
      from: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bd3e',
      status: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    {
      id: '2',
      type: 'send',
      amount: '0.1',
      symbol: nativeCurrency.symbol,
      to: '0x8Ba1f109551bD432803012645Ac136ddd64DBA72',
      status: 'success',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    {
      id: '3',
      type: 'send',
      amount: '100',
      symbol: 'USDC',
      to: '0x123456789abcdef123456789abcdef123456789a',
      status: 'pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
      hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    },
  ]


  return (
    <div className="p-4">
      <div className="space-y-2">
        {mockTransactions.map((tx) => (
          <div
            key={tx.id}
            className="p-4 bg-surface-base border border-border-subtle rounded-lg hover:border-border-default transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.type === 'send'
                      ? 'bg-accent-500/10'
                      : 'bg-green-500/10'
                  }`}
                >
                  {tx.type === 'send' ? (
                    <ArrowUpRight className={`w-5 h-5 ${
                      tx.type === 'send' ? 'text-accent-500' : 'text-green-500'
                    }`} />
                  ) : (
                    <ArrowDownLeft className="w-5 h-5 text-green-500" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-text-primary">
                      {tx.type === 'send' ? 'Sent' : 'Received'} {tx.symbol}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      tx.status === 'success'
                        ? 'bg-green-500/10 text-green-500'
                        : tx.status === 'pending'
                        ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-accent-500/10 text-accent-500'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    {tx.type === 'send' ? 'To: ' : 'From: '}
                    {formatAddress(tx.type === 'send' ? tx.to! : tx.from!)}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {formatDate(tx.timestamp)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className={`font-medium ${
                  tx.type === 'send' ? 'text-accent-500' : 'text-green-500'
                }`}>
                  {tx.type === 'send' ? '-' : '+'}{formatBalance(tx.amount)} {tx.symbol}
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
        ))}
      </div>

      {mockTransactions.length === 0 && (
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