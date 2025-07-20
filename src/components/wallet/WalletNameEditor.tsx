/**
 * Code by Xipzer
 */

import { Edit2 } from 'lucide-react'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernButton,
} from '../ModernDialog'

interface WalletNameEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletNames: string[]
  addresses?: string[]
  onUpdateName: (index: number, name: string) => void
  onClose: () => void
  onBack: () => void
  subtitle?: string
  getLabel?: (index: number) => string
  width?: 'sm' | 'md' | 'lg'
}

import { formatAddress } from '../../utils/formatters'

export function WalletNameEditor({
  open,
  onOpenChange,
  walletNames,
  addresses,
  onUpdateName,
  onClose,
  onBack,
  subtitle = 'Customize names for your wallets',
  getLabel,
  width = 'md',
}: WalletNameEditorProps) {
  const label = getLabel || ((i: number) => `#${i + 1}`)

  return (
    <ModernDialog open={open} onOpenChange={onOpenChange} width={width}>
      <ModernDialogHeader
        icon={<Edit2 className="w-5 h-5 sm:w-6 sm:h-6" />}
        title="Edit Wallet Names"
        subtitle={subtitle}
        onClose={onClose}
      />

      <ModernDialogSection className="pb-4">
        <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
          {walletNames.map((name, index) => (
            <div key={index} className="flex items-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-text-tertiary w-10 sm:w-12 font-mono shrink-0">
                {label(index)}
              </span>
              <div className="flex-1">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => onUpdateName(index, e.target.value)}
                  className="w-full px-3 py-2 sm:py-2.5 text-sm bg-white/5 border border-white/10 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50 transition-all"
                  style={{ fontSize: '16px' }}
                />
              </div>
              {addresses?.[index] && (
                <span className="text-[10px] sm:text-xs text-text-tertiary font-mono shrink-0">
                  {formatAddress(addresses[index])}
                </span>
              )}
            </div>
          ))}
        </div>
      </ModernDialogSection>

      <ModernDialogActions>
        <ModernButton variant="secondary" fullWidth onClick={onBack}>
          Back
        </ModernButton>
        <ModernButton variant="primary" fullWidth onClick={onBack}>
          Confirm Names
        </ModernButton>
      </ModernDialogActions>
    </ModernDialog>
  )
}

interface WalletTypeConfigProps {
  title: string
  preGenerateEVM: boolean
  setPreGenerateEVM: (v: boolean) => void
  evmWalletCount: number
  setEvmWalletCount: (v: number) => void
  preGenerateSVM: boolean
  setPreGenerateSVM: (v: boolean) => void
  svmWalletCount: number
  setSvmWalletCount: (v: number) => void
  walletNames: string[]
  onEditNames: () => void
}

import { ModernToggle, ModernNumberInput } from '../ModernDialog'

export function WalletTypeConfig({
  title,
  preGenerateEVM,
  setPreGenerateEVM,
  evmWalletCount,
  setEvmWalletCount,
  preGenerateSVM,
  setPreGenerateSVM,
  svmWalletCount,
  setSvmWalletCount,
  walletNames,
  onEditNames,
}: WalletTypeConfigProps) {
  return (
    <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
      <h3 className="text-sm font-medium text-text-primary">{title}</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <ModernToggle
            checked={preGenerateEVM}
            onChange={setPreGenerateEVM}
            label="EVM Wallets"
            description="Ethereum, Base, Polygon, etc."
          />
          {preGenerateEVM && (
            <ModernNumberInput
              value={evmWalletCount}
              onChange={setEvmWalletCount}
              min={1}
              max={99}
            />
          )}
        </div>

        <div className="h-px bg-white/5" />

        <div className="flex items-center justify-between">
          <ModernToggle
            checked={preGenerateSVM}
            onChange={setPreGenerateSVM}
            label="SVM Wallets"
            description="Solana"
          />
          {preGenerateSVM && (
            <ModernNumberInput
              value={svmWalletCount}
              onChange={setSvmWalletCount}
              min={1}
              max={99}
            />
          )}
        </div>
      </div>

      {(preGenerateEVM || preGenerateSVM) && (
        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-text-tertiary">
            {walletNames.length > 0 ? 'Custom names configured' : 'Default names will be used'}
          </span>
          <ModernButton
            type="button"
            variant="ghost"
            size="sm"
            icon={<Edit2 className="w-3.5 h-3.5" />}
            onClick={onEditNames}
            disabled={!preGenerateEVM && !preGenerateSVM}
          >
            Edit Names
          </ModernButton>
        </div>
      )}
    </div>
  )
}