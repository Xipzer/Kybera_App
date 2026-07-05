/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { ChainType, Network, Transaction, Wallet, WalletGroup } from '../types'
import {
  EVM_NETWORKS,
  SVM_NETWORKS,
  getNetworksByType,
  getDefaultNetworkId,
} from '../utils/networks'
import { db, StoredWallet, StoredWalletGroup } from '../services/database'
import { EVMWalletService } from '../services/blockchain/evmWallet'
import { SVMWalletService } from '../services/blockchain/svmWallet'
import { decryptData, encryptData } from '../utils/crypto'
import { memoryProtection } from '../services/security/memoryProtection'

interface WalletState {
  wallets: Wallet[]
  walletGroups: WalletGroup[]
  activeWalletId: string | null
  activeNetwork: Network
  activeEVMNetwork: Network
  activeSVMNetwork: Network
  viewNetworks: string[]
  isLocked: boolean
  password: string | null
  transactions: Transaction[]

  addWallet: (wallet: Wallet) => Promise<void>
  removeWallet: (id: string) => Promise<void>
  setActiveWallet: (id: string | null) => void
  setActiveNetwork: (network: Network) => Promise<void>
  setViewNetworks: (networkIds: string[]) => void
  lock: () => void
  unlock: (password: string) => void
  loadWallets: () => Promise<void>
  updateWallet: (id: string, updates: Partial<Wallet>) => Promise<void>

  createWalletGroup: (
    name: string,
    password: string,
    initialWalletCount?: number,
    walletNames?: string[],
  ) => Promise<WalletGroup>
  removeWalletGroup: (id: string) => Promise<void>
  addWalletToGroup: (groupId: string, name: string, walletType: ChainType) => Promise<Wallet>
  addWalletsToGroup: (
    groupId: string,
    specs: { name: string; type: ChainType }[],
  ) => Promise<Wallet[]>
  loadWalletGroups: () => Promise<void>
  exportGroupSeed: (groupId: string, password: string) => Promise<string>
  getWalletPrivateKey: (walletId: string, password: string) => Promise<string>
  importWalletGroup: (
    name: string,
    seedPhrase: string,
    password: string,
    walletNames?: string[],
    evmCount?: number,
    svmCount?: number,
  ) => Promise<WalletGroup>
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
      viewNetworks: [],
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
        const wallet = state.wallets.find((w) => w.id === id)
        if (wallet) {
          let activeNetwork: Network

          if (wallet.lastNetworkId) {
            const lastNetwork = getNetworksByType(wallet.type).find(
              (n) => n.id === wallet.lastNetworkId,
            )

            if (lastNetwork) {
              activeNetwork = lastNetwork
              if (wallet.type === 'EVM') {
                set({ activeEVMNetwork: lastNetwork })
              } else {
                set({ activeSVMNetwork: lastNetwork })
              }
            } else {
              activeNetwork =
                wallet.type === 'EVM' ? state.activeEVMNetwork : state.activeSVMNetwork
            }
          } else {
            if (wallet.type === 'EVM') {
              activeNetwork = EVM_NETWORKS[0]
              set({ activeEVMNetwork: activeNetwork })
            } else {
              activeNetwork = SVM_NETWORKS[0]
              set({ activeSVMNetwork: activeNetwork })
            }
          }

          set({
            activeWalletId: id,
            activeNetwork,
            viewNetworks: getNetworksByType(wallet.type).map((n) => n.id),
          })
        } else {
          set({ activeWalletId: id })
        }
      },

      setActiveNetwork: async (network) => {
        const state = get()

        if (state.activeWalletId) {
          const wallet = state.wallets.find((w) => w.id === state.activeWalletId)
          if (wallet) {
            await db.wallets.update(state.activeWalletId, { lastNetworkId: network.id })

            set((state) => ({
              wallets: state.wallets.map((w) =>
                w.id === state.activeWalletId ? { ...w, lastNetworkId: network.id } : w,
              ),
            }))
          }
        }

        if (network.type === 'EVM') {
          set({ activeNetwork: network, activeEVMNetwork: network })
        } else if (network.type === 'SVM') {
          set({ activeNetwork: network, activeSVMNetwork: network })
        } else {
          set({ activeNetwork: network })
        }
      },

      setViewNetworks: (networkIds) => {
        set({ viewNetworks: networkIds })
      },

      lock: () => {
        const state = get()
        if (state.password) {
          memoryProtection.wipeSensitive('wallet_password')
        }
        set({ isLocked: true, password: null })
      },

      unlock: (password) => {
        memoryProtection.storeSensitive('wallet_password', password, 30 * 60 * 1000)
        set({ isLocked: false, password })
      },

      loadWallets: async () => {
        const wallets = (await db.wallets.toArray()).map((w) => ({
          ...w,
          createdAt: new Date(w.createdAt),
        }))

        const state = get()
        const updates: Partial<WalletState> = { wallets }

        if (state.activeWalletId) {
          const activeWallet = wallets.find((w) => w.id === state.activeWalletId)
          if (activeWallet) {
            if (activeWallet.type !== state.activeNetwork.type) {
              const correctNetwork =
                activeWallet.type === 'EVM' ? state.activeEVMNetwork : state.activeSVMNetwork
              updates.activeNetwork = correctNetwork
            }

            if (!state.viewNetworks || state.viewNetworks.length === 0) {
              updates.viewNetworks = getNetworksByType(activeWallet.type).map((n) => n.id)
            }
          }
        }

        set(updates)
      },

      createWalletGroup: async (name, password) => {
        const mnemonic = await EVMWalletService.createSeedPhrase()
        const encryptedSeed = await encryptData(mnemonic, password)

        const group: WalletGroup = {
          id: `group-${Date.now()}`,
          name,
          encryptedSeed,
          createdAt: new Date(),
          walletCount: 0,
          evmWalletCount: 0,
          svmWalletCount: 0,
        }

        await db.walletGroups.add({
          ...group,
          createdAt: group.createdAt.getTime(),
        })

        set((state) => ({
          walletGroups: [...state.walletGroups, group],
        }))

        return group
      },

      removeWalletGroup: async (id) => {
        const walletsToRemove = get().wallets.filter((w) => w.groupId === id)
        for (const wallet of walletsToRemove) {
          await db.wallets.delete(wallet.id)
        }

        await db.walletGroups.delete(id)

        set((state) => ({
          walletGroups: state.walletGroups.filter((g) => g.id !== id),
          wallets: state.wallets.filter((w) => w.groupId !== id),
          activeWalletId: walletsToRemove.some((w) => w.id === state.activeWalletId)
            ? null
            : state.activeWalletId,
        }))
      },

      addWalletToGroup: async (groupId, name, walletType) => {
        const group = get().walletGroups.find((g) => g.id === groupId)
        if (!group) throw new Error('Group not found')

        if (group.id === 'default-imported') {
          throw new Error('Cannot add wallets to imported group. Use import instead.')
        }

        const password = get().password
        if (!password) throw new Error('Password required')

        const mnemonic = await decryptData(group.encryptedSeed, password)

        let derivationIndex: number
        if (walletType === 'EVM') {
          derivationIndex = group.evmWalletCount
        } else {
          derivationIndex = group.svmWalletCount
        }

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
          createdAt: new Date(),
          lastNetworkId: getDefaultNetworkId(walletType),
        }

        const updateData: Partial<Pick<WalletGroup, 'walletCount' | 'evmWalletCount' | 'svmWalletCount'>> = {
          walletCount: group.walletCount + 1,
          ...(walletType === 'EVM'
            ? { evmWalletCount: group.evmWalletCount + 1 }
            : { svmWalletCount: group.svmWalletCount + 1 }),
        }
        await db.walletGroups.update(groupId, updateData)

        await db.wallets.add({
          ...wallet,
          createdAt: wallet.createdAt.getTime(),
        })

        set((state) => ({
          wallets: [...state.wallets, wallet],
          walletGroups: state.walletGroups.map((g) =>
            g.id === groupId ? { ...g, ...updateData } : g,
          ),
        }))

        return wallet
      },

      addWalletsToGroup: async (groupId, specs) => {
        const group = get().walletGroups.find((g) => g.id === groupId)
        if (!group) throw new Error('Group not found')
        if (group.id === 'default-imported') throw new Error('Cannot add wallets to imported group')
        const password = get().password
        if (!password) throw new Error('Password required')

        const mnemonic = await decryptData(group.encryptedSeed, password)
        let evmIndex = group.evmWalletCount
        let svmIndex = group.svmWalletCount
        const newWallets: Wallet[] = []

        for (const spec of specs) {
          const derivationIndex = spec.type === 'EVM' ? evmIndex++ : svmIndex++
          const walletData =
            spec.type === 'EVM'
              ? await EVMWalletService.deriveWalletFromSeed(mnemonic, derivationIndex)
              : await SVMWalletService.deriveWalletFromSeed(mnemonic, derivationIndex)

          newWallets.push({
            id: `wallet-${Date.now()}-${newWallets.length}`,
            groupId,
            name: spec.name,
            address: walletData.address,
            type: spec.type,
            derivationIndex,
            createdAt: new Date(),
            lastNetworkId: getDefaultNetworkId(spec.type),
          })
        }

        await db.transaction('rw', db.wallets, db.walletGroups, async () => {
          for (const w of newWallets) {
            await db.wallets.add({ ...w, createdAt: w.createdAt.getTime() })
          }
          await db.walletGroups.update(groupId, {
            walletCount: group.walletCount + specs.length,
            evmWalletCount: evmIndex,
            svmWalletCount: svmIndex,
          })
        })

        set((state) => ({
          wallets: [...state.wallets, ...newWallets],
          walletGroups: state.walletGroups.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  walletCount: group.walletCount + specs.length,
                  evmWalletCount: evmIndex,
                  svmWalletCount: svmIndex,
                }
              : g,
          ),
        }))

        return newWallets
      },

      loadWalletGroups: async () => {
        const groups = (await db.walletGroups.toArray()).map((g) => ({
          ...g,
          createdAt: new Date(g.createdAt),
        }))
        set({ walletGroups: groups })
      },

      exportGroupSeed: async (groupId, password) => {
        const group = get().walletGroups.find((g) => g.id === groupId)
        if (!group) throw new Error('Group not found')

        return await decryptData(group.encryptedSeed, password)
      },

      getWalletPrivateKey: async (walletId, password) => {
        const wallet = get().wallets.find((w) => w.id === walletId)
        if (!wallet) throw new Error('Wallet not found')

        if (wallet.isImported && wallet.encryptedPrivateKey) {
          return await decryptData(wallet.encryptedPrivateKey, password)
        }

        const group = get().walletGroups.find((g) => g.id === wallet.groupId)
        if (!group) throw new Error('Wallet group not found')

        const mnemonic = await decryptData(group.encryptedSeed, password)

        if (wallet.type === 'EVM') {
          const derived = await EVMWalletService.deriveWalletFromSeed(
            mnemonic,
            wallet.derivationIndex,
          )
          return derived.privateKey
        } else {
          const derived = await SVMWalletService.deriveWalletFromSeed(
            mnemonic,
            wallet.derivationIndex,
          )
          return derived.privateKey
        }
      },

      importWalletGroup: async (
        name,
        seedPhrase,
        password,
        walletNames,
        evmCount = 0,
        svmCount = 0,
      ) => {
        const encryptedSeed = await encryptData(seedPhrase, password)

        const group: WalletGroup = {
          id: `group-${Date.now()}`,
          name,
          encryptedSeed,
          createdAt: new Date(),
          walletCount: 0,
          evmWalletCount: 0,
          svmWalletCount: 0,
        }

        await db.walletGroups.add({
          ...group,
          createdAt: group.createdAt.getTime(),
        })

        set((state) => ({
          walletGroups: [...state.walletGroups, group],
        }))

        const specs: { name: string; type: ChainType }[] = []
        let walletIndex = 0

        for (let i = 0; i < evmCount; i++) {
          specs.push({
            name: walletNames?.[walletIndex++] || `${name} - EVM #${i + 1}`,
            type: 'EVM',
          })
        }
        for (let i = 0; i < svmCount; i++) {
          specs.push({
            name: walletNames?.[walletIndex++] || `${name} - SVM #${i + 1}`,
            type: 'SVM',
          })
        }

        if (specs.length > 0) await get().addWalletsToGroup(group.id, specs)

        return group
      },

      updateWallet: async (id, updates) => {
        const updateData: Record<string, unknown> = {}
        if (updates.createdAt) {
          updateData.createdAt = updates.createdAt.getTime()
        }
        Object.keys(updates).forEach((key) => {
          if (key !== 'createdAt') {
            updateData[key] = (updates as Record<string, unknown>)[key]
          }
        })
        await db.wallets.update(id, updateData as Partial<StoredWallet>)
        set((state) => ({
          wallets: state.wallets.map((w) => (w.id === id ? { ...w, ...updates } : w)),
        }))
      },

      updateWalletGroup: async (id, updates) => {
        const updateData: Record<string, unknown> = {}
        if (updates.createdAt) {
          updateData.createdAt = updates.createdAt.getTime()
        }
        Object.keys(updates).forEach((key) => {
          if (key !== 'createdAt') {
            updateData[key] = (updates as Record<string, unknown>)[key]
          }
        })
        await db.walletGroups.update(id, updateData as Partial<StoredWalletGroup>)
        set((state) => ({
          walletGroups: state.walletGroups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
        }))
      },

      reorderWalletGroups: async (groupIds) => {
        for (const update of groupIds.map((id, index) => ({ id, order: index }))) {
          await db.walletGroups.update(update.id, { order: update.order })
        }

        set((state) => ({
          walletGroups: state.walletGroups.map((group) => {
            const newOrder = groupIds.indexOf(group.id)
            return newOrder !== -1 ? { ...group, order: newOrder } : group
          }),
        }))
      },

      reorderWallets: async (walletIds) => {
        for (const update of walletIds.map((id, index) => ({ id, order: index }))) {
          await db.wallets.update(update.id, { order: update.order })
        }

        set((state) => ({
          wallets: state.wallets.map((wallet) => {
            const newOrder = walletIds.indexOf(wallet.id)
            return newOrder !== -1 ? { ...wallet, order: newOrder } : wallet
          }),
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
        viewNetworks: state.viewNetworks,
      }),
    },
  ),
)