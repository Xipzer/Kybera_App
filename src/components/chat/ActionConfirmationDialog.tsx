/**
 * Code by Xipzer
 */

import { useState } from 'react'
import { AlertTriangle, Info, AlertCircle, Shield, CheckCircle, Clock, Copy } from 'lucide-react'
import { PendingAction, RiskLevel } from '../../types'
import { formatAddress } from '../../utils/formatters'
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard'
import {
  ModernDialog,
  ModernDialogHeader,
  ModernDialogSection,
  ModernDialogActions,
  ModernAlert,
  ModernButton,
} from '../ModernDialog'

interface ActionConfirmationDialogProps {
  action: PendingAction | null
  open: boolean
  onApprove: () => void
  onReject: () => void
}

const ADDRESS_KEYS = new Set(['to', 'recipient', 'address', 'from', 'destination', 'spender'])
const AMOUNT_KEYS = new Set(['amount', 'value', 'quantity'])

function looksLikeAddress(v: string): boolean {
  return /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44})$/.test(v)
}

function ParameterRow({ paramKey, value }: { paramKey: string; value: unknown }) {
  const { copied, copy } = useCopyToClipboard()
  const label = paramKey.replace(/_/g, ' ')
  const lower = paramKey.toLowerCase()

  if (typeof value === 'object' && value !== null) {
    return (
      <div>
        <span className="text-xs font-medium text-text-tertiary capitalize">{label}:</span>
        <pre className="mt-1 text-2xs sm:text-xs bg-surface-sunken p-2 sm:p-3 rounded-lg overflow-x-auto text-text-primary font-mono">
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    )
  }

  const str = String(value)
  const isAddress = ADDRESS_KEYS.has(lower) || looksLikeAddress(str)

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-text-tertiary capitalize">{label}</span>
      {isAddress ? (
        <button
          type="button"
          onClick={() => copy(str)}
          className="flex items-center gap-1.5 font-mono text-xs sm:text-sm text-text-primary hover:text-accent-400 transition-colors"
          aria-label={`Copy ${label}`}
          title={str}
        >
          <span>{formatAddress(str, 8, 6)}</span>
          <Copy className={`w-3.5 h-3.5 ${copied ? 'text-green-400' : 'text-text-tertiary'}`} />
        </button>
      ) : (
        <span
          className={`text-xs sm:text-sm text-text-primary text-right ${AMOUNT_KEYS.has(lower) ? 'font-semibold' : ''}`}
        >
          {str}
        </span>
      )}
    </div>
  )
}

export function ActionConfirmationDialog({
  action,
  open,
  onApprove,
  onReject,
}: ActionConfirmationDialogProps) {
  const [confirmText, setConfirmText] = useState('')
  if (!action) return null

  const getRiskConfig = (risk: RiskLevel) => {
    switch (risk) {
      case 'low':
        return {
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/20',
          icon: <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />,
          label: 'Low Risk',
        }
      case 'medium':
        return {
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/20',
          icon: <Info className="w-4 h-4 sm:w-5 sm:h-5" />,
          label: 'Medium Risk',
        }
      case 'high':
        return {
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/20',
          icon: <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />,
          label: 'High Risk',
        }
      case 'critical':
        return {
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/20',
          icon: <Shield className="w-4 h-4 sm:w-5 sm:h-5" />,
          label: 'Critical Risk',
        }
      default:
        return {
          color: 'text-text-secondary',
          bgColor: 'bg-white/5',
          borderColor: 'border-white/10',
          icon: <Info className="w-4 h-4 sm:w-5 sm:h-5" />,
          label: 'Unknown Risk',
        }
    }
  }

  const riskConfig = getRiskConfig(action.riskLevel)
  const isHighRisk = action.riskLevel === 'high' || action.riskLevel === 'critical'
  const isCritical = action.riskLevel === 'critical'

  return (
    <ModernDialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onReject()} width="md">
      <ModernDialogHeader
        icon={<AlertCircle className="w-5 h-5" />}
        title="Confirm Action"
        subtitle={action.description}
        onClose={onReject}
      />

      <ModernDialogSection className="space-y-4 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-medium text-text-secondary">Risk Level:</span>
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${riskConfig.bgColor} border ${riskConfig.borderColor}`}
          >
            <span className={riskConfig.color}>{riskConfig.icon}</span>
            <span className={`text-xs font-semibold ${riskConfig.color}`}>{riskConfig.label}</span>
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
          <div>
            <span className="text-xs sm:text-sm font-medium text-text-secondary">Action:</span>
            <p className="text-sm sm:text-base text-text-primary font-mono mt-1 px-3 py-2 bg-surface-sunken rounded-lg">
              {action.name}
            </p>
          </div>

          {Object.keys(action.parameters).length > 0 && (
            <div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">
                Parameters:
              </span>
              <div className="mt-2 space-y-2.5">
                {Object.entries(action.parameters).map(([key, value]) => (
                  <ParameterRow key={key} paramKey={key} value={value} />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-xs sm:text-sm font-medium text-text-secondary">Category:</span>
              <p className="text-xs sm:text-sm text-text-primary capitalize mt-1">
                {action.category.replace('_', ' ')}
              </p>
            </div>

            {action.estimatedTime && (
              <div>
                <span className="text-xs sm:text-sm font-medium text-text-secondary">
                  Est. Time:
                </span>
                <p className="text-xs sm:text-sm text-text-primary mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-text-tertiary" />~
                  {Math.ceil(action.estimatedTime / 1000)}s
                </p>
              </div>
            )}
          </div>
        </div>

        {isHighRisk && (
          <ModernAlert
            type={isCritical ? 'error' : 'warning'}
            icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
            title={isCritical ? 'Critical Action' : 'High-Risk Action'}
          >
            This action involves sensitive operations. Please verify all details carefully before
            proceeding.
          </ModernAlert>
        )}

        {isCritical && (
          <div className="space-y-1.5">
            <label htmlFor="confirm-critical" className="block text-xs font-medium text-text-secondary">
              Type <span className="font-mono font-semibold text-red-400">CONFIRM</span> to proceed
            </label>
            <input
              id="confirm-critical"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="CONFIRM"
              className="w-full px-3 py-2 rounded-lg bg-surface-sunken border border-white/10 text-sm font-mono text-text-primary placeholder:text-text-tertiary focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:outline-none"
            />
          </div>
        )}
      </ModernDialogSection>

      <ModernDialogActions>
        <ModernButton variant="secondary" fullWidth onClick={onReject}>
          Reject
        </ModernButton>
        <ModernButton
          variant={isHighRisk ? 'danger' : 'primary'}
          fullWidth
          disabled={isCritical && confirmText.trim().toUpperCase() !== 'CONFIRM'}
          onClick={onApprove}
        >
          Approve &amp; Execute
        </ModernButton>
      </ModernDialogActions>
    </ModernDialog>
  )
}