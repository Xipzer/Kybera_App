import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Wallet, WalletGroup, Network, Transaction, ChainType } from '../types'
import { EVM_NETWORKS } from '../utils/networks'
import { db } from '../services/storage/database'
import { EVMWalletService } from '../services/blockchain/evmWallet'
import { SVMWalletService } from '../services/blockchain/svmWallet'
import { encryptData, decryptData } from '../utils/crypto'

interface WalletState {
  wallets: Wallet[]
  walletGroups: WalletGroup[]
  activeWalletId: string | null
  activeNetwork: Network
  isLocked: boolean
  password: string | null
  transactions: Transaction[]

  // Wallet Actions
  addWallet: (wallet: Wallet) => Promise<void>
  removeWallet: (id: string) => Promise<void>
  setActiveWallet: (id: string) => void
  setActiveNetwork: (network: Network) => void
  lock: () => void
  unlock: (password: string) => void
  loadWallets: () => Promise<void>
  updateWallet: (id: string, updates: Partial<Wallet>) => Promise<void>
  
  // Group Actions
  createWalletGroup: (name: string, type: ChainType, password: string, initialWalletCount?: number, walletNames?: string[]) => Promise<WalletGroup>
  removeWalletGroup: (id: string) => Promise<void>
  addWalletToGroup: (groupId: string, name: string) => Promise<Wallet>
  loadWalletGroups: () => Promise<void>
  exportGroupSeed: (groupId: string, password: string) => Promise<string>
  getWalletPrivateKey: (walletId: string, password: string) => Promise<string>
  importWalletGroup: (name: string, type: ChainType, seedPhrase: string, password: string, walletCount?: number, walletNames?: string[]) => Promise<WalletGroup>
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallets: [],
      walletGroups: [],
      activeWalletId: null,
      activeNetwork: EVM_NETWORKS[0],
      isLocked: true,
      password: null,
      transactions: [],

      addWallet: async (wallet) => {
        await db.wallets.add({
          ...wallet,
          createdAt: wallet.createdAt.getTime(),
        })
        set((state) => ({
          wallets: [...state.wallets, wallet],
        }))
      },

      removeWallet: async (id) => {
        await db.wallets.delete(id)
        set((state) => ({
          wallets: state.wallets.filter((w) => w.id !== id),
          activeWalletId: state.activeWalletId === id ? null : state.activeWalletId,
        }))
      },

      setActiveWallet: (id) => {
        set({ activeWalletId: id })
      },

      setActiveNetwork: (network) => {
        set({ activeNetwork: network })
      },

      lock: () => {
        set({ isLocked: true, password: null })
      },

      unlock: (password) => {
        set({ isLocked: false, password })
      },

      loadWallets: async () => {
        const storedWallets = await db.wallets.toArray()
        const wallets = storedWallets.map((w) => ({
          ...w,
          createdAt: new Date(w.createdAt),
        }))
        set({ wallets })
      },
      
      createWalletGroup: async (name, type, password) => {
        // Generate new seed phrase
        const mnemonic = await EVMWalletService.createSeedPhrase()
        const encryptedSeed = encryptData(mnemonic, password)
        
        const group: WalletGroup = {
          id: `group-${Date.now()}`,
          name,
          type,
          encryptedSeed,
          createdAt: new Date(),
          walletCount: 0
        }
        
        await db.walletGroups.add({
          ...group,
          createdAt: group.createdAt.getTime()
        })
        
        set((state) => ({
          walletGroups: [...state.walletGroups, group]
        }))
        
        return group
      },
      
      removeWalletGroup: async (id) => {
        // Remove all wallets in the group
        const walletsToRemove = get().wallets.filter(w => w.groupId === id)
        for (const wallet of walletsToRemove) {
          await db.wallets.delete(wallet.id)
        }
        
        // Remove the group
        await db.walletGroups.delete(id)
        
        set((state) => ({
          walletGroups: state.walletGroups.filter(g => g.id !== id),
          wallets: state.wallets.filter(w => w.groupId !== id),
          activeWalletId: walletsToRemove.some(w => w.id === state.activeWalletId) ? null : state.activeWalletId
        }))
      },
      
