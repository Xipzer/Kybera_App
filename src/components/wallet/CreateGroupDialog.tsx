/**
 * Code by Xipzer
 */

import { useState } from 'react'
import { Users, AlertCircle, Check, Copy, Sparkles } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernAlert,
  ModernInput,
  ModernButton,
  SeedPhraseGrid,
} from '../ModernDialog'
import { WalletNameEditor, WalletTypeConfig } from './WalletNameEditor'

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { createWalletGroup, password, addWalletsToGroup } = useWalletStore()
  const [groupName, setGroupName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [createdGroup, setCreatedGroup] = useState<{
    id: string
    name: string
    seed: string
  } | null>(null)
  const [showNameEditor, setShowNameEditor] = useState(false)
  const [walletNames, setWalletNames] = useState<string[]>([])
  const [preGenerateEVM, setPreGenerateEVM] = useState(true)
  const [preGenerateSVM, setPreGenerateSVM] = useState(true)
  const [evmWalletCount, setEvmWalletCount] = useState(1)
  const [svmWalletCount, setSvmWalletCount] = useState(1)
  const { copied, copy: copyToClipboard } = useCopyToClipboard()
  const [showSeed, setShowSeed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!groupName.trim() || !password) return

    setIsLoading(true)
    setError('')

    try {
      const group = await createWalletGroup(groupName.trim(), password)
      const seed = await useWalletStore.getState().exportGroupSeed(group.id, password)

      const specs: { name: string; type: 'EVM' | 'SVM' }[] = []
      let walletIndex = 0

      if (preGenerateEVM) {
        for (let i = 0; i < evmWalletCount; i++) {
          specs.push({
            name: walletNames[walletIndex++] || `${groupName.trim()} - EVM #${i + 1}`,
            type: 'EVM',
          })
        }
      }
      if (preGenerateSVM) {
        for (let i = 0; i < svmWalletCount; i++) {
          specs.push({
            name: walletNames[walletIndex++] || `${groupName.trim()} - SVM #${i + 1}`,
            type: 'SVM',
          })
        }
      }

      if (specs.length > 0) await addWalletsToGroup(group.id, specs)

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
    setShowSeed(false)
    onOpenChange(false)
  }

  const handleEditNames = () => {
    const defaultNames: string[] = []
    if (preGenerateEVM) {
      for (let i = 0; i < evmWalletCount; i++) {
        defaultNames.push(`${groupName.trim() || 'Group'} - EVM #${i + 1}`)
      }
    }
    if (preGenerateSVM) {
      for (let i = 0; i < svmWalletCount; i++) {
        defaultNames.push(`${groupName.trim() || 'Group'} - SVM #${i + 1}`)
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

  if (createdGroup) {
    return (
      <ModernDialog open={open} onOpenChange={onOpenChange} width="lg">
        <ModernDialogHeader
          icon={<Check className="w-5 h-5 sm:w-6 sm:h-6" />}
          title="Wallet Group Created"
          subtitle={`"${createdGroup.name}" is ready to use`}
          onClose={handleClose}
        />

        <ModernDialogSection className="space-y-4 pb-4">
          <ModernAlert type="success" icon={<Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />}>
            Your wallet group has been created successfully. You can now manage multiple wallets
            with a single recovery phrase.
          </ModernAlert>

          <ModernAlert
            type="warning"
            title="Save Your Recovery Phrase"
            icon={<AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" />}
          >
            This is the only time you'll see this recovery phrase. Write it down and store it
            securely. You'll need it to recover all wallets in this group.
          </ModernAlert>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs sm:text-sm font-medium text-text-secondary">
                Recovery Phrase
              </label>
              <button
                onClick={() => setShowSeed(!showSeed)}
                className="text-xs text-accent hover:text-accent/80 transition-colors"
              >
                {showSeed ? 'Hide' : 'Reveal'}
              </button>
            </div>
            <SeedPhraseGrid words={createdGroup.seed.split(' ')} hidden={!showSeed} />

            <ModernButton
              variant="secondary"
              fullWidth
              icon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              onClick={() => copyToClipboard(createdGroup.seed)}
              className={copied ? 'text-green-400 border-green-400/30' : ''}
            >
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </ModernButton>
          </div>
        </ModernDialogSection>

        <ModernDialogActions>
          <ModernButton variant="primary" fullWidth onClick={handleClose}>
            Done
          </ModernButton>
        </ModernDialogActions>
      </ModernDialog>
    )
  }

  if (showNameEditor) {
    return (
      <WalletNameEditor
        open={open}
        onOpenChange={onOpenChange}
        walletNames={walletNames}
        onUpdateName={updateWalletName}
        onClose={handleClose}
        onBack={() => setShowNameEditor(false)}
        subtitle="Customize names for your new wallets"
        width="lg"
      />
    )
  }

  return (
    <ModernDialog open={open} onOpenChange={onOpenChange} width="lg">
      <ModernDialogHeader
        icon={<Users className="w-5 h-5 sm:w-6 sm:h-6" />}
        title="Create Wallet Group"
        subtitle="Generate a new recovery phrase"
        onClose={handleClose}
      />

      <form onSubmit={handleSubmit}>
        <ModernDialogSection className="space-y-4 sm:space-y-5 pb-4">
          <ModernAlert
            type="info"
            icon={<Users className="w-4 h-4 sm:w-5 sm:h-5" />}
            title="What is a Wallet Group?"
          >
            A wallet group shares a single recovery phrase. You can create multiple wallets within a
            group, and they can all be recovered using the same seed phrase.
          </ModernAlert>

          <ModernInput
            label="Group Name"
            placeholder="e.g., Main Wallets, Trading Accounts"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            autoFocus
          />

          <WalletTypeConfig
            title="Pre-generate Wallets"
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
            disabled={!groupName.trim()}
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </ModernButton>
        </ModernDialogActions>
      </form>
    </ModernDialog>
  )
}