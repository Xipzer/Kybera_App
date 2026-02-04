/**
 * Research Store
 * Manages token research state and OpenClaw connection
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
import { OpenClawService, ConnectionState, OpenClawEvent } from '../services/openclaw/openClawService'

interface ResearchState {
  // Connection state
  connectionState: ConnectionState
  connectionError: string | null
  
  // Active researches
  researches: TokenResearch[]
  activeResearchId: string | null
  
  // Chat messages for current session
  messages: ResearchChatMessage[]
  
  // UI state
  isResearching: boolean
  currentResearchStep: string | null
  researchProgress: number
  
  // Actions
  connect: (gatewayUrl: string, authToken?: string) => Promise<void>
  disconnect: () => void
  
  requestResearch: (contractAddress: string, network: ResearchNetwork) => Promise<string>
  sendMessage: (content: string) => Promise<void>
  
  dismissResearch: (researchId: string) => void
  markAsTraded: (researchId: string, amount: number, txHash: string) => void
  
  setActiveResearch: (researchId: string | null) => void
  clearMessages: () => void
  
  // Internal actions for handling events
  _setConnectionState: (state: ConnectionState) => void
  _setConnectionError: (error: string | null) => void
  _updateResearch: (researchId: string, updates: Partial<TokenResearch>) => void
  _setResearchComplete: (researchId: string, research: TokenResearch) => void
  _addChatMessage: (message: ResearchChatMessage) => void
  _setResearching: (isResearching: boolean, step?: string | null, progress?: number) => void
}

// Create store without event listeners in creation
export const useResearchStore = create<ResearchState>()(
  persist(
    (set, get) => ({
      // Initial state
      connectionState: 'disconnected',
      connectionError: null,
      researches: [],
      activeResearchId: null,
      messages: [],
      isResearching: false,
      currentResearchStep: null,
      researchProgress: 0,

      // Connection actions
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

      // Research actions
      requestResearch: async (contractAddress, network) => {
        const researchId = await OpenClawService.requestResearch(contractAddress, network)
        
        // Create pending research entry
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
        
        // Add user message to state
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
            r.id === researchId ? { ...r, dismissed: true } : r
          ),
          activeResearchId: state.activeResearchId === researchId ? null : state.activeResearchId,
        }))
      },

      markAsTraded: (researchId, amount, txHash) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === researchId
              ? { ...r, traded: true, tradeAmount: amount, tradeTxHash: txHash }
              : r
          ),
        }))
      },

      setActiveResearch: (researchId) => {
        set({ activeResearchId: researchId })
      },

      clearMessages: () => {
        set({ messages: [] })
      },

      // Internal setters for event handlers
      _setConnectionState: (connectionState) => {
        set({ connectionState })
      },

      _setConnectionError: (connectionError) => {
        set({ connectionError })
      },

      _updateResearch: (researchId, updates) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === researchId ? { ...r, ...updates } : r
          ),
        }))
      },

      _setResearchComplete: (researchId, research) => {
        set((state) => ({
          researches: state.researches.map((r) =>
            r.id === researchId ? research : r
          ),
          isResearching: false,
          currentResearchStep: null,
          researchProgress: 100,
        }))
      },

      _addChatMessage: (message) => {
        set((state) => {
          // Check if this is an update to an existing message (streaming delta)
          const existingIndex = state.messages.findIndex((m) => m.id === message.id)

          if (existingIndex >= 0) {
            // Update existing message content (streaming)
            const updatedMessages = [...state.messages]
            updatedMessages[existingIndex] = {
              ...updatedMessages[existingIndex],
              content: message.content,
              isStreaming: message.isStreaming,
            }
            return { messages: updatedMessages }
          }

          // Add new message
          return { messages: [...state.messages, message] }
        })
      },

      _setResearching: (isResearching, step = null, progress = 0) => {
        set({ isResearching, currentResearchStep: step, researchProgress: progress })
      },
    }),
    {
      name: 'research-store',
      partialize: (state) => ({
        // Only persist completed researches
        researches: state.researches.filter((r) => r.status === 'completed'),
      }),
    }
  )
)

// Set up event listeners OUTSIDE the store (run once on module load)
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
    const complete = event.data as OpenClawResearchComplete
    useResearchStore.getState()._setResearchComplete(complete.researchId, complete.research)
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
}

// Initialize listeners on module load
initializeResearchListeners()

// Legacy selector exports - these are no longer recommended
// Use individual selectors in components instead to prevent re-render loops
// Example: const connectionState = useResearchStore((state) => state.connectionState)
