import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X, AlertCircle, Users, Edit2, ChevronLeft } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
// import { encryptData } from '../../utils/crypto'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import { ChainType } from '../../types'
import { useTheme } from '../../hooks/useTheme'

interface ImportGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportGroupDialog({ open, onOpenChange }: ImportGroupDialogProps) {
  const { walletGroups, password, importWalletGroup, exportGroupSeed } = useWalletStore()
  const { theme } = useTheme()
  const [groupName, setGroupName] = useState('')
  const [chainType, setChainType] = useState<ChainType>('EVM')
  const [seedPhrase, setSeedPhrase] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [preGenerateWallets, setPreGenerateWallets] = useState(false)
  const [walletCount, setWalletCount] = useState(1)
  const [showNameEditor, setShowNameEditor] = useState(false)
  const [walletNames, setWalletNames] = useState<string[]>([])

  const validateSeedPhrase = (phrase: string): boolean => {
    const words = phrase.trim().split(/\s+/)
    return words.length === 12 || words.length === 24
  }

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || !seedPhrase.trim() || !password) return

    if (!validateSeedPhrase(seedPhrase)) {
      setError('Invalid seed phrase. Must be 12 or 24 words.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Validate the seed phrase by trying to derive a wallet
      try {
        if (chainType === 'EVM') {
          await EVMWalletService.deriveWalletFromSeed(seedPhrase.trim(), 0)
        } else {
          await SVMWalletService.deriveWalletFromSeed(seedPhrase.trim(), 0)
        }
      } catch {
        setError('Invalid seed phrase for ' + chainType)
        setIsLoading(false)
        return
      }

      // Check if group already exists
      const existingSeed = seedPhrase.trim()
      for (const group of walletGroups) {
        if (group.id === 'default-imported') continue
        try {
          const groupSeed = await exportGroupSeed(group.id, password)
          if (groupSeed === existingSeed) {
            setError('This seed phrase is already imported')
            setIsLoading(false)
            return
          }
        } catch {
          // Ignore decryption errors
        }
      }

      // Import the group
      if (preGenerateWallets) {
        await importWalletGroup(groupName.trim(), chainType, seedPhrase.trim(), password, walletCount, walletNames.length > 0 ? walletNames : undefined)
      } else {
        await importWalletGroup(groupName.trim(), chainType, seedPhrase.trim(), password, 0)
      }
      handleClose()
    } catch (err) {
      console.error('Failed to import group:', err)
      setError('Failed to import wallet group')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setGroupName('')
    setChainType('EVM')
    setSeedPhrase('')
    setError('')
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className={`dialog-content w-[500px] max-h-[85vh] overflow-y-auto ${theme.styles.dialogContainer}`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {showNameEditor && (
                  <button
                    onClick={() => setShowNameEditor(false)}
                    className={theme.styles.buttonIcon}
                  >
                    <ChevronLeft className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                  </button>
                )}
                <Dialog.Title className={theme.styles.heading}>
                  {showNameEditor ? 'Edit Wallet Names' : 'Import Wallet Group'}
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

            <div className={theme.styles.info.container}>
              <div className="flex gap-3">
                <Users className={theme.styles.info.icon} />
                <div className={theme.styles.info.text}>
                  <p>Import an existing recovery phrase to restore all wallets associated with it. You can then derive new wallets from this group.</p>
                </div>
              </div>
            </div>

            {showNameEditor ? (
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
                    className={theme.styles.buttonSettings || theme.styles.buttonPrimary}
                    style={theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary}
                  >
                    Confirm Names
                  </button>
                </div>
              </div>
            ) : (
            <form onSubmit={handleImport} className="space-y-4">
              <Tabs.Root value={chainType} onValueChange={(v) => setChainType(v as ChainType)}>
                <Tabs.List className={`${theme.styles.tabs.list} mb-4`}>
                  <Tabs.Trigger
                    value="EVM"
                    className={theme.styles.tabs.trigger}
                  >
                    EVM (Ethereum, Base, BSC)
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="SVM"
                    className={theme.styles.tabs.trigger}
                  >
                    SVM (Solana)
                  </Tabs.Trigger>
                </Tabs.List>
              </Tabs.Root>

              <div>
                <label className={theme.styles.label}>
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g., My Restored Wallets"
                  className={theme.styles.input}
                  autoFocus
                />
              </div>

              <div>
                <label className={theme.styles.label}>
                  Recovery Phrase
                </label>
                <textarea
                  value={seedPhrase}
                  onChange={(e) => setSeedPhrase(e.target.value)}
                  placeholder="Enter your 12 or 24 word recovery phrase..."
                  rows={4}
                  className={`${theme.styles.textarea} font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent`}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="preGenerateWallets"
                    checked={preGenerateWallets}
                    onChange={(e) => setPreGenerateWallets(e.target.checked)}
                    className={theme.styles.checkbox}
                  />
                  <label htmlFor="preGenerateWallets" className={`text-sm font-medium ${theme.styles.textSecondary}`}>
                    Pre-Generate Wallets
                  </label>
                </div>

                <div className={`ml-6 space-y-2 transition-opacity ${preGenerateWallets ? 'opacity-100' : 'opacity-40'}`}>
                    <label className={`${theme.styles.label} ${!preGenerateWallets ? 'text-gray-500 dark:text-gray-500' : ''}`}>
                      Number of Wallets to Generate
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={walletCount}
                        onChange={(e) => setWalletCount(Math.max(1, Math.min(99, parseInt(e.target.value) || 1)))}
                        min="1"
                        max="99"
                        className="w-20 px-3 py-2 text-sm border rounded-lg bg-surface-elevated border-border-subtle text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={!preGenerateWallets}
                      />
                      <button
                        type="button"
                        onClick={handleEditNames}
                        className={`${theme.styles.buttonSecondary} flex items-center gap-1 text-sm ${!preGenerateWallets ? 'opacity-50 cursor-not-allowed' : ''}`}
                        style={theme.dynamicStyles.buttonSecondary}
                        disabled={!preGenerateWallets}
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit Names
                      </button>
                    </div>
                    <p className={`text-xs ${theme.styles.textTertiary}`}>
                      {walletNames.length > 0 ? 'Custom names configured' : 'Default names will be used'}
                    </p>
                  </div>
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
                  disabled={!groupName.trim() || !seedPhrase.trim() || isLoading}
                  className={`${theme.styles.buttonSettings || theme.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary}
                >
                  {isLoading ? 'Importing...' : 'Import Group'}
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