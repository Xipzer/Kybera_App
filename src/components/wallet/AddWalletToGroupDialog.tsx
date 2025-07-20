import React, { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { X, ChevronDown, Wallet } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'

interface AddWalletToGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: string
}

export function AddWalletToGroupDialog({ open, onOpenChange, groupId }: AddWalletToGroupDialogProps) {
  const { walletGroups, addWalletToGroup } = useWalletStore()
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [walletName, setWalletName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  // When dialog opens, set the selected group ID
  React.useEffect(() => {
    if (open && groupId) {
      setSelectedGroupId(groupId)
    }
  }, [open, groupId])
  
  // If groupId is provided, we know the type from that group
  // Otherwise, show all non-imported groups
  const targetGroup = groupId ? walletGroups.find(g => g.id === groupId) : null
  const compatibleGroups = groupId && targetGroup
    ? walletGroups.filter(g => g.id !== 'default-imported' && g.type === targetGroup.type)
    : walletGroups.filter(g => g.id !== 'default-imported')

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
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-surface-base rounded-lg shadow-2xl border border-border-subtle w-[500px]">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-text-primary">
                Add Wallet to Group
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  onClick={handleClose}
                  className="p-1 rounded hover:bg-surface-hover transition-colors"
                >
                  <X className="w-5 h-5 text-text-secondary" />
                </button>
              </Dialog.Close>
            </div>

            {compatibleGroups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary mb-4">
                  No {targetGroup ? targetGroup.type : 'wallet'} groups found.
                </p>
                <p className="text-sm text-text-tertiary">
                  Create a new {targetGroup ? targetGroup.type : ''} group first to add wallets.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {!groupId && (
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Select Group
                    </label>
                    <Select.Root value={selectedGroupId} onValueChange={setSelectedGroupId}>
                      <Select.Trigger className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface-elevated text-text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent flex items-center justify-between transition-colors">
                        <Select.Value placeholder="Choose a wallet group" />
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="bg-surface-base border border-border-subtle rounded-lg shadow-lg">
                          <Select.Viewport className="p-1">
                            {compatibleGroups.map((group) => (
                              <Select.Item
                                key={group.id}
                                value={group.id}
                                className="px-3 py-2 rounded hover:bg-surface-hover cursor-pointer outline-none text-text-primary"
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
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="e.g., Trading Wallet #1"
                  className="w-full px-3 py-2 border border-border-default rounded-lg bg-surface-elevated text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
                  autoFocus
                />
              </div>

              {error && (
                <div className="p-3 bg-accent/10 border border-accent/30 rounded-lg">
                  <p className="text-sm text-accent-400">{error}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 border border-border-default rounded-lg hover:bg-surface-hover transition-colors text-text-primary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedGroupId || !walletName.trim() || isLoading}
                  className="px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-lg hover:primary-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium flex items-center gap-2"
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