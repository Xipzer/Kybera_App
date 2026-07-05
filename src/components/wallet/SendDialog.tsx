/**
 * Code by Xipzer
 */

import { useEffect, useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import * as Select from '@radix-ui/react-select'
import * as Popover from '@radix-ui/react-popover'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ExternalLink,
  Search,
  Send,
  Users,
  Wallet as WalletIcon,
} from 'lucide-react'
import { Wallet } from '../../types'
import { Network } from '../../utils/networks'
import { blockchainService } from '../../services/blockchain/blockchainService'
import { useWalletStore } from '../../store/walletStore'
import { useTheme } from '../../hooks/useTheme'
import { formatAddress, formatCryptoBalance, formatUSD } from '../../utils/formatters'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernAlert,
  ModernButton,
} from '../ModernDialog'
import { NativeTokenIcon } from '../NetworkIcons'

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

export function SendDialog({
  open,
  onOpenChange,
  wallet: initialWallet,
  network,
}: SendDialogProps) {
  const { password, wallets, walletGroups, setActiveWallet } = useWalletStore()
  const { theme, themeName } = useTheme()

  const [fromWallet, setFromWallet] = useState<Wallet>(initialWallet)
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null)
  const [memo, setMemo] = useState('')

  const [activeTab, setActiveTab] = useState('wallets')
  const [step, setStep] = useState<'input' | 'confirm'>('input')
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null)
  const [isEstimatingFee, setIsEstimatingFee] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingBalances, setIsLoadingBalances] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [tokenSelectorOpen, setTokenSelectorOpen] = useState(false)
  const [tokenSearchQuery, setTokenSearchQuery] = useState('')
  const [walletSearchQuery, setWalletSearchQuery] = useState('')

  const [availableTokens, setAvailableTokens] = useState<TokenOption[]>([])
  const [usdAmount, setUsdAmount] = useState(0)

  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18,
  }

  const groupedWallets = walletGroups
    .map((group) => ({
      group,
      wallets: wallets.filter((w) => w.groupId === group.id && w.type === network.type),
    }))
    .filter((g) => g.wallets.length > 0)

  useEffect(() => {
    const fetchBalances = async () => {
      if (!fromWallet) return

      if (fromWallet.type !== network.type) {
        return
      }

      setIsLoadingBalances(true)

      try {
        const data = await blockchainService.getBalance(fromWallet, network)

        const tokens: TokenOption[] = [
          {
            symbol: nativeCurrency.symbol,
            name: nativeCurrency.name,
            balance: data.native,
            decimals: nativeCurrency.decimals,
            usdValue: data.nativeUSD,
            isNative: true,
          },
          ...data.tokens.map((token) => ({
            address: token.address,
            symbol: token.symbol,
            name: token.name,
            balance: token.balance,
            decimals: token.decimals,
            usdValue: 0,
            isNative: false,
            logoURI: token.logoURI,
          })),
        ]

        setAvailableTokens(tokens)

        if (tokens.length > 0) {
          setSelectedToken(tokens[0])
        }
      } catch (err) {
        console.error('Failed to fetch balances:', err)
        setAvailableTokens([])
      } finally {
        setIsLoadingBalances(false)
      }
    }

    fetchBalances()
  }, [fromWallet?.address, network.id])

  useEffect(() => {
    const bal = selectedToken ? parseFloat(selectedToken.balance) : 0
    const amountNum = parseFloat(amount)
    if (selectedToken && amount && !isNaN(amountNum) && bal > 0 && selectedToken.usdValue > 0) {
      setUsdAmount(amountNum * (selectedToken.usdValue / bal))
    } else {
      setUsdAmount(0)
    }
  }, [amount, selectedToken])

  const hasPrice = (selectedToken?.usdValue ?? 0) > 0
  const recipientValid = recipient
    ? blockchainService.validateAddress(recipient, fromWallet.type)
    : null

  const handleReview = async () => {
    setError('')

    if (!recipient || !amount || !selectedToken) {
      setError('Please fill in all required fields')
      return
    }
    if (!password) {
      setError('Please unlock your wallet first')
      return
    }
    if (!blockchainService.validateAddress(recipient, fromWallet.type)) {
      setError('Invalid recipient address')
      return
    }

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount')
      return
    }
    if (amountNum > parseFloat(selectedToken.balance)) {
      setError('Insufficient balance')
      return
    }

    setIsEstimatingFee(true)
    let fee: string | null = null
    try {
      fee = await blockchainService.estimateTransactionFee(fromWallet, network, recipient, amount)
      setEstimatedFee(fee)
    } catch (err) {
      console.error('Fee estimation failed:', err)
      setEstimatedFee(null)
    } finally {
      setIsEstimatingFee(false)
    }

    // For native sends, ensure amount + gas fits within balance.
    if (selectedToken.isNative && fee) {
      if (amountNum + parseFloat(fee) > parseFloat(selectedToken.balance)) {
        setError('Insufficient balance for amount + network fee')
        return
      }
    }

    setStep('confirm')
  }

  const resetAndClose = () => {
    onOpenChange(false)
    setStep('input')
    setRecipient('')
    setAmount('')
    setMemo('')
    setTxHash(null)
    setShowSuccess(false)
    setEstimatedFee(null)
    setError('')
  }

  const handleConfirmSend = async () => {
    if (!selectedToken || !password) return
    setError('')
    setIsLoading(true)

    try {
      const hash = selectedToken.isNative
        ? await blockchainService.sendTransaction(fromWallet, network, recipient, amount, password)
        : await blockchainService.sendToken(
            fromWallet,
            network,
            selectedToken.address!,
            recipient,
            amount,
            selectedToken.decimals,
            password,
          )

      setTxHash(hash)
      setShowSuccess(true)
      setTimeout(resetAndClose, 4000)
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

  const handleMaxClick = async () => {
    if (!selectedToken) return

    if (selectedToken.isNative) {
      try {
        const toAddress = recipient || fromWallet.address
        const fee = await blockchainService.estimateTransactionFee(
          fromWallet,
          network,
          toAddress,
          selectedToken.balance,
        )
        const maxAmount = parseFloat(selectedToken.balance) - parseFloat(fee)
        setAmount(maxAmount > 0 ? maxAmount.toFixed(6) : '0')
      } catch {
        const buffer = fromWallet.type === 'EVM' ? 0.002 : 0.00089
        const maxAmount = parseFloat(selectedToken.balance) - buffer
        setAmount(maxAmount > 0 ? maxAmount.toFixed(6) : '0')
      }
    } else {
      setAmount(selectedToken.balance)
    }
  }

  const dropdownBg =
    themeName === 'xipz'
      ? 'bg-primary-900 border-primary-800/50'
      : 'bg-surface-elevated border-border-subtle'

  return (
    <ModernDialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : resetAndClose())}
      width="lg"
      preventClose={isLoading}
    >
      <ModernDialogHeader
        icon={<Send className="w-5 h-5" />}
        title={step === 'confirm' ? 'Confirm Send' : 'Send'}
        subtitle={step === 'confirm' ? 'Review before sending' : `From ${fromWallet.name}`}
        onClose={resetAndClose}
        backButton={
          step === 'confirm' && !isLoading && !showSuccess ? (
            <button
              onClick={() => setStep('input')}
              aria-label="Back"
              className="p-2.5 sm:p-3 rounded-xl hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-text-secondary" />
            </button>
          ) : undefined
        }
      />

      {step === 'confirm' ? (
        <ModernDialogSection className="space-y-4 pb-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-text-secondary">Amount</span>
              <div className="text-right">
                <p className="text-base font-semibold text-text-primary">
                  {amount} {selectedToken?.symbol}
                </p>
                {hasPrice && <p className="text-xs text-text-tertiary">≈ {formatUSD(usdAmount)}</p>}
              </div>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs font-medium text-text-secondary shrink-0">To</span>
              <span className="text-xs font-mono text-text-primary break-all text-right">
                {recipient}
              </span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-text-secondary">Network</span>
              <span className="text-xs font-medium text-text-primary">{network.name}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-text-secondary">Network fee</span>
              <span className="text-xs font-medium text-text-primary">
                {isEstimatingFee
                  ? 'Estimating…'
                  : estimatedFee
                    ? `≈ ${formatCryptoBalance(estimatedFee)} ${nativeCurrency.symbol}`
                    : 'Unavailable'}
              </span>
            </div>
          </div>

          {error && (
            <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4" />}>
              {error}
            </ModernAlert>
          )}

          {showSuccess && txHash && (
            <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
              <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-400">Transaction Sent!</p>
                <p className="text-xs text-green-400/80 truncate">{txHash}</p>
              </div>
              <a
                href={`${network.explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on explorer"
                className="p-2 rounded-lg hover:bg-green-500/20 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-green-400" />
              </a>
            </div>
          )}
        </ModernDialogSection>
      ) : (
      <ModernDialogSection className="space-y-4 pb-4">
        <div className="space-y-2">
          <label className={`text-xs font-medium ${theme.styles.textSecondary}`}>From</label>

          <Select.Root
            value={fromWallet.address}
            onValueChange={(addr) => {
              const wallet = wallets.find((w) => w.address === addr)
              if (wallet) {
                setFromWallet(wallet)
                setActiveWallet(wallet.id)
              }
            }}
          >
            <Select.Trigger
              className={`w-full flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-500/10">
                  <WalletIcon className="w-4 h-4 text-accent-500" />
                </div>
                <div className="text-left">
                  <p className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                    {fromWallet.name}
                  </p>
                  <p className={`text-xs ${theme.styles.textTertiary}`}>
                    {formatAddress(fromWallet.address)}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 ${theme.styles.textSecondary}`} />
            </Select.Trigger>

            <Select.Portal>
              <Select.Content
                className={`${dropdownBg} border rounded-xl shadow-xl max-h-[250px] overflow-y-auto`}
                style={{ zIndex: 9999 }}
                position="popper"
                sideOffset={4}
              >
                <Select.Viewport className="p-1">
                  {groupedWallets.map(({ group, wallets }) => (
                    <div key={group.id}>
                      <div className={`px-3 py-2 text-xs font-medium ${theme.styles.textTertiary}`}>
                        {group.name}
                      </div>
                      {wallets.map((wallet) => {
                        const isSelected = wallet.address === fromWallet.address
                        return (
                          <Select.Item
                            key={wallet.id}
                            value={wallet.address}
                            className={`p-2 mx-1 rounded-lg outline-none cursor-pointer transition-colors ${
                              isSelected ? 'bg-accent-500/10' : 'hover:bg-white/5'
                            }`}
                          >
                            <Select.ItemText>
                              <div className="flex items-center gap-2">
                                <WalletIcon className="w-3.5 h-3.5 text-text-secondary" />
                                <div>
                                  <p className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                                    {wallet.name}
                                  </p>
                                  <p className={`text-xs ${theme.styles.textTertiary}`}>
                                    {formatAddress(wallet.address)}
                                  </p>
                                </div>
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
        </div>

        <div className="space-y-2">
          <label className={`text-xs font-medium ${theme.styles.textSecondary}`}>Amount</label>

          <div className="flex gap-2">
            <Popover.Root open={tokenSelectorOpen} onOpenChange={setTokenSelectorOpen}>
              <Popover.Trigger asChild>
                <button
                  className="flex items-center gap-2 px-3 py-3 bg-white/5 border border-white/10 rounded-xl hover:border-white/20 transition-colors min-w-[120px]"
                  disabled={isLoadingBalances || availableTokens.length === 0}
                >
                  <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedToken?.isNative ? (
                      <NativeTokenIcon symbol={selectedToken.symbol} size={24} />
                    ) : selectedToken?.logoURI ? (
                      <img
                        src={selectedToken.logoURI}
                        alt={selectedToken.symbol}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <span className="text-xs font-medium">
                        {selectedToken?.symbol.slice(0, 2).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${theme.styles.textPrimary} truncate`}>
                    {isLoadingBalances ? '...' : selectedToken?.symbol || 'Select'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                </button>
              </Popover.Trigger>

              <Popover.Portal>
                <Popover.Content
                  className={`min-w-[280px] ${dropdownBg} border rounded-xl shadow-xl overflow-hidden`}
                  style={{ zIndex: 9999 }}
                  sideOffset={4}
                  align="start"
                >
                  <div className="p-2 border-b border-white/10">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                      <input
                        type="text"
                        placeholder="Search tokens..."
                        value={tokenSearchQuery}
                        onChange={(e) => setTokenSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500/50"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div
                    className="max-h-[250px] overflow-y-auto overscroll-contain p-1"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    {availableTokens.length === 0 ? (
                      <div className="p-4 text-center text-sm text-text-tertiary">
                        No tokens available
                      </div>
                    ) : (
                      availableTokens
                        .filter(
                          (token) =>
                            token.symbol.toLowerCase().includes(tokenSearchQuery.toLowerCase()) ||
                            token.name.toLowerCase().includes(tokenSearchQuery.toLowerCase()),
                        )
                        .map((token) => {
                          const isSelected =
                            selectedToken &&
                            ((token.isNative && selectedToken.isNative) ||
                              (!token.isNative &&
                                !selectedToken.isNative &&
                                token.address === selectedToken.address))
                          return (
                            <button
                              key={token.isNative ? 'native' : token.address}
                              onClick={() => {
                                setSelectedToken(token)
                                setTokenSelectorOpen(false)
                                setTokenSearchQuery('')
                              }}
                              className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-colors ${
                                isSelected ? 'bg-accent-500/10' : 'hover:bg-white/5'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center overflow-hidden">
                                  {token.isNative ? (
                                    <NativeTokenIcon symbol={token.symbol} size={32} />
                                  ) : token.logoURI ? (
                                    <img
                                      src={token.logoURI}
                                      alt={token.symbol}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <span className="text-xs font-medium">
                                      {token.symbol.slice(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <div className="text-left">
                                  <p className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                                    {token.symbol}
                                  </p>
                                  <p className={`text-xs ${theme.styles.textTertiary}`}>
                                    {token.name}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                                  {formatCryptoBalance(token.balance)}
                                </p>
                                <p className={`text-xs ${theme.styles.textTertiary}`}>
                                  {formatUSD(token.usdValue)}
                                </p>
                              </div>
                            </button>
                          )
                        })
                    )}
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>

            <div className="flex-1 relative bg-white/5 border border-white/10 rounded-xl overflow-hidden">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                className={`w-full h-full px-4 py-3 pb-6 bg-transparent text-right text-lg font-medium ${theme.styles.textPrimary} placeholder-text-tertiary focus:outline-none`}
                style={{ fontSize: '16px' }}
              />
              <div className={`absolute right-4 bottom-2 text-xs ${theme.styles.textTertiary}`}>
                ≈ {amount ? formatUSD(usdAmount) : '$0.00'}
              </div>
            </div>
          </div>

          {selectedToken && (
            <div className="flex items-center justify-between">
              <p className={`text-xs ${theme.styles.textTertiary}`}>
                Balance: {formatCryptoBalance(selectedToken.balance)} {selectedToken.symbol}
              </p>
              <button
                type="button"
                onClick={handleMaxClick}
                disabled={!selectedToken}
                className="text-xs font-medium text-accent-500 hover:text-accent-400 transition-colors px-2 py-1 rounded-lg hover:bg-accent-500/10 disabled:opacity-50"
              >
                Max
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className={`text-xs font-medium ${theme.styles.textSecondary}`}>To</label>

          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder={`Enter ${network.type} address`}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={recipientValid === false}
            className={`w-full px-4 py-3 text-sm bg-white/5 border rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 transition-all ${
              recipientValid === false
                ? 'border-red-500/50 focus:ring-red-500/50'
                : recipientValid
                  ? 'border-green-500/40 focus:ring-green-500/40'
                  : 'border-white/10 focus:ring-accent-500/50 focus:border-accent-500/50'
            }`}
            style={{ fontSize: '16px' }}
          />
          {recipientValid === false && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> This doesn't look like a valid {network.type}{' '}
              address
            </p>
          )}

          <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
            <Tabs.List className="flex border-b border-white/10">
              <Tabs.Trigger
                value="wallets"
                className="flex-1 py-2 text-xs font-medium text-text-secondary border-b-2 border-transparent transition-colors hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-accent-500"
              >
                My Wallets
              </Tabs.Trigger>
              <Tabs.Trigger
                value="contacts"
                className="flex-1 py-2 text-xs font-medium text-text-secondary border-b-2 border-transparent transition-colors hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-accent-500"
              >
                Contacts
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="wallets" className="mt-3">
              <div className={`${dropdownBg} border rounded-xl overflow-hidden`}>
                <div className="p-2 border-b border-white/10">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                      type="text"
                      placeholder="Search wallets..."
                      value={walletSearchQuery}
                      onChange={(e) => setWalletSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="max-h-[180px] overflow-y-auto p-1">
                  {(() => {
                    const filteredGroups = groupedWallets
                      .map(({ group, wallets }) => ({
                        group,
                        wallets: wallets.filter(
                          (wallet) =>
                            wallet.name.toLowerCase().includes(walletSearchQuery.toLowerCase()) ||
                            wallet.address.toLowerCase().includes(walletSearchQuery.toLowerCase()),
                        ),
                      }))
                      .filter((g) => g.wallets.length > 0)

                    if (filteredGroups.length === 0) {
                      return (
                        <div className="p-4 text-center text-sm text-text-tertiary">
                          No wallets found
                        </div>
                      )
                    }

                    return filteredGroups.map(({ group, wallets }) => (
                      <div key={group.id}>
                        <div
                          className={`flex items-center gap-2 px-3 py-2 text-xs font-medium ${theme.styles.textTertiary}`}
                        >
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
                              className={`w-full flex items-center justify-between p-2.5 mx-1 rounded-lg transition-colors ${
                                isSelected ? 'bg-accent-500/10' : 'hover:bg-white/5'
                              } ${isFromWallet ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                              style={{ width: 'calc(100% - 8px)' }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                                  <WalletIcon className="w-4 h-4 text-text-secondary" />
                                </div>
                                <div className="text-left">
                                  <p className={`text-sm font-medium ${theme.styles.textPrimary}`}>
                                    {wallet.name}
                                  </p>
                                  <p className={`text-xs ${theme.styles.textTertiary}`}>
                                    {formatAddress(wallet.address)}
                                  </p>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-accent-500" />}
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
              <div className={`${dropdownBg} border rounded-xl p-6 text-center`}>
                <p className={`text-sm ${theme.styles.textTertiary}`}>No contacts yet</p>
                <p className={`text-xs ${theme.styles.textTertiary} mt-1`}>Coming soon</p>
              </div>
            </Tabs.Content>
          </Tabs.Root>
        </div>

        {network.type === 'SVM' && (
          <div className="space-y-2">
            <label className={`text-xs font-medium ${theme.styles.textSecondary}`}>
              Memo (Optional)
            </label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Add a memo"
              className="w-full px-4 py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500/50"
              style={{ fontSize: '16px' }}
            />
          </div>
        )}

        {error && (
          <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4" />}>
            {error}
          </ModernAlert>
        )}

      </ModernDialogSection>
      )}

      <ModernDialogActions>
        {step === 'confirm' ? (
          showSuccess ? (
            <ModernButton variant="primary" fullWidth onClick={resetAndClose}>
              Done
            </ModernButton>
          ) : (
            <>
              <ModernButton
                variant="secondary"
                fullWidth
                onClick={() => setStep('input')}
                disabled={isLoading}
              >
                Back
              </ModernButton>
              <ModernButton
                variant="primary"
                fullWidth
                onClick={handleConfirmSend}
                loading={isLoading}
                icon={<Send className="w-4 h-4" />}
              >
                Confirm Send
              </ModernButton>
            </>
          )
        ) : (
          <>
            <ModernButton variant="secondary" fullWidth onClick={resetAndClose}>
              Cancel
            </ModernButton>
            <ModernButton
              variant="primary"
              fullWidth
              onClick={handleReview}
              loading={isEstimatingFee}
              disabled={
                !recipient ||
                !amount ||
                !selectedToken ||
                isLoadingBalances ||
                recipientValid === false
              }
              icon={<Send className="w-4 h-4" />}
            >
              Review
            </ModernButton>
          </>
        )}
      </ModernDialogActions>
    </ModernDialog>
  )
}