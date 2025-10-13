import Dexie, { Table } from 'dexie'
import { Conversation, Message, Transaction, Wallet, WalletGroup } from '../../types'

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
  value: any
}

export interface StoredTokenBalance {
  id: string // walletAddress_networkId_tokenAddress
  walletAddress: string
  networkId: string
  tokenAddress: string
  symbol: string
  name: string
  decimals: number
  balance: string
  usdValue?: number // Store USD value at time of caching
  logoURI?: string
  lastUpdated: number
}

export interface StoredPriceData {
  id: string // symbol or coingeckoId
  symbol: string
  usdPrice: number
  usd24hChange: number
  lastUpdated: number
}

export interface StoredPriceHistory {
  id: string // symbol_timestamp
  symbol: string
  usdPrice: number
  timestamp: number
}

export interface StoredWalletBalance {
  id: string // walletAddress_networkId
  walletAddress: string
  networkId: string
  nativeBalance: string
  nativeUSD: number
  totalUSD: number
  lastUpdated: number
  previousTotalUSD?: number // Store previous value for delta calculation
}

export interface StoredTokenMetadata {
  id: string // chainId_tokenAddress
  chainId: number
  address: string
  name: string
  symbol: string
  decimals: number
  logoURI?: string
  lastUpdated: number
}

export interface StoredDiscoveredToken {
  id: string // walletAddress_chainId_tokenAddress
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
  explorer: string
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
  networkId: string // Primary key
  isHidden: boolean
  updatedAt: number
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

  constructor() {
    super('SmartWalletDB')

    this.version(1).stores({
      wallets: '++id, address, type',
      conversations: '++id, createdAt',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
    })

    // Version 2 adds wallet groups
    this.version(2)
      .stores({
        wallets: '++id, groupId, address, type',
        walletGroups: '++id, type, createdAt',
        conversations: '++id, createdAt',
        messages: '++id, conversationId, timestamp',
        settings: 'key',
      })
      .upgrade(async (trans) => {
        // Migrate existing wallets to a default group
        const defaultGroup: StoredWalletGroup = {
          id: 'default-imported',
          name: 'Imported Wallets',
          encryptedSeed: '', // Empty for imported wallets
          createdAt: Date.now(),
          walletCount: 0,
          evmWalletCount: 0,
          svmWalletCount: 0,
        }

        await trans.table('walletGroups').add(defaultGroup)

        // Update existing wallets to reference the default group
        await trans
          .table('wallets')
          .toCollection()
          .modify((wallet) => {
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
      auth: 'id',
    })

    // Version 4 adds transactions table
    this.version(4).stores({
      wallets: '++id, groupId, address, type',
      walletGroups: '++id, type, createdAt',
      conversations: '++id, createdAt',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp',
    })

    // Version 5 adds pinned field to conversations
    this.version(5).stores({
      wallets: '++id, groupId, address, type',
      walletGroups: '++id, type, createdAt',
      conversations: '++id, createdAt, pinned',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp',
    })

    // Version 6 adds support for MULTI wallet groups
    this.version(6)
      .stores({
        wallets: '++id, groupId, address, type',
        walletGroups: '++id, type, createdAt',
        conversations: '++id, createdAt, pinned',
        messages: '++id, conversationId, timestamp',
        settings: 'key',
        auth: 'id',
        transactions: '++id, hash, from, to, network, timestamp',
      })
      .upgrade(async () => {
        // No data migration needed, just schema update for optional fields
      })

    // Version 7 removes type restriction from wallet groups
    this.version(7)
      .stores({
        wallets: '++id, groupId, address, type',
        walletGroups: '++id, createdAt',
        conversations: '++id, createdAt, pinned',
        messages: '++id, conversationId, timestamp',
        settings: 'key',
        auth: 'id',
        transactions: '++id, hash, from, to, network, timestamp',
      })
      .upgrade(async (trans) => {
        // Migrate existing groups to have evmWalletCount and svmWalletCount
        const groups = await trans.table('walletGroups').toArray()
        const wallets = await trans.table('wallets').toArray()

        for (const group of groups) {
          const groupWallets = wallets.filter((w) => w.groupId === group.id)
          const evmCount = groupWallets.filter((w) => w.type === 'EVM').length
          const svmCount = groupWallets.filter((w) => w.type === 'SVM').length

          await trans.table('walletGroups').update(group.id, {
            evmWalletCount: evmCount,
            svmWalletCount: svmCount,
          })

          // Remove the type field if it exists
          if (group.type) {
            const { type, ...groupWithoutType } = group
            await trans.table('walletGroups').put({
              ...groupWithoutType,
              id: group.id,
              evmWalletCount: evmCount,
              svmWalletCount: svmCount,
            })
          }
        }
      })

    // Version 8 adds order field for drag and drop support
    this.version(8)
      .stores({
        wallets: '++id, groupId, address, type, order',
        walletGroups: '++id, createdAt, order',
        conversations: '++id, createdAt, pinned',
        messages: '++id, conversationId, timestamp',
        settings: 'key',
        auth: 'id',
        transactions: '++id, hash, from, to, network, timestamp',
      })
      .upgrade(async (trans) => {
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
        wallets.forEach((w) => {
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

    // Version 9 adds caching tables for balances and prices
    this.version(9).stores({
      wallets: '++id, groupId, address, type, order',
      walletGroups: '++id, createdAt, order',
      conversations: '++id, createdAt, pinned',
      messages: '++id, conversationId, timestamp',
      settings: 'key',
      auth: 'id',
      transactions: '++id, hash, from, to, network, timestamp',
      tokenBalances: 'id, walletAddress, networkId, lastUpdated',
      priceData: 'id, symbol, lastUpdated',
      walletBalances: 'id, walletAddress, networkId, lastUpdated',
    })

    // Version 10 adds price history table for 24h change tracking
    this.version(10).stores({
      wallets: '++id, groupId, address, type, order',
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
    })

    // Version 11 adds usdValue to token balances
    this.version(11)
      .stores({
        wallets: '++id, groupId, address, type, order',
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
      })
      .upgrade(async (trans) => {
        // Add usdValue field to existing token balances
        const tokenBalances = await trans.table('tokenBalances').toArray()
        for (const tokenBalance of tokenBalances) {
          await trans.table('tokenBalances').update(tokenBalance.id, {
            usdValue: 0, // Will be updated on next refresh
          })
        }
      })

    // Version 12 adds lastNetworkId to wallets for network persistence
    this.version(12)
      .stores({
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
      })
      .upgrade(async (trans) => {
        // Add lastNetworkId field to existing wallets
        const wallets = await trans.table('wallets').toArray()
        for (const wallet of wallets) {
          // Set default network based on wallet type
          const defaultNetworkId = wallet.type === 'EVM' ? 'ethereum' : 'solana-mainnet'
          await trans.table('wallets').update(wallet.id, {
            lastNetworkId: defaultNetworkId,
          })
        }
      })

    // Version 13 adds token metadata and discovered tokens tables
    this.version(13).stores({
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
    })

    // Version 14 adds custom networks and network visibility tables
    this.version(14).stores({
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
    })
  }
}

export const db = new SmartWalletDB()