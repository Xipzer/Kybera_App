import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { X, ChevronDown, Wallet } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
// import { ChainType } from '../../types' - No longer needed

interface AddWalletToGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: string
}

export function AddWalletToGroupDialog({ open, onOpenChange, groupId }: AddWalletToGroupDialogProps) {
  const { walletGroups, addWalletToGroup, activeNetwork } = useWalletStore()
  const [selectedGroupId, setSelectedGroupId] = useState(groupId || '')
  const [walletName, setWalletName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const compatibleGroups = walletGroups.filter(g => g.id !== 'default-imported' && g.type === activeNetwork.type)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroupId || !walletName.trim()) return

    setIsLoading(true)
    setError('')

    try {
      await addWalletToGroup(selectedGroupId, walletName.trim())
      handleClose()
    } catch (err) {
      console.error('Failed to add wallet to group:', err)
      setError(err instanceof Error ? err.message : 'Failed to add wallet')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setWalletName('')
    setSelectedGroupId(groupId || '')
    setError('')
    onOpenChange(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[500px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Add Wallet to Group
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

            {compatibleGroups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No {activeNetwork.type} wallet groups found.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Create a new {activeNetwork.type} group first to add wallets.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!groupId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Group
                    </label>
                    <Select.Root value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <Select.Trigger className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between">
                        <Select.Value placeholder="Choose a wallet group" />
                        <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg shadow-lg">
                          <Select.Viewport className="p-1">
                            {compatibleGroups.map((group) => (
                              <Select.Item
                                key={group.id}
                                value={group.id}
                                className="px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer outline-none"
                              >
                                <Select.ItemText>{group.name}</Select.ItemText>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="e.g., Trading Wallet #1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
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
                  disabled={!selectedGroupId || !walletName.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4" />
                      Add Wallet
                    </>
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}