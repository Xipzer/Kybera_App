/**
 * Code by Xipzer
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useNotificationStore } from '../store/notificationStore'

beforeEach(() => {
  useNotificationStore.setState({
    alerts: [],
    notifications: [],
    unreadCount: 0,
    deliveryConfig: { inApp: true, browserPush: false },
    isPolling: false,
  })
})

describe('notificationStore', () => {
  describe('alerts', () => {
    it('adds a new alert and returns its id', () => {
      const id = useNotificationStore.getState().addAlert({
        type: 'price_threshold',
        tokenSymbol: 'ETH',
        condition: 'above',
        targetValue: 5000,
      })

      expect(id).toBeTruthy()
      expect(useNotificationStore.getState().alerts).toHaveLength(1)
      expect(useNotificationStore.getState().alerts[0].config.type).toBe('price_threshold')
      expect(useNotificationStore.getState().alerts[0].enabled).toBe(true)
      expect(useNotificationStore.getState().alerts[0].oneShot).toBe(false)
    })

    it('creates one-shot alerts', () => {
      useNotificationStore.getState().addAlert(
        { type: 'price_threshold', tokenSymbol: 'BTC', condition: 'below', targetValue: 50000 },
        true,
      )

      expect(useNotificationStore.getState().alerts[0].oneShot).toBe(true)
    })

    it('removes an alert by id', () => {
      const id = useNotificationStore.getState().addAlert({
        type: 'system',
        systemEvent: 'test',
      })

      expect(useNotificationStore.getState().alerts).toHaveLength(1)
      useNotificationStore.getState().removeAlert(id)
      expect(useNotificationStore.getState().alerts).toHaveLength(0)
    })

    it('toggles alert enabled state', () => {
      const id = useNotificationStore.getState().addAlert({
        type: 'system',
        systemEvent: 'test',
      })

      expect(useNotificationStore.getState().alerts[0].enabled).toBe(true)
      useNotificationStore.getState().toggleAlert(id)
      expect(useNotificationStore.getState().alerts[0].enabled).toBe(false)
      useNotificationStore.getState().toggleAlert(id)
      expect(useNotificationStore.getState().alerts[0].enabled).toBe(true)
    })
  })

  describe('notifications', () => {
    it('triggers a notification and increments unread count', () => {
      useNotificationStore.getState().triggerNotification({
        type: 'price_threshold',
        priority: 'high',
        title: 'ETH Alert',
        message: 'ETH above $5000',
      })

      const state = useNotificationStore.getState()
      expect(state.notifications).toHaveLength(1)
      expect(state.unreadCount).toBe(1)
      expect(state.notifications[0].status).toBe('unread')
      expect(state.notifications[0].title).toBe('ETH Alert')
    })

    it('marks notification as read', () => {
      useNotificationStore.getState().triggerNotification({
        type: 'system',
        priority: 'low',
        title: 'Test',
        message: 'Test notification',
      })

      const id = useNotificationStore.getState().notifications[0].id
      useNotificationStore.getState().markAsRead(id)

      const state = useNotificationStore.getState()
      expect(state.notifications[0].status).toBe('read')
      expect(state.notifications[0].readAt).toBeDefined()
      expect(state.unreadCount).toBe(0)
    })

    it('marks all notifications as read', () => {
      for (let i = 0; i < 5; i++) {
        useNotificationStore.getState().triggerNotification({
          type: 'system',
          priority: 'low',
          title: `Test ${i}`,
          message: 'msg',
        })
      }

      expect(useNotificationStore.getState().unreadCount).toBe(5)
      useNotificationStore.getState().markAllAsRead()
      expect(useNotificationStore.getState().unreadCount).toBe(0)
      expect(
        useNotificationStore.getState().notifications.every((n) => n.status === 'read'),
      ).toBe(true)
    })

    it('dismisses a notification', () => {
      useNotificationStore.getState().triggerNotification({
        type: 'system',
        priority: 'low',
        title: 'Test',
        message: 'msg',
      })

      const id = useNotificationStore.getState().notifications[0].id
      useNotificationStore.getState().dismissNotification(id)

      expect(useNotificationStore.getState().notifications[0].status).toBe('dismissed')
      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })

    it('clears all notifications', () => {
      for (let i = 0; i < 3; i++) {
        useNotificationStore.getState().triggerNotification({
          type: 'system',
          priority: 'low',
          title: `Test ${i}`,
          message: 'msg',
        })
      }

      useNotificationStore.getState().clearAllNotifications()
      expect(useNotificationStore.getState().notifications).toHaveLength(0)
      expect(useNotificationStore.getState().unreadCount).toBe(0)
    })

    it('caps notifications at 200', () => {
      for (let i = 0; i < 210; i++) {
        useNotificationStore.getState().triggerNotification({
          type: 'system',
          priority: 'low',
          title: `Test ${i}`,
          message: 'msg',
        })
      }

      expect(useNotificationStore.getState().notifications.length).toBeLessThanOrEqual(200)
    })

    it('disables one-shot alert after triggering', () => {
      const alertId = useNotificationStore.getState().addAlert(
        { type: 'price_threshold', tokenSymbol: 'ETH', condition: 'above', targetValue: 5000 },
        true,
      )

      useNotificationStore.getState().triggerNotification({
        alertId,
        type: 'price_threshold',
        priority: 'high',
        title: 'ETH Alert',
        message: 'triggered',
      })

      const alert = useNotificationStore.getState().alerts.find((a) => a.id === alertId)
      expect(alert!.enabled).toBe(false)
      expect(alert!.triggerCount).toBe(1)
      expect(alert!.lastTriggeredAt).toBeDefined()
    })
  })

  describe('delivery config', () => {
    it('updates delivery config partially', () => {
      useNotificationStore.getState().setDeliveryConfig({ browserPush: true })

      const config = useNotificationStore.getState().deliveryConfig
      expect(config.browserPush).toBe(true)
      expect(config.inApp).toBe(true)
    })

    it('sets discord webhook url', () => {
      useNotificationStore.getState().setDeliveryConfig({
        discordWebhookUrl: 'https://discord.com/api/webhooks/test',
      })

      expect(useNotificationStore.getState().deliveryConfig.discordWebhookUrl).toBe(
        'https://discord.com/api/webhooks/test',
      )
    })
  })

  describe('polling state', () => {
    it('sets polling state', () => {
      useNotificationStore.getState().setIsPolling(true)
      expect(useNotificationStore.getState().isPolling).toBe(true)
      useNotificationStore.getState().setIsPolling(false)
      expect(useNotificationStore.getState().isPolling).toBe(false)
    })
  })
})
