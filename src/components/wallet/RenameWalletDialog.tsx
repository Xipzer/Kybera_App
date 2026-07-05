/**
 * Code by Xipzer
 */

import { useState, useEffect } from 'react'
import { Pencil, Wallet } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { Wallet as WalletType } from '../../types'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernInput,
  ModernButton,
} from '../ModernDialog'

interface RenameWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletType | null
}

export function RenameWalletDialog({ open, onOpenChange, wallet }: RenameWalletDialogProps) {
  const { updateWallet } = useWalletStore()
  const [name, setName] = useState(wallet?.name || '')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && wallet) {
      setName(wallet.name)
    }
  }, [open, wallet])

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

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <ModernDialog open={open} onOpenChange={onOpenChange} width="md">
      <ModernDialogHeader
        icon={<Pencil className="w-5 h-5" />}
        title="Rename Wallet"
        subtitle={wallet?.name}
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit} id="rename-wallet-form">
        <ModernDialogSection className="space-y-4 pb-4">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="block text-xs sm:text-sm font-medium text-text-secondary">
              Current Wallet
            </label>
            <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent-500/10">
                  <Wallet className="w-4 h-4 text-accent-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xs sm:text-xs text-text-tertiary font-mono truncate">
                    {wallet?.address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <ModernInput
            label="New Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter new wallet name"
            autoFocus
          />
        </ModernDialogSection>

        <ModernDialogActions>
          <ModernButton variant="secondary" fullWidth onClick={handleClose} type="button">
            Cancel
          </ModernButton>
          <ModernButton
            variant="primary"
            fullWidth
            disabled={!name.trim() || name.trim() === wallet?.name}
            loading={isLoading}
            type="submit"
          >
            Save
          </ModernButton>
        </ModernDialogActions>
      </form>
    </ModernDialog>
  )
}