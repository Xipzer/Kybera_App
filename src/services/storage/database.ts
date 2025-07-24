import Dexie, { Table } from 'dexie'
import { Wallet, WalletGroup, Conversation, Message, Transaction } from '../../types'

export interface StoredWallet extends Omit<Wallet, 'createdAt'> {
  createdAt: number
}

export interface StoredWalletGroup extends Omit<WalletGroup, 'createdAt'> {
  createdAt: number
  evmWalletCount?: number
  svmWalletCount?: number
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
  value: any
}

export class SmartWalletDB extends Dexie {
  wallets!: Table<StoredWallet>
  walletGroups!: Table<StoredWalletGroup>
  conversations!: Table<StoredConversation>
  messages!: Table<StoredMessage>
  settings!: Table<StoredSetting>
  auth!: Table<StoredAuth>
  transactions!: Table<StoredTransaction>

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
    
    // Version 4 adds transactions table
    this.version(4).stores({
      wallets: '++id, groupId, address, type',
      walletGroups: '++id, type, createdAt',
      conversations: '++id, createdAt',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp'
    })
    
    // Version 5 adds pinned field to conversations
    this.version(5).stores({
      wallets: '++id, groupId, address, type',
      walletGroups: '++id, type, createdAt',
      conversations: '++id, createdAt, pinned',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp'
    })
    
    // Version 6 adds support for MULTI wallet groups
    this.version(6).stores({
      wallets: '++id, groupId, address, type',
      walletGroups: '++id, type, createdAt',
      conversations: '++id, createdAt, pinned',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp'
    }).upgrade(async trans => {
      // No data migration needed, just schema update for optional fields
    })
    
    // Version 7 removes type restriction from wallet groups
    this.version(7).stores({
      wallets: '++id, groupId, address, type',
      walletGroups: '++id, createdAt',
      conversations: '++id, createdAt, pinned',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp'
    }).upgrade(async trans => {
      // Migrate existing groups to have evmWalletCount and svmWalletCount
      const groups = await trans.table('walletGroups').toArray()
      const wallets = await trans.table('wallets').toArray()
      
      for (const group of groups) {
        const groupWallets = wallets.filter(w => w.groupId === group.id)
        const evmCount = groupWallets.filter(w => w.type === 'EVM').length
        const svmCount = groupWallets.filter(w => w.type === 'SVM').length
        
        await trans.table('walletGroups').update(group.id, {
          evmWalletCount: evmCount,
          svmWalletCount: svmCount
        })
        
        // Remove the type field if it exists
        if (group.type) {
          const { type, ...groupWithoutType } = group
          await trans.table('walletGroups').put({
            ...groupWithoutType,
            id: group.id,
            evmWalletCount: evmCount,
            svmWalletCount: svmCount
          })
        }
      }
    })
    
    // Version 8 adds order field for drag and drop support
    this.version(8).stores({
      wallets: '++id, groupId, address, type, order',
      walletGroups: '++id, createdAt, order',
      conversations: '++id, createdAt, pinned',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp'
    }).upgrade(async trans => {
      // Add order to existing wallets and groups
      const groups = await trans.table('walletGroups').toArray()
      const wallets = await trans.table('wallets').toArray()
      
      // Set order for groups based on creation date
      const sortedGroups = groups.sort((a, b) => a.createdAt - b.createdAt)
      for (let i = 0; i < sortedGroups.length; i++) {
        await trans.table('walletGroups').update(sortedGroups[i].id, { order: i })
      }
      
      // Set order for wallets within each group
      const walletsByGroup: { [key: string]: any[] } = {}
      wallets.forEach(w => {
        if (!walletsByGroup[w.groupId]) walletsByGroup[w.groupId] = []
        walletsByGroup[w.groupId].push(w)
      })
      
      for (const groupId in walletsByGroup) {
        const groupWallets = walletsByGroup[groupId].sort((a, b) => a.createdAt - b.createdAt)
        for (let i = 0; i < groupWallets.length; i++) {
          await trans.table('wallets').update(groupWallets[i].id, { order: i })
        }
      }
    })
  }
}

export const db = new SmartWalletDB()