import { useState, useEffect } from 'react'
import { Search, Send, RefreshCw } from 'lucide-react'
import { Network, TokenBalance, ChainType } from '../../types'
import { Skeleton } from '../common/Skeleton'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'

interface TokenListProps {
  walletAddress: string
  walletType: ChainType
  network: Network
  onSendToken: (tokenAddress: string, tokenInfo: { decimals: number; symbol: string }) => void
}

// Mock token data - in production, this would come from an API
const MOCK_TOKENS: Record<string, TokenBalance[]> = {
  ethereum: [
    {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      balance: '1000.00',
      logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    },
    {
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      balance: '500.00',
      logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
    }
  ],
  'solana-mainnet': [
    {
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      symbol: 'USDT',
      name: 'Tether USD',
      decimals: 6,
      balance: '750.00',
      logoURI: 'https://cryptologos.cc/logos/tether-usdt-logo.png'
    },
    {
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      balance: '1250.00',
      logoURI: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png'
    }
  ]
}

export function TokenList({ walletAddress, walletType, network, onSendToken }: TokenListProps) {
  const [tokens, setTokens] = useState<TokenBalance[]>([])
  const [filteredTokens, setFilteredTokens] = useState<TokenBalance[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchTokenBalances = async () => {
    if (!isRefreshing) {
      setIsLoading(true)
    }
      
      try {
        // Use mock tokens as a base but fetch real balances
        const mockTokens = MOCK_TOKENS[network.id] || []
        
        // Fetch real balances for each token
        const tokensWithRealBalances = await Promise.all(
          mockTokens.map(async (token) => {
            try {
              let balance = '0'
              
              if (walletType === 'EVM') {
                const result = await EVMWalletService.getERC20Balance(
                  token.address,
                  walletAddress,
                  network.rpcUrl
                )
                balance = result.balance
              } else {
                const result = await SVMWalletService.getSPLTokenBalance(
                  token.address,
                  walletAddress,
                  network.rpcUrl
                )
                balance = result.balance
              }
              
              return {
                ...token,
                balance
              }
            } catch (error) {
              console.error(`Failed to fetch balance for ${token.symbol}:`, error)
              return token // Return with mock balance on error
            }
          })
        )
        
        setTokens(tokensWithRealBalances)
        setFilteredTokens(tokensWithRealBalances)
      } catch (error) {
        console.error('Failed to fetch token balances:', error)
        // Fall back to mock tokens on complete failure
        const mockTokens = MOCK_TOKENS[network.id] || []
        setTokens(mockTokens)
        setFilteredTokens(mockTokens)
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    }
  
  useEffect(() => {
    fetchTokenBalances()
  }, [walletAddress, walletType, network])
  
  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchTokenBalances()
  }

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      setFilteredTokens(
        tokens.filter(
          token =>
            token.symbol.toLowerCase().includes(query) ||
            token.name.toLowerCase().includes(query)
        )
      )
    } else {
      setFilteredTokens(tokens)
    }
  }, [searchQuery, tokens])

  return (
    <div className="p-4">
      {/* Search Bar and Refresh */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tokens..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isRefreshing}
          className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Refresh token balances"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Token List */}
      <div className="space-y-2">
        {isLoading ? (
          <>
            <TokenItemSkeleton />
            <TokenItemSkeleton />
            <TokenItemSkeleton />
          </>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No tokens found' : 'No tokens in this wallet'}
            </p>
          </div>
        ) : (
          filteredTokens.map((token) => (
            <TokenItem
              key={token.address}
              token={token}
              onSend={() => onSendToken(token.address, { decimals: token.decimals, symbol: token.symbol })}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TokenItem({ token, onSend }: { token: TokenBalance; onSend: () => void }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
          {token.logoURI ? (
            <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {token.symbol.slice(0, 2)}
            </span>
          )}
        </div>
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">{token.symbol}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{token.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="font-medium text-gray-900 dark:text-gray-100">{token.balance}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{token.symbol}</p>
        </div>
        <button
          onClick={onSend}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          title={`Send ${token.symbol}`}
        >
          <Send className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </div>
  )
}

function TokenItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div>
          <Skeleton variant="text" width="60px" className="mb-1" />
          <Skeleton variant="text" width="100px" height="14px" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right">
          <Skeleton variant="text" width="80px" className="mb-1" />
          <Skeleton variant="text" width="40px" height="14px" />
        </div>
        <Skeleton variant="circular" width={32} height={32} />
      </div>
    </div>
  )
}