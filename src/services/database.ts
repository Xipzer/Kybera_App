/**
 * Code by Xipzer
 */

import Dexie, { Table } from 'dexie'
import { Conversation, Message, Transaction, Wallet, WalletGroup } from '../types'
import type { AlertConfig } from '../types/notifications'

export interface StoredWallet extends Omit<Wallet, 'createdAt'> {
  createdAt: number
}

export interface StoredWalletGroup extends Omit<WalletGroup, 'createdAt'> {
  createdAt: number
}

export interface StoredConversation extends Omit<Conversation, 'createdAt' | 'updatedAt'> {
  createdAt: number
  updatedAt: number
}

export interface StoredMessage extends Omit<Message, 'timestamp'> {
  timestamp: number
}

export interface StoredAuth {
  id: string
  passwordHash: string
  passwordSalt: string
  encryptionSalt: string
  createdAt: number
  updatedAt?: number
}

export interface StoredTransaction extends Omit<Transaction, 'timestamp'> {
  timestamp: number
}

export interface StoredSetting {
  key: string
  value: unknown
}

export interface StoredTokenBalance {
  id: string
  walletAddress: string
  networkId: string
  tokenAddress: string
  symbol: string
  name: string
  decimals: number
  balance: string
  usdValue?: number
  logoURI?: string
  lastUpdated: number
}

export interface StoredPriceData {
  id: string
  symbol: string
  usdPrice: number
  usd24hChange: number
  lastUpdated: number
}

export interface StoredPriceHistory {
  id: string
  symbol: string
  usdPrice: number
  timestamp: number
}

export interface StoredWalletBalance {
  id: string
  walletAddress: string
  networkId: string
  nativeBalance: string
  nativeUSD: number
  totalUSD: number
  lastUpdated: number
  previousTotalUSD?: number
}

export interface StoredTokenMetadata {
  id: string
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
  lastUpdated: number
}

export interface StoredDiscoveredToken {
  id: string
  walletAddress: string
  chainId: number
  tokenAddress: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
  addedManually?: boolean
  discoveredAt: number
}

export interface StoredCustomNetwork {
  id: string
  name: string
  type: 'EVM' | 'SVM'
  chainId: string | number
  symbol: string
  rpcUrl: string
  explorerUrl: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  isMainnet?: boolean
  alchemyRpcUrl?: string
  isCustom: boolean
  addedAt: number
  updatedAt?: number
}

export interface StoredNetworkVisibility {
  networkId: string
  isHidden: boolean
  updatedAt: number
}

export interface StoredAIActionHistory {
  id: string
  actionName: string
  parameters: Record<string, unknown>
  result: {
    success: boolean
    data?: unknown
    error?: string
    message?: string
    transactionHash?: string
    explorerUrl?: string
  }
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'
  executedAt: number
  walletId: string | null
  networkId: string
  conversationId?: string
  duration?: number
  error?: string
}

export interface StoredAlert {
  id: string
  config: AlertConfig
  enabled: boolean
  createdAt: number
  lastTriggeredAt?: number
  triggerCount: number
  oneShot: boolean
}

export interface StoredNotification {
  id: string
  alertId?: string
  type: string
  priority: string
  title: string
  message: string
  status: string
  createdAt: number
  readAt?: number
  actionType?: string
  actionPayload?: Record<string, string>
}

export interface StoredTradeRecord {
  id: string
  walletAddress: string
  networkId: string
  tokenInAddress: string
  tokenInSymbol: string
  tokenInAmount: string
  tokenOutAddress: string
  tokenOutSymbol: string
  tokenOutAmount: string
  tokenInPriceUsd: number
  tokenOutPriceUsd: number
  totalValueUsd: number
  txHash: string
  timestamp: number
  source: string
  researchId?: string
}

export interface StoredPortfolioSnapshot {
  id: string
  walletAddress: string
  timestamp: number
  totalValueUsd: number
  networkBreakdown: string
  tokenBreakdown: string
}

export interface StoredWalletActivity {
  id: string
  watchedWalletId: string
  walletAddress: string
  networkId: string
  txHash: string
  blockNumber: number
  timestamp: number
  activityType: string
  tokenInSymbol?: string
  tokenOutSymbol?: string
  estimatedValueUsd?: number
  raw: string
}

export class SmartWalletDB extends Dexie {
  wallets!: Table<StoredWallet>
  walletGroups!: Table<StoredWalletGroup>
  conversations!: Table<StoredConversation>
  messages!: Table<StoredMessage>
  settings!: Table<StoredSetting>
  auth!: Table<StoredAuth>
  transactions!: Table<StoredTransaction>
  tokenBalances!: Table<StoredTokenBalance>
  priceData!: Table<StoredPriceData>
  priceHistory!: Table<StoredPriceHistory>
  walletBalances!: Table<StoredWalletBalance>
  tokenMetadata!: Table<StoredTokenMetadata>
  discoveredTokens!: Table<StoredDiscoveredToken>
  customNetworks!: Table<StoredCustomNetwork>
  networkVisibility!: Table<StoredNetworkVisibility>
  aiActionHistory!: Table<StoredAIActionHistory>
  alerts!: Table<StoredAlert>
  notifications!: Table<StoredNotification>
  tradeRecords!: Table<StoredTradeRecord>
  portfolioSnapshots!: Table<StoredPortfolioSnapshot>
  walletActivities!: Table<StoredWalletActivity>

  constructor() {
    super('SmartWalletDB')

    this.version(1).stores({
      wallets: '++id, groupId, address, type, order, lastNetworkId',
      walletGroups: '++id, createdAt, order',
      conversations: '++id, createdAt, pinned',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp',
      tokenBalances: 'id, walletAddress, networkId, lastUpdated',
      priceData: 'id, symbol, lastUpdated',
      priceHistory: 'id, symbol, timestamp',
      walletBalances: 'id, walletAddress, networkId, lastUpdated',
      tokenMetadata: 'id, chainId, address, lastUpdated',
      discoveredTokens: 'id, walletAddress, chainId, tokenAddress, discoveredAt',
      customNetworks: 'id, type, chainId, addedAt',
      networkVisibility: 'networkId, updatedAt',
      aiActionHistory: 'id, actionName, executedAt, walletId, conversationId',
    })

    this.version(2).stores({
      alerts: 'id, enabled, createdAt',
      notifications: 'id, alertId, type, status, createdAt',
    })

    this.version(3).stores({
      tradeRecords: 'id, walletAddress, networkId, timestamp, txHash, source',
      portfolioSnapshots: 'id, walletAddress, timestamp',
    })

    this.version(4).stores({
      walletActivities: 'id, watchedWalletId, walletAddress, networkId, timestamp, txHash',
    })
  }
}

export const db = new SmartWalletDB()
