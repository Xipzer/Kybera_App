/**
 * Code by Xipzer
 */

import {
  Bell,
  Trash2,
  TrendingUp,
  Wallet,
  Search,
  Monitor,
  Copy,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useState } from 'react'
import { useNotificationStore } from '../../store/notificationStore'
import { useTheme } from '../../hooks/useTheme'
import { EmptyState } from '../common/EmptyState'
import { ModernToggle } from '../ModernDialog'
import { Alert, AlertConfig, AlertType } from '../../types/notifications'

const ALERT_TYPE_META: Record<AlertType, { icon: typeof Bell; label: string; color: string }> = {
  price_threshold: { icon: TrendingUp, label: 'Price Alert', color: 'text-green-400' },
  wallet_activity: { icon: Wallet, label: 'Wallet Activity', color: 'text-blue-400' },
  research_followup: { icon: Search, label: 'Research Follow-up', color: 'text-purple-400' },
  system: { icon: Monitor, label: 'System', color: 'text-text-secondary' },
  copy_trade: { icon: Copy, label: 'Copy Trade', color: 'text-amber-400' },
  yield_change: { icon: BarChart3, label: 'Yield Change', color: 'text-cyan-400' },
}

function formatAlertDetails(config: AlertConfig): string {
  switch (config.type) {
    case 'price_threshold':
      return `${config.tokenSymbol} ${config.condition === 'above' ? '>' : config.condition === 'below' ? '<' : '~'} $${config.targetValue}`
    case 'wallet_activity':
      return `${config.walletLabel || config.walletAddress.slice(0, 8) + '...'} (${config.activityType})`
    case 'research_followup':
      return `${config.tokenSymbol} every ${config.checkInterval}h, ${config.priceChangeThreshold}% threshold`
    case 'system':
      return config.systemEvent
  }
}

function AlertItem({
  alert,
  onToggle,
  onDelete,
}: {
  alert: Alert
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = ALERT_TYPE_META[alert.config.type]
  const Icon = meta.icon
  const ExpandIcon = expanded ? ChevronUp : ChevronDown

  return (
    <div className={`rounded-xl border transition-all duration-200 ${
      alert.enabled
        ? 'border-border-subtle bg-surface-elevated/50'
        : 'border-border-subtle/50 bg-surface-base opacity-60'
    }`}>
      <div className="flex items-center gap-3 p-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          alert.enabled ? 'bg-accent-500/15' : 'bg-surface-elevated'
        }`}>
          <Icon className={`w-4 h-4 ${alert.enabled ? meta.color : 'text-text-tertiary'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${alert.enabled ? 'text-text-primary' : 'text-text-secondary'}`}>
              {meta.label}
            </span>
            {alert.oneShot && (
              <span className="px-1.5 py-0.5 text-2xs font-semibold uppercase tracking-wider rounded bg-amber-500/15 text-amber-400">
                one-shot
              </span>
            )}
          </div>
          <p className="text-xs text-text-tertiary mt-0.5 truncate">
            {formatAlertDetails(alert.config)}
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors"
          >
            <ExpandIcon className="w-3.5 h-3.5 text-text-tertiary" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-border-subtle/50 mt-0">
          <div className="pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-text-tertiary">Created</span>
                <p className="text-text-secondary mt-0.5">
                  {new Date(alert.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <span className="text-text-tertiary">Triggered</span>
                <p className="text-text-secondary mt-0.5">
                  {alert.triggerCount > 0
                    ? `${alert.triggerCount}x (last ${alert.lastTriggeredAt ? new Date(alert.lastTriggeredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'n/a'})`
                    : 'Never'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <ModernToggle
                checked={alert.enabled}
                onChange={() => onToggle(alert.id)}
                label="Enabled"
              />
              <button
                onClick={() => onDelete(alert.id)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function AlertManager() {
  useTheme()
  const alerts = useNotificationStore((s) => s.alerts)
  const toggleAlert = useNotificationStore((s) => s.toggleAlert)
  const removeAlert = useNotificationStore((s) => s.removeAlert)

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No active alerts"
        description="Alerts you create from research cards or wallet monitoring will appear here."
        className="py-12"
      />
    )
  }

  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="text-xs font-medium text-text-secondary">
          {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
        </span>
        <span className="text-2xs text-text-tertiary">
          {alerts.filter((a) => a.enabled).length} active
        </span>
      </div>
      {alerts.map((alert) => (
        <AlertItem
          key={alert.id}
          alert={alert}
          onToggle={toggleAlert}
          onDelete={removeAlert}
        />
      ))}
    </div>
  )
}
