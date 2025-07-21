import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { Wallet } from '../../types'

interface RenameWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null
}

export function RenameWalletDialog({ open, onOpenChange, wallet }: RenameWalletDialogProps) {
  const { updateWallet } = useWalletStore()
  const [name, setName] = useState(wallet?.name || '')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet || !name.trim()) return

    setIsLoading(true)
    try {
      await updateWallet(wallet.id, { name: name.trim() })
      onOpenChange(false)
    } catch (error) {
      console.error('Failed to rename wallet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (open && wallet) {
      setName(wallet.name)
    }
    onOpenChange(open)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[400px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Rename Wallet
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter wallet name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || isLoading}
                  className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg hover:primary-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}