/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TokenResearch, ResearchNetwork, ResearchChatMessage } from '../types/research'
import { LLMService, ConnectionState, LLMEvent } from '../services/llm/llmService'
import { PendingAction } from '../types/aiActions'
import type { ProviderId } from '../services/llm/types'

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
  
  connect: (provider: ProviderId, model: string) => Promise<void>
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

      connect: async (provider, model) => {
        set({ connectionError: null })

        try {
          LLMService.configure({ provider, model })
          await LLMService.connect()
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
        LLMService.disconnect()
        set({
          connectionState: 'disconnected',
          connectionError: null,
        })
      },

      requestResearch: async (contractAddress, network) => {
        const researchId = await LLMService.requestResearch(contractAddress, network)

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
          id: `msg_${crypto.randomUUID()}`,
          role: 'user',
          content,
          timestamp: new Date(),
          researchId: activeResearchId || undefined,
        }

        set((state) => ({
          messages: [...state.messages, userMessage],
        }))

        await LLMService.sendChatMessage(content)
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
        LLMService.resolveConfirmation(pendingAction.id, true)
      },

      rejectAction: async () => {
        const { pendingAction } = get()
        if (!pendingAction) return

        set({ pendingAction: null })
        LLMService.resolveConfirmation(pendingAction.id, false)
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
            const existing = state.messages[existingIndex]
            const updatedMessages = [...state.messages]
            updatedMessages[existingIndex] = {
              ...existing,
              content: message.content,
              isStreaming: message.isStreaming,
              ...(message.researchId && { researchId: message.researchId }),
              // Preserve actionResult if the new message doesn't carry one
              // (streaming overwrites would otherwise lose it)
              actionResult: message.actionResult ?? existing.actionResult,
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
const consumedRunIds = new Set<string>()

export function initializeResearchListeners() {
  if (listenersInitialized) return
  listenersInitialized = true

  LLMService.on('connection_change', (event: LLMEvent) => {
    const data = event.data as { currentState: ConnectionState }
    useResearchStore.getState()._setConnectionState(data.currentState)
    if (data.currentState === 'error') {
      useResearchStore.getState()._setConnectionError('Connection lost')
    }
  })

  LLMService.on('research_started', (event: LLMEvent) => {
    const { researchId } = event.data as { researchId: string }
    consumedRunIds.add(researchId)
    useResearchStore.getState()._setResearching(true, 'Researching...', 0)
  })

  LLMService.on('chat_message', (event: LLMEvent) => {
    const msg = event.data as ResearchChatMessage
    useResearchStore.getState()._addChatMessage(msg)
    if (!msg.isStreaming) {
      useResearchStore.getState()._setResearching(false, null, 0)
    }
  })

  LLMService.on('error', (event: LLMEvent) => {
    const error = event.data as { message: string }
    useResearchStore.getState()._setConnectionError(error.message)
    useResearchStore.getState()._setResearching(false)
  })

  LLMService.on('research_error', (event: LLMEvent) => {
    const error = event.data as { researchId: string; message: string }
    useResearchStore.getState()._updateResearch(error.researchId, {
      status: 'failed',
      errorMessage: error.message,
    })
    useResearchStore.getState()._setResearching(false)
  })

  LLMService.on('action_requested', (event: LLMEvent) => {
    const { action } = event.data as { action: PendingAction }
    useResearchStore.getState()._setPendingAction(action)
  })

  LLMService.on('action_result', (event: LLMEvent) => {
    const result = event.data as { actionName?: string; runId?: string; success: boolean; message: string; data?: unknown; error?: string }
    const hasCard = !!result.actionName
    const store = useResearchStore.getState()

    if (hasCard) {
      if (result.runId) consumedRunIds.add(result.runId)
      useResearchStore.setState((state) => ({
        messages: state.messages.filter((m) => {
          if (result.runId && m.id === result.runId) return false
          if (m.role === 'assistant' && m.isStreaming) return false
          return true
        }),
      }))
    }

    store._setResearching(false, null, 0)
    store._addChatMessage({
      id: `action_result_${Date.now()}`,
      role: 'assistant',
      content: hasCard && result.success
        ? ''
        : `✗ ${result.message}${result.error ? `: ${result.error}` : ''}`,
      timestamp: new Date(),
      isStreaming: false,
      actionResult: hasCard ? {
        actionName: result.actionName!,
        success: result.success,
        message: result.message,
        data: result.data,
        error: result.error,
      } : undefined,
    })
  })
}

initializeResearchListeners()