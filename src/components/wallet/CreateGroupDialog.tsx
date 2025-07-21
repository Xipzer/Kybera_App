import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X, Users, AlertCircle, Edit2, ChevronLeft } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { ChainType } from '../../types'
import { useTheme } from '../../hooks/useTheme'

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { createWalletGroup, password, addWalletToGroup } = useWalletStore()
  const { theme } = useTheme()
  const [groupName, setGroupName] = useState('')
  const [chainType, setChainType] = useState<ChainType>('EVM')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdGroup, setCreatedGroup] = useState<{ id: string; name: string; seed: string } | null>(null)
  const [preGenerateWallets, setPreGenerateWallets] = useState(false)
  const [walletCount, setWalletCount] = useState(1)
  const [showNameEditor, setShowNameEditor] = useState(false)
  const [walletNames, setWalletNames] = useState<string[]>([])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || !password) return

    setIsLoading(true)
    setError('')

    try {
      const group = await createWalletGroup(groupName.trim(), chainType, password)
      // Get the seed phrase to show to user
      const seed = await useWalletStore.getState().exportGroupSeed(group.id, password)
      
      // Generate the specified number of wallets if enabled
      if (preGenerateWallets) {
        for (let i = 0; i < walletCount; i++) {
          const walletName = walletNames[i] || `${groupName.trim()} - Wallet #${i + 1}`
          await addWalletToGroup(group.id, walletName)
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
    setChainType('EVM')
    setError('')
    setCreatedGroup(null)
    setPreGenerateWallets(false)
    setWalletCount(1)
    setShowNameEditor(false)
    setWalletNames([])
    onOpenChange(false)
  }

  const handleEditNames = () => {
    const defaultNames = Array.from({ length: walletCount }, (_, i) => 
      `${groupName.trim() || 'Group'} - Wallet #${i + 1}`
    )
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
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
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
                <div className="flex gap-2 justify-end pt-4 border-t">
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className={theme.styles.buttonSecondary}
                    style={theme.dynamicStyles.buttonSecondary}
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className="px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
                    style={{
                      ...theme.dynamicStyles.buttonPrimary
                    }}
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
                  <Tabs.Root value={chainType} onValueChange={(v) => setChainType(v as ChainType)}>
                    <Tabs.List className={`${theme.styles.tabs.list} mb-4`}>
                      <Tabs.Trigger value="EVM" className={theme.styles.tabs.trigger}>
                        EVM (Ethereum, Base, BSC)
                      </Tabs.Trigger>
                      <Tabs.Trigger value="SVM" className={theme.styles.tabs.trigger}>
                        SVM (Solana)
                      </Tabs.Trigger>
                    </Tabs.List>
                  </Tabs.Root>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="preGenerateWallets"
                        checked={preGenerateWallets}
                        onChange={(e) => setPreGenerateWallets(e.target.checked)}
                        className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600 checked:bg-accent checked:border-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 dark:checked:bg-accent dark:focus:ring-offset-gray-900 transition-all duration-200"
                      />
                      <label htmlFor="preGenerateWallets" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Pre-Generate Wallets
                      </label>
                    </div>

                    {preGenerateWallets && (
                      <div className="ml-6 space-y-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Number of Wallets to Generate
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={walletCount}
                            onChange={(e) => setWalletCount(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                            min="1"
                            max="99"
                            className={`w-16 ${theme.styles.input} focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent`}
                          />
                          <button
                            type="button"
                            onClick={handleEditNames}
                            className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit Names
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {walletNames.length > 0 ? 'Custom names configured' : 'Default names will be used'}
                        </p>
                      </div>
                    )}
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