/**
 * Code by Xipzer
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
import { TokenResearch, RISK_RATING_CONFIG } from '../../types/research'
import { useWalletStore } from '../../store/walletStore'
import { swapService, SwapQuote } from '../../services/api/swapService'
import { useTheme } from '../../hooks/useTheme'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import { formatAddress, formatCompactNumber } from '../../utils/formatters'
import {
  getExplorerUrl,
  getChainId,
  getNativeSymbol,
  getChainType,
  findNetworkByResearchId,
  getNativeTokenAddress,
  getNativePriceFallback,
} from '../../utils/networks'
import { themeClasses, statusClasses } from '../../utils/themeClasses'

interface ApeInterfaceProps {
  research: TokenResearch
  onClose: () => void
  onTradeComplete?: (txHash: string, amount: number) => void
}

const PRESET_AMOUNTS = [0.01, 0.05, 0.1, 0.25, 0.5, 1.0]
const SLIPPAGE_PRESETS = [0.5, 1, 3, 5]

export function ApeInterface({ research, onClose, onTradeComplete }: ApeInterfaceProps) {
  const { theme, isDark } = useTheme()
  const tc = themeClasses(isDark)

  const iconAccent = theme.styles.iconAccent

  const [amount, setAmount] = useState<string>('0.1')
  const [, setIsExecuting] = useState(false)
  const [isFetchingQuote, setIsFetchingQuote] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'input' | 'confirm' | 'executing' | 'success' | 'error'>('input')
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [slippage, setSlippage] = useState(1.0)
  const { copied, copy: copyToClipboard } = useCopyToClipboard()

  const activeWalletId = useWalletStore((state) => state.activeWalletId)
  const password = useWalletStore((state) => state.password)
  const getWalletPrivateKey = useWalletStore((state) => state.getWalletPrivateKey)

  const activeWallet = useWalletStore((state) => state.wallets).find((w) => w.id === activeWalletId)
  const ratingConfig = RISK_RATING_CONFIG[research.rating]

  const nativeSymbol = getNativeSymbol(research.network)
  const chainId = getChainId(research.network)
  const chainType = getChainType(research.network)

  const estimatedTokens =
    research.price > 0
      ? (parseFloat(amount || '0') * getNativePriceFallback(research.network)) / research.price
      : 0

  const formatNumber = (num: number): string => formatCompactNumber(num, '')

  useEffect(() => {
    const fetchQuote = async () => {
      if (!amount || parseFloat(amount) <= 0 || !activeWallet) return

      setIsFetchingQuote(true)
      try {
        const fromToken = getNativeTokenAddress(research.network)

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
      const privateKey = await getWalletPrivateKey(activeWallet.id, password)

      const rpcUrl = findNetworkByResearchId(research.network)?.rpcUrl || ''

      const fromToken = getNativeTokenAddress(research.network)

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

  const explorerTxUrl = `${getExplorerUrl(research.network)}/tx/`

  const canClose = step !== 'executing'
  const handleDismiss = () => canClose && onClose()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className={`absolute inset-0 ${tc.backdrop} backdrop-blur-sm`} onClick={handleDismiss} />

      <div
        className={`relative w-full max-w-md ${theme.styles.dialogContainer} rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto`}
      >
        <div className={`p-3 sm:p-4 border-b ${tc.border} flex items-center justify-between`}>
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border ${isDark ? 'border-green-500/30' : 'border-green-300'}`}
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
            </div>
            <div>
              <h2 className="font-semibold text-text-primary text-sm sm:text-base">Ape In</h2>
              <p className="text-xs sm:text-sm text-text-secondary">Buy ${research.tokenSymbol}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            disabled={!canClose}
            aria-label="Close"
            className={`p-1.5 sm:p-2 ${tc.hoverBg} rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-3 sm:p-4">
          {!activeWallet && (
            <div
              className={`${statusClasses('yellow', isDark).bg} ${statusClasses('yellow', isDark).border} border rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 flex items-start gap-2 sm:gap-3`}
            >
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className={`text-xs sm:text-sm ${statusClasses('yellow', isDark).text}`}>
                Please select a wallet from the sidebar to execute trades.
              </div>
            </div>
          )}

          <div className={`${tc.sectionBg} border rounded-xl p-3 sm:p-4 mb-3 sm:mb-4`}>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-600/20 flex items-center justify-center border ${tc.border}`}
                >
                  <span className="text-xs sm:text-sm font-bold text-text-primary">
                    {research.tokenSymbol.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-text-primary text-sm sm:text-base">
                    {research.tokenName}
                  </div>
                  <div className="text-xs sm:text-sm text-text-secondary">
                    ${research.tokenSymbol}
                  </div>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full ${ratingConfig.bgColor}`}>
                <span className={`text-[10px] sm:text-xs font-bold ${ratingConfig.color}`}>
                  {ratingConfig.emoji} {ratingConfig.label}
                </span>
              </div>
            </div>
            <div className={`pt-2 sm:pt-3 border-t ${tc.border}`}>
              <div className="text-[10px] sm:text-xs text-text-tertiary mb-1">Contract Address</div>
              <button
                onClick={() => copyToClipboard(research.contractAddress)}
                className={`w-full flex items-center justify-between gap-2 px-2 sm:px-3 py-1.5 sm:py-2 ${tc.interactiveBg} border rounded-lg transition-colors group`}
              >
                <span className="text-xs sm:text-sm text-text-secondary font-mono truncate">
                  {research.contractAddress}
                </span>
                {copied ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-tertiary group-hover:text-text-primary flex-shrink-0 transition-colors" />
                )}
              </button>
            </div>
          </div>

          {(research.rating === 'red' || research.rating === 'yellow') &&
            (step === 'input' || step === 'confirm') && (
            <div
              className={`${statusClasses('orange', isDark).bg} ${statusClasses('orange', isDark).border} border rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 flex items-start gap-2 sm:gap-3`}
            >
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className={`text-xs sm:text-sm ${statusClasses('orange', isDark).text}`}>
                This token has a <span className="font-medium">{ratingConfig.label}</span> rating.
                Trade with caution and only risk what you can afford to lose.
              </div>
            </div>
          )}

          {step === 'input' && (
            <>
              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">
                  Amount ({nativeSymbol})
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 ${tc.inputBg} border rounded-xl text-text-primary text-base sm:text-lg font-medium focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all`}
                    placeholder="0.0"
                    style={{ fontSize: '16px' }}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs sm:text-base">
                    {nativeSymbol}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => handlePresetClick(preset)}
                    className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                      amount === preset.toString()
                        ? 'bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400'
                        : isDark
                          ? 'bg-white/5 border-white/10 text-text-secondary hover:bg-white/10 hover:text-white'
                          : 'bg-gray-100 border-gray-200 text-text-secondary hover:bg-gray-200 hover:text-gray-900'
                    } border`}
                  >
                    {preset} {nativeSymbol}
                  </button>
                ))}
              </div>

              <div className="mb-3 sm:mb-4">
                <label className="block text-xs sm:text-sm text-text-secondary mb-1.5 sm:mb-2">
                  Max Slippage
                </label>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {SLIPPAGE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setSlippage(preset)}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all border ${
                        slippage === preset
                          ? 'bg-green-500/20 border-green-500/50 text-green-600 dark:text-green-400'
                          : tc.interactiveBg
                      }`}
                    >
                      {preset}%
                    </button>
                  ))}
                  <div className="relative flex-1 min-w-[80px]">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={String(slippage)}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value)
                        if (!isNaN(v) && v > 0 && v <= 50) setSlippage(v)
                        else if (e.target.value === '') setSlippage(0)
                      }}
                      aria-label="Custom slippage percentage"
                      className={`w-full px-2.5 py-1 sm:py-1.5 pr-6 ${tc.inputBg} border rounded-lg text-xs sm:text-sm text-text-primary text-right focus:outline-none focus:border-green-500/50`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary text-xs">
                      %
                    </span>
                  </div>
                </div>
                {slippage >= 5 && (
                  <p className="text-2xs sm:text-xs text-orange-400 mt-1.5">
                    High slippage — you may receive significantly fewer tokens.
                  </p>
                )}
              </div>

              <div className={`${tc.sectionBg} border rounded-xl p-3 sm:p-4 mb-3 sm:mb-4`}>
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-text-secondary">You'll receive (est.)</span>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {isFetchingQuote ? (
                      <Loader2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${iconAccent} animate-spin`} />
                    ) : (
                      <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                    )}
                    <span className="text-text-primary font-medium">
                      ~{formatNumber(quote ? parseFloat(quote.toAmount) : estimatedTokens)} $
                      {research.tokenSymbol}
                    </span>
                  </div>
                </div>
                {quote && (
                  <div
                    className={`mt-2 pt-2 border-t ${tc.borderSubtle} text-[10px] sm:text-xs text-text-tertiary`}
                  >
                    Impact: {quote.priceImpact.toFixed(2)}% | Route: {quote.route.join(' → ')}
                  </div>
                )}
              </div>

              {error && (
                <div
                  className={`${statusClasses('red', isDark).bg} ${statusClasses('red', isDark).border} border rounded-xl p-2.5 sm:p-3 mb-3 sm:mb-4 text-xs sm:text-sm text-red-500`}
                >
                  {error}
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={!amount || parseFloat(amount) <= 0 || !activeWallet}
                className="w-full py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl font-medium text-white text-sm sm:text-base shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {activeWallet ? 'Continue' : 'Select Wallet First'}
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className={`${tc.sectionBg} border rounded-xl p-3 sm:p-4 mb-3 sm:mb-4`}>
                <div className="text-center mb-3 sm:mb-4">
                  <div className="text-2xl sm:text-3xl font-bold text-text-primary mb-1">
                    {amount} {nativeSymbol}
                  </div>
                  <div className="flex items-center justify-center gap-2 text-text-secondary text-sm sm:text-base">
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>
                      ~{formatNumber(quote ? parseFloat(quote.toAmount) : estimatedTokens)} $
                      {research.tokenSymbol}
                    </span>
                  </div>
                </div>

                <div
                  className={`border-t ${tc.border} pt-3 sm:pt-4 space-y-1.5 sm:space-y-2 text-xs sm:text-sm`}
                >
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Network</span>
                    <span className="text-text-primary uppercase">{research.network}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Wallet</span>
                    <span className="text-text-primary font-mono text-[10px] sm:text-xs">
                      {activeWallet ? formatAddress(activeWallet.address) : ''}
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

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleBack}
                  className={`flex-1 py-2.5 sm:py-3 ${tc.interactiveBg} border rounded-xl font-medium text-text-primary text-sm sm:text-base transition-all`}
                >
                  Back
                </button>
                <button
                  onClick={handleExecute}
                  className="flex-1 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 rounded-xl font-medium text-white text-sm sm:text-base shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all"
                >
                  Confirm Ape
                </button>
              </div>
            </>
          )}

          {step === 'executing' && (
            <div className="py-6 sm:py-8 text-center">
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-green-500 animate-spin mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-medium text-text-primary mb-2">
                Executing Trade
              </h3>
              <p className="text-text-secondary text-sm sm:text-base">
                Swapping {amount} {nativeSymbol} for ${research.tokenSymbol}...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 sm:py-8 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Check className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-text-primary mb-2">
                Ape Successful!
              </h3>
              <p className="text-text-secondary text-sm sm:text-base mb-3 sm:mb-4">
                You bought ~{formatNumber(quote ? parseFloat(quote.toAmount) : estimatedTokens)} $
                {research.tokenSymbol}
              </p>

              {txHash && (
                <a
                  href={`${explorerTxUrl}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 ${tc.interactiveBg} border rounded-xl text-xs sm:text-sm ${iconAccent} hover:opacity-80 transition-colors`}
                >
                  View Transaction
                  <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </a>
              )}

              <button
                onClick={onClose}
                className={`w-full mt-5 sm:mt-6 py-2.5 sm:py-3 ${tc.interactiveBg} border rounded-xl font-medium text-text-primary text-sm sm:text-base transition-all`}
              >
                Close
              </button>
            </div>
          )}

          {step === 'error' && (
            <div className="py-6 sm:py-8 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <X className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
              </div>
              <h3 className="text-base sm:text-lg font-medium text-text-primary mb-2">
                Trade Failed
              </h3>
              <p className="text-red-500 text-sm sm:text-base mb-3 sm:mb-4">{error}</p>

              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleBack}
                  className={`flex-1 py-2.5 sm:py-3 ${tc.interactiveBg} border rounded-xl font-medium text-text-primary text-sm sm:text-base transition-all`}
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className={`flex-1 py-2.5 sm:py-3 ${tc.interactiveBg} border rounded-xl font-medium text-text-secondary text-sm sm:text-base transition-all`}
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