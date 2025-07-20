/**
 * Code by Xipzer
 */

import { AlertTriangle, Copy, Eye, EyeOff, Check, Key, Wallet } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { Wallet as WalletType } from '../../types'
import { useExportSecret } from '../../hooks/useExportSecret'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernAlert,
  ModernInput,
  ModernButton,
} from '../ModernDialog'

interface ExportWalletDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  wallet: WalletType | null
}

export function ExportWalletDialog({ open, onOpenChange, wallet }: ExportWalletDialogProps) {
  const { getWalletPrivateKey } = useWalletStore()
  const {
    password,
    setPassword,
    secret,
    showPassword,
    setShowPassword,
    showSecret,
    setShowSecret,
    error,
    isLoading,
    copied,
    handleExport,
    handleClose,
    copySecret,
  } = useExportSecret({
    exportFn: (id, pw) => getWalletPrivateKey(id, pw),
    onClose: () => onOpenChange(false),
  })

  return (
    <ModernDialog open={open} onOpenChange={onOpenChange} width="md">
      <ModernDialogHeader
        icon={<Key className="w-5 h-5" />}
        title="Export Private Key"
        subtitle={wallet?.name}
        onClose={handleClose}
      />

      {!secret ? (
        <>
          <ModernDialogSection className="space-y-4 pb-4">
            <ModernAlert
              type="error"
              icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
              title="Danger Zone"
            >
              Your private key provides full access to this wallet. Never share it with anyone,
              never enter it on any website, and store it securely offline.
            </ModernAlert>

            <form
              onSubmit={(e) => wallet && handleExport(e, wallet.id)}
              className="space-y-4"
              id="export-wallet-form"
            >
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium text-text-secondary">
                  Wallet
                </label>
                <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-500/10">
                      <Wallet className="w-4 h-4 text-accent-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary text-sm sm:text-base">
                        {wallet?.name}
                      </p>
                      <p className="text-[10px] sm:text-xs text-text-tertiary font-mono truncate">
                        {wallet?.address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <ModernInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoFocus
                rightElement={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4 text-text-secondary" />
                    ) : (
                      <Eye className="w-4 h-4 text-text-secondary" />
                    )}
                  </button>
                }
              />

              {error && (
                <ModernAlert type="error" icon={<AlertTriangle className="w-4 h-4" />}>
                  {error}
                </ModernAlert>
              )}
            </form>
          </ModernDialogSection>

          <ModernDialogActions>
            <ModernButton variant="secondary" fullWidth onClick={handleClose}>
              Cancel
            </ModernButton>
            <ModernButton
              variant="danger"
              fullWidth
              disabled={!password}
              loading={isLoading}
              type="submit"
              form="export-wallet-form"
            >
              Export
            </ModernButton>
          </ModernDialogActions>
        </>
      ) : (
        <>
          <ModernDialogSection className="space-y-4 pb-4">
            <ModernAlert type="success" icon={<Check className="w-4 h-4 sm:w-5 sm:h-5" />}>
              Private key exported successfully!
            </ModernAlert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-medium text-text-secondary">
                  Private Key
                </label>
                <button
                  onClick={() => setShowSecret(!showSecret)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1.5 text-text-secondary hover:text-text-primary"
                >
                  {showSecret ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs">Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span className="text-xs">Show</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl">
                <p className="font-mono text-[10px] sm:text-sm text-text-primary break-all leading-relaxed">
                  {showSecret ? secret : '\u2022'.repeat(64)}
                </p>
              </div>

              <button
                onClick={copySecret}
                className="w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 bg-white/5 border border-white/10 rounded-xl font-medium text-sm text-text-secondary hover:bg-white/10 hover:text-text-primary hover:border-white/20 transition-all"
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

            <ModernAlert type="warning" icon={<AlertTriangle className="w-4 h-4" />}>
              Make sure to store this key securely. Clear your clipboard after pasting.
            </ModernAlert>
          </ModernDialogSection>

          <ModernDialogActions>
            <ModernButton variant="primary" fullWidth onClick={handleClose}>
              Done
            </ModernButton>
          </ModernDialogActions>
        </>
      )}
    </ModernDialog>
  )
}