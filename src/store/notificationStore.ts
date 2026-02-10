/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  Alert,
  AlertConfig,
  Notification,
  NotificationDeliveryConfig,
} from '../types/notifications'

const MAX_NOTIFICATIONS = 200

interface NotificationState {
  alerts: Alert[]
  notifications: Notification[]
  unreadCount: number
  deliveryConfig: NotificationDeliveryConfig
  isPolling: boolean

  addAlert: (config: AlertConfig, oneShot?: boolean) => string
  removeAlert: (id: string) => void
  toggleAlert: (id: string) => void
  triggerNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'status'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  dismissNotification: (id: string) => void
  clearAllNotifications: () => void
  setDeliveryConfig: (config: Partial<NotificationDeliveryConfig>) => void
  getUnreadCount: () => number
  setIsPolling: (polling: boolean) => void
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      alerts: [],
      notifications: [],
      unreadCount: 0,
      deliveryConfig: {
        inApp: true,
        browserPush: false,
      },
      isPolling: false,

      addAlert: (config: AlertConfig, oneShot: boolean = false): string => {
        const id = crypto.randomUUID()
        const alert: Alert = {
          id,
          config,
          enabled: true,
          createdAt: Date.now(),
          triggerCount: 0,
          oneShot,
        }
        set((state) => ({ alerts: [...state.alerts, alert] }))
        return id
      },

      removeAlert: (id: string) => {
        set((state) => ({
          alerts: state.alerts.filter((a) => a.id !== id),
        }))
      },

      toggleAlert: (id: string) => {
        set((state) => ({
          alerts: state.alerts.map((a) =>
            a.id === id ? { ...a, enabled: !a.enabled } : a,
          ),
        }))
      },

      triggerNotification: (
        notification: Omit<Notification, 'id' | 'createdAt' | 'status'>,
      ) => {
        const newNotification: Notification = {
          ...notification,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          status: 'unread',
        }

        set((state) => {
          const updated = [newNotification, ...state.notifications]
          const trimmed = updated.slice(0, MAX_NOTIFICATIONS)
          const unreadCount = trimmed.filter((n) => n.status === 'unread').length

          return {
            notifications: trimmed,
            unreadCount,
          }
        })

        if (notification.alertId) {
          set((state) => ({
            alerts: state.alerts.map((a) => {
              if (a.id !== notification.alertId) return a
              const updated = {
                ...a,
                lastTriggeredAt: Date.now(),
                triggerCount: a.triggerCount + 1,
              }
              if (a.oneShot) {
                updated.enabled = false
              }
              return updated
            }),
          }))
        }
      },

      markAsRead: (id: string) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, status: 'read' as const, readAt: Date.now() } : n,
          )
          const unreadCount = notifications.filter((n) => n.status === 'unread').length
          return { notifications, unreadCount }
        })
      },

      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.status === 'unread'
              ? { ...n, status: 'read' as const, readAt: Date.now() }
              : n,
          ),
          unreadCount: 0,
        }))
      },

      dismissNotification: (id: string) => {
        set((state) => {
          const notifications = state.notifications.map((n) =>
            n.id === id ? { ...n, status: 'dismissed' as const } : n,
          )
          const unreadCount = notifications.filter((n) => n.status === 'unread').length
          return { notifications, unreadCount }
        })
      },

      clearAllNotifications: () => {
        set({ notifications: [], unreadCount: 0 })
      },

      setDeliveryConfig: (config: Partial<NotificationDeliveryConfig>) => {
        set((state) => ({
          deliveryConfig: { ...state.deliveryConfig, ...config },
        }))
      },

      getUnreadCount: (): number => {
        return get().unreadCount
      },

      setIsPolling: (polling: boolean) => {
        set({ isPolling: polling })
      },
    }),
    {
      name: 'notification-store',
      partialize: (state) => ({
        alerts: state.alerts,
        notifications: state.notifications,
        unreadCount: state.unreadCount,
        deliveryConfig: state.deliveryConfig,
      }),
    },
  ),
)
