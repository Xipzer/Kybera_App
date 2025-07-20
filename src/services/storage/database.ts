import Dexie, { Table } from 'dexie'
import { Wallet, Conversation, Message } from '../../types'

export interface StoredWallet extends Omit<Wallet, 'createdAt'> {
  createdAt: number
}

export interface StoredConversation extends Omit<Conversation, 'createdAt' | 'updatedAt'> {
  createdAt: number
  updatedAt: number
}

export interface StoredMessage extends Omit<Message, 'timestamp'> {
  timestamp: number
}

export class SmartWalletDB extends Dexie {
  wallets!: Table<StoredWallet>
  conversations!: Table<StoredConversation>
  messages!: Table<StoredMessage>
  settings!: Table<{ key: string; value: any }>

  constructor() {
    super('SmartWalletDB')
    this.version(1).stores({
      wallets: '++id, address, type',
      conversations: '++id, createdAt',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
    })
  }
}

export const db = new SmartWalletDB()