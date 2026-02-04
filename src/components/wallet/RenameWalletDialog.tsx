import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Pencil, X } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useTheme } from '../../hooks/useTheme'
import { Wallet } from '../../types'

interface RenameWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null
}

export function RenameWalletDialog({ open, onOpenChange, wallet }: RenameWalletDialogProps) {
  const { updateWallet } = useWalletStore()
  const { theme } = useTheme()
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
        <Dialog.Content className={`dialog-content ${theme.styles.dialogContainer} w-[400px]`}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${theme.styles.wallet.titleIconBg}`}>
                  <Pencil className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Dialog.Title className={theme.styles.heading}>Rename Wallet</Dialog.Title>
                  <p className="text-sm text-text-secondary">{wallet?.name}</p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button className={theme.styles.buttonIcon}>
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={theme.styles.label}>Wallet Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter wallet name"
                  className={theme.styles.input}
                  autoFocus
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className={theme.styles.buttonSecondary}
                  style={theme.dynamicStyles.buttonSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!name.trim() || isLoading}
                  className={`${theme.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={theme.dynamicStyles.buttonPrimary}
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
