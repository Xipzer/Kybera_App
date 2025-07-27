import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Wallet, WalletGroup, Network, Transaction, ChainType } from '../types'
import { EVM_NETWORKS, SVM_NETWORKS } from '../utils/networks'
import { db } from '../services/storage/database'
import { EVMWalletService } from '../services/blockchain/evmWallet'
import { SVMWalletService } from '../services/blockchain/svmWallet'
import { encryptData, decryptData } from '../utils/crypto'
import { memoryProtection } from '../services/security/memoryProtection'

interface WalletState {
  wallets: Wallet[]
  walletGroups: WalletGroup[]
  activeWalletId: string | null
  activeNetwork: Network
  activeEVMNetwork: Network
  activeSVMNetwork: Network
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
  createWalletGroup: (name: string, password: string, initialWalletCount?: number, walletNames?: string[]) => Promise<WalletGroup>
  removeWalletGroup: (id: string) => Promise<void>
  addWalletToGroup: (groupId: string, name: string, walletType: ChainType) => Promise<Wallet>
  loadWalletGroups: () => Promise<void>
  exportGroupSeed: (groupId: string, password: string) => Promise<string>
  getWalletPrivateKey: (walletId: string, password: string) => Promise<string>
  importWalletGroup: (name: string, seedPhrase: string, password: string, walletNames?: string[], evmCount?: number, svmCount?: number) => Promise<WalletGroup>
  updateWalletGroup: (id: string, updates: Partial<WalletGroup>) => Promise<void>
  reorderWalletGroups: (groupIds: string[]) => Promise<void>
  reorderWallets: (walletIds: string[]) => Promise<void>
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      wallets: [],
      walletGroups: [],
      activeWalletId: null,
      activeNetwork: EVM_NETWORKS[0],
      activeEVMNetwork: EVM_NETWORKS[0],
      activeSVMNetwork: SVM_NETWORKS[0],
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
        const state = get()
        const wallet = state.wallets.find(w => w.id === id)
        if (wallet) {
          // Set the active network based on wallet type
          const activeNetwork = wallet.type === 'EVM' 
            ? state.activeEVMNetwork 
            : state.activeSVMNetwork
          
          console.log('setActiveWallet: Switching to wallet', {
            walletId: id,
            walletType: wallet.type,
            walletAddress: wallet.address,
            newNetworkType: activeNetwork.type,
            newNetworkName: activeNetwork.name,
            newNetworkRPC: activeNetwork.rpcUrl
          })
          
          set({ activeWalletId: id, activeNetwork })
        } else {
          set({ activeWalletId: id })
        }
      },

      setActiveNetwork: (network) => {
        const state = get()
        // Update the specific network type state as well
        if (network.type === 'EVM') {
          set({ activeNetwork: network, activeEVMNetwork: network })
        } else if (network.type === 'SVM') {
          set({ activeNetwork: network, activeSVMNetwork: network })
        } else {
          set({ activeNetwork: network })
        }
      },

      lock: () => {
        // Wipe password from memory when locking
        const state = get()
        if (state.password) {
          memoryProtection.wipeSensitive('wallet_password')
        }
        set({ isLocked: true, password: null })
      },

      unlock: (password) => {
        // Store password in secure memory
        memoryProtection.storeSensitive('wallet_password', password, 30 * 60 * 1000) // 30 minutes
        set({ isLocked: false, password })
      },

      loadWallets: async () => {
        const storedWallets = await db.wallets.toArray()
        const wallets = storedWallets.map((w) => ({
          ...w,
          createdAt: new Date(w.createdAt),
        }))
        
        // Check if active wallet's type matches active network
        const state = get()
        if (state.activeWalletId) {
          const activeWallet = wallets.find(w => w.id === state.activeWalletId)
          if (activeWallet && activeWallet.type !== state.activeNetwork.type) {
            // Fix network mismatch
            const correctNetwork = activeWallet.type === 'EVM' 
              ? state.activeEVMNetwork 
              : state.activeSVMNetwork
            set({ wallets, activeNetwork: correctNetwork })
            return
          }
        }
        
        set({ wallets })
      },
      
      createWalletGroup: async (name, password) => {
        // Generate new seed phrase
        const mnemonic = await EVMWalletService.createSeedPhrase()
        const encryptedSeed = encryptData(mnemonic, password)
        
        const group: WalletGroup = {
          id: `group-${Date.now()}`,
          name,
          encryptedSeed,
          createdAt: new Date(),
          walletCount: 0,
          evmWalletCount: 0,
          svmWalletCount: 0
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
      
      addWalletToGroup: async (groupId, name, walletType) => {
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
        
        // Calculate derivation index based on type
        let derivationIndex: number
        if (walletType === 'EVM') {
          derivationIndex = group.evmWalletCount
        } else {
          derivationIndex = group.svmWalletCount
        }
        
        // Derive wallet
        let walletData
        if (walletType === 'EVM') {
          walletData = await EVMWalletService.deriveWalletFromSeed(mnemonic, derivationIndex)
        } else if (walletType === 'SVM') {
          walletData = await SVMWalletService.deriveWalletFromSeed(mnemonic, derivationIndex)
        } else {
          throw new Error('Invalid wallet type')
        }
        
        const wallet: Wallet = {
          id: `wallet-${Date.now()}`,
          groupId,
          name,
          address: walletData.address,
          type: walletType,
          derivationIndex,
          createdAt: new Date()
        }
        
        // Update group wallet count
        const updateData: any = { 
          walletCount: group.walletCount + 1,
          ...(walletType === 'EVM' 
            ? { evmWalletCount: group.evmWalletCount + 1 }
            : { svmWalletCount: group.svmWalletCount + 1 }
          )
        }
        await db.walletGroups.update(groupId, updateData)
        
        // Add wallet
        await db.wallets.add({
          ...wallet,
          createdAt: wallet.createdAt.getTime()
        })
        
        set((state) => ({
          wallets: [...state.wallets, wallet],
          walletGroups: state.walletGroups.map(g => 
            g.id === groupId ? { ...g, ...updateData } : g
          )
        }))
        
        return wallet
      },
      
      loadWalletGroups: async () => {
        const storedGroups = await db.walletGroups.toArray()
        const wallets = await db.wallets.toArray()
        
        const groups = await Promise.all(storedGroups.map(async (g) => {
          // Count wallets for this group if counts are missing
          const groupWallets = wallets.filter(w => w.groupId === g.id)
          const evmCount = g.evmWalletCount ?? groupWallets.filter(w => w.type === 'EVM').length
          const svmCount = g.svmWalletCount ?? groupWallets.filter(w => w.type === 'SVM').length
          
          // Update database if counts were missing
          if (g.evmWalletCount === undefined || g.svmWalletCount === undefined) {
            await db.walletGroups.update(g.id, {
              evmWalletCount: evmCount,
              svmWalletCount: svmCount
            })
          }
          
          return {
            ...g,
            createdAt: new Date(g.createdAt),
            evmWalletCount: evmCount,
            svmWalletCount: svmCount
          }
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
      
      importWalletGroup: async (name, seedPhrase, password, walletNames, evmCount = 0, svmCount = 0) => {
        const encryptedSeed = encryptData(seedPhrase, password)
        
        const group: WalletGroup = {
          id: `group-${Date.now()}`,
          name,
          encryptedSeed,
          createdAt: new Date(),
          walletCount: 0,
          evmWalletCount: 0,
          svmWalletCount: 0
        }
        
        await db.walletGroups.add({
          ...group,
          createdAt: group.createdAt.getTime()
        })
        
        set((state) => ({
          walletGroups: [...state.walletGroups, group]
        }))
        
        // Generate EVM and SVM wallets
        let walletIndex = 0
        
        // Generate EVM wallets
        if (evmCount > 0) {
          for (let i = 0; i < evmCount; i++) {
            const walletName = walletNames?.[walletIndex] || `${name} - EVM Wallet #${i + 1}`
            await get().addWalletToGroup(group.id, walletName, 'EVM')
            walletIndex++
          }
        }
        
        // Generate SVM wallets
        if (svmCount > 0) {
          for (let i = 0; i < svmCount; i++) {
            const walletName = walletNames?.[walletIndex] || `${name} - SVM Wallet #${i + 1}`
            await get().addWalletToGroup(group.id, walletName, 'SVM')
            walletIndex++
          }
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
      
      updateWalletGroup: async (id, updates) => {
        const updateData: any = {}
        if (updates.createdAt) {
          updateData.createdAt = updates.createdAt.getTime()
        }
        Object.keys(updates).forEach((key) => {
          if (key !== 'createdAt') {
            updateData[key] = (updates as any)[key]
          }
        })
        await db.walletGroups.update(id, updateData)
        set((state) => ({
          walletGroups: state.walletGroups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }))
      },
      
      reorderWalletGroups: async (groupIds) => {
        // Update order for each group
        const updates = groupIds.map((id, index) => ({ id, order: index }))
        
        // Update database
        for (const update of updates) {
          await db.walletGroups.update(update.id, { order: update.order })
        }
        
        // Update state
        set((state) => ({
          walletGroups: state.walletGroups.map(group => {
            const newOrder = groupIds.indexOf(group.id)
            return newOrder !== -1 ? { ...group, order: newOrder } : group
          })
        }))
      },
      
      reorderWallets: async (walletIds) => {
        // Update order for each wallet
        const updates = walletIds.map((id, index) => ({ id, order: index }))
        
        // Update database
        for (const update of updates) {
          await db.wallets.update(update.id, { order: update.order })
        }
        
        // Update state
        set((state) => ({
          wallets: state.wallets.map(wallet => {
            const newOrder = walletIds.indexOf(wallet.id)
            return newOrder !== -1 ? { ...wallet, order: newOrder } : wallet
          })
        }))
      },
    }),
    {
      name: 'wallet-store',
      partialize: (state) => ({
        activeWalletId: state.activeWalletId,
        activeNetwork: state.activeNetwork,
        activeEVMNetwork: state.activeEVMNetwork,
        activeSVMNetwork: state.activeSVMNetwork,
      }),
      migrate: (persistedState: any) => {
        // Ensure activeEVMNetwork and activeSVMNetwork exist
        if (!persistedState.activeEVMNetwork) {
          persistedState.activeEVMNetwork = EVM_NETWORKS[0]
        }
        if (!persistedState.activeSVMNetwork) {
          persistedState.activeSVMNetwork = SVM_NETWORKS[0]
        }
        
        // Fix activeNetwork if it's mismatched with the wallet type
        if (persistedState.activeWalletId) {
          // We can't check wallet type here since wallets aren't loaded yet
          // So we'll ensure activeNetwork is valid
          if (persistedState.activeNetwork && persistedState.activeNetwork.type === 'SVM') {
            // If it's a Solana network but we can't verify the wallet type,
            // we'll let setActiveWallet handle it properly
          }
        }
        
        return persistedState
      },
    },
  ),
)