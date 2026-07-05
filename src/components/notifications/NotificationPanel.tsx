/**
 * Code by Xipzer
 */

import { useMemo } from 'react'
import * as Tabs from '@radix-ui/react-tabs'
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  TrendingUp,
  Wallet,
  Search,
  Monitor,
  CircleDot,
  Copy,
  BarChart3,
} from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { useTheme } from '../../hooks/useTheme'
import { EmptyState } from '../common/EmptyState'
import { Notification, AlertType } from '../../types/notifications'
import { AlertManager } from './AlertManager'

interface NotificationPanelProps {
  compact?: boolean
}

const ALERT_TYPE_META: Record<AlertType, { icon: typeof Bell; label: string; color: string }> = {
  price_threshold: { icon: TrendingUp, label: 'Price Alert', color: 'text-green-400' },
  wallet_activity: { icon: Wallet, label: 'Wallet Activity', color: 'text-blue-400' },
  research_followup: { icon: Search, label: 'Research', color: 'text-purple-400' },
  system: { icon: Monitor, label: 'System', color: 'text-text-secondary' },
  copy_trade: { icon: Copy, label: 'Copy Trade', color: 'text-amber-400' },
  yield_change: { icon: BarChart3, label: 'Yield Change', color: 'text-cyan-400' },
}

function formatTimestamp(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDateGroup(ts: number): string {
  const now = new Date()
  const date = new Date(ts)
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'long' })
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function groupByDate(notifications: Notification[]): Map<string, Notification[]> {
  const groups = new Map<string, Notification[]>()
  for (const n of notifications) {
    const key = formatDateGroup(n.createdAt)
    const existing = groups.get(key)
    if (existing) {
      existing.push(n)
    } else {
      groups.set(key, [n])
    }
  }
  return groups
}

function NotificationItem({
  notification,
  onMarkRead,
  onDismiss,
}: {
  notification: Notification
  onMarkRead: (id: string) => void
  onDismiss: (id: string) => void
}) {
  const meta = ALERT_TYPE_META[notification.type]
  const Icon = meta.icon

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-200 group ${
        notification.status === 'unread'
          ? 'bg-accent-500/5 hover:bg-accent-500/10'
          : 'hover:bg-surface-hover'
      }`}
      onClick={() => notification.status === 'unread' && onMarkRead(notification.id)}
      role="button"
      tabIndex={0}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        notification.status === 'unread' ? 'bg-accent-500/15' : 'bg-surface-elevated'
      }`}>
        <Icon className={`w-4 h-4 ${notification.status === 'unread' ? meta.color : 'text-text-tertiary'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-tight ${
            notification.status === 'unread' ? 'text-text-primary' : 'text-text-secondary'
          }`}>
            {notification.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {notification.status === 'unread' && (
              <CircleDot className="w-2.5 h-2.5 text-accent-500 flex-shrink-0" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDismiss(notification.id) }}
              className="opacity-0 group-hover:opacity-100 [@media(pointer:coarse)]:opacity-100 p-1 rounded hover:bg-surface-hover transition-all duration-200"
            >
              <Trash2 className="w-3 h-3 text-text-tertiary hover:text-red-400" />
            </button>
          </div>
        </div>
        <p className={`text-xs mt-0.5 leading-relaxed ${
          notification.status === 'unread' ? 'text-text-secondary' : 'text-text-tertiary'
        }`}>
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-2xs ${meta.color}`}>{meta.label}</span>
          <span className="text-2xs text-text-tertiary">{formatTimestamp(notification.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

export function NotificationPanel({ compact }: NotificationPanelProps) {
  useTheme()
  const notifications = useNotificationStore((s) => s.notifications)
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const markAsRead = useNotificationStore((s) => s.markAsRead)
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead)
  const dismissNotification = useNotificationStore((s) => s.dismissNotification)
  const clearAllNotifications = useNotificationStore((s) => s.clearAllNotifications)

  const visibleNotifications = useMemo(
    () => notifications.filter((n) => n.status !== 'dismissed'),
    [notifications],
  )

  const grouped = useMemo(() => groupByDate(visibleNotifications), [visibleNotifications])

  return (
    <div className={`flex flex-col bg-surface-base ${compact ? 'max-h-[520px]' : 'h-full'}`}>
      <Tabs.Root defaultValue="notifications" className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <h3 className="text-base font-medium text-text-primary">Notifications</h3>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-2xs font-bold">
              {unreadCount} unread
            </span>
          )}
        </div>

        <Tabs.List className="flex gap-1 px-4 py-2 border-b border-border-subtle">
          <Tabs.Trigger
            value="notifications"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            Feed
          </Tabs.Trigger>
          <Tabs.Trigger
            value="alerts"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors"
          >
            <BellOff className="w-3.5 h-3.5" />
            Alerts
          </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="notifications" className="flex-1 overflow-y-auto min-h-0">
          {visibleNotifications.length > 0 && (
            <div className="flex items-center justify-end gap-2 px-4 pt-2 pb-1">
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1 px-2 py-1 text-2xs font-medium text-text-secondary hover:text-accent-500 rounded transition-colors"
              >
                <CheckCheck className="w-3 h-3" />
                Mark all read
              </button>
              <button
                onClick={clearAllNotifications}
                className="flex items-center gap-1 px-2 py-1 text-2xs font-medium text-text-secondary hover:text-red-400 rounded transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                Clear all
              </button>
            </div>
          )}

          {visibleNotifications.length === 0 ? (
            <EmptyState
              icon={Bell}
              title="No notifications"
              description="You're all caught up. Notifications from alerts and system events will appear here."
              className="py-12"
            />
          ) : (
            <div className="px-2 pb-3">
              {Array.from(grouped.entries()).map(([dateLabel, items]) => (
                <div key={dateLabel}>
                  <div className="px-2 py-2">
                    <span className="text-2xs font-semibold uppercase tracking-wider text-text-tertiary">
                      {dateLabel}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {items.map((n) => (
                      <NotificationItem
                        key={n.id}
                        notification={n}
                        onMarkRead={markAsRead}
                        onDismiss={dismissNotification}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Tabs.Content>

        <Tabs.Content value="alerts" className="flex-1 overflow-y-auto min-h-0">
          <AlertManager />
        </Tabs.Content>
      </Tabs.Root>
    </div>
  )
}
