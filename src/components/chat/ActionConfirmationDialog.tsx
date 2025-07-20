/**
 * Code by Xipzer
 */

import { AlertTriangle, Info, AlertCircle, Shield, CheckCircle, Clock } from 'lucide-react'
import { PendingAction, RiskLevel } from '../../types'
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

export function ActionConfirmationDialog({
  action,
  open,
  onApprove,
  onReject,
}: ActionConfirmationDialogProps) {
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

  const formatParameterValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  const riskConfig = getRiskConfig(action.riskLevel)
  const isHighRisk = action.riskLevel === 'high' || action.riskLevel === 'critical'

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
              <div className="mt-2 space-y-2">
                {Object.entries(action.parameters).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-xs font-medium text-text-tertiary">{key}:</span>
                    <pre className="mt-1 text-[10px] sm:text-xs bg-surface-sunken p-2 sm:p-3 rounded-lg overflow-x-auto text-text-primary font-mono">
                      {formatParameterValue(value)}
                    </pre>
                  </div>
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
            type={action.riskLevel === 'critical' ? 'error' : 'warning'}
            icon={<AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />}
            title="High-Risk Action"
          >
            This action involves sensitive operations. Please verify all details carefully before
            proceeding.
          </ModernAlert>
        )}
      </ModernDialogSection>

      <ModernDialogActions>
        <ModernButton variant="secondary" fullWidth onClick={onReject}>
          Reject
        </ModernButton>
        <ModernButton variant={isHighRisk ? 'danger' : 'primary'} fullWidth onClick={onApprove}>
          Approve & Execute
        </ModernButton>
      </ModernDialogActions>
    </ModernDialog>
  )
}