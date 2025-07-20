import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Send, AlertCircle } from 'lucide-react'
import { Wallet } from '../../types'
import { Network } from '../../utils/networks'

interface SendDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet
  network: Network
}

export function SendDialog({ open, onOpenChange, wallet, network }: SendDialogProps) {
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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

    // TODO: Implement actual send functionality
    setIsLoading(true)
    
    try {
      // Simulate transaction
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Close dialog on success
      onOpenChange(false)
      
      // Reset form
      setRecipient('')
      setAmount('')
      setMemo('')
    } catch (err) {
      setError('Transaction failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-surface-base rounded-lg shadow-2xl border border-border-subtle w-[500px] max-h-[85vh] overflow-y-auto">
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
                  className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
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
                    className="w-full px-3 py-2 pr-16 border border-border-default rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
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
                    className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-accent-500/10 border border-accent-500/30 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-accent-500 flex-shrink-0" />
                  <p className="text-sm text-accent-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-border-default rounded-lg hover:bg-surface-hover transition-colors text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading || !recipient || !amount}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-candy-red text-white rounded-lg hover:shadow-lg hover:shadow-accent-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
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