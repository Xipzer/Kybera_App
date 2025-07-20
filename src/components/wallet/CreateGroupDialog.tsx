import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Users, AlertCircle } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { ChainType } from '../../types'

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { createWalletGroup, password } = useWalletStore()
  const [groupName, setGroupName] = useState('')
  const [chainType, setChainType] = useState<ChainType>('EVM')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdGroup, setCreatedGroup] = useState<{ name: string; seed: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || !password) return

    setIsLoading(true)
    setError('')

    try {
      const group = await createWalletGroup(groupName.trim(), chainType, password)
      // Get the seed phrase to show to user
      const seed = await useWalletStore.getState().exportGroupSeed(group.id, password)
      setCreatedGroup({ name: group.name, seed })
    } catch (err) {
      console.error('Failed to create wallet group:', err)
      setError(err instanceof Error ? err.message : 'Failed to create wallet group')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setGroupName('')
    setChainType('EVM')
    setError('')
    setCreatedGroup(null)
    onOpenChange(false)
  }

  const copySeedPhrase = () => {
    if (createdGroup) {
      navigator.clipboard.writeText(createdGroup.seed)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[600px] max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {createdGroup ? 'Wallet Group Created' : 'Create Wallet Group'}
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

            {!createdGroup ? (
              <>
                <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex gap-3">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-1">What is a Wallet Group?</p>
                      <p>A wallet group shares a single recovery phrase. You can create multiple wallets within a group, and they can all be recovered using the same seed phrase.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                      placeholder="e.g., Main Wallets, Trading Accounts"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
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
                      disabled={!groupName.trim() || isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    Wallet group "{createdGroup.name}" created successfully!
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Recovery Phrase
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Write down this recovery phrase and store it securely. You'll need it to recover all wallets in this group.
                  </p>
                  
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        <strong>Important:</strong> This is the only time you'll see this recovery phrase. Make sure to save it before closing this dialog.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all">
                    {createdGroup.seed}
                  </div>

                  <button
                    onClick={copySeedPhrase}
                    className="mt-3 w-full py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}