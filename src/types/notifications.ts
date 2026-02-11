/**
 * Code by Xipzer
 */

export type AlertType = 'price_threshold' | 'wallet_activity' | 'research_followup' | 'system' | 'copy_trade' | 'yield_change'

export type AlertCondition = 'above' | 'below' | 'change_percent'

export type NotificationPriority = 'low' | 'medium' | 'high' | 'critical'

export type NotificationStatus = 'unread' | 'read' | 'dismissed'

export interface PriceAlert {
  type: 'price_threshold'
  tokenSymbol: string
  tokenAddress?: string
  networkId?: string
  condition: AlertCondition
  targetValue: number
  currentValue?: number
}

export interface WalletActivityAlert {
  type: 'wallet_activity'
  walletAddress: string
  walletLabel?: string
  activityType: 'incoming' | 'outgoing' | 'swap' | 'approval' | 'any'
  minValueUsd?: number
}

export interface ResearchFollowupAlert {
  type: 'research_followup'
  researchId: string
  contractAddress: string
  network: string
  tokenSymbol: string
  checkInterval: number
  priceChangeThreshold: number
}

export interface SystemAlert {
  type: 'system'
  systemEvent: string
}

export type AlertConfig = PriceAlert | WalletActivityAlert | ResearchFollowupAlert | SystemAlert

export interface Alert {
  id: string
  config: AlertConfig
  enabled: boolean
  createdAt: number
  lastTriggeredAt?: number
  triggerCount: number
  oneShot: boolean
}

export interface Notification {
  id: string
  alertId?: string
  type: AlertType
  priority: NotificationPriority
  title: string
  message: string
  status: NotificationStatus
  createdAt: number
  readAt?: number
  actionType?: 'navigate' | 'open_research' | 'open_swap' | 'open_wallet'
  actionPayload?: Record<string, string>
}

export interface NotificationDeliveryConfig {
  inApp: boolean
  browserPush: boolean
  discordWebhookUrl?: string
  telegramChatId?: string
  telegramBotToken?: string
}
