import { useState, useEffect } from 'react'
import { Wallet } from '../../types'
import { Network } from '../../utils/networks'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { blockchainService, BlockchainBalance } from '../../services/blockchain/blockchainService'

interface TokenListProps {
  wallet: Wallet
  network: Network
}

export function TokenList({ wallet, network }: TokenListProps) {
  const [balanceData, setBalanceData] = useState<BlockchainBalance | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBalances = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      
      const data = await blockchainService.getBalance(wallet, network)
      setBalanceData(data)
    } catch (err) {
      console.error('Failed to fetch balances:', err)
      setError('Failed to load balance data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchBalances()
  }, [wallet.address, network.id])

  const handleRefresh = () => {
    fetchBalances(true)
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-surface-elevated rounded-lg" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-elevated rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-accent mb-2">{error}</p>
          <button
            onClick={() => fetchBalances()}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  if (!balanceData) {
    return null
  }

  // Get native currency info
  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18
  }

  // Calculate token USD values
  const tokenPriceIds: Record<string, string> = {
    'USDC': 'usd-coin',
    'USDT': 'tether',
    'DAI': 'dai',
    'WBTC': 'wrapped-bitcoin',
    'BUSD': 'binance-usd',
    'wSOL': 'solana',
    'mSOL': 'marinade-staked-sol',
    'BONK': 'bonk',
    'JUP': 'jupiter-exchange-solana',
    'PYTH': 'pyth-network',
    'UXD': 'uxd-stablecoin',
  }

  // Create token list including native currency
  const allTokens = [
    {
      symbol: nativeCurrency.symbol,
      name: nativeCurrency.name,
      balance: balanceData.native,
      usdValue: balanceData.nativeUSD,
      change24h: 0, // TODO: Get from price data
      isNative: true
    },
    ...balanceData.tokens.map(token => {
      // For stablecoins, assume $1 value
      const isStablecoin = ['USDC', 'USDT', 'DAI', 'BUSD'].includes(token.symbol)
      const estimatedValue = isStablecoin ? parseFloat(token.balance) : 0
      
      return {
        symbol: token.symbol,
        name: token.name,
        balance: token.balance,
        usdValue: estimatedValue,
        change24h: 0,
        isNative: false,
        address: token.address
      }
    })
  ]

  return (
    <div className="p-4">
      <div className="space-y-2">
        {allTokens.map((token) => (
          <div
            key={token.symbol + (token.isNative ? '-native' : token.address || '')}
            className="p-4 bg-surface-base border border-border-subtle rounded-lg hover:border-border-default transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface-elevated rounded-full flex items-center justify-center overflow-hidden">
                  {!token.isNative && token.address && balanceData.tokens.find(t => t.address === token.address)?.logoURI ? (
                    <img 
                      src={balanceData.tokens.find(t => t.address === token.address)?.logoURI} 
                      alt={token.symbol}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to text if image fails to load
                        e.currentTarget.style.display = 'none'
                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                      }}
                    />
                  ) : null}
                  <span className={`text-sm font-medium text-text-primary ${
                    !token.isNative && token.address && balanceData.tokens.find(t => t.address === token.address)?.logoURI ? 'hidden' : ''
                  }`}>
                    {token.symbol.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-text-primary">{token.symbol}</p>
                  <p className="text-sm text-text-secondary">{token.name}</p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-medium text-text-primary">{formatCryptoBalance(token.balance)}</p>
                <div className="flex items-center justify-end gap-1">
                  <span className="text-sm text-text-secondary">{formatUSD(token.usdValue)}</span>
                  {token.usdValue > 0 && (
                    <div className="flex items-center gap-0.5">
                      {token.change24h >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-accent" />
                      )}
                      <span
                        className={`text-xs ${
                          token.change24h >= 0 ? 'text-green-500' : 'text-accent'
                        }`}
                      >
                        {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {allTokens.length === 1 && parseFloat(balanceData.native) === 0 && (
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