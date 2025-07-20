import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertCircle, Users } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
// import { encryptData } from '../../utils/crypto'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import { ChainType } from '../../types'

interface ImportGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportGroupDialog({ open, onOpenChange }: ImportGroupDialogProps) {
  const { walletGroups, password, importWalletGroup, exportGroupSeed } = useWalletStore()
  const [groupName, setGroupName] = useState('')
  const [chainType, setChainType] = useState<ChainType>('EVM')
  const [seedPhrase, setSeedPhrase] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateSeedPhrase = (phrase: string): boolean => {
    const words = phrase.trim().split(/\s+/)
    return words.length === 12 || words.length === 24
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || !seedPhrase.trim() || !password) return

    if (!validateSeedPhrase(seedPhrase)) {
      setError('Invalid seed phrase. Must be 12 or 24 words.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Validate the seed phrase by trying to derive a wallet
      try {
        if (chainType === 'EVM') {
          await EVMWalletService.deriveWalletFromSeed(seedPhrase.trim(), 0)
        } else {
          await SVMWalletService.deriveWalletFromSeed(seedPhrase.trim(), 0)
        }
      } catch {
        setError('Invalid seed phrase for ' + chainType)
        setIsLoading(false)
        return
      }

      // Check if group already exists
      const existingSeed = seedPhrase.trim()
      for (const group of walletGroups) {
        if (group.id === 'default-imported') continue
        try {
          const groupSeed = await exportGroupSeed(group.id, password)
          if (groupSeed === existingSeed) {
            setError('This seed phrase is already imported')
            setIsLoading(false)
            return
          }
        } catch {
          // Ignore decryption errors
        }
      }

      // Import the group
      await importWalletGroup(groupName.trim(), chainType, seedPhrase.trim(), password)
      handleClose()
    } catch (err) {
      console.error('Failed to import group:', err)
      setError('Failed to import wallet group')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setGroupName('')
    setChainType('EVM')
    setSeedPhrase('')
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[500px] max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Import Wallet Group
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

            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex gap-3">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p>Import an existing recovery phrase to restore all wallets associated with it. You can then derive new wallets from this group.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleImport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Chain Type
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChainType('EVM')}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                      chainType === 'EVM'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    EVM (Ethereum, Base, BSC)
                  </button>
                  <button
                    type="button"
                    onClick={() => setChainType('SVM')}
                    className={`flex-1 py-2 px-3 rounded-lg border transition-colors ${
                      chainType === 'SVM'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    SVM (Solana)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., My Restored Wallets"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Recovery Phrase
                </label>
                <textarea
                  value={seedPhrase}
                  onChange={(e) => setSeedPhrase(e.target.value)}
                  placeholder="Enter your 12 or 24 word recovery phrase..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!groupName.trim() || !seedPhrase.trim() || isLoading}
                  className="px-4 py-2 bg-gradient-secondary text-white rounded-lg hover:shadow-lg hover:secondary-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
                >
                  {isLoading ? 'Importing...' : 'Import Group'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}