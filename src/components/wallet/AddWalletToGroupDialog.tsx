import React, { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import * as Tabs from '@radix-ui/react-tabs'
import { X, ChevronDown, Wallet, Users, Edit2, ChevronLeft, Plus } from 'lucide-react'
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
  const [addMultiple, setAddMultiple] = useState(false)
  const [walletCount, setWalletCount] = useState(1)
  const [walletNames, setWalletNames] = useState<string[]>([])
  const [showNameEditor, setShowNameEditor] = useState(false)
  
  // When dialog opens, set the selected group ID and generate default name
  useEffect(() => {
    if (open) {
      const targetGroupId = groupId || selectedGroupId
      if (targetGroupId) {
        setSelectedGroupId(targetGroupId)
        const group = walletGroups.find(g => g.id === targetGroupId)
        if (group) {
          setSelectedGroup(group)
          // Generate default wallet name based on the next logical number (only for single wallet mode)
          if (!addMultiple) {
            const groupWallets = wallets.filter(w => w.groupId === targetGroupId)
            const walletTypeCount = walletType === 'EVM' 
              ? groupWallets.filter(w => w.type === 'EVM').length
              : groupWallets.filter(w => w.type === 'SVM').length
            setWalletName(`${group.name} - ${walletType} Wallet #${walletTypeCount + 1}`)
          }
        }
      }
    }
  }, [open, groupId, selectedGroupId, walletGroups, wallets, walletType])
  
  // Show all non-imported groups
  const compatibleGroups = walletGroups.filter(g => g.id !== 'default-imported')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGroupId) return
    if (!addMultiple && !walletName.trim()) return

    setIsLoading(true)
    setError('')

    try {
      if (addMultiple) {
        // Add multiple wallets
        for (let i = 0; i < walletCount; i++) {
          const name = walletNames[i] || `${selectedGroup?.name || 'Wallet'} - ${walletType} Wallet #${i + 1}`
          await addWalletToGroup(selectedGroupId, name, walletType)
        }
      } else {
        // Add single wallet
        await addWalletToGroup(selectedGroupId, walletName.trim(), walletType)
      }
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
    setAddMultiple(false)
    setWalletCount(1)
    setWalletNames([])
    setShowNameEditor(false)
    onOpenChange(false)
  }

  const handleEditNames = () => {
    const defaultNames: string[] = []
    const groupWallets = wallets.filter(w => w.groupId === selectedGroupId)
    const existingTypeCount = walletType === 'EVM' 
      ? groupWallets.filter(w => w.type === 'EVM').length
      : groupWallets.filter(w => w.type === 'SVM').length
    
    for (let i = 0; i < walletCount; i++) {
      defaultNames.push(`${selectedGroup?.name || 'Wallet'} - ${walletType} Wallet #${existingTypeCount + i + 1}`)
    }
    
    setWalletNames(defaultNames)
    setShowNameEditor(true)
  }

  const updateWalletName = (index: number, name: string) => {
    const newNames = [...walletNames]
    newNames[index] = name
    setWalletNames(newNames)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content ${theme.styles.dialogContainer} w-[500px]`}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {showNameEditor ? (
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className={theme.styles.buttonIcon}
                  >
                    <ChevronLeft className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                  </button>
                ) : (
                  <div className={`p-2 rounded-lg ${theme.styles.wallet.titleIconBg}`}>
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <Dialog.Title className={theme.styles.heading}>
                    {showNameEditor
                      ? 'Edit Wallet Names'
                      : addMultiple
                        ? 'Add Multiple Wallets'
                        : 'Add Wallet'}
                  </Dialog.Title>
                  {!showNameEditor && selectedGroup && (
                    <p className="text-sm text-text-secondary">Derive new wallet from group</p>
                  )}
                </div>
              </div>
              <Dialog.Close asChild>
                <button onClick={handleClose} className={theme.styles.buttonIcon}>
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            {compatibleGroups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-text-secondary mb-4">No wallet groups found.</p>
                <p className="text-sm text-text-tertiary">
                  Create a new group first to add wallets.
                </p>
              </div>
            ) : showNameEditor ? (
              <div className="space-y-4">
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                  {walletNames.map((name, index) => {
                    const groupWallets = wallets.filter((w) => w.groupId === selectedGroupId)
                    const existingTypeCount =
                      walletType === 'EVM'
                        ? groupWallets.filter((w) => w.type === 'EVM').length
                        : groupWallets.filter((w) => w.type === 'SVM').length

                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className={`text-sm w-20 ${theme.styles.textTertiary}`}>
                          {walletType} #{existingTypeCount + index + 1}
                        </span>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => updateWalletName(index, e.target.value)}
                          className={`${theme.styles.input} focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent`}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-3 pt-4 border-t border-border-subtle">
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className="flex-1 py-2.5 px-4 bg-surface-elevated border border-border-subtle rounded-lg font-medium text-text-secondary hover:bg-surface-hover transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className={`flex-1 ${theme.styles.buttonSettings || theme.styles.buttonPrimary}`}
                    style={theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary}
                  >
                    Confirm Names
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Wallet type selector using tabs */}
                <Tabs.Root
                  value={walletType}
                  onValueChange={(value) => {
                    const newType = value as ChainType
                    setWalletType(newType)
                    // Update default name when type changes
                    if (selectedGroup && !addMultiple) {
                      const groupWallets = wallets.filter((w) => w.groupId === selectedGroup.id)
                      const walletTypeCount =
                        newType === 'EVM'
                          ? groupWallets.filter((w) => w.type === 'EVM').length
                          : groupWallets.filter((w) => w.type === 'SVM').length
                      setWalletName(
                        `${selectedGroup.name} - ${newType} Wallet #${walletTypeCount + 1}`,
                      )
                    }
                  }}
                >
                  <Tabs.List className="flex border-b border-border-subtle">
                    <Tabs.Trigger
                      value="EVM"
                      className="flex-1 py-2.5 text-sm font-medium text-text-secondary border-b-2 border-transparent transition-colors hover:text-text-primary data-[state=active]:text-accent data-[state=active]:border-accent"
                    >
                      EVM
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="SVM"
                      className="flex-1 py-2.5 text-sm font-medium text-text-secondary border-b-2 border-transparent transition-colors hover:text-text-primary data-[state=active]:text-accent data-[state=active]:border-accent"
                    >
                      SVM
                    </Tabs.Trigger>
                  </Tabs.List>
                </Tabs.Root>

                {/* Show which group the wallet is being added to */}
                {selectedGroup && (
                  <div>
                    <label className={`${theme.styles.label} mb-3 block`}>Adding to Group</label>
                    <div className={`w-full flex items-center gap-3 p-3 ${theme.styles.input}`}>
                      <Users className="w-4 h-4 text-text-secondary" />
                      <div className="text-left">
                        <p className="text-sm font-medium text-text-primary">
                          {selectedGroup.name}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {(() => {
                            const evmCount = selectedGroup.evmWalletCount || 0
                            const svmCount = selectedGroup.svmWalletCount || 0

                            if (evmCount > 0 && svmCount > 0) {
                              const totalCount = evmCount + svmCount
                              return `${totalCount} Wallet${totalCount !== 1 ? 's' : ''} • ${evmCount} EVM / ${svmCount} SVM`
                            } else if (evmCount > 0) {
                              return `${evmCount} EVM Wallet${evmCount !== 1 ? 's' : ''}`
                            } else if (svmCount > 0) {
                              return `${svmCount} SVM Wallet${svmCount !== 1 ? 's' : ''}`
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
                    <label className={theme.styles.label}>Select Group</label>
                    <Select.Root
                      value={selectedGroupId}
                      onValueChange={(groupId) => {
                        setSelectedGroupId(groupId)
                        const group = walletGroups.find((g) => g.id === groupId)
                        if (group) {
                          setSelectedGroup(group)
                          // Generate default wallet name based on the next logical number (only for single wallet mode)
                          if (!addMultiple) {
                            const groupWallets = wallets.filter((w) => w.groupId === groupId)
                            const walletTypeCount =
                              walletType === 'EVM'
                                ? groupWallets.filter((w) => w.type === 'EVM').length
                                : groupWallets.filter((w) => w.type === 'SVM').length
                            setWalletName(
                              `${group.name} - ${walletType} Wallet #${walletTypeCount + 1}`,
                            )
                          }
                        }
                      }}
                    >
                      <Select.Trigger
                        className={`w-full ${theme.styles.input} flex items-center justify-between`}
                      >
                        <Select.Value placeholder="Choose a wallet group" />
                        <ChevronDown className="w-4 h-4 text-text-secondary" />
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content
                          className={
                            theme.styles.dropdown?.content ||
                            'bg-surface-base border border-border-subtle rounded-lg shadow-lg'
                          }
                        >
                          <Select.Viewport className="p-1">
                            {compatibleGroups.map((group) => (
                              <Select.Item
                                key={group.id}
                                value={group.id}
                                className={
                                  theme.styles.dropdown?.item ||
                                  'p-2 hover:bg-surface-hover outline-none'
                                }
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

                {/* Add Multiple Toggle */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="addMultiple"
                    checked={addMultiple}
                    onChange={(e) => {
                      setAddMultiple(e.target.checked)
                      if (!e.target.checked) {
                        setWalletCount(1)
                        setWalletNames([])
                      }
                    }}
                    className={theme.styles.checkbox}
                  />
                  <label
                    htmlFor="addMultiple"
                    className={`text-sm font-medium ${theme.styles.textSecondary}`}
                  >
                    Add Multiple Wallets
                  </label>
                </div>

                {/* Separator */}
                <div className="border-t border-border-subtle" />

                {addMultiple ? (
                  <div className="space-y-3">
                    <div>
                      <label className={theme.styles.label}>Number of Wallets</label>
                      <input
                        type="number"
                        value={walletCount}
                        onChange={(e) =>
                          setWalletCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))
                        }
                        min="1"
                        max="10"
                        className="w-20 px-3 py-2 text-sm border rounded-lg bg-surface-elevated border-border-subtle text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleEditNames}
                      className={`${theme.styles.buttonSecondary} flex items-center gap-1 text-sm`}
                      style={theme.dynamicStyles.buttonSecondary}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Names
                    </button>
                    <p className={`text-xs ${theme.styles.textTertiary}`}>
                      {walletNames.length > 0
                        ? 'Custom names configured'
                        : 'Default names will be used'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className={theme.styles.label}>Wallet Name</label>
                    <input
                      type="text"
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      placeholder="e.g., Trading Wallet #1"
                      className={theme.styles.input}
                      autoFocus
                    />
                  </div>
                )}

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
                    disabled={!selectedGroupId || (!addMultiple && !walletName.trim()) || isLoading}
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
                        {addMultiple ? `Add ${walletCount} Wallets` : 'Add Wallet'}
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