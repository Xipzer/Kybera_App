/**
 * Code by Xipzer
 */

import { useNotificationStore } from '../store/notificationStore'
import { db } from './database'
import {
  Alert,
  type Notification as AppNotification,
  NotificationPriority,
  PriceAlert,
  ResearchFollowupAlert,
} from '../types/notifications'

const DEFAULT_POLL_INTERVAL = 60_000 // 1 minute

class NotificationService {
  private pollingInterval: ReturnType<typeof setInterval> | null = null

  startPolling(intervalMs: number = DEFAULT_POLL_INTERVAL): void {
    if (this.pollingInterval) return

    console.log(`[NotificationService] Starting alert polling every ${intervalMs}ms`)
    useNotificationStore.getState().setIsPolling(true)

    this.pollingInterval = setInterval(() => {
      this.evaluateAlerts().catch((err) =>
        console.error('[NotificationService] Alert evaluation error:', err),
      )
    }, intervalMs)

    this.evaluateAlerts().catch((err) =>
      console.error('[NotificationService] Initial alert evaluation error:', err),
    )
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    useNotificationStore.getState().setIsPolling(false)
    console.log('[NotificationService] Alert polling stopped')
  }

  async evaluateAlerts(): Promise<void> {
    const { alerts } = useNotificationStore.getState()
    const enabled = alerts.filter((a) => a.enabled)

    for (const alert of enabled) {
      try {
        switch (alert.config.type) {
          case 'price_threshold':
            await this.evaluatePriceAlert(alert)
            break
          case 'wallet_activity':
            await this.evaluateWalletActivityAlert(alert)
            break
          case 'research_followup':
            await this.evaluateResearchFollowup(alert)
            break
          case 'system':
            break
        }
      } catch (err) {
        console.error(`[NotificationService] Failed to evaluate alert ${alert.id}:`, err)
      }
    }
  }

  async evaluatePriceAlert(alert: Alert): Promise<void> {
    const config = alert.config as PriceAlert
    const { tokenSymbol, tokenAddress, condition, targetValue } = config

    const lookupKey = tokenAddress?.toLowerCase() || tokenSymbol.toLowerCase()
    const cached = await db.priceData.get(lookupKey)

    if (!cached) {
      console.debug(
        `[NotificationService] No cached price for ${tokenSymbol} (${lookupKey}), skipping`,
      )
      return
    }

    const currentPrice = cached.usdPrice
    let triggered = false

    switch (condition) {
      case 'above':
        triggered = currentPrice >= targetValue
        break
      case 'below':
        triggered = currentPrice <= targetValue
        break
      case 'change_percent': {
        const changePercent = Math.abs(cached.usd24hChange)
        triggered = changePercent >= targetValue
        break
      }
    }

    if (triggered) {
      const priority: NotificationPriority =
        condition === 'change_percent' && Math.abs(cached.usd24hChange) >= 20
          ? 'high'
          : 'medium'

      const directionLabel =
        condition === 'above'
          ? 'risen above'
          : condition === 'below'
            ? 'fallen below'
            : `changed by ${cached.usd24hChange.toFixed(2)}% (threshold: ${targetValue}%)`

      this.triggerAndDeliver({
        alertId: alert.id,
        type: 'price_threshold',
        priority,
        title: `${tokenSymbol} Price Alert`,
        message: `${tokenSymbol} has ${directionLabel} $${targetValue.toLocaleString()} — current price: $${currentPrice.toLocaleString()}`,
        actionType: 'open_swap',
        actionPayload: {
          tokenSymbol,
          ...(tokenAddress ? { tokenAddress } : {}),
        },
      })
    }
  }

  async evaluateWalletActivityAlert(_alert: Alert): Promise<void> {
    console.debug(
      `[NotificationService] Wallet activity alert evaluation is not yet implemented (alert ${_alert.id})`,
    )
  }

  async evaluateResearchFollowup(alert: Alert): Promise<void> {
    const config = alert.config as ResearchFollowupAlert
    const { contractAddress, tokenSymbol, priceChangeThreshold } = config

    const intervalMs = config.checkInterval * 60 * 60 * 1000
    if (alert.lastTriggeredAt && Date.now() - alert.lastTriggeredAt < intervalMs) {
      return
    }

    const cached = await db.priceData.get(contractAddress.toLowerCase())
    if (!cached) {
      console.debug(
        `[NotificationService] No cached price for research followup ${tokenSymbol}, skipping`,
      )
      return
    }

    const changePercent = Math.abs(cached.usd24hChange)
    if (changePercent >= priceChangeThreshold) {
      const direction = cached.usd24hChange >= 0 ? 'up' : 'down'
      const priority: NotificationPriority = changePercent >= 20 ? 'high' : 'medium'

      this.triggerAndDeliver({
        alertId: alert.id,
        type: 'research_followup',
        priority,
        title: `Research Follow-up: ${tokenSymbol}`,
        message: `${tokenSymbol} has moved ${direction} ${changePercent.toFixed(1)}% since your research — current price: $${cached.usdPrice.toLocaleString()}`,
        actionType: 'open_research',
        actionPayload: {
          researchId: config.researchId,
          contractAddress,
          tokenSymbol,
        },
      })
    }
  }

  private triggerAndDeliver(
    notification: Omit<AppNotification, 'id' | 'createdAt' | 'status'>,
  ): void {
    useNotificationStore.getState().triggerNotification(notification)

    const full: AppNotification = {
      ...notification,
      id: '',
      createdAt: Date.now(),
      status: 'unread',
    }

    this.deliverNotification(full).catch((err) =>
      console.error('[NotificationService] Delivery error:', err),
    )
  }

  async deliverNotification(notification: AppNotification): Promise<void> {
    const { deliveryConfig } = useNotificationStore.getState()

    if (deliveryConfig.browserPush) {
      await this.sendBrowserPush(notification.title, notification.message)
    }

    if (deliveryConfig.discordWebhookUrl) {
      await this.sendDiscordWebhook(deliveryConfig.discordWebhookUrl, notification)
    }

    if (deliveryConfig.telegramBotToken && deliveryConfig.telegramChatId) {
      await this.sendTelegramMessage(
        deliveryConfig.telegramBotToken,
        deliveryConfig.telegramChatId,
        notification,
      )
    }
  }

  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') return true
    const result = await Notification.requestPermission()
    return result === 'granted'
  }

  async sendBrowserPush(title: string, body: string, icon?: string): Promise<void> {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    new Notification(title, {
      body,
      icon: icon || '/favicon.ico',
      tag: 'kybera-alert',
    })
  }

  async sendDiscordWebhook(webhookUrl: string, notification: AppNotification): Promise<void> {
    const priorityEmoji: Record<string, string> = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴',
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `${priorityEmoji[notification.priority]} **${notification.title}**\n${notification.message}`,
        }),
      })
    } catch (err) {
      console.error('[NotificationService] Discord webhook failed:', err)
    }
  }

  async sendTelegramMessage(
    botToken: string,
    chatId: string,
    notification: AppNotification,
  ): Promise<void> {
    const priorityEmoji: Record<string, string> = {
      low: 'ℹ️',
      medium: '⚠️',
      high: '🚨',
      critical: '🔴',
    }

    const text = `${priorityEmoji[notification.priority]} *${notification.title}*\n${notification.message}`

    try {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      })
    } catch (err) {
      console.error('[NotificationService] Telegram message failed:', err)
    }
  }
}

export const notificationService = new NotificationService()