      addWalletToGroup: async (groupId, name) => {
        const group = get().walletGroups.find(g => g.id === groupId)
        if (!group) throw new Error('Group not found')
        
        // Special case: allow mixed types for imported wallets group
        if (group.id === 'default-imported') {
          throw new Error('Cannot add wallets to imported group. Use import instead.')
        }
        
        const password = get().password
        if (!password) throw new Error('Password required')
        
        // Decrypt seed
        const mnemonic = decryptData(group.encryptedSeed, password)
        
        // Derive wallet at next index - use group's chain type
        const derivationIndex = group.walletCount
        let walletData
        
        if (group.type === 'EVM') {
          walletData = await EVMWalletService.deriveWalletFromSeed(mnemonic, derivationIndex)
        } else {
          walletData = await SVMWalletService.deriveWalletFromSeed(mnemonic, derivationIndex)
        }
        
        const wallet: Wallet = {
          id: `wallet-${Date.now()}`,
          groupId,
          name,
          address: walletData.address,
          type: group.type, // Use group's chain type
          derivationIndex,
          createdAt: new Date()
        }
        
        // Update group wallet count
        await db.walletGroups.update(groupId, { walletCount: group.walletCount + 1 })
        
        // Add wallet
        await db.wallets.add({
          ...wallet,
          createdAt: wallet.createdAt.getTime()
        })
        
        set((state) => ({
          wallets: [...state.wallets, wallet],
          walletGroups: state.walletGroups.map(g => 
            g.id === groupId ? { ...g, walletCount: g.walletCount + 1 } : g
          )
        }))
        
        return wallet
      },
      
      loadWalletGroups: async () => {
        const storedGroups = await db.walletGroups.toArray()
        const groups = storedGroups.map((g) => ({
          ...g,
          createdAt: new Date(g.createdAt),
        }))
        set({ walletGroups: groups })
      },
      
      exportGroupSeed: async (groupId, password) => {
        const group = get().walletGroups.find(g => g.id === groupId)
        if (!group) throw new Error('Group not found')
        
        return decryptData(group.encryptedSeed, password)
      },
      
      getWalletPrivateKey: async (walletId, password) => {
        const wallet = get().wallets.find(w => w.id === walletId)
        if (!wallet) throw new Error('Wallet not found')
        
        // If it's an imported wallet with its own private key
        if (wallet.isImported && wallet.encryptedPrivateKey) {
          return decryptData(wallet.encryptedPrivateKey, password)
        }
        
        // Otherwise, derive from group seed
        const group = get().walletGroups.find(g => g.id === wallet.groupId)
        if (!group) throw new Error('Wallet group not found')
        
        const mnemonic = decryptData(group.encryptedSeed, password)
        
        if (wallet.type === 'EVM') {
          const derived = await EVMWalletService.deriveWalletFromSeed(mnemonic, wallet.derivationIndex)
          return derived.privateKey
        } else {
          const derived = await SVMWalletService.deriveWalletFromSeed(mnemonic, wallet.derivationIndex)
          return derived.privateKey
        }
      },
      
      importWalletGroup: async (name, type, seedPhrase, password, walletCount = 1, walletNames) => {
        const encryptedSeed = encryptData(seedPhrase, password)
        
        const group: WalletGroup = {
          id: `group-${Date.now()}`,
          name,
          type,
          encryptedSeed,
          createdAt: new Date(),
          walletCount: 0
        }
        
        await db.walletGroups.add({
          ...group,
          createdAt: group.createdAt.getTime()
        })
        
        set((state) => ({
          walletGroups: [...state.walletGroups, group]
        }))
        
        // Generate the specified number of wallets
        for (let i = 0; i < walletCount; i++) {
          const walletName = walletNames?.[i] || `${name} - Wallet #${i + 1}`
          await get().addWalletToGroup(group.id, walletName)
        }
        
        return group
      },

      updateWallet: async (id, updates) => {
        const updateData: any = {}
        if (updates.createdAt) {
          updateData.createdAt = updates.createdAt.getTime()
        }
        Object.keys(updates).forEach((key) => {
          if (key !== 'createdAt') {
            updateData[key] = (updates as any)[key]
          }
        })
        await db.wallets.update(id, updateData)
        set((state) => ({
          wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }))
      },
    }),
    {
      name: 'wallet-store',
      partialize: (state) => ({
        activeWalletId: state.activeWalletId,
        activeNetwork: state.activeNetwork,
      }),
    },
  ),
)