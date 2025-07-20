import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../services/storage/database'

interface SettingsState {
  openRouterApiKey: string | null
  selectedModel: string
  autoLockTimeout: number
  defaultNetwork: string

  // Actions
  setOpenRouterApiKey: (key: string | null) => Promise<void>
  setSelectedModel: (model: string) => Promise<void>
  setAutoLockTimeout: (timeout: number) => Promise<void>
  setDefaultNetwork: (networkId: string) => Promise<void>
  loadSettings: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openRouterApiKey: null,
      selectedModel: 'openai/gpt-4-turbo-preview',
      autoLockTimeout: 15, // minutes
      defaultNetwork: 'ethereum',

      setOpenRouterApiKey: async (key) => {
        await db.settings.put({ key: 'openRouterApiKey', value: key })
        set({ openRouterApiKey: key })
      },

      setSelectedModel: async (model) => {
        await db.settings.put({ key: 'selectedModel', value: model })
        set({ selectedModel: model })
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
        const settingsMap = settings.reduce((acc, { key, value }) => {
          acc[key] = value
          return acc
        }, {} as Record<string, any>)

        set({
          openRouterApiKey: settingsMap.openRouterApiKey || null,
          selectedModel: settingsMap.selectedModel || 'openai/gpt-4-turbo-preview',
          autoLockTimeout: settingsMap.autoLockTimeout || 15,
          defaultNetwork: settingsMap.defaultNetwork || 'ethereum',
        })
      },
    }),
    {
      name: 'settings-store',
      partialize: (state) => ({
        selectedModel: state.selectedModel,
        autoLockTimeout: state.autoLockTimeout,
        defaultNetwork: state.defaultNetwork,
      }),
    },
  ),
)