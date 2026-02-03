/**
 * Action Confirmation Dialog
 * Shows action details and requests user approval before execution
 */

import * as Dialog from '@radix-ui/react-dialog'
import { PendingAction, RiskLevel } from '../../types'
import { AlertTriangle, Info, AlertCircle, Shield, X } from 'lucide-react'

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

  const getRiskColor = (risk: RiskLevel): string => {
    switch (risk) {
      case 'low':
        return 'text-green-500'
      case 'medium':
        return 'text-yellow-500'
      case 'high':
        return 'text-orange-500'
      case 'critical':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  const getRiskIcon = (risk: RiskLevel) => {
    switch (risk) {
      case 'low':
        return <Info className="h-5 w-5" />
      case 'medium':
        return <AlertCircle className="h-5 w-5" />
      case 'high':
        return <AlertTriangle className="h-5 w-5" />
      case 'critical':
        return <Shield className="h-5 w-5" />
      default:
        return <Info className="h-5 w-5" />
    }
  }

  const getRiskLabel = (risk: RiskLevel): string => {
    switch (risk) {
      case 'low':
        return 'Low Risk'
      case 'medium':
        return 'Medium Risk'
      case 'high':
        return 'High Risk'
      case 'critical':
        return 'Critical Risk'
      default:
        return 'Unknown Risk'
    }
  }

  const formatParameterValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen: boolean) => !isOpen && onReject()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-900 rounded-lg shadow-xl z-50 w-full max-w-[500px] p-6">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
              <span className={getRiskColor(action.riskLevel)}>
                {getRiskIcon(action.riskLevel)}
              </span>
              Confirm Action
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </Dialog.Close>
          </div>

          <Dialog.Description className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {action.description}
          </Dialog.Description>

          <div className="space-y-4">
            {/* Risk Level Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Risk Level:
              </span>
              <span
                className={`px-2 py-1 rounded text-xs font-semibold ${getRiskColor(action.riskLevel)} bg-opacity-10`}
              >
                {getRiskLabel(action.riskLevel)}
              </span>
            </div>

            {/* Action Details */}
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Action:
                </span>
                <p className="text-sm text-gray-900 dark:text-gray-100 font-mono mt-1">
                  {action.name}
                </p>
              </div>

              {/* Parameters */}
              {Object.keys(action.parameters).length > 0 && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Parameters:
                  </span>
                  <div className="mt-2 space-y-2">
                    {Object.entries(action.parameters).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">{key}:</span>
                        <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                          {formatParameterValue(value)}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category */}
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Category:
                </span>
                <p className="text-sm text-gray-900 dark:text-gray-100 capitalize mt-1">
                  {action.category.replace('_', ' ')}
                </p>
              </div>

              {/* Estimated Time */}
              {action.estimatedTime && (
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Estimated Time:
                  </span>
                  <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">
                    ~{Math.ceil(action.estimatedTime / 1000)} seconds
                  </p>
                </div>
              )}
            </div>

            {/* Warning for high-risk actions */}
            {(action.riskLevel === 'high' || action.riskLevel === 'critical') && (
              <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-900 dark:text-orange-200">
                  <p className="font-medium">High-Risk Action</p>
                  <p className="mt-1">
                    This action involves sensitive operations. Please verify all details carefully
                    before proceeding.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onReject}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                action.riskLevel === 'high' || action.riskLevel === 'critical'
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              Approve & Execute
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
