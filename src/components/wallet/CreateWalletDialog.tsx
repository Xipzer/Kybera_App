import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Tabs from '@radix-ui/react-tabs'
import { X, Copy, Eye, EyeOff } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { EVMWalletService } from '../../services/blockchain/evmWallet'
import { SVMWalletService } from '../../services/blockchain/svmWallet'
import { ChainType, Wallet } from '../../types'

interface CreateWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWalletDialog({ open, onOpenChange }: CreateWalletDialogProps) {
  const { addWallet, password } = useWalletStore()
  const [walletType, setWalletType] = useState<ChainType>('EVM')
  const [walletName, setWalletName] = useState('')
  const [generatedWallet, setGeneratedWallet] = useState<{
    address: string
    privateKey: string
    mnemonic: string
  } | null>(null)
  const [showMnemonic, setShowMnemonic] = useState(false)
  const [showPrivateKey, setShowPrivateKey] = useState(false)
  const [step, setStep] = useState<'create' | 'backup'>('create')

  const handleCreate = async () => {
    if (!walletName.trim()) return

    const walletData =
      walletType === 'EVM'
        ? await EVMWalletService.createWallet()
        : await SVMWalletService.createWallet()

    setGeneratedWallet(walletData)
    setStep('backup')
  }

  const handleConfirm = async () => {
    if (!generatedWallet || !password) return

    const encryptedPrivateKey =
      walletType === 'EVM'
        ? EVMWalletService.encryptPrivateKey(generatedWallet.privateKey, password)
        : SVMWalletService.encryptPrivateKey(generatedWallet.privateKey, password)

    const wallet: Wallet = {
      id: Date.now().toString(),
      name: walletName,
      address: generatedWallet.address,
      type: walletType,
      encryptedPrivateKey,
      createdAt: new Date(),
      isImported: false,
    }

    await addWallet(wallet)
    handleClose()
  }

  const handleClose = () => {
    setWalletName('')
    setGeneratedWallet(null)
    setStep('create')
    setShowMnemonic(false)
    setShowPrivateKey(false)
    onOpenChange(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[500px] max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {step === 'create' ? 'Create New Wallet' : 'Backup Your Wallet'}
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

            {step === 'create' ? (
              <>
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
                      placeholder="My Wallet"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleCreate}
                    disabled={!walletName.trim()}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Wallet
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    ⚠️ Important: Save your recovery phrase and private key in a secure location. You
                    will need them to recover your wallet.
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recovery Phrase
                    </label>
                    <button
                      onClick={() => setShowMnemonic(!showMnemonic)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {showMnemonic ? (
                        <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all">
                      {showMnemonic ? generatedWallet?.mnemonic : '••••• ••••• ••••• •••••'}
                    </div>
                    <button
                      onClick={() => copyToClipboard(generatedWallet?.mnemonic || '')}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Private Key
                    </label>
                    <button
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {showPrivateKey ? (
                        <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all">
                      {showPrivateKey
                        ? generatedWallet?.privateKey
                        : '•••••••••••••••••••••••••••••••••••••••••••••••••••••'}
                    </div>
                    <button
                      onClick={() => copyToClipboard(generatedWallet?.privateKey || '')}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Wallet Address
                  </label>
                  <div className="relative mt-2">
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm">
                      {generatedWallet?.address}
                    </div>
                    <button
                      onClick={() => copyToClipboard(generatedWallet?.address || '')}
                      className="absolute top-2 right-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleConfirm}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  I've Saved My Keys
                </button>
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}