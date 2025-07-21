import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Send, AlertCircle, ExternalLink } from 'lucide-react'
import { Wallet } from '../../types'
import { Network } from '../../utils/networks'
import { blockchainService } from '../../services/blockchain/blockchainService'
import { useWalletStore } from '../../store/walletStore'
import { useTheme } from '../../hooks/useTheme'

interface SendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet
  network: Network
}

export function SendDialog({ open, onOpenChange, wallet, network }: SendDialogProps) {
  const { password } = useWalletStore()
  const { theme } = useTheme()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)

  // Get native currency info with fallback
  const nativeCurrency = network.nativeCurrency || {
    name: network.symbol || 'ETH',
    symbol: network.symbol || 'ETH',
    decimals: 18
  }

  const handleSend = async () => {
    setError('')
    
    if (!recipient || !amount) {
      setError('Please fill in all required fields')
      return
    }
    
    if (!password) {
      setError('Please unlock your wallet first')
      return
    }
    
    // Validate recipient address
    if (!blockchainService.validateAddress(recipient, wallet.type)) {
      setError('Invalid recipient address')
      return
    }
    
    // Validate amount
    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Invalid amount')
      return
    }

    setIsLoading(true)
    
    try {
      const hash = await blockchainService.sendTransaction(
        wallet,
        network,
        recipient,
        amount,
        password
      )
      
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content bg-surface-base rounded-lg shadow-2xl border border-border-subtle w-[500px] max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-text-primary">
                Send {nativeCurrency.symbol}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded hover:bg-surface-hover transition-colors">
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  From
                </label>
                <div className="p-3 bg-surface-elevated rounded-lg">
                  <p className="text-sm font-medium text-text-primary">{wallet.name}</p>
                  <p className="text-xs text-text-tertiary">{wallet.address}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={`Enter ${network.type} address`}
                  className={theme.styles.input}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    step="0.000001"
                    min="0"
                    className={`${theme.styles.input} pr-16`}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary">
                    {nativeCurrency.symbol}
                  </span>
                </div>
              </div>

              {network.type === 'SVM' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
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

              {error && (
                <div className="flex items-center gap-2 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-accent flex-shrink-0" />
                  <p className="text-sm text-accent-400">{error}</p>
                </div>
              )}
              
              {showSuccess && txHash && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex-1">
                    <p className="text-sm text-green-400 font-medium">Transaction sent successfully!</p>
                    <p className="text-xs text-green-400/80 mt-1">Hash: {txHash.slice(0, 10)}...{txHash.slice(-8)}</p>
                  </div>
                  <a
                    href={`${network.explorerUrl || network.explorer}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-green-500/20 transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-4 h-4 text-green-400" />
                  </a>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSend}
                  disabled={isLoading || !recipient || !amount}
                  className={`w-full flex items-center justify-center gap-2 ${theme.styles.buttonSettings || theme.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
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