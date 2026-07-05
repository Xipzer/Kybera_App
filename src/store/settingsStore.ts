/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { db } from '../services/database'

import type { ProviderId } from '../services/llm/types'

interface SettingsState {
  llmProvider: ProviderId
  llmModel: string | null
  llmAutoConnect: boolean

  coinGeckoApiKey: string | null
  alchemyApiKey: string | null
  heliusApiKey: string | null
  autoLockTimeout: number
  defaultNetwork: string

  setLlmProvider: (provider: ProviderId) => Promise<void>
  setLlmModel: (model: string | null) => Promise<void>
  setLlmAutoConnect: (autoConnect: boolean) => Promise<void>
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
      llmProvider: 'anthropic',
      llmModel: null,
      llmAutoConnect: true,
      coinGeckoApiKey: null,
      alchemyApiKey: null,
      heliusApiKey: null,
      autoLockTimeout: 15,
      defaultNetwork: 'base',

      setLlmProvider: async (provider) => {
        await db.settings.put({ key: 'llmProvider', value: provider })
        set({ llmProvider: provider })
      },

      setLlmModel: async (model) => {
        await db.settings.put({ key: 'llmModel', value: model })
        set({ llmModel: model })
      },

      setLlmAutoConnect: async (autoConnect) => {
        await db.settings.put({ key: 'llmAutoConnect', value: autoConnect })
        set({ llmAutoConnect: autoConnect })
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
          {} as Record<string, unknown>,
        )

        set({
          llmProvider: (settingsMap.llmProvider as ProviderId) || 'anthropic',
          llmModel: (settingsMap.llmModel as string) || null,
          llmAutoConnect: (settingsMap.llmAutoConnect as boolean | undefined) ?? true,
          coinGeckoApiKey: (settingsMap.coinGeckoApiKey as string) || null,
          alchemyApiKey: (settingsMap.alchemyApiKey as string) || null,
          heliusApiKey: (settingsMap.heliusApiKey as string) || null,
          autoLockTimeout: (settingsMap.autoLockTimeout as number) || 15,
          defaultNetwork: (settingsMap.defaultNetwork as string) || 'base',
        })
      },
    }),
    {
      name: 'settings-store',
      partialize: (state) => ({
        autoLockTimeout: state.autoLockTimeout,
        defaultNetwork: state.defaultNetwork,
        llmProvider: state.llmProvider,
        llmModel: state.llmModel,
        llmAutoConnect: state.llmAutoConnect,
        alchemyApiKey: state.alchemyApiKey,
        heliusApiKey: state.heliusApiKey,
        coinGeckoApiKey: state.coinGeckoApiKey,
      }),
    },
  ),
)