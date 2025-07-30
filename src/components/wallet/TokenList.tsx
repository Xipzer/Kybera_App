import { useState, useEffect, useRef } from 'react'
import { Wallet } from '../../types'
import { Network } from '../../utils/networks'
import { formatCryptoBalance, formatUSD } from '../../utils/formatters'
import { TrendingUp, TrendingDown, Plus, ChevronDown } from 'lucide-react'
import { BlockchainBalance } from '../../services/blockchain/simpleBlockchainService'
import { AddTokenDialog } from './AddTokenDialog'
import { blockchainService } from '../../services/blockchain/blockchainService'
import { SimpleBlockchainService } from '../../services/blockchain/simpleBlockchainService'
import { ALL_NETWORKS } from '../../utils/networks'
import { useTheme } from '../../hooks/useTheme'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'

const simpleBlockchainService = new SimpleBlockchainService()

interface TokenListProps {
  wallet: Wallet
  network: Network
  balanceData: BlockchainBalance
  isLoading: boolean
  error: string | null
}

interface AllNetworkToken {
  symbol: string
  name: string
  balance: string
  usdValue: number
  change24h: number
  isNative: boolean
  address: string
  networkId: string
  networkName: string
  networkSymbol: string
}

export function TokenList({ wallet, network, balanceData, isLoading, error }: TokenListProps) {
  const [filterMode, setFilterMode] = useState<'current' | 'all'>('current')
  const [showAddTokenDialog, setShowAddTokenDialog] = useState(false)
  const [allNetworkTokens, setAllNetworkTokens] = useState<AllNetworkToken[]>([])
  const [isLoadingAllNetworks, setIsLoadingAllNetworks] = useState(false)
  const { theme } = useTheme()

  // Fetch all network tokens when filter mode changes to 'all'
  useEffect(() => {
    if (filterMode === 'all' && wallet.type === 'EVM') {
      fetchAllNetworkTokens()
    }
  }, [filterMode, wallet])

  const fetchAllNetworkTokens = async () => {
    setIsLoadingAllNetworks(true)
    try {
      const allTokens: AllNetworkToken[] = []
      const networks = ALL_NETWORKS.filter(n => n.type === wallet.type)
      
      for (const net of networks) {
        try {
          const balance = await simpleBlockchainService.getBalance(wallet, net)
          
          // Add native token
          if (parseFloat(balance.native) > 0) {
            allTokens.push({
              symbol: net.nativeCurrency?.symbol || net.symbol,
              name: net.nativeCurrency?.name || net.symbol,
              balance: balance.native,
              usdValue: balance.nativeUSD,
              change24h: 0,
              isNative: true,
              address: '',
              networkId: net.id,
              networkName: net.name,
              networkSymbol: net.symbol
            })
          }
          
          // Add other tokens
          balance.tokens.forEach(token => {
            allTokens.push({
              symbol: token.symbol,
              name: token.name,
              balance: token.balance,
              usdValue: token.usdValue || 0,
              change24h: 0,
              isNative: false,
              address: token.address || '',
              networkId: net.id,
              networkName: net.name,
              networkSymbol: net.symbol
            })
          })
        } catch (error) {
          console.error(`Failed to fetch tokens for network ${net.name}:`, error)
        }
      }
      
      setAllNetworkTokens(allTokens)
    } catch (error) {
      console.error('Failed to fetch all network tokens:', error)
    } finally {
      setIsLoadingAllNetworks(false)
    }
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

  if (error && balanceData.totalUSD === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-8">
          <p className="text-accent mb-2">{error}</p>
          <p className="text-sm text-text-secondary">
            Unable to load token data
          </p>
        </div>
      </div>
    )
  }

  // Get native currency info
  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18
  }


  // Create token list including native currency
  const allTokens = [
    {
      symbol: nativeCurrency.symbol,
      name: nativeCurrency.name,
      balance: balanceData.native,
      usdValue: balanceData.nativeUSD,
      change24h: 0, // TODO: Get from price data
      isNative: true,
      address: ''
    },
    ...balanceData.tokens.map(token => ({
      symbol: token.symbol,
      name: token.name,
      balance: token.balance,
      usdValue: token.usdValue || 0,
      change24h: 0,
      isNative: false,
      address: token.address || ''
    }))
  ]

  // Determine which tokens to display based on filter mode
  const displayTokens = filterMode === 'current' ? allTokens : allNetworkTokens

  return (
    <div className="p-4">
      {/* Filter row */}
      <div className="flex items-center justify-between mb-4">
        {/* Filter dropdown */}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors bg-surface-elevated ${theme.styles.listItemHover} min-w-[160px]`}>
              <span className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                {filterMode === 'current' ? 'Current Network' : 'All Networks'}
              </span>
              <ChevronDown className={`w-4 h-4 ${theme.styles.iconSecondary}`} />
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={theme.styles.dropdown.content}
              sideOffset={5}
              align="start"
            >
              <DropdownMenu.Item
                onClick={() => setFilterMode('current')}
                className={`${theme.styles.dropdown.item} ${
                  filterMode === 'current'
                    ? 'bg-accent/10 text-accent'
                    : theme.styles.dropdown.itemHover
                }`}
              >
                Current Network
              </DropdownMenu.Item>
              <DropdownMenu.Item
                onClick={() => setFilterMode('all')}
                className={`${theme.styles.dropdown.item} ${
                  filterMode === 'all'
                    ? 'bg-accent/10 text-accent'
                    : theme.styles.dropdown.itemHover
                }`}
              >
                All {wallet.type === 'EVM' ? 'EVM' : 'SVM'} Networks
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        
        {/* Add token button */}
        <button
          onClick={() => setShowAddTokenDialog(true)}
          className={`flex items-center justify-center gap-2 ${theme.styles.buttonSecondary}`}
          style={theme.dynamicStyles.buttonSecondary}
        >
          <Plus className="w-4 h-4" />
          <span>Add Token</span>
        </button>
      </div>

      {/* Loading state for all networks */}
      {isLoadingAllNetworks && (
        <div className="animate-pulse space-y-2 mb-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-surface-elevated rounded-lg" />
          ))}
        </div>
      )}

      {/* Token list */}
      <div className="space-y-2">
        {displayTokens.map((token) => {
          // Create unique key
          const tokenKey = filterMode === 'current' 
            ? `${token.symbol}-${token.isNative ? 'native' : token.address || ''}`
            : `${(token as AllNetworkToken).networkId}-${token.symbol}-${token.isNative ? 'native' : token.address || ''}`
          
          return (
            <div
              key={tokenKey}
              className="p-4 bg-surface-base border border-border-subtle rounded-lg hover:border-border-default transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface-elevated rounded-full flex items-center justify-center overflow-hidden">
                    {/* Logo handling for both current and all network modes */}
                    {filterMode === 'current' && !token.isNative && token.address && balanceData.tokens.find(t => t.address === token.address)?.logoURI ? (
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
                      filterMode === 'current' && !token.isNative && token.address && balanceData.tokens.find(t => t.address === token.address)?.logoURI ? 'hidden' : ''
                    }`}>
                      {token.symbol.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">{token.symbol}</p>
                    <p className="text-sm text-text-secondary">
                      {token.name}
                      {filterMode === 'all' && 'networkName' in token && (
                        <span className="text-text-tertiary"> • {(token as AllNetworkToken).networkName}</span>
                      )}
                    </p>
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
          )
        })}
      </div>

      {/* Empty state */}
      {displayTokens.length === 0 && !isLoadingAllNetworks && (
        <div className="text-center py-8">
          <p className="text-text-secondary">No tokens found</p>
          <p className="text-sm text-text-tertiary mt-1">
            {filterMode === 'current' 
              ? 'Send some funds to this wallet or add custom tokens'
              : 'No tokens found across any networks'}
          </p>
        </div>
      )}

      {/* Add Token Dialog */}
      <AddTokenDialog
        isOpen={showAddTokenDialog}
        onClose={() => setShowAddTokenDialog(false)}
        walletAddress={wallet.address}
        network={network}
        onTokenAdded={() => {
          // Balance will be automatically updated by the existing polling in useWalletBalance
          // No need to start additional polling here
        }}
      />
    </div>
  )
}