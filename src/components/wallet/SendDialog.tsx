import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import * as Select from '@radix-ui/react-select'
import * as Popover from '@radix-ui/react-popover'
import { X, Send, AlertCircle, ExternalLink, ChevronDown, Wallet as WalletIcon, Users, Search } from 'lucide-react'
import { Wallet, TokenBalance } from '../../types'
import { Network } from '../../utils/networks'
import { blockchainService, BlockchainBalance } from '../../services/blockchain/blockchainService'
import { useWalletStore } from '../../store/walletStore'
import { useTheme } from '../../hooks/useTheme'
import { formatAddress, formatBalance, formatUSD } from '../../utils/formatters'

interface SendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet
  network: Network
}

interface TokenOption {
  address?: string
  symbol: string
  name: string
  balance: string
  decimals: number
  usdValue: number
  isNative: boolean
  logoURI?: string
}

export function SendDialog({ open, onOpenChange, wallet: initialWallet, network }: SendDialogProps) {
  const { password, wallets, walletGroups, setActiveWalletId } = useWalletStore()
  const { theme } = useTheme()
  
  // Form state
  const [fromWallet, setFromWallet] = useState<Wallet>(initialWallet)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null)
  const [memo, setMemo] = useState('')
  
  // UI state
  const [activeTab, setActiveTab] = useState('wallets')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false)
  const [tokenSearchQuery, setTokenSearchQuery] = useState('')
  const [walletSearchQuery, setWalletSearchQuery] = useState('')
  
  // Data state
  const [balanceData, setBalanceData] = useState<BlockchainBalance | null>(null)
  const [availableTokens, setAvailableTokens] = useState<TokenOption[]>([])
  const [usdAmount, setUsdAmount] = useState(0)

  // Get native currency info
  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18
  }
  
  // Group wallets by their groups
  const groupedWallets = walletGroups.map(group => ({
    group,
    wallets: wallets.filter(w => w.groupId === group.id && w.type === network.type)
  })).filter(g => g.wallets.length > 0)

  // Fetch token balances when wallet changes
  useEffect(() => {
    const fetchBalances = async () => {
      if (!fromWallet) return
      
      setIsLoadingBalances(true)
      // Don't reset to null to avoid controlled/uncontrolled warning
      
      try {
        const data = await blockchainService.getBalance(fromWallet, network)
        setBalanceData(data)
        
        // Prepare token options
        const tokens: TokenOption[] = [
          {
            symbol: nativeCurrency.symbol,
            name: nativeCurrency.name,
            balance: data.native,
            decimals: nativeCurrency.decimals,
            usdValue: data.nativeUSD,
            isNative: true
          },
          ...data.tokens.map(token => ({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            balance: token.balance,
            decimals: token.decimals,
            usdValue: 0, // TODO: Calculate from price data
            isNative: false,
            logoURI: token.logoURI
          }))
        ]
        
        setAvailableTokens(tokens)
        
        // Select native token by default
        if (tokens.length > 0) {
          setSelectedToken(tokens[0])
        }
      } catch (err) {
        console.error('Failed to fetch balances:', err)
        setAvailableTokens([]) // Clear tokens on error
      } finally {
        setIsLoadingBalances(false)
      }
    }
    
    fetchBalances()
  }, [fromWallet?.address, network.id]) // Use specific properties to avoid infinite loops
  
  // Calculate USD value when amount changes
  useEffect(() => {
    if (selectedToken && amount) {
      const amountNum = parseFloat(amount)
      if (!isNaN(amountNum)) {
        setUsdAmount(amountNum * (selectedToken.usdValue / parseFloat(selectedToken.balance)))
      } else {
        setUsdAmount(0)
      }
    } else {
      setUsdAmount(0)
    }
  }, [amount, selectedToken])

  const handleSend = async () => {
    setError('')
    
    if (!recipient || !amount || !selectedToken) {
      setError('Please fill in all required fields')
      return
    }
    
    if (!password) {
      setError('Please unlock your wallet first')
      return
    }
    
    // Validate recipient address
    if (!blockchainService.validateAddress(recipient, fromWallet.type)) {
      setError('Invalid recipient address')
      return
    }
    
    // Validate amount
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount')
      return
    }
    
    if (amountNum > parseFloat(selectedToken.balance)) {
      setError('Insufficient balance')
      return
    }

    setIsLoading(true)
    
    try {
      let hash: string
      
      if (selectedToken.isNative) {
        // Send native token
        hash = await blockchainService.sendTransaction(
          fromWallet,
          network,
          recipient,
          amount,
          password
        )
      } else {
        // Send token
        hash = await blockchainService.sendToken(
          fromWallet,
          network,
          selectedToken.address!,
          recipient,
          amount,
          selectedToken.decimals,
          password
        )
      }
      
      setTxHash(hash)
      setShowSuccess(true)
      
      // Reset form after a delay
      setTimeout(() => {
        onOpenChange(false)
        setRecipient('')
        setAmount('')
        setMemo('')
        setTxHash(null)
        setShowSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Transaction failed:', err)
      setError(err instanceof Error ? err.message : 'Transaction failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleWalletSelect = (address: string) => {
    setRecipient(address)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content ${theme.styles.dialogContainer} w-[600px] max-h-[85vh] overflow-y-auto`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Dialog.Title className={theme.styles.heading}>
                  Send
                </Dialog.Title>
                <Dialog.Description className="sr-only">
                  Send tokens from your wallet
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className={theme.styles.buttonIcon}>
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-6">
              {/* From Section */}
              <div>
                <label className={`${theme.styles.label} mb-3 block`}>
                  From
                </label>
                
                {/* Wallet Selector */}
                <Select.Root 
                  value={fromWallet.address} 
                  onValueChange={(addr) => {
                    const wallet = wallets.find(w => w.address === addr)
                    if (wallet) {
                      setFromWallet(wallet)
                      setActiveWalletId(wallet.id)
                    }
                  }}
                  open={undefined}
                >
                  <Select.Trigger className={`w-full flex items-center justify-between p-3 ${theme.styles.input} hover:border-border-default transition-colors`}>
                    <div className="flex items-center gap-3">
                      <WalletIcon className="w-4 h-4 text-text-secondary" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-text-primary">{fromWallet.name}</p>
                        <p className="text-xs text-text-tertiary">{formatAddress(fromWallet.address)}</p>
                      </div>
                    </div>
                    <ChevronDown className="w-4 h-4 text-text-secondary" />
                  </Select.Trigger>
                  
                  <Select.Portal>
                    <Select.Content 
                      className={`${theme.styles.dropdown?.content || 'bg-surface-base border border-border-subtle rounded-lg shadow-lg'} max-h-[300px] overflow-y-auto`} 
                      style={{ zIndex: 9999 }} 
                      position="popper" 
                      sideOffset={5}
                    >
                      <Select.Viewport>
                        {groupedWallets.map(({ group, wallets }) => (
                          <div key={group.id}>
                            <div className="px-3 py-2 text-xs font-medium text-text-tertiary">
                              {group.name}
                            </div>
                            {wallets.map((wallet) => {
                              const isSelected = wallet.address === fromWallet.address
                              return (
                                <Select.Item
                                  key={wallet.id}
                                  value={wallet.address}
                                  className={`${theme.styles.dropdown?.item || 'p-2 hover:bg-surface-hover outline-none'} cursor-pointer ${
                                    isSelected ? 'bg-accent/10' : ''
                                  }`}
                                >
                                <Select.ItemText>
                                  <div>
                                    <p className="text-sm font-medium">{wallet.name}</p>
                                    <p className="text-xs text-text-tertiary">{formatAddress(wallet.address)}</p>
                                  </div>
                                </Select.ItemText>
                                </Select.Item>
                              )
                            })}
                          </div>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
                
                {/* Amount Input with Token Selector */}
                <div className="mt-3 flex gap-2">
                  {/* Token Selector */}
                  <Popover.Root open={tokenSelectorOpen} onOpenChange={setTokenSelectorOpen}>
                    <Popover.Trigger asChild>
                      <button
                        className={`w-[140px] flex items-center gap-2 px-3 py-3 ${theme.styles.input} hover:border-border-default transition-colors`}
                        disabled={isLoadingBalances || availableTokens.length === 0}
                      >
                        <div className="w-8 h-8 bg-surface-elevated rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                          {selectedToken?.logoURI ? (
                            <img 
                              src={selectedToken.logoURI} 
                              alt={selectedToken.symbol}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <span className={`text-sm font-medium ${selectedToken?.logoURI ? 'hidden' : ''}`}>
                            {selectedToken?.symbol.slice(0, 2).toUpperCase() || '?'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-text-primary truncate flex-1">
                          {isLoadingBalances ? 'Loading...' : (selectedToken?.symbol || 'Select')}
                        </span>
                        <ChevronDown className="w-4 h-4 text-text-secondary flex-shrink-0" />
                      </button>
                    </Popover.Trigger>
                      
                      <Popover.Portal>
                        <Popover.Content
                          className={`w-[var(--radix-popover-trigger-width)] min-w-[300px] ${theme.styles.dropdown?.content || 'bg-surface-base border border-border-subtle rounded-lg shadow-lg'} overflow-hidden`}
                          style={{ zIndex: 9999 }}
                          sideOffset={5}
                          align="start"
                        >
                          <div className="p-3 border-b border-border-subtle">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                              <input
                                type="text"
                                placeholder="Search tokens..."
                                value={tokenSearchQuery}
                                onChange={(e) => setTokenSearchQuery(e.target.value)}
                                className={`w-full pl-10 pr-3 py-2 text-sm ${theme.styles.input}`}
                                autoFocus
                              />
                            </div>
                          </div>
                          
                          <div className="max-h-[300px] overflow-y-auto py-1">
                            {availableTokens.length === 0 ? (
                              <div className="p-4 text-center text-sm text-text-tertiary">
                                No tokens available
                              </div>
                            ) : (
                              (() => {
                                const filteredTokens = availableTokens.filter(token => 
                                  token.symbol.toLowerCase().includes(tokenSearchQuery.toLowerCase()) ||
                                  token.name.toLowerCase().includes(tokenSearchQuery.toLowerCase())
                                )
                                
                                if (filteredTokens.length === 0) {
                                  return (
                                    <div className="p-4 text-center text-sm text-text-tertiary">
                                      No tokens found matching "{tokenSearchQuery}"
                                    </div>
                                  )
                                }
                                
                                return filteredTokens.map((token) => {
                                  const isSelected = selectedToken && (
                                    (token.isNative && selectedToken.isNative) ||
                                    (!token.isNative && !selectedToken.isNative && token.address === selectedToken.address)
                                  )
                                  return (
                                    <button
                                      key={token.isNative ? 'native' : token.address}
                                      onClick={() => {
                                        setSelectedToken(token)
                                        setTokenSelectorOpen(false)
                                        setTokenSearchQuery('')
                                      }}
                                      className={`w-full flex items-center justify-between ${theme.styles.dropdown?.item || 'p-3 hover:bg-surface-hover'} transition-colors ${
                                        isSelected ? 'bg-accent/10' : ''
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 ${theme.styles.surface || 'bg-surface-elevated'} rounded-full flex items-center justify-center overflow-hidden`}>
                                          {token.logoURI ? (
                                            <img 
                                              src={token.logoURI} 
                                              alt={token.symbol}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none'
                                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                              }}
                                            />
                                          ) : null}
                                          <span className={`text-sm font-medium ${token.logoURI ? 'hidden' : ''}`}>
                                            {token.symbol.slice(0, 2).toUpperCase()}
                                          </span>
                                        </div>
                                        <div className="text-left">
                                          <p className="text-sm font-medium text-text-primary">{token.symbol}</p>
                                          <p className="text-xs text-text-tertiary">{token.name}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-medium text-text-primary">{formatBalance(token.balance)}</p>
                                        <p className="text-xs text-text-tertiary">{formatUSD(token.usdValue)}</p>
                                      </div>
                                    </button>
                                  )
                                })
                              })()
                            )}
                          </div>
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                    
                    {/* Amount Input */}
                    <div className={`flex-1 relative ${theme.styles.input}`}>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.0"
                        step="0.000001"
                        min="0"
                        className="w-full h-full pb-5 bg-transparent border-0 focus:outline-none text-right text-text-primary placeholder-text-tertiary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <div className="absolute right-3 bottom-2 text-xs text-text-tertiary text-right">
                        ≈ {amount ? formatUSD(usdAmount) : '$0.00'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Balance Display */}
                  {selectedToken && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-text-tertiary">
                        Balance: {formatBalance(selectedToken.balance)} {selectedToken.symbol}
                      </p>
                      <button
                        type="button"
                        onClick={async () => {
                          if (selectedToken.isNative && recipient) {
                            // Calculate max amount accounting for gas fees
                            try {
                              const fee = await blockchainService.estimateTransactionFee(
                                fromWallet,
                                network,
                                recipient,
                                selectedToken.balance
                              )
                              const maxAmount = parseFloat(selectedToken.balance) - parseFloat(fee)
                              setAmount(maxAmount > 0 ? maxAmount.toFixed(6) : '0')
                            } catch (err) {
                              // Fallback to simple calculation with buffer
                              const buffer = fromWallet.type === 'EVM' ? 0.001 : 0.000005
                              const maxAmount = parseFloat(selectedToken.balance) - buffer
                              setAmount(maxAmount > 0 ? maxAmount.toFixed(6) : '0')
                            }
                          } else {
                            // For tokens, use full balance
                            setAmount(selectedToken.balance)
                          }
                        }}
                        disabled={!selectedToken || (selectedToken.isNative && !recipient)}
                        className="text-xs text-accent hover:text-accent-hover transition-colors px-2 py-0.5 rounded hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Max
                      </button>
                    </div>
                  )}
              </div>

              {/* To Section */}
              <div>
                <label className={`${theme.styles.label} mb-3 block`}>
                  To
                </label>
                
                {/* Recipient Input */}
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={`Enter ${network.type} address`}
                  className={theme.styles.input}
                />
                
                {/* Tabs for Wallets/Contacts */}
                <div className="mt-3">
                  <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
                    <Tabs.List className="flex border-b border-border-subtle">
                      <Tabs.Trigger
                        value="wallets"
                        className="flex-1 py-2 text-sm font-medium text-text-secondary border-b-2 border-transparent transition-colors hover:text-text-primary data-[state=active]:text-accent data-[state=active]:border-accent"
                      >
                        Your Wallets
                      </Tabs.Trigger>
                      <Tabs.Trigger
                        value="contacts"
                        className="flex-1 py-2 text-sm font-medium text-text-secondary border-b-2 border-transparent transition-colors hover:text-text-primary data-[state=active]:text-accent data-[state=active]:border-accent"
                      >
                        Contacts
                      </Tabs.Trigger>
                    </Tabs.List>
                    
                    <Tabs.Content value="wallets" className="mt-3">
                      <div className={`${theme.styles.dropdown?.content || 'bg-surface-base border border-border-subtle rounded-lg'} overflow-hidden`}>
                        {/* Search Bar */}
                        <div className="p-3 border-b border-border-subtle">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                            <input
                              type="text"
                              placeholder="Search wallets..."
                              value={walletSearchQuery}
                              onChange={(e) => setWalletSearchQuery(e.target.value)}
                              className={`w-full pl-10 pr-3 py-2 text-sm ${theme.styles.input}`}
                            />
                          </div>
                        </div>
                        
                        {/* Wallet List */}
                        <div className="max-h-[300px] overflow-y-auto py-1">
                          {(() => {
                            const filteredGroups = groupedWallets.map(({ group, wallets }) => ({
                              group,
                              wallets: wallets.filter(wallet => 
                                wallet.name.toLowerCase().includes(walletSearchQuery.toLowerCase()) ||
                                wallet.address.toLowerCase().includes(walletSearchQuery.toLowerCase())
                              )
                            })).filter(g => g.wallets.length > 0)
                            
                            if (filteredGroups.length === 0) {
                              return (
                                <div className="p-4 text-center text-sm text-text-tertiary">
                                  No wallets found matching "{walletSearchQuery}"
                                </div>
                              )
                            }
                            
                            return filteredGroups.map(({ group, wallets }) => (
                              <div key={group.id}>
                                <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-tertiary">
                                  <Users className="w-3 h-3" />
                                  {group.name}
                                </div>
                                {wallets.map((wallet) => {
                                  const isSelected = wallet.address === recipient
                                  const isFromWallet = wallet.address === fromWallet.address
                                  
                                  return (
                                    <button
                                      key={wallet.id}
                                      onClick={() => handleWalletSelect(wallet.address)}
                                      disabled={isFromWallet}
                                      className={`w-full flex items-center justify-between ${theme.styles.dropdown?.item || 'p-3 hover:bg-surface-hover'} transition-colors ${
                                        isSelected ? 'bg-accent/10' : ''
                                      } ${isFromWallet ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-surface-elevated rounded-full flex items-center justify-center">
                                          <WalletIcon className="w-4 h-4 text-text-secondary" />
                                        </div>
                                        <div className="text-left">
                                          <p className="text-sm font-medium text-text-primary">{wallet.name}</p>
                                          <p className="text-xs text-text-tertiary">{formatAddress(wallet.address)}</p>
                                        </div>
                                      </div>
                                      {isSelected && (
                                        <div className="w-2 h-2 bg-accent rounded-full" />
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            ))
                          })()}
                        </div>
                      </div>
                    </Tabs.Content>
                    
                    <Tabs.Content value="contacts" className="mt-3">
                      <div className="text-center py-8 text-text-tertiary">
                        <p className="text-sm">No contacts yet</p>
                        <p className="text-xs mt-1">Contact management coming soon</p>
                      </div>
                    </Tabs.Content>
                  </Tabs.Root>
                </div>
                
                {/* Receive Amount Display */}
                {amount && selectedToken && (
                  <div className="mt-3">
                    <div className={`${theme.styles.input} p-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-surface-elevated rounded-full flex items-center justify-center overflow-hidden">
                            {selectedToken.logoURI ? (
                              <img 
                                src={selectedToken.logoURI} 
                                alt={selectedToken.symbol}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none'
                                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                }}
                              />
                            ) : null}
                            <span className={`text-sm font-medium ${selectedToken.logoURI ? 'hidden' : ''}`}>
                              {selectedToken.symbol.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-text-primary">
                            {selectedToken.symbol}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-text-primary">{amount}</p>
                          <p className="text-xs text-text-tertiary">≈ {formatUSD(usdAmount)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Memo for Solana */}
              {network.type === 'SVM' && (
                <div>
                  <label className={theme.styles.label}>
                    Memo (Optional)
                  </label>
                  <input
                    type="text"
                    value={memo}
                    onChange={(e) => setMemo(e.target.value)}
                    placeholder="Add a memo"
                    className={theme.styles.input}
                  />
                </div>
              )}

              {/* Error/Success Messages */}
              {error && (
                <div className={theme.styles.error.container}>
                  <AlertCircle className={theme.styles.error.icon} />
                  <p className={theme.styles.error.text}>{error}</p>
                </div>
              )}
              
              {showSuccess && txHash && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-green-400 font-medium">Transaction sent successfully!</p>
                    <p className="text-xs text-green-400/80 mt-1">
                      Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}
                    </p>
                  </div>
                  <a
                    href={`${network.explorerUrl || network.explorer}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-green-500/20 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-green-400" />
                  </a>
                </div>
              )}

              {/* Send Button */}
              <div className="pt-2">
                <button
                  onClick={handleSend}
                  disabled={isLoading || !recipient || !amount || !selectedToken || isLoadingBalances}
                  className={`w-full flex items-center justify-center gap-2 ${
                    theme.styles.buttonSettings || theme.styles.buttonPrimary
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}