/**
 * Code by Xipzer
 */

import { AlertTriangle, Copy, Eye, EyeOff, Check, Key, Shield } from 'lucide-react'
import { useWalletStore } from '../../store/walletStore'
import { WalletGroup } from '../../types'
import { useExportSecret } from '../../hooks/useExportSecret'
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

interface ExportGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  group: WalletGroup | null
}

export function ExportGroupDialog({ open, onOpenChange, group }: ExportGroupDialogProps) {
  const { exportGroupSeed } = useWalletStore()
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
    exportFn: (id, pw) => exportGroupSeed(id, pw),
    onClose: () => onOpenChange(false),
    open,
  })

  const seedWords = secret ? secret.split(' ') : Array(12).fill('')

  return (
    <ModernDialog
      open={open}
      onOpenChange={(o) => (o ? onOpenChange(o) : handleClose())}
      width="md"
    >
      <ModernDialogHeader
        icon={<Key className="w-5 h-5" />}
        title="Export Recovery Phrase"
        subtitle={group?.name}
        onClose={handleClose}
      />

      {!secret ? (
        <>
          <ModernDialogSection className="space-y-4 pb-4">
            <ModernAlert
              type="warning"
              icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
              title="Security Warning"
            >
              Anyone with access to this recovery phrase can access all wallets in this group. Keep
              it secure and never share it online.
            </ModernAlert>

            <form
              onSubmit={(e) => group && handleExport(e, group.id)}
              className="space-y-4"
              id="export-group-form"
            >
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-xs sm:text-sm font-medium text-text-secondary">
                  Group Name
                </label>
                <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent-500/10">
                      <Shield className="w-4 h-4 text-accent-500" />
                    </div>
                    <p className="font-medium text-text-primary text-sm sm:text-base">
                      {group?.name}
                    </p>
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
              variant="primary"
              fullWidth
              disabled={!password}
              loading={isLoading}
              type="submit"
              form="export-group-form"
            >
              Export
            </ModernButton>
          </ModernDialogActions>
        </>
      ) : (
        <>
          <ModernDialogSection className="space-y-4 pb-4">
            <ModernAlert type="success" icon={<Check className="w-4 h-4 sm:w-5 sm:h-5" />}>
              Recovery phrase exported successfully!
            </ModernAlert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-medium text-text-secondary">
                  Recovery Phrase
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

              <SeedPhraseGrid words={seedWords} hidden={!showSecret} />

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