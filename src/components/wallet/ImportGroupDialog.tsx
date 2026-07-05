/**
 * Code by Xipzer
 */

import { useState } from 'react'
import { Download, AlertCircle, Users } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernAlert,
  ModernInput,
  ModernTextarea,
  ModernButton,
} from '../ModernDialog'
import { WalletNameEditor, WalletTypeConfig } from './WalletNameEditor'

interface ImportGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportGroupDialog({ open, onOpenChange }: ImportGroupDialogProps) {
  const { walletGroups, password, importWalletGroup, exportGroupSeed } = useWalletStore()
  const [groupName, setGroupName] = useState('')
  const [seedPhrase, setSeedPhrase] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showNameEditor, setShowNameEditor] = useState(false)
  const [walletNames, setWalletNames] = useState<string[]>([])
  const [preGenerateEVM, setPreGenerateEVM] = useState(true)
  const [preGenerateSVM, setPreGenerateSVM] = useState(true)
  const [evmWalletCount, setEvmWalletCount] = useState(1)
  const [svmWalletCount, setSvmWalletCount] = useState(1)
  const [previewAddresses, setPreviewAddresses] = useState<string[]>([])

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
      try {
        await EVMWalletService.deriveWalletFromSeed(seedPhrase.trim(), 0)
        await SVMWalletService.deriveWalletFromSeed(seedPhrase.trim(), 0)
      } catch {
        setError('Invalid seed phrase')
        setIsLoading(false)
        return
      }

      const existingSeed = seedPhrase.trim()
      for (const group of walletGroups) {
        if (group.id === 'default-imported') continue
        try {
          if ((await exportGroupSeed(group.id, password)) === existingSeed) {
            setError('This seed phrase is already imported')
            setIsLoading(false)
            return
          }
        } catch {
        }
      }

      await importWalletGroup(
        groupName.trim(),
        seedPhrase.trim(),
        password,
        walletNames.length > 0 ? walletNames : undefined,
        preGenerateEVM ? evmWalletCount : 0,
        preGenerateSVM ? svmWalletCount : 0,
      )
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
    setSeedPhrase('')
    setError('')
    setShowNameEditor(false)
    setWalletNames([])
    setPreviewAddresses([])
    setPreGenerateEVM(true)
    setPreGenerateSVM(true)
    setEvmWalletCount(1)
    setSvmWalletCount(1)
    onOpenChange(false)
  }

  const handleEditNames = async () => {
    const defaultNames: string[] = []
    const addresses: string[] = []
    const seed = seedPhrase.trim()

    if (preGenerateEVM) {
      for (let i = 0; i < evmWalletCount; i++) {
        defaultNames.push(`${groupName.trim() || 'Group'} - EVM #${i + 1}`)
        if (seed && validateSeedPhrase(seed)) {
          try {
            const w = await EVMWalletService.deriveWalletFromSeed(seed, i)
            addresses.push(w.address)
          } catch {
            addresses.push('')
          }
        } else {
          addresses.push('')
        }
      }
    }
    if (preGenerateSVM) {
      for (let i = 0; i < svmWalletCount; i++) {
        defaultNames.push(`${groupName.trim() || 'Group'} - SVM #${i + 1}`)
        if (seed && validateSeedPhrase(seed)) {
          try {
            const w = await SVMWalletService.deriveWalletFromSeed(seed, i)
            addresses.push(w.address)
          } catch {
            addresses.push('')
          }
        } else {
          addresses.push('')
        }
      }
    }
    setWalletNames(defaultNames)
    setPreviewAddresses(addresses)
    setShowNameEditor(true)
  }

  const updateWalletName = (index: number, name: string) => {
    const newNames = [...walletNames]
    newNames[index] = name
    setWalletNames(newNames)
  }

  if (showNameEditor) {
    return (
      <WalletNameEditor
        open={open}
        onOpenChange={onOpenChange}
        walletNames={walletNames}
        addresses={previewAddresses}
        onUpdateName={updateWalletName}
        onClose={handleClose}
        onBack={() => setShowNameEditor(false)}
        subtitle="Customize names for your imported wallets"
      />
    )
  }

  return (
    <ModernDialog open={open} onOpenChange={onOpenChange} width="md">
      <ModernDialogHeader
        icon={<Download className="w-5 h-5 sm:w-6 sm:h-6" />}
        title="Import Wallet Group"
        subtitle="Restore from recovery phrase"
        onClose={handleClose}
      />

      <form onSubmit={handleImport}>
        <ModernDialogSection className="space-y-4 sm:space-y-5 pb-4">
          <ModernAlert type="info" icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />}>
            Import an existing recovery phrase to restore all wallets associated with it. You can
            then derive new wallets from this group.
          </ModernAlert>

          <ModernInput
            label="Group Name"
            placeholder="e.g., My Restored Wallets"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoFocus
          />

          <ModernTextarea
            label="Recovery Phrase"
            placeholder="Enter your 12 or 24 word recovery phrase..."
            value={seedPhrase}
            onChange={(e) => setSeedPhrase(e.target.value)}
            rows={3}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />

          <WalletTypeConfig
            title="Derive Wallets"
            preGenerateEVM={preGenerateEVM}
            setPreGenerateEVM={setPreGenerateEVM}
            evmWalletCount={evmWalletCount}
            setEvmWalletCount={setEvmWalletCount}
            preGenerateSVM={preGenerateSVM}
            setPreGenerateSVM={setPreGenerateSVM}
            svmWalletCount={svmWalletCount}
            setSvmWalletCount={setSvmWalletCount}
            walletNames={walletNames}
            onEditNames={handleEditNames}
          />

          {error && (
            <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}>
              {error}
            </ModernAlert>
          )}
        </ModernDialogSection>

        <ModernDialogActions>
          <ModernButton type="button" variant="secondary" fullWidth onClick={handleClose}>
            Cancel
          </ModernButton>
          <ModernButton
            type="submit"
            variant="primary"
            fullWidth
            loading={isLoading}
            disabled={!groupName.trim() || !seedPhrase.trim()}
          >
            {isLoading ? 'Importing...' : 'Import Group'}
          </ModernButton>
        </ModernDialogActions>
      </form>
    </ModernDialog>
  )
}