import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertCircle, Copy, Eye, EyeOff } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { WalletGroup } from '../../types'

interface ExportGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: WalletGroup | null
}

export function ExportGroupDialog({ open, onOpenChange, group }: ExportGroupDialogProps) {
  const { exportGroupSeed } = useWalletStore()
  const [password, setPassword] = useState('')
  const [seedPhrase, setSeedPhrase] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSeed, setShowSeed] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !group) return

    setIsLoading(true)
    setError('')

    try {
      const seed = await exportGroupSeed(group.id, password)
      setSeedPhrase(seed)
    } catch (err) {
      console.error('Failed to export seed:', err)
      setError('Invalid password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setSeedPhrase('')
    setError('')
    setShowPassword(false)
    setShowSeed(false)
    onOpenChange(false)
  }

  const copySeedPhrase = () => {
    navigator.clipboard.writeText(seedPhrase)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] bg-white dark:bg-gray-900 rounded-lg shadow-lg w-[500px] max-h-[85vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Export Recovery Phrase
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

            {!seedPhrase ? (
              <>
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium mb-1">Security Warning</p>
                      <p>Anyone with access to this recovery phrase can access all wallets in this group. Keep it secure and never share it online.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleExport} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Group Name
                    </label>
                    <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{group?.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!password || isLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isLoading ? 'Exporting...' : 'Export'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-800 dark:text-green-200 font-medium">
                    Recovery phrase exported successfully!
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recovery Phrase
                    </label>
                    <button
                      onClick={() => setShowSeed(!showSeed)}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {showSeed ? (
                        <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm break-all">
                    {showSeed ? seedPhrase : '••••• ••••• ••••• •••••'}
                  </div>
                  <button
                    onClick={copySeedPhrase}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    Copy to Clipboard
                  </button>
                </div>

                <button
                  onClick={handleClose}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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