import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { AlertCircle, X } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import { ChainType, Wallet } from '../../types'
import { useTheme } from '../../hooks/useTheme'

interface ImportWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportWalletDialog({ open, onOpenChange }: ImportWalletDialogProps) {
  const { addWallet, password } = useWalletStore()
  const { theme } = useTheme()
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
          return
        }

        if (walletType === 'EVM') {
          if (!EVMWalletService.isValidPrivateKey(privateKey)) {
            setError('Invalid private key')
            return
          }
          const result = await EVMWalletService.importFromPrivateKey(privateKey)
          address = result.address
          finalPrivateKey = privateKey
        } else {
          if (!SVMWalletService.isValidPrivateKey(privateKey)) {
            setError('Invalid private key')
            return
          }
          const result = await SVMWalletService.importFromPrivateKey(privateKey)
          address = result.address
          finalPrivateKey = privateKey
        }
      } else {
        if (!mnemonic.trim()) {
          setError('Mnemonic phrase is required')
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
          ? EVMWalletService.encryptPrivateKey(finalPrivateKey, password)
          : SVMWalletService.encryptPrivateKey(finalPrivateKey, password)

      const wallet: Wallet = {
        id: Date.now().toString(),
        groupId: 'default-imported',
        name: walletName,
        address,
        type: walletType,
        derivationIndex: -1, // -1 indicates imported wallet
        createdAt: new Date(),
        encryptedPrivateKey,
        isImported: true,
        lastNetworkId: walletType === 'EVM' ? 'ethereum' : 'solana-mainnet', // Set default network
      }

      await addWallet(wallet)
      handleClose()
    } catch (err) {
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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className={`dialog-content w-[500px] max-h-[85vh] overflow-y-auto ${theme.styles.dialogContainer}`}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className={theme.styles.heading}>Import Wallet</Dialog.Title>
              <Dialog.Close asChild>
                <button onClick={handleClose} className={theme.styles.buttonIcon}>
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            <Tabs.Root value={walletType} onValueChange={(v) => setWalletType(v as ChainType)}>
              <Tabs.List className={`${theme.styles.tabs.list} mb-6`}>
                <Tabs.Trigger value="EVM" className={theme.styles.tabs.trigger}>
                  EVM (Ethereum, Base, BSC)
                </Tabs.Trigger>
                <Tabs.Trigger value="SVM" className={theme.styles.tabs.trigger}>
                  SVM (Solana)
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>

            <div className="space-y-4">
              <div>
                <label className={theme.styles.label}>Wallet Name</label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="My Imported Wallet"
                  className={theme.styles.input}
                />
              </div>

              <Tabs.Root
                value={importMethod}
                onValueChange={(v) => setImportMethod(v as 'privateKey' | 'mnemonic')}
              >
                <Tabs.List className={`${theme.styles.tabs.list} mb-4`}>
                  <Tabs.Trigger value="privateKey" className={theme.styles.tabs.trigger}>
                    Private Key
                  </Tabs.Trigger>
                  <Tabs.Trigger value="mnemonic" className={theme.styles.tabs.trigger}>
                    Recovery Phrase
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="privateKey">
                  <div>
                    <label className={theme.styles.label}>Private Key</label>
                    <textarea
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="Enter your private key..."
                      rows={3}
                      className={`${theme.styles.textarea} font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent`}
                    />
                  </div>
                </Tabs.Content>

                <Tabs.Content value="mnemonic">
                  <div>
                    <label className={theme.styles.label}>Recovery Phrase</label>
                    <textarea
                      value={mnemonic}
                      onChange={(e) => setMnemonic(e.target.value)}
                      placeholder="Enter your 12 or 24 word recovery phrase..."
                      rows={3}
                      className={`${theme.styles.textarea} font-mono text-sm focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent`}
                    />
                  </div>
                </Tabs.Content>
              </Tabs.Root>

              {error && (
                <div className={theme.styles.error.container}>
                  <AlertCircle className={theme.styles.error.icon} />
                  <p className={theme.styles.error.text}>{error}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  disabled={!walletName.trim() || isLoading}
                  className={`${theme.styles.buttonSettings || theme.styles.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={theme.dynamicStyles.buttonSettings || theme.dynamicStyles.buttonPrimary}
                >
                  {isLoading ? 'Importing...' : 'Import Wallet'}
                </button>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}