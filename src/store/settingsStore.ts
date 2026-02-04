import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../services/storage/database'

interface SettingsState {
  // OpenClaw Gateway settings
  openClawGatewayUrl: string | null
  openClawAuthToken: string | null
  openClawAutoConnect: boolean

  // API keys for external services
  coinGeckoApiKey: string | null

  // General settings
  autoLockTimeout: number
  defaultNetwork: string

  // Actions
  setOpenClawGatewayUrl: (url: string | null) => Promise<void>
  setOpenClawAuthToken: (token: string | null) => Promise<void>
  setOpenClawAutoConnect: (autoConnect: boolean) => Promise<void>
  setCoinGeckoApiKey: (key: string | null) => Promise<void>
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
      autoLockTimeout: 15, // minutes (0 means disabled)
      defaultNetwork: 'base', // Default to Base for research

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

      setAutoLockTimeout: async (timeout) => {
        await db.settings.put({ key: 'autoLockTimeout', value: timeout })
        set({ autoLockTimeout: timeout })
      },

      setDefaultNetwork: async (networkId) => {
        await db.settings.put({ key: 'defaultNetwork', value: networkId })
        set({ defaultNetwork: networkId })
      },

      loadSettings: async () => {
        const settings = await db.settings.toArray()
        const settingsMap = settings.reduce(
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
      }),
    },
  ),
)
