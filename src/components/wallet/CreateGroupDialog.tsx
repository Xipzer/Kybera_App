import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Users, AlertCircle, Edit2, ChevronLeft } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useTheme } from '../../hooks/useTheme'

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { createWalletGroup, password, addWalletToGroup } = useWalletStore()
  const { theme } = useTheme()
  const [groupName, setGroupName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string; seed: string } | null>(null)
  const [showNameEditor, setShowNameEditor] = useState(false)
  const [walletNames, setWalletNames] = useState<string[]>([])
  // For MULTI wallet groups
  const [preGenerateEVM, setPreGenerateEVM] = useState(true)
  const [preGenerateSVM, setPreGenerateSVM] = useState(true)
  const [evmWalletCount, setEvmWalletCount] = useState(1)
  const [svmWalletCount, setSvmWalletCount] = useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || !password) return

    setIsLoading(true)
    setError('')

    try {
      const group = await createWalletGroup(groupName.trim(), password)
      // Get the seed phrase to show to user
      const seed = await useWalletStore.getState().exportGroupSeed(group.id, password)
      
      // Generate wallets based on user selection
      let walletIndex = 0
      
      if (preGenerateEVM) {
        for (let i = 0; i < evmWalletCount; i++) {
          const walletName = walletNames[walletIndex] || `${groupName.trim()} - EVM Wallet #${i + 1}`
          await addWalletToGroup(group.id, walletName, 'EVM')
          walletIndex++
        }
      }
      
      if (preGenerateSVM) {
        for (let i = 0; i < svmWalletCount; i++) {
          const walletName = walletNames[walletIndex] || `${groupName.trim()} - SVM Wallet #${i + 1}`
          await addWalletToGroup(group.id, walletName, 'SVM')
          walletIndex++
        }
      }
      
      setCreatedGroup({ id: group.id, name: group.name, seed })
    } catch (err) {
      console.error('Failed to create wallet group:', err)
      setError(err instanceof Error ? err.message : 'Failed to create wallet group')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setGroupName('')
    setError('')
    setCreatedGroup(null)
    setShowNameEditor(false)
    setWalletNames([])
    setPreGenerateEVM(true)
    setPreGenerateSVM(true)
    setEvmWalletCount(1)
    setSvmWalletCount(1)
    onOpenChange(false)
  }

  const handleEditNames = () => {
    let defaultNames: string[] = []
    
    // Generate names for both EVM and SVM wallets
    if (preGenerateEVM) {
      for (let i = 0; i < evmWalletCount; i++) {
        defaultNames.push(`${groupName.trim() || 'Group'} - EVM Wallet #${i + 1}`)
      }
    }
    if (preGenerateSVM) {
      for (let i = 0; i < svmWalletCount; i++) {
        defaultNames.push(`${groupName.trim() || 'Group'} - SVM Wallet #${i + 1}`)
      }
    }
    
    setWalletNames(defaultNames)
    setShowNameEditor(true)
  }

  const updateWalletName = (index: number, name: string) => {
    const newNames = [...walletNames]
    newNames[index] = name
    setWalletNames(newNames)
  }

  const copySeedPhrase = () => {
    if (createdGroup) {
      navigator.clipboard.writeText(createdGroup.seed)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content w-[600px] max-h-[85vh] overflow-y-auto ${theme.styles.dialogContainer}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {showNameEditor && !createdGroup && (
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className={theme.styles.buttonIcon}
                  >
                    <ChevronLeft className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                  </button>
                )}
                <Dialog.Title className={theme.styles.heading}>
                  {createdGroup ? 'Wallet Group Created' : showNameEditor ? 'Edit Wallet Names' : 'Create Wallet Group'}
                </Dialog.Title>
              </div>
              <Dialog.Close asChild>
                <button
                  onClick={handleClose}
                  className={theme.styles.buttonIcon}
                >
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            {!createdGroup && showNameEditor ? (
              <div className="space-y-4">
                <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                  {walletNames.map((name, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className={`text-sm w-8 ${theme.styles.textTertiary}`}>
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => updateWalletName(index, e.target.value)}
                        className={`${theme.styles.input} focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-4 border-t border-border-subtle">
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className={theme.styles.buttonSecondary}
                    style={theme.dynamicStyles.buttonSecondary}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className={theme.styles.buttonPrimary}
                    style={theme.dynamicStyles.buttonPrimary}
                  >
                    Confirm Names
                  </button>
                </div>
              </div>
            ) : !createdGroup ? (
              <>
                <div className={theme.styles.info.container}>
                  <div className="flex gap-3">
                    <Users className={theme.styles.info.icon} />
                    <div className={theme.styles.info.text}>
                      <p className="font-medium mb-1">What is a Wallet Group?</p>
                      <p>A wallet group shares a single recovery phrase. You can create multiple wallets within a group, and they can all be recovered using the same seed phrase.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                  <div>
                    <label className={theme.styles.label}>
                      Group Name
                    </label>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="e.g., Main Wallets, Trading Accounts"
                      className={`${theme.styles.input} focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent`}
                      autoFocus
                    />
                  </div>

                  <div className="space-y-4">
                    {/* EVM Wallets */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="preGenerateEVM"
                          checked={preGenerateEVM}
                          onChange={(e) => setPreGenerateEVM(e.target.checked)}
                          className={theme.styles.checkbox}
                        />
                        <label htmlFor="preGenerateEVM" className={`text-sm font-medium ${theme.styles.textSecondary}`}>
                          Pre-Generate EVM Wallets
                        </label>
                      </div>
                      <div className={`ml-6 space-y-2 transition-opacity ${preGenerateEVM ? 'opacity-100' : 'opacity-40'}`}>
                        <label className={`${theme.styles.label} ${!preGenerateEVM ? theme.styles.textTertiary : ''}`}>
                          Number of EVM Wallets
                        </label>
                        <input
                          type="number"
                          value={evmWalletCount}
                          onChange={(e) => setEvmWalletCount(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                          min="1"
                          max="99"
                          className="w-20 px-3 py-2 text-sm border rounded-lg bg-surface-elevated border-border-subtle text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!preGenerateEVM}
                        />
                      </div>
                    </div>

                    {/* SVM Wallets */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="preGenerateSVM"
                          checked={preGenerateSVM}
                          onChange={(e) => setPreGenerateSVM(e.target.checked)}
                          className={theme.styles.checkbox}
                        />
                        <label htmlFor="preGenerateSVM" className={`text-sm font-medium ${theme.styles.textSecondary}`}>
                          Pre-Generate SVM Wallets
                        </label>
                      </div>
                      <div className={`ml-6 space-y-2 transition-opacity ${preGenerateSVM ? 'opacity-100' : 'opacity-40'}`}>
                        <label className={`${theme.styles.label} ${!preGenerateSVM ? theme.styles.textTertiary : ''}`}>
                          Number of SVM Wallets
                        </label>
                        <input
                          type="number"
                          value={svmWalletCount}
                          onChange={(e) => setSvmWalletCount(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                          min="1"
                          max="99"
                          className="w-20 px-3 py-2 text-sm border rounded-lg bg-surface-elevated border-border-subtle text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!preGenerateSVM}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleEditNames}
                      className={`${theme.styles.buttonSecondary} flex items-center gap-1 text-sm ${(!preGenerateEVM && !preGenerateSVM) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={theme.dynamicStyles.buttonSecondary}
                      disabled={!preGenerateEVM && !preGenerateSVM}
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit Names
                    </button>
                    <p className={`text-xs ${theme.styles.textTertiary}`}>
                      {walletNames.length > 0 ? 'Custom names configured' : 'Default names will be used'}
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!groupName.trim() || isLoading}
                      className={`${theme.styles.buttonSettings || theme.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                      style={theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary}
                    >
                      {isLoading ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 font-medium">
                    Wallet group "{createdGroup.name}" created successfully!
                  </p>
                </div>

                <div>
                  <h3 className={`text-lg font-medium ${theme.styles.textPrimary} mb-2`}>
                    Recovery Phrase
                  </h3>
                  <p className={`text-sm ${theme.styles.textSecondary} mb-4`}>
                    Write down this recovery phrase and store it securely. You'll need it to recover all wallets in this group.
                  </p>
                  
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <p className="text-sm text-amber-600 dark:text-amber-400">
                        <strong>Important:</strong> This is the only time you'll see this recovery phrase. Make sure to save it before closing this dialog.
                      </p>
                    </div>
                  </div>

                  <div className={`p-4 bg-surface-elevated rounded-lg font-mono text-sm break-all ${theme.styles.textPrimary}`}>
                    {createdGroup.seed}
                  </div>

                  <button
                    onClick={copySeedPhrase}
                    className={`mt-3 w-full ${theme.styles.buttonSecondary}`}
                    style={theme.dynamicStyles.buttonSecondary}
                  >
                    Copy to Clipboard
                  </button>
                </div>

                <button
                  onClick={handleClose}
                  className={`w-full py-2 ${theme.styles.buttonSettings || theme.styles.buttonPrimary}`}
                  style={theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary}
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