/**
 * ApeInterface Component
 * Trading interface for buying tokens after research
 */

import { useState, useEffect } from 'react'
import {
  X,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Loader2,
  Check,
  ExternalLink,
  Zap,
  Wallet,
  Copy,
} from 'lucide-react'
import { TokenResearch, RISK_RATING_CONFIG, ResearchNetwork } from '../../types/research'
import { useWalletStore } from '../../store/walletStore'
import { swapService, SwapQuote } from '../../services/api/swapService'
import { networkService } from '../../services/network/networkService'
import { useTheme } from '../../hooks/useTheme'

interface ApeInterfaceProps {
  research: TokenResearch
  onClose: () => void
  onTradeComplete?: (txHash: string, amount: number) => void
}

// Preset amounts for quick selection
const PRESET_AMOUNTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0]

// Native token addresses by network
const NATIVE_TOKEN: Record<ResearchNetwork, string> = {
  base: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH placeholder
  ethereum: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  arbitrum: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  optimism: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  solana: 'So11111111111111111111111111111111111111112', // Wrapped SOL
}

// Chain IDs by network
const CHAIN_IDS: Record<ResearchNetwork, number> = {
  base: 8453,
  ethereum: 1,
  arbitrum: 42161,
  optimism: 10,
  solana: 0, // Special handling for Solana
}

// Block explorer URLs
const EXPLORER_URLS: Record<ResearchNetwork, string> = {
  base: 'https://basescan.org/tx/',
  ethereum: 'https://etherscan.io/tx/',
  arbitrum: 'https://arbiscan.io/tx/',
  optimism: 'https://optimistic.etherscan.io/tx/',
  solana: 'https://solscan.io/tx/',
}

export function ApeInterface({ research, onClose, onTradeComplete }: ApeInterfaceProps) {
  const { themeName, theme } = useTheme()
  const isDark = themeName === 'dark' || themeName === 'xipz' || themeName === 'ogDark'

  // Get theme-aware accent color class
  const iconAccent = theme.styles.iconAccent
  
  const [amount, setAmount] = useState<string>('0.1')
  const [, setIsExecuting] = useState(false)
  const [isFetchingQuote, setIsFetchingQuote] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'input' | 'confirm' | 'executing' | 'success' | 'error'>('input')
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [slippage] = useState(1.0) // 1% default slippage
  const [copied, setCopied] = useState(false)

  // Get active wallet
  const activeWalletId = useWalletStore((state) => state.activeWalletId)
  const wallets = useWalletStore((state) => state.wallets)
  const password = useWalletStore((state) => state.password)
  const getWalletPrivateKey = useWalletStore((state) => state.getWalletPrivateKey)

  const activeWallet = wallets.find((w) => w.id === activeWalletId)
  const ratingConfig = RISK_RATING_CONFIG[research.rating]

  // Approximate native token prices in USD for fallback estimation
  const NATIVE_PRICES: Record<ResearchNetwork, number> = {
    base: 2300, // ETH price
    ethereum: 2300,
    arbitrum: 2300,
    optimism: 2300,
    solana: 150, // SOL price
  }

  // Calculate estimated tokens (converts native amount to USD, then divides by token price)
  const estimatedTokens =
    research.price > 0
      ? (parseFloat(amount || '0') * NATIVE_PRICES[research.network]) / research.price
      : 0

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`
    if (num < 0.01) return num.toExponential(2)
    return num.toFixed(4)
  }

  // Fetch quote when amount changes
  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || parseFloat(amount) <= 0 || !activeWallet) return

      setIsFetchingQuote(true)
      try {
        const chainType = research.network === 'solana' ? 'SVM' : 'EVM'
        const chainId = CHAIN_IDS[research.network]
        const fromToken = NATIVE_TOKEN[research.network]

        const newQuote = await swapService.getSwapQuote(
          chainType,
          chainId,
          fromToken,
          research.contractAddress,
          amount,
          slippage,
          activeWallet.address,
        )
        setQuote(newQuote)
      } catch (err) {
        console.error('Failed to fetch quote:', err)
        // Don't show error, just use estimated calculation
        setQuote(null)
      } finally {
        setIsFetchingQuote(false)
      }
    }

    const debounce = setTimeout(fetchQuote, 500)
    return () => clearTimeout(debounce)
  }, [amount, activeWallet, research.contractAddress, research.network, slippage])

  const handleAmountChange = (value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
      setError(null)
    }
  }

  const handlePresetClick = (preset: number) => {
    setAmount(preset.toString())
    setError(null)
  }

  const handleConfirm = () => {
    if (!activeWallet) {
      setError('Please select a wallet first')
      return
    }
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }
    setStep('confirm')
  }

  const handleExecute = async () => {
    if (!activeWallet || !password) {
      setError('Wallet not available')
      return
    }

    setStep('executing')
    setIsExecuting(true)
    setError(null)

    try {
      // Get private key
      const privateKey = await getWalletPrivateKey(activeWallet.id, password)

      // Get network RPC URL
      const networks = await networkService.getVisibleNetworks()
      const network = networks.find(
        (n) => n.id === research.network || n.name.toLowerCase() === research.network,
      )
      const rpcUrl = network?.rpcUrl || `https://${research.network}.infura.io/v3/`

      // Execute swap
      const chainType = research.network === 'solana' ? 'SVM' : 'EVM'
      const chainId = CHAIN_IDS[research.network]
      const fromToken = NATIVE_TOKEN[research.network]

      const result = await swapService.executeSwap(
        chainType,
        chainId,
        privateKey,
        fromToken,
        research.contractAddress,
        amount,
        slippage,
        rpcUrl,
      )

      setTxHash(result.txHash)
      setStep('success')
      onTradeComplete?.(result.txHash, parseFloat(amount))
    } catch (err) {
      console.error('Swap failed:', err)
      setError(err instanceof Error ? err.message : 'Transaction failed')
      setStep('error')
    } finally {
      setIsExecuting(false)
    }
  }

  const handleBack = () => {
    setStep('input')
    setError(null)
  }

  const explorerUrl = EXPLORER_URLS[research.network] || EXPLORER_URLS.base

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-black/40'} backdrop-blur-sm`}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md bg-surface-elevated border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-2xl shadow-2xl overflow-hidden`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'} flex items-center justify-between`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border ${isDark ? 'border-green-500/30' : 'border-green-300'}`}
            >
              <Zap className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">Ape In</h2>
              <p className="text-sm text-text-secondary">Buy ${research.tokenSymbol}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'} rounded-lg transition-colors`}
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* No wallet warning */}
          {!activeWallet && (
            <div
              className={`${isDark ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'} border rounded-xl p-3 mb-4 flex items-start gap-3`}
            >
              <Wallet className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
                Please select a wallet from the sidebar to execute trades.
              </div>
            </div>
          )}

          {/* Token info */}
          <div
            className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4 mb-4`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center border ${isDark ? 'border-white/10' : 'border-gray-200'}`}
                >
                  <span className="text-sm font-bold text-text-primary">
                    {research.tokenSymbol.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-text-primary">{research.tokenName}</div>
                  <div className="text-sm text-text-secondary">${research.tokenSymbol}</div>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full ${ratingConfig.bgColor}`}>
                <span className={`text-xs font-bold ${ratingConfig.color}`}>
                  {ratingConfig.emoji} {ratingConfig.label}
                </span>
              </div>
            </div>
            {/* Contract address */}
            <div className={`pt-3 border-t ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="text-xs text-text-tertiary mb-1">Contract Address</div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(research.contractAddress)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border rounded-lg transition-colors group`}
              >
                <span className="text-sm text-text-secondary font-mono truncate">
                  {research.contractAddress}
                </span>
                {copied ? (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Copy className="w-4 h-4 text-text-tertiary group-hover:text-text-primary flex-shrink-0 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {/* Risk warning for high-risk tokens */}
          {(research.rating === 'red' || research.rating === 'yellow') && step === 'input' && (
            <div
              className={`${isDark ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'} border rounded-xl p-3 mb-4 flex items-start gap-3`}
            >
              <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className={`text-sm ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                This token has a <span className="font-medium">{ratingConfig.label}</span> rating.
                Trade with caution and only risk what you can afford to lose.
              </div>
            </div>
          )}

          {/* Step: Input */}
          {step === 'input' && (
            <>
              {/* Amount input */}
              <div className="mb-4">
                <label className="block text-sm text-text-secondary mb-2">
                  Amount ({research.network === 'solana' ? 'SOL' : 'ETH'})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`w-full px-4 py-3 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} border rounded-xl text-text-primary text-lg font-medium focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all`}
                    placeholder="0.0"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    {research.network === 'solana' ? 'SOL' : 'ETH'}
                  </div>
                </div>
              </div>

              {/* Preset amounts */}
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      amount === preset.toString()
                        ? 'bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                          : 'bg-gray-100 border-gray-200 text-text-secondary hover:bg-gray-200 hover:text-gray-900'
                    } border`}
                  >
                    {preset} {research.network === 'solana' ? 'SOL' : 'ETH'}
                  </button>
                ))}
              </div>

              {/* Estimated output */}
              <div
                className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4 mb-4`}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">You'll receive (estimated)</span>
                  <div className="flex items-center gap-2">
                    {isFetchingQuote ? (
                      <Loader2 className={`w-4 h-4 ${iconAccent} animate-spin`} />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    )}
                    <span className="text-text-primary font-medium">
                      ~{formatNumber(quote ? parseFloat(quote.toAmount) : estimatedTokens)} $
                      {research.tokenSymbol}
                    </span>
                  </div>
                </div>
                {quote && (
                  <div
                    className={`mt-2 pt-2 border-t ${isDark ? 'border-white/5' : 'border-gray-200'} text-xs text-text-tertiary`}
                  >
                    Price impact: {quote.priceImpact.toFixed(2)}% | Route: {quote.route.join(' → ')}
                  </div>
                )}
              </div>

              {error && (
                <div
                  className={`${isDark ? 'bg-red-500/10 border-red-500/30' : 'bg-red-50 border-red-200'} border rounded-xl p-3 mb-4 text-sm text-red-500`}
                >
                  {error}
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={!amount || parseFloat(amount) <= 0 || !activeWallet}
                className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl font-medium text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {activeWallet ? 'Continue' : 'Select Wallet First'}
              </button>
            </>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <>
              <div
                className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4 mb-4`}
              >
                <div className="text-center mb-4">
                  <div className="text-3xl font-bold text-text-primary mb-1">
                    {amount} {research.network === 'solana' ? 'SOL' : 'ETH'}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-text-secondary">
                    <ArrowRight className="w-4 h-4" />
                    <span>
                      ~{formatNumber(quote ? parseFloat(quote.toAmount) : estimatedTokens)} $
                      {research.tokenSymbol}
                    </span>
                  </div>
                </div>

                <div
                  className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'} pt-4 space-y-2 text-sm`}
                >
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Network</span>
                    <span className="text-text-primary uppercase">{research.network}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Wallet</span>
                    <span className="text-text-primary font-mono text-xs">
                      {activeWallet?.address.slice(0, 6)}...{activeWallet?.address.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Slippage</span>
                    <span className="text-text-primary">{slippage}%</span>
                  </div>
                  {quote?.estimatedGas && (
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Est. Gas</span>
                      <span className="text-text-primary">{quote.estimatedGas}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className={`flex-1 py-3 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border rounded-xl font-medium text-text-primary transition-all`}
                >
                  Back
                </button>
                <button
                  onClick={handleExecute}
                  className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl font-medium text-white shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                >
                  Confirm Ape
                </button>
              </div>
            </>
          )}

          {/* Step: Executing */}
          {step === 'executing' && (
            <div className="py-8 text-center">
              <Loader2 className="w-12 h-12 text-green-500 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text-primary mb-2">Executing Trade</h3>
              <p className="text-text-secondary">
                Swapping {amount} {research.network === 'solana' ? 'SOL' : 'ETH'} for $
                {research.tokenSymbol}...
              </p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">Ape Successful!</h3>
              <p className="text-text-secondary mb-4">
                You bought ~{formatNumber(quote ? parseFloat(quote.toAmount) : estimatedTokens)} $
                {research.tokenSymbol}
              </p>

              {txHash && (
                <a
                  href={`${explorerUrl}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-2 px-4 py-2 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border rounded-xl text-sm ${iconAccent} hover:opacity-80 transition-colors`}
                >
                  View Transaction
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                onClick={onClose}
                className={`w-full mt-6 py-3 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border rounded-xl font-medium text-text-primary transition-all`}
              >
                Close
              </button>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-2">Trade Failed</h3>
              <p className="text-red-500 mb-4">{error}</p>

              <div className="flex gap-3">
                <button
                  onClick={handleBack}
                  className={`flex-1 py-3 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border rounded-xl font-medium text-text-primary transition-all`}
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className={`flex-1 py-3 ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/10' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'} border rounded-xl font-medium text-text-secondary transition-all`}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
