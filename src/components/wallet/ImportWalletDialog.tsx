/**
 * Code by Xipzer
 */

import { useState } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import { AlertCircle, Download } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import { ChainType, Wallet } from '../../types'
import { getDefaultNetworkId } from '../../utils/networks'
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

interface ImportWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportWalletDialog({ open, onOpenChange }: ImportWalletDialogProps) {
  const { addWallet, password } = useWalletStore()
  const [walletType, setWalletType] = useState<ChainType>('EVM')
  const [importMethod, setImportMethod] = useState<'privateKey' | 'mnemonic'>('privateKey')
  const [walletName, setWalletName] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleImport = async () => {
    if (!walletName.trim() || !password) return

    setError('')
    setIsLoading(true)

    try {
      let address: string
      let finalPrivateKey: string

      if (importMethod === 'privateKey') {
        if (!privateKey.trim()) {
          setError('Private key is required')
          setIsLoading(false)
          return
        }

        if (walletType === 'EVM') {
          if (!EVMWalletService.isValidPrivateKey(privateKey)) {
            setError('Invalid private key')
            setIsLoading(false)
            return
          }
          const result = await EVMWalletService.importFromPrivateKey(privateKey)
          address = result.address
          finalPrivateKey = privateKey
        } else {
          if (!SVMWalletService.isValidPrivateKey(privateKey)) {
            setError('Invalid private key')
            setIsLoading(false)
            return
          }
          const result = await SVMWalletService.importFromPrivateKey(privateKey)
          address = result.address
          finalPrivateKey = privateKey
        }
      } else {
        if (!mnemonic.trim()) {
          setError('Mnemonic phrase is required')
          setIsLoading(false)
          return
        }

        if (walletType === 'EVM') {
          const result = await EVMWalletService.importFromMnemonic(mnemonic)
          address = result.address
          finalPrivateKey = result.privateKey
        } else {
          const result = await SVMWalletService.importFromMnemonic(mnemonic)
          address = result.address
          finalPrivateKey = result.privateKey
        }
      }

      const encryptedPrivateKey =
        walletType === 'EVM'
          ? await EVMWalletService.encryptPrivateKey(finalPrivateKey, password)
          : await SVMWalletService.encryptPrivateKey(finalPrivateKey, password)

      const wallet: Wallet = {
        id: Date.now().toString(),
        groupId: 'default-imported',
        name: walletName,
        address,
        type: walletType,
        derivationIndex: -1,
        createdAt: new Date(),
        encryptedPrivateKey,
        isImported: true,
        lastNetworkId: getDefaultNetworkId(walletType),
      }

      await addWallet(wallet)
      handleClose()
    } catch {
      setError('Failed to import wallet. Please check your input.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setWalletName('')
    setPrivateKey('')
    setMnemonic('')
    setError('')
    setIsLoading(false)
    onOpenChange(false)
  }

  return (
    <ModernDialog open={open} onOpenChange={onOpenChange} width="md">
      <ModernDialogHeader
        icon={<Download className="w-5 h-5" />}
        title="Import Wallet"
        subtitle="Import from private key or phrase"
        onClose={handleClose}
      />

      <ModernDialogSection className="space-y-4 pb-4">
        <Tabs.Root value={walletType} onValueChange={(v) => setWalletType(v as ChainType)}>
          <Tabs.List className="flex p-1 bg-white/5 rounded-xl border border-white/10">
            <Tabs.Trigger
              value="EVM"
              className="flex-1 py-2.5 text-sm font-medium rounded-lg text-text-secondary transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent-500 data-[state=active]:to-accent-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              EVM (Ethereum, Base)
            </Tabs.Trigger>
            <Tabs.Trigger
              value="SVM"
              className="flex-1 py-2.5 text-sm font-medium rounded-lg text-text-secondary transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent-500 data-[state=active]:to-accent-600 data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              SVM (Solana)
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs.Root>

        <ModernInput
          label="Wallet Name"
          placeholder="My Imported Wallet"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
          autoFocus
        />

        <Tabs.Root
          value={importMethod}
          onValueChange={(v) => setImportMethod(v as 'privateKey' | 'mnemonic')}
        >
          <Tabs.List className="flex border-b border-white/10 mb-4">
            <Tabs.Trigger
              value="privateKey"
              className="flex-1 py-2.5 text-sm font-medium text-text-secondary border-b-2 border-transparent transition-colors hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-accent-500"
            >
              Private Key
            </Tabs.Trigger>
            <Tabs.Trigger
              value="mnemonic"
              className="flex-1 py-2.5 text-sm font-medium text-text-secondary border-b-2 border-transparent transition-colors hover:text-text-primary data-[state=active]:text-accent-500 data-[state=active]:border-accent-500"
            >
              Recovery Phrase
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="privateKey">
            <ModernTextarea
              label="Private Key"
              placeholder="Enter your private key..."
              value={privateKey}
              onChange={(e) => setPrivateKey(e.target.value)}
              rows={3}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </Tabs.Content>

          <Tabs.Content value="mnemonic">
            <ModernTextarea
              label="Recovery Phrase"
              placeholder="Enter your 12 or 24 word recovery phrase..."
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              rows={3}
              spellCheck={false}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          </Tabs.Content>
        </Tabs.Root>

        {error && (
          <ModernAlert type="error" icon={<AlertCircle className="w-4 h-4" />}>
            {error}
          </ModernAlert>
        )}
      </ModernDialogSection>

      <ModernDialogActions>
        <ModernButton variant="secondary" fullWidth onClick={handleClose}>
          Cancel
        </ModernButton>
        <ModernButton
          variant="primary"
          fullWidth
          onClick={handleImport}
          loading={isLoading}
          disabled={!walletName.trim()}
        >
          Import Wallet
        </ModernButton>
      </ModernDialogActions>
    </ModernDialog>
  )
}
