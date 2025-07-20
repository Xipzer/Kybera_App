import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertCircle, Send } from 'lucide-react'
import { Wallet, Network } from '../../types'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import { useWalletStore } from '../../store/walletStore'

interface SendTokenDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet
  network: Network
  tokenAddress: string | null // null for native token
  tokenDecimals?: number // Required for token transfers
  tokenSymbol?: string // For display purposes
}

export function SendTokenDialog({ 
  open, 
  onOpenChange, 
  wallet, 
  network, 
  tokenAddress,
  tokenDecimals = 18,
  tokenSymbol
}: SendTokenDialogProps) {
  const { password, getWalletPrivateKey } = useWalletStore()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState('')

  const isNativeToken = !tokenAddress

  const validateAddress = (address: string): boolean => {
    if (wallet.type === 'EVM') {
      return EVMWalletService.isValidAddress(address)
    } else {
      return SVMWalletService.isValidAddress(address)
    }
  }

  const handleSend = async () => {
    setError('')
    
    if (!recipient || !amount || !password) {
      setError('Please fill in all fields')
      return
    }

    if (!validateAddress(recipient)) {
      setError('Invalid recipient address')
      return
    }

    if (parseFloat(amount) <= 0) {
      setError('Amount must be greater than 0')
      return
    }

    setIsLoading(true)
    
    try {
      // Get private key using the new method that handles both imported and group wallets
      const decryptedPrivateKey = await getWalletPrivateKey(wallet.id, password)
      let hash: string

      if (wallet.type === 'EVM') {
        
        if (isNativeToken) {
          hash = await EVMWalletService.sendTransaction(
            decryptedPrivateKey,
            recipient,
            amount,
            network.rpcUrl
          )
        } else {
          hash = await EVMWalletService.sendERC20Token(
            decryptedPrivateKey,
            tokenAddress,
            recipient,
            amount,
            tokenDecimals,
            network.rpcUrl
          )
        }
      } else {
        if (isNativeToken) {
          hash = await SVMWalletService.sendTransaction(
            decryptedPrivateKey,
            recipient,
            amount,
            network.rpcUrl
          )
        } else {
          hash = await SVMWalletService.sendSPLToken(
            decryptedPrivateKey,
            tokenAddress,
            recipient,
            amount,
            network.rpcUrl
          )
        }
      }

      setTxHash(hash)
    } catch (err) {
      console.error('Transaction failed:', err)
      setError(err instanceof Error ? err.message : 'Transaction failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setRecipient('')
    setAmount('')
    setError('')
    setTxHash('')
    onOpenChange(false)
  }

  const openExplorer = () => {
    if (txHash && network) {
      const url = `${network.explorer}/tx/${txHash}`
      window.open(url, '_blank')
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[500px] max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Send {isNativeToken ? network.symbol : (tokenSymbol || 'Token')}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  onClick={handleClose}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </Dialog.Close>
            </div>

            {txHash ? (
              // Success State
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Send className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    Transaction Sent!
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Your transaction has been submitted to the network
                  </p>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                      {txHash}
                    </p>
                  </div>
                  <button
                    onClick={openExplorer}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                  >
                    View in Explorer →
                  </button>
                </div>
                <button
                  onClick={handleClose}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              // Form State
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    From
                  </label>
                  <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{wallet.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    To
                  </label>
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={wallet.type === 'EVM' ? '0x...' : 'Enter Solana address'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.0"
                      step="0.000001"
                      className="w-full px-3 py-2 pr-16 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400">
                      {isNativeToken ? network.symbol : (tokenSymbol || 'Token')}
                    </span>
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSend}
                    disabled={isLoading || !recipient || !amount}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}