import { Wallet } from '../../types'
import { Network } from '../../utils/networks'
import { formatBalance, formatUSD } from '../../utils/formatters'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TokenListProps {
  wallet: Wallet
  network: Network
}

interface Token {
  symbol: string
  name: string
  balance: string
  usdValue: number
  change24h: number
  icon?: string
}

export function TokenList({ network }: TokenListProps) {
  // Get native currency info with fallback
  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18
  }

  // Mock token data - will be replaced with real data from API
  const mockTokens: Token[] = [
    {
      symbol: nativeCurrency.symbol,
      name: nativeCurrency.name,
      balance: '1.234',
      usdValue: 2468.00,
      change24h: 5.2,
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      balance: '1000.00',
      usdValue: 1000.00,
      change24h: 0.01,
    },
    {
      symbol: 'USDT',
      name: 'Tether',
      balance: '500.00',
      usdValue: 500.00,
      change24h: -0.02,
    },
  ]

  const totalValue = mockTokens.reduce((sum, token) => sum + token.usdValue, 0)

  return (
    <div className="p-4">
      <div className="mb-4 p-4 bg-surface-elevated rounded-lg">
        <p className="text-sm text-text-secondary mb-1">Total Portfolio Value</p>
        <p className="text-2xl font-bold text-text-primary">{formatUSD(totalValue)}</p>
      </div>

      <div className="space-y-2">
        {mockTokens.map((token) => (
          <div
            key={token.symbol}
            className="p-4 bg-surface-base border border-border-subtle rounded-lg hover:border-border-default transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-elevated rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-text-primary">
                    {token.symbol.slice(0, 2)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">{token.symbol}</p>
                  <p className="text-sm text-text-secondary">{token.name}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-medium text-text-primary">{formatBalance(token.balance)}</p>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-sm text-text-secondary">{formatUSD(token.usdValue)}</span>
                  <div className="flex items-center gap-0.5">
                    {token.change24h >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-500" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-accent-500" />
                    )}
                    <span
                      className={`text-xs ${
                        token.change24h >= 0 ? 'text-green-500' : 'text-accent-500'
                      }`}
                    >
                      {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {mockTokens.length === 0 && (
        <div className="text-center py-8">
          <p className="text-text-secondary">No tokens found</p>
          <p className="text-sm text-text-tertiary mt-1">
            Send some funds to this wallet to see them here
          </p>
        </div>
      )}
    </div>
  )
}