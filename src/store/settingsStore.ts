/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../services/database'

interface SettingsState {
  openClawGatewayUrl: string | null
  openClawAuthToken: string | null
  openClawAutoConnect: boolean

  coinGeckoApiKey: string | null
  alchemyApiKey: string | null
  heliusApiKey: string | null
  autoLockTimeout: number
  defaultNetwork: string

  setOpenClawGatewayUrl: (url: string | null) => Promise<void>
  setOpenClawAuthToken: (token: string | null) => Promise<void>
  setOpenClawAutoConnect: (autoConnect: boolean) => Promise<void>
  setCoinGeckoApiKey: (key: string | null) => Promise<void>
  setAlchemyApiKey: (key: string | null) => Promise<void>
  setHeliusApiKey: (key: string | null) => Promise<void>
  setAutoLockTimeout: (timeout: number) => Promise<void>
  setDefaultNetwork: (networkId: string) => Promise<void>

  loadSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openClawGatewayUrl: null,
      openClawAuthToken: null,
      openClawAutoConnect: true,
      coinGeckoApiKey: null,
      alchemyApiKey: null,
      heliusApiKey: null,
      autoLockTimeout: 15,
      defaultNetwork: 'base',

      setOpenClawGatewayUrl: async (url) => {
        await db.settings.put({ key: 'openClawGatewayUrl', value: url })
        set({ openClawGatewayUrl: url })
      },

      setOpenClawAuthToken: async (token) => {
        await db.settings.put({ key: 'openClawAuthToken', value: token })
        set({ openClawAuthToken: token })
      },

      setOpenClawAutoConnect: async (autoConnect) => {
        await db.settings.put({ key: 'openClawAutoConnect', value: autoConnect })
        set({ openClawAutoConnect: autoConnect })
      },

      setCoinGeckoApiKey: async (key) => {
        await db.settings.put({ key: 'coinGeckoApiKey', value: key })
        set({ coinGeckoApiKey: key })
      },

      setAlchemyApiKey: async (key) => {
        await db.settings.put({ key: 'alchemyApiKey', value: key })
        set({ alchemyApiKey: key })
      },

      setHeliusApiKey: async (key) => {
        await db.settings.put({ key: 'heliusApiKey', value: key })
        set({ heliusApiKey: key })
      },

      setAutoLockTimeout: async (timeout) => {
        await db.settings.put({ key: 'autoLockTimeout', value: timeout })
        set({ autoLockTimeout: timeout })
      },

      setDefaultNetwork: async (networkId) => {
        await db.settings.put({ key: 'defaultNetwork', value: networkId })
        set({ defaultNetwork: networkId })
      },

      loadSettings: async () => {
        const settingsMap = (await db.settings.toArray()).reduce(
          (acc, { key, value }) => {
            acc[key] = value
            return acc
          },
          {} as Record<string, any>,
        )

        set({
          openClawGatewayUrl: settingsMap.openClawGatewayUrl || null,
          openClawAuthToken: settingsMap.openClawAuthToken || null,
          openClawAutoConnect: settingsMap.openClawAutoConnect ?? true,
          coinGeckoApiKey: settingsMap.coinGeckoApiKey || null,
          alchemyApiKey: settingsMap.alchemyApiKey || null,
          heliusApiKey: settingsMap.heliusApiKey || null,
          autoLockTimeout: settingsMap.autoLockTimeout || 15,
          defaultNetwork: settingsMap.defaultNetwork || 'base',
        })
      },
    }),
    {
      name: 'settings-store',
      partialize: (state) => ({
        autoLockTimeout: state.autoLockTimeout,
        defaultNetwork: state.defaultNetwork,
        openClawAutoConnect: state.openClawAutoConnect,
        alchemyApiKey: state.alchemyApiKey,
        heliusApiKey: state.heliusApiKey,
        coinGeckoApiKey: state.coinGeckoApiKey,
      }),
    },
  ),
)