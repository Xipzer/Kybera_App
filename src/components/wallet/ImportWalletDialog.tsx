import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X, AlertCircle } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import { ChainType, Wallet } from '../../types'

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
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[500px] max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Import Wallet
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  onClick={handleClose}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
              </Dialog.Close>
            </div>

            <Tabs.Root value={walletType} onValueChange={(v) => setWalletType(v as ChainType)}>
              <Tabs.List className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6">
                <Tabs.Trigger
                  value="EVM"
                  className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 text-gray-600 dark:text-gray-400"
                >
                  EVM (Ethereum, Base, BSC)
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="SVM"
                  className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 text-gray-600 dark:text-gray-400"
                >
                  SVM (Solana)
                </Tabs.Trigger>
              </Tabs.List>
            </Tabs.Root>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder="My Imported Wallet"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <Tabs.Root
                value={importMethod}
                onValueChange={(v) => setImportMethod(v as 'privateKey' | 'mnemonic')}
              >
                <Tabs.List className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-4">
                  <Tabs.Trigger
                    value="privateKey"
                    className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 text-gray-600 dark:text-gray-400"
                  >
                    Private Key
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    value="mnemonic"
                    className="flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-gray-900 dark:data-[state=active]:text-gray-100 text-gray-600 dark:text-gray-400"
                  >
                    Recovery Phrase
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="privateKey">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Private Key
                    </label>
                    <textarea
                      value={privateKey}
                      onChange={(e) => setPrivateKey(e.target.value)}
                      placeholder="Enter your private key..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </Tabs.Content>

                <Tabs.Content value="mnemonic">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Recovery Phrase
                    </label>
                    <textarea
                      value={mnemonic}
                      onChange={(e) => setMnemonic(e.target.value)}
                      placeholder="Enter your 12 or 24 word recovery phrase..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </Tabs.Content>
              </Tabs.Root>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleImport}
                disabled={!walletName.trim() || isLoading}
                className="w-full py-2 bg-gradient-secondary text-white rounded-lg hover:shadow-lg hover:secondary-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              >
                {isLoading ? 'Importing...' : 'Import Wallet'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}