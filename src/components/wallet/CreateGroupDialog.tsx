import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Users, AlertCircle, Edit2, ChevronLeft, Check, Copy } from 'lucide-react'
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
  const [copied, setCopied] = useState(false)

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
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className={`dialog-content w-[600px] max-h-[85vh] overflow-y-auto ${theme.styles.dialogContainer}`}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {showNameEditor && !createdGroup ? (
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className={theme.styles.buttonIcon}
                  >
                    <ChevronLeft className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                  </button>
                ) : (
                  <div className={`p-2 rounded-lg ${theme.styles.wallet.titleIconBg}`}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <Dialog.Title className={theme.styles.heading}>
                    {createdGroup
                      ? 'Wallet Group Created'
                      : showNameEditor
                        ? 'Edit Wallet Names'
                        : 'Create Wallet Group'}
                  </Dialog.Title>
                  {!createdGroup && !showNameEditor && (
                    <p className="text-sm text-text-secondary">Generate a new recovery phrase</p>
                  )}
                </div>
              </div>
              <Dialog.Close asChild>
                <button onClick={handleClose} className={theme.styles.buttonIcon}>
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
            ) : !createdGroup ? (
              <>
                <div className={theme.styles.info.container}>
                  <div className="flex gap-3">
                    <Users className={theme.styles.info.icon} />
                    <div className={theme.styles.info.text}>
                      <p className="font-medium mb-1">What is a Wallet Group?</p>
                      <p>
                        A wallet group shares a single recovery phrase. You can create multiple
                        wallets within a group, and they can all be recovered using the same seed
                        phrase.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className={theme.styles.label}>Group Name</label>
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
                        <label
                          htmlFor="preGenerateEVM"
                          className={`text-sm font-medium ${theme.styles.textSecondary}`}
                        >
                          Pre-Generate EVM Wallets
                        </label>
                      </div>
                      <div
                        className={`ml-6 space-y-2 transition-opacity ${preGenerateEVM ? 'opacity-100' : 'opacity-40'}`}
                      >
                        <label
                          className={`${theme.styles.label} ${!preGenerateEVM ? theme.styles.textTertiary : ''}`}
                        >
                          Number of EVM Wallets
                        </label>
                        <input
                          type="number"
                          value={evmWalletCount}
                          onChange={(e) =>
                            setEvmWalletCount(
                              Math.max(1, Math.min(99, parseInt(e.target.value) || 1)),
                            )
                          }
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
                        <label
                          htmlFor="preGenerateSVM"
                          className={`text-sm font-medium ${theme.styles.textSecondary}`}
                        >
                          Pre-Generate SVM Wallets
                        </label>
                      </div>
                      <div
                        className={`ml-6 space-y-2 transition-opacity ${preGenerateSVM ? 'opacity-100' : 'opacity-40'}`}
                      >
                        <label
                          className={`${theme.styles.label} ${!preGenerateSVM ? theme.styles.textTertiary : ''}`}
                        >
                          Number of SVM Wallets
                        </label>
                        <input
                          type="number"
                          value={svmWalletCount}
                          onChange={(e) =>
                            setSvmWalletCount(
                              Math.max(1, Math.min(99, parseInt(e.target.value) || 1)),
                            )
                          }
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
                      className={`${theme.styles.buttonSecondary} flex items-center gap-1 text-sm ${!preGenerateEVM && !preGenerateSVM ? 'opacity-50 cursor-not-allowed' : ''}`}
                      style={theme.dynamicStyles.buttonSecondary}
                      disabled={!preGenerateEVM && !preGenerateSVM}
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

                  {error && (
                    <div className={theme.styles.error.container}>
                      <AlertCircle className={theme.styles.error.icon} />
                      <p className={theme.styles.error.text}>{error}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!groupName.trim() || isLoading}
                      className={`${theme.styles.buttonSettings || theme.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                      style={
                        theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary
                      }
                    >
                      {isLoading ? 'Creating...' : 'Create Group'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                {/* Success Banner */}
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-400" />
                    <p className="font-medium text-green-400">
                      Wallet group "{createdGroup.name}" created successfully!
                    </p>
                  </div>
                </div>

                {/* Warning Banner */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-amber-400 mb-1">Save Your Recovery Phrase</p>
                      <p className="text-text-secondary">
                        This is the only time you'll see this recovery phrase. Write it down and
                        store it securely. You'll need it to recover all wallets in this group.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Seed Phrase Display */}
                <div>
                  <label className={`${theme.styles.label} mb-2 block`}>Recovery Phrase</label>
                  <div className="p-4 bg-surface-elevated border border-border-subtle rounded-lg">
                    <div className="grid grid-cols-3 gap-2">
                      {createdGroup.seed.split(' ').map((word, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 rounded-lg bg-surface-sunken border border-border-subtle"
                        >
                          <span className="text-xs text-text-tertiary w-5">{index + 1}.</span>
                          <span className="font-mono text-sm text-text-primary">{word}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={copySeedPhrase}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-surface-elevated border border-border-subtle rounded-lg font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </button>
                </div>

                <button
                  onClick={handleClose}
                  className={`w-full ${theme.styles.buttonSettings || theme.styles.buttonPrimary}`}
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