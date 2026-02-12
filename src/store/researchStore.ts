/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  TokenResearch,
  ResearchNetwork,
  ResearchChatMessage,
  OpenClawResearchUpdate,
  OpenClawResearchComplete,
} from '../types/research'
import { OpenClawService, ConnectionState, OpenClawEvent } from '../services/openClawService'
import { PendingAction } from '../types/aiActions'

interface ResearchState {
  connectionState: ConnectionState
  connectionError: string | null
  
  researches: TokenResearch[]
  activeResearchId: string | null
  
  messages: ResearchChatMessage[]
  
  isResearching: boolean
  currentResearchStep: string | null
  researchProgress: number

  pendingAction: PendingAction | null
  
  connect: (gatewayUrl: string, authToken?: string) => Promise<void>
  disconnect: () => void
  
  requestResearch: (contractAddress: string, network: ResearchNetwork) => Promise<string>
  sendMessage: (content: string) => Promise<void>
  
  dismissResearch: (researchId: string) => void
  markAsTraded: (researchId: string, amount: number, txHash: string) => void
  
  setActiveResearch: (researchId: string | null) => void
  clearMessages: () => void

  approveAction: () => Promise<void>
  rejectAction: (reason?: string) => Promise<void>
  
  _setConnectionState: (state: ConnectionState) => void
  _setConnectionError: (error: string | null) => void
  _updateResearch: (researchId: string, updates: Partial<TokenResearch>) => void
  _setResearchComplete: (researchId: string, research: TokenResearch) => void
  _addChatMessage: (message: ResearchChatMessage) => void
  _setResearching: (isResearching: boolean, step?: string | null, progress?: number) => void
  _setPendingAction: (action: PendingAction | null) => void
}

export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      connectionState: 'disconnected',
      connectionError: null,
      researches: [],
      activeResearchId: null,
      messages: [],
      isResearching: false,
      currentResearchStep: null,
      researchProgress: 0,
      pendingAction: null,

      connect: async (gatewayUrl, authToken) => {
        set({ connectionError: null })

        try {
          OpenClawService.configure({
            gatewayUrl,
            authToken,
            reconnectAttempts: 5,
            reconnectDelay: 2000,
          })

          await OpenClawService.connect()
        } catch (error) {
          console.error('[ResearchStore] Connection failed:', error)
          set({
            connectionState: 'error',
            connectionError: error instanceof Error ? error.message : 'Failed to connect',
          })
          throw error
        }
      },

      disconnect: () => {
        OpenClawService.disconnect()
        set({
          connectionState: 'disconnected',
          connectionError: null,
        })
      },

      requestResearch: async (contractAddress, network) => {
        const researchId = await OpenClawService.requestResearch(contractAddress, network)

        const newResearch: TokenResearch = {
          id: researchId,
          contractAddress,
          network,
          tokenName: 'Loading...',
          tokenSymbol: '...',
          marketCap: 0,
          price: 0,
          pros: [],
          cons: [],
          rating: 'yellow',
          timestamp: new Date(),
          sources: [],
          status: 'pending',
        }

        set((state) => ({
          researches: [newResearch, ...state.researches],
          activeResearchId: researchId,
          isResearching: true,
          currentResearchStep: 'Starting research...',
          researchProgress: 0,
        }))

        return researchId
      },

      sendMessage: async (content) => {
        const { activeResearchId } = get()

        const userMessage: ResearchChatMessage = {
          id: `msg_${Date.now()}`,
          role: 'user',
          content,
          timestamp: new Date(),
          researchId: activeResearchId || undefined,
        }

        set((state) => ({
          messages: [...state.messages, userMessage],
        }))

        await OpenClawService.sendChatMessage(content, activeResearchId || undefined)
      },

      dismissResearch: (researchId) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === researchId ? { ...r, dismissed: true } : r,
          ),
          activeResearchId: state.activeResearchId === researchId ? null : state.activeResearchId,
        }))
      },

      markAsTraded: (researchId, amount, txHash) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === researchId
              ? { ...r, traded: true, tradeAmount: amount, tradeTxHash: txHash }
              : r,
          ),
        }))
      },

      setActiveResearch: (researchId) => {
        set({ activeResearchId: researchId })
      },

      clearMessages: () => {
        set({ messages: [] })
      },

      approveAction: async () => {
        const { pendingAction } = get()
        if (!pendingAction) return

        set({ pendingAction: null })
        await OpenClawService.executeActionWithConfirmation(pendingAction)
      },

      rejectAction: async (reason?: string) => {
        const { pendingAction } = get()
        if (!pendingAction) return

        set({ pendingAction: null })
        await OpenClawService.rejectAction(pendingAction, reason)
      },

      _setConnectionState: (connectionState) => {
        set({ connectionState })
      },

      _setConnectionError: (connectionError) => {
        set({ connectionError })
      },

      _updateResearch: (researchId, updates) => {
        set((state) => ({
          researches: state.researches.map((r) => (r.id === researchId ? { ...r, ...updates } : r)),
        }))
      },

      _setResearchComplete: (researchId, research) => {
        set((state) => ({
          researches: state.researches.map((r) => (r.id === researchId ? research : r)),
          messages: state.messages.filter((m) => {
            if (m.researchId === researchId) return false
            if (m.id === researchId) return false
            if (m.role === 'assistant' && m.isStreaming) return false
            return true
          }),
          isResearching: false,
          currentResearchStep: null,
          researchProgress: 100,
        }))
      },

      _addChatMessage: (message) => {
        set((state) => {
          if (message.researchId) {
            const research = state.researches.find((r) => r.id === message.researchId)
            if (research && research.status === 'completed') {
              return state
            }
          }

          const existingIndex = state.messages.findIndex((m) => m.id === message.id)

          if (existingIndex >= 0) {
            const updatedMessages = [...state.messages]
            updatedMessages[existingIndex] = {
              ...updatedMessages[existingIndex],
              content: message.content,
              isStreaming: message.isStreaming,
              ...(message.researchId && { researchId: message.researchId }),
            }
            return { messages: updatedMessages }
          }

          return { messages: [...state.messages, message] }
        })
      },

      _setResearching: (isResearching, step = null, progress = 0) => {
        set({ isResearching, currentResearchStep: step, researchProgress: progress })
      },

      _setPendingAction: (pendingAction) => {
        set({ pendingAction })
      },
    }),
    {
      name: 'research-store',
      partialize: (state) => ({
        researches: state.researches.filter(
          (r) => r.status === 'completed' && r.contractAddress && r.network,
        ),
      }),
    },
  ),
)

let listenersInitialized = false

export function initializeResearchListeners() {
  if (listenersInitialized) return
  listenersInitialized = true

  OpenClawService.on('connection_change', (event: OpenClawEvent) => {
    const data = event.data as { currentState: ConnectionState }
    useResearchStore.getState()._setConnectionState(data.currentState)
    if (data.currentState === 'error') {
      useResearchStore.getState()._setConnectionError('Connection lost')
    }
  })

  OpenClawService.on('research_update', (event: OpenClawEvent) => {
    const update = event.data as OpenClawResearchUpdate
    useResearchStore.getState()._updateResearch(update.researchId, {
      status: update.status,
      ...(update.partialData || {}),
    })
    if (update.currentStep || update.progress !== undefined) {
      useResearchStore.getState()._setResearching(
        true,
        update.currentStep || null,
        update.progress || 0
      )
    }
  })

  OpenClawService.on('research_complete', (event: OpenClawEvent) => {
    const { researchId, research } = event.data as OpenClawResearchComplete
    useResearchStore.getState()._setResearchComplete(researchId, research)
  })

  OpenClawService.on('chat_message', (event: OpenClawEvent) => {
    useResearchStore.getState()._addChatMessage(event.data as ResearchChatMessage)
  })

  OpenClawService.on('error', (event: OpenClawEvent) => {
    const error = event.data as { message: string }
    useResearchStore.getState()._setConnectionError(error.message)
  })

  OpenClawService.on('research_error', (event: OpenClawEvent) => {
    const error = event.data as { researchId: string; message: string }
    useResearchStore.getState()._updateResearch(error.researchId, {
      status: 'failed',
      errorMessage: error.message,
    })
    useResearchStore.getState()._setResearching(false)
  })

  OpenClawService.on('action_requested', (event: OpenClawEvent) => {
    const { action } = event.data as { action: PendingAction }
    useResearchStore.getState()._setPendingAction(action)
  })

  OpenClawService.on('action_result', (event: OpenClawEvent) => {
    const result = event.data as { actionName?: string; success: boolean; message: string; data?: unknown; error?: string }
    useResearchStore.getState()._addChatMessage({
      id: `action_result_${Date.now()}`,
      role: 'assistant',
      content: result.success
        ? `✓ ${result.message}`
        : `✗ ${result.message}${result.error ? `: ${result.error}` : ''}`,
      timestamp: new Date(),
      isStreaming: false,
      actionResult: result.actionName ? {
        actionName: result.actionName,
        success: result.success,
        message: result.message,
        data: result.data,
        error: result.error,
      } : undefined,
    })
  })
}

initializeResearchListeners()