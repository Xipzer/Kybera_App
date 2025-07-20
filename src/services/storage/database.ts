import Dexie, { Table } from 'dexie'
import { Wallet, WalletGroup, Conversation, Message } from '../../types'

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

export class SmartWalletDB extends Dexie {
  wallets!: Table<StoredWallet>
  walletGroups!: Table<StoredWalletGroup>
  conversations!: Table<StoredConversation>
  messages!: Table<StoredMessage>
  settings!: Table<{ key: string; value: any }>
  auth!: Table<StoredAuth>

  constructor() {
    super('SmartWalletDB')
    
    this.version(1).stores({
      wallets: '++id, address, type',
      conversations: '++id, createdAt',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
    })
    
    // Version 2 adds wallet groups
    this.version(2).stores({
      wallets: '++id, groupId, address, type',
      walletGroups: '++id, type, createdAt',
      conversations: '++id, createdAt',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
    }).upgrade(async trans => {
      // Migrate existing wallets to a default group
      const defaultGroup: StoredWalletGroup = {
        id: 'default-imported',
        name: 'Imported Wallets',
        type: 'EVM', // Default type, but mixed types allowed for imported wallets
        encryptedSeed: '', // Empty for imported wallets
        createdAt: Date.now(),
        walletCount: 0
      }
      
      await trans.table('walletGroups').add(defaultGroup)
      
      // Update existing wallets to reference the default group
      await trans.table('wallets').toCollection().modify(wallet => {
        wallet.groupId = 'default-imported'
        wallet.derivationIndex = -1 // -1 indicates imported wallet
      })
    })
    
    // Version 3 adds auth table
    this.version(3).stores({
      wallets: '++id, groupId, address, type',
      walletGroups: '++id, type, createdAt',
      conversations: '++id, createdAt',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id'
    })
  }
}

export const db = new SmartWalletDB()