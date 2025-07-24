import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import * as Tabs from '@radix-ui/react-tabs'
import { X, ChevronDown, Wallet, Users } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { ChainType } from '../../types'
import { useTheme } from '../../hooks/useTheme'

interface AddWalletToGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: string
}

export function AddWalletToGroupDialog({ open, onOpenChange, groupId }: AddWalletToGroupDialogProps) {
  const { walletGroups, wallets, addWalletToGroup } = useWalletStore()
  const { theme } = useTheme()
  const [selectedGroupId, setSelectedGroupId] = useState('')
  const [walletName, setWalletName] = useState('')
  const [walletType, setWalletType] = useState<ChainType>('EVM')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<typeof walletGroups[0] | null>(null)
  
  // When dialog opens, set the selected group ID and generate default name
  useEffect(() => {
    if (open) {
      const targetGroupId = groupId || selectedGroupId
      if (targetGroupId) {
        setSelectedGroupId(targetGroupId)
        const group = walletGroups.find(g => g.id === targetGroupId)
        if (group) {
          setSelectedGroup(group)
          // Generate default wallet name based on the next logical number
          const groupWallets = wallets.filter(w => w.groupId === targetGroupId)
          const walletTypeCount = walletType === 'EVM' 
            ? groupWallets.filter(w => w.type === 'EVM').length
            : groupWallets.filter(w => w.type === 'SVM').length
          setWalletName(`${group.name} - ${walletType} Wallet #${walletTypeCount + 1}`)
        }
      }
    }
  }, [open, groupId, selectedGroupId, walletGroups, wallets, walletType])
  
  // Show all non-imported groups
  const compatibleGroups = walletGroups.filter(g => g.id !== 'default-imported')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroupId || !walletName.trim()) return

    setIsLoading(true)
    setError('')

    try {
      await addWalletToGroup(selectedGroupId, walletName.trim(), walletType)
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
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content ${theme.styles.dialogContainer} w-[500px]`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className={theme.styles.heading}>
                Add Wallet
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  onClick={handleClose}
                  className={theme.styles.buttonIcon}
                >
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            {compatibleGroups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary mb-4">
                  No wallet groups found.
                </p>
                <p className="text-sm text-text-tertiary">
                  Create a new group first to add wallets.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Show which group the wallet is being added to */}
                {selectedGroup && (
                  <div>
                    <label className={`${theme.styles.label} mb-3 block`}>
                      Adding to Group
                    </label>
                    <div className={`w-full flex items-center gap-3 p-3 ${theme.styles.input}`}>
                      <Users className="w-4 h-4 text-text-secondary" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-text-primary">{selectedGroup.name}</p>
                        <p className="text-xs text-text-tertiary">
                          {(() => {
                            const evmCount = selectedGroup.evmWalletCount || 0
                            const svmCount = selectedGroup.svmWalletCount || 0
                            
                            if (evmCount > 0 && svmCount > 0) {
                              return `${evmCount} EVM, ${svmCount} SVM wallets`
                            } else if (evmCount > 0) {
                              return `${evmCount} EVM wallet${evmCount !== 1 ? 's' : ''}`
                            } else if (svmCount > 0) {
                              return `${svmCount} SVM wallet${svmCount !== 1 ? 's' : ''}`
                            } else {
                              return `No wallets yet`
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {!groupId && (
                  <div>
                    <label className={theme.styles.label}>
                      Select Group
                    </label>
                    <Select.Root value={selectedGroupId} onValueChange={(groupId) => {
                      setSelectedGroupId(groupId)
                      const group = walletGroups.find(g => g.id === groupId)
                      if (group) {
                        setSelectedGroup(group)
                        // Generate default wallet name based on the next logical number
                        const groupWallets = wallets.filter(w => w.groupId === groupId)
                        const walletTypeCount = walletType === 'EVM' 
                          ? groupWallets.filter(w => w.type === 'EVM').length
                          : groupWallets.filter(w => w.type === 'SVM').length
                        setWalletName(`${group.name} - ${walletType} Wallet #${walletTypeCount + 1}`)
                      }
                    }}>
                      <Select.Trigger className={`w-full ${theme.styles.input} flex items-center justify-between`}>
                        <Select.Value placeholder="Choose a wallet group" />
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className={theme.styles.dropdown?.content || 'bg-surface-base border border-border-subtle rounded-lg shadow-lg'}>
                          <Select.Viewport className="p-1">
                            {compatibleGroups.map((group) => (
                              <Select.Item
                                key={group.id}
                                value={group.id}
                                className={theme.styles.dropdown?.item || 'p-2 hover:bg-surface-hover outline-none'}
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

              {/* Wallet type selector using tabs */}
              <div>
                <label className={theme.styles.label}>
                  Wallet Type
                </label>
                <Tabs.Root value={walletType} onValueChange={(value) => {
                  const newType = value as ChainType
                  setWalletType(newType)
                  // Update default name when type changes
                  if (selectedGroup) {
                    const groupWallets = wallets.filter(w => w.groupId === selectedGroup.id)
                    const walletTypeCount = newType === 'EVM' 
                      ? groupWallets.filter(w => w.type === 'EVM').length
                      : groupWallets.filter(w => w.type === 'SVM').length
                    setWalletName(`${selectedGroup.name} - ${newType} Wallet #${walletTypeCount + 1}`)
                  }
                }}>
                  <Tabs.List className="grid grid-cols-2 gap-4 p-0">
                    <Tabs.Trigger
                      value="EVM"
                      className={`py-3 px-4 rounded-lg border transition-colors text-center font-medium ${
                        walletType === 'EVM'
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface-base border-border-default hover:border-border-hover text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      EVM
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="SVM"
                      className={`py-3 px-4 rounded-lg border transition-colors text-center font-medium ${
                        walletType === 'SVM'
                          ? 'bg-accent/10 border-accent text-accent'
                          : 'bg-surface-base border-border-default hover:border-border-hover text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      SVM
                    </Tabs.Trigger>
                  </Tabs.List>
                </Tabs.Root>
              </div>

              <div>
                <label className={theme.styles.label}>
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="e.g., Trading Wallet #1"
                  className={theme.styles.input}
                  autoFocus
                />
              </div>

              {error && (
                <div className={theme.styles.error.container}>
                  <p className={theme.styles.error.text}>{error}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className={theme.styles.buttonSecondary}
                  style={theme.dynamicStyles.buttonSecondary}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedGroupId || !walletName.trim() || isLoading}
                  className={`${theme.styles.buttonSettings || theme.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
                  style={theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary}
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