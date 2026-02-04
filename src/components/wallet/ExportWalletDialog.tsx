import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, AlertTriangle, Copy, Eye, EyeOff, Check, Key } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { useTheme } from '../../hooks/useTheme'
import { Wallet } from '../../types'

interface ExportWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: Wallet | null
}

export function ExportWalletDialog({ open, onOpenChange, wallet }: ExportWalletDialogProps) {
  const { getWalletPrivateKey } = useWalletStore()
  const { theme } = useTheme()
  const [password, setPassword] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || !wallet) return

    setIsLoading(true)
    setError('')

    try {
      const key = await getWalletPrivateKey(wallet.id, password)
      setPrivateKey(key)
    } catch (err) {
      console.error('Failed to export private key:', err)
      setError('Invalid password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setPrivateKey('')
    setError('')
    setShowPassword(false)
    setShowKey(false)
    setCopied(false)
    onOpenChange(false)
  }

  const copyPrivateKey = () => {
    navigator.clipboard.writeText(privateKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className={`dialog-content ${theme.styles.dialogContainer} w-[500px] max-h-[85vh] overflow-y-auto`}
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${theme.styles.wallet.titleIconBg}`}>
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <Dialog.Title className={theme.styles.heading}>Export Private Key</Dialog.Title>
                  <p className="text-sm text-text-secondary">{wallet?.name}</p>
                </div>
              </div>
              <Dialog.Close asChild>
                <button onClick={handleClose} className={theme.styles.buttonIcon}>
                  <X className={`w-5 h-5 ${theme.styles.iconSecondary}`} />
                </button>
              </Dialog.Close>
            </div>

            {!privateKey ? (
              <>
                {/* Warning Banner */}
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-red-400 mb-1">Danger Zone</p>
                      <p className="text-text-secondary">
                        Your private key provides full access to this wallet. Never share it with
                        anyone, never enter it on any website, and store it securely offline.
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleExport} className="space-y-4">
                  {/* Wallet Info Display */}
                  <div>
                    <label className={`${theme.styles.label} mb-2 block`}>Wallet</label>
                    <div className="p-3 bg-surface-elevated rounded-lg border border-border-subtle">
                      <p className="font-medium text-text-primary">{wallet?.name}</p>
                      <p className="text-xs text-text-tertiary font-mono mt-1">{wallet?.address}</p>
                    </div>
                  </div>

                  {/* Password field */}
                  <div>
                    <label className={`${theme.styles.label} mb-2 block`}>Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className={`${theme.styles.input} pr-10`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-surface-hover transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-text-secondary" />
                        ) : (
                          <Eye className="w-4 h-4 text-text-secondary" />
                        )}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className={theme.styles.error.container}>
                      <AlertTriangle className={theme.styles.error.icon} />
                      <p className={theme.styles.error.text}>{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-2.5 px-4 bg-surface-elevated border border-border-subtle rounded-lg font-medium text-text-secondary hover:bg-surface-hover transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!password || isLoading}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg font-medium text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {isLoading ? 'Exporting...' : 'Export'}
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
                    <p className="font-medium text-green-400">Private key exported successfully!</p>
                  </div>
                </div>

                {/* Private Key Display */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={theme.styles.label}>Private Key</label>
                    <button
                      onClick={() => setShowKey(!showKey)}
                      className="p-1 rounded hover:bg-surface-hover transition-colors"
                    >
                      {showKey ? (
                        <EyeOff className="w-4 h-4 text-text-secondary" />
                      ) : (
                        <Eye className="w-4 h-4 text-text-secondary" />
                      )}
                    </button>
                  </div>

                  <div className="p-4 bg-surface-elevated border border-border-subtle rounded-lg">
                    <p className="font-mono text-sm text-text-primary break-all">
                      {showKey ? privateKey : '•'.repeat(64)}
                    </p>
                  </div>

                  <button
                    onClick={copyPrivateKey}
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

                {/* Another Warning */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-xs text-amber-400">
                    Make sure to store this key securely. Clear your clipboard after pasting.
                  </p>
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
