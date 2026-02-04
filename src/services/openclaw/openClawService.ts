/**
 * OpenClaw Gateway WebSocket Service
 * Connects to user's local OpenClaw instance for AI-powered token research
 */

import {
  ResearchNetwork,
  OpenClawMessage,
  OpenClawResearchUpdate,
  OpenClawResearchComplete,
  OpenClawError,
  ResearchChatMessage,
} from '../../types/research'

// Connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

// Event types
export type OpenClawEventType =
  | 'connection_change'
  | 'research_started'
  | 'research_update'
  | 'research_complete'
  | 'research_error'
  | 'chat_message'
  | 'error'

export interface OpenClawEvent {
  type: OpenClawEventType
  data: unknown
}

// Listener callback type
type EventListener = (event: OpenClawEvent) => void

// Configuration
export interface OpenClawConfig {
  gatewayUrl: string
  authToken?: string
  reconnectAttempts?: number
  reconnectDelay?: number
  pingInterval?: number
}

class OpenClawServiceClass {
  private ws: WebSocket | null = null
  private config: OpenClawConfig | null = null
  private connectionState: ConnectionState = 'disconnected'
  private listeners: Map<string, Set<EventListener>> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 2000
  private pingInterval: number | null = null
  private pingIntervalMs = 30000
  private sessionId: string | null = null
  private pendingRequests: Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
  > = new Map()

  /**
   * Initialize the service with configuration
   */
  configure(config: OpenClawConfig): void {
    this.config = config
    this.maxReconnectAttempts = config.reconnectAttempts ?? 5
    this.reconnectDelay = config.reconnectDelay ?? 2000
    this.pingIntervalMs = config.pingInterval ?? 30000
  }

  /**
   * Connect to OpenClaw Gateway
   */
  async connect(): Promise<void> {
    if (!this.config?.gatewayUrl) {
      throw new Error('OpenClaw Gateway URL not configured')
    }

    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return
    }

    this.setConnectionState('connecting')

    return new Promise((resolve, reject) => {
      try {
        // Build WebSocket URL with auth token if provided
        let rawUrl = this.config!.gatewayUrl.trim()
        
        // Convert http(s) to ws(s) if needed
        if (rawUrl.startsWith('http://')) {
          rawUrl = 'ws://' + rawUrl.slice(7)
        } else if (rawUrl.startsWith('https://')) {
          rawUrl = 'wss://' + rawUrl.slice(8)
        } else if (!rawUrl.startsWith('ws://') && !rawUrl.startsWith('wss://')) {
          // If no protocol, assume ws://
          rawUrl = 'ws://' + rawUrl
        }
        
        console.log('[OpenClaw] Base URL:', rawUrl)
        
        // Parse URL and add token if provided
        let wsUrl: string
        try {
          const url = new URL(rawUrl)
          if (this.config!.authToken) {
            url.searchParams.set('token', this.config!.authToken)
            console.log('[OpenClaw] Added auth token to URL')
          }
          wsUrl = url.toString()
        } catch (urlError) {
          console.error('[OpenClaw] Invalid URL format:', rawUrl, urlError)
          this.setConnectionState('error')
          reject(new Error(`Invalid gateway URL: ${rawUrl}`))
          return
        }
        
        console.log('[OpenClaw] Connecting to:', wsUrl.replace(/token=[^&]+/, 'token=***'))

        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log('[OpenClaw] Connected to gateway')
          this.setConnectionState('connected')
          this.reconnectAttempts = 0
          this.startPingInterval()
          this.sendHandshake()
          resolve()
        }

        this.ws.onmessage = (event) => {
          console.log('[OpenClaw] Received message:', event.data)
          this.handleMessage(event.data)
        }

        this.ws.onerror = (error) => {
          console.error('[OpenClaw] WebSocket error:', error)
          this.emit('error', { message: 'WebSocket connection error' })
          // Reject the promise on error if still connecting
          if (this.connectionState === 'connecting') {
            this.setConnectionState('error')
            reject(new Error('WebSocket connection failed'))
          }
        }

        this.ws.onclose = (event) => {
          console.log('[OpenClaw] Connection closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
          })
          this.stopPingInterval()

          if (this.connectionState !== 'disconnected') {
            this.handleDisconnection()
          }
        }
      } catch (error) {
        console.error('[OpenClaw] Connection error:', error)
        this.setConnectionState('error')
        reject(error)
      }
    })
  }

  /**
   * Disconnect from OpenClaw Gateway
   */
  disconnect(): void {
    this.setConnectionState('disconnected')
    this.stopPingInterval()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.sessionId = null
    this.pendingRequests.clear()
  }

  /**
   * Request token research
   */
  async requestResearch(contractAddress: string, network: ResearchNetwork): Promise<string> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to OpenClaw Gateway')
    }

    const researchId = this.generateId()

    const message: OpenClawMessage = {
      type: 'research_request',
      payload: {
        researchId,
        contractAddress,
        network,
        skill: 'token-research', // The SKILL.md installed in user's OpenClaw
      },
      timestamp: new Date(),
      sessionId: this.sessionId || undefined,
    }

    this.send(message)
    this.emit('research_started', { researchId, contractAddress, network })

    return researchId
  }

  /**
   * Send a chat message (for follow-up questions about research)
   */
  async sendChatMessage(content: string, researchId?: string): Promise<void> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to OpenClaw Gateway')
    }

    const message: OpenClawMessage = {
      type: 'chat',
      payload: {
        content,
        researchId,
      },
      timestamp: new Date(),
      sessionId: this.sessionId || undefined,
    }

    this.send(message)
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connectionState === 'connected'
  }

  /**
   * Subscribe to events
   */
  on(event: OpenClawEventType | 'all', listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  /**
   * Remove event listener
   */
  off(event: OpenClawEventType | 'all', listener: EventListener): void {
    this.listeners.get(event)?.delete(listener)
  }

  // Private methods

  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState
    this.connectionState = state

    if (previousState !== state) {
      this.emit('connection_change', { previousState, currentState: state })
    }
  }

  private emit(type: OpenClawEventType, data: unknown): void {
    const event: OpenClawEvent = { type, data }

    // Emit to specific listeners
    this.listeners.get(type)?.forEach((listener) => listener(event))

    // Emit to 'all' listeners
    this.listeners.get('all')?.forEach((listener) => listener(event))
  }

  private send(message: OpenClawMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('[OpenClaw] Cannot send message: WebSocket not open')
    }
  }

  private sendHandshake(): void {
    const handshake: OpenClawMessage = {
      type: 'chat',
      payload: {
        type: 'handshake',
        clientVersion: '1.0.0',
        capabilities: ['token-research', 'chat'],
      },
      timestamp: new Date(),
    }
    this.send(handshake)
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as OpenClawMessage

      // Store session ID if provided
      if (message.sessionId) {
        this.sessionId = message.sessionId
      }

      switch (message.type) {
        case 'research_update':
          this.handleResearchUpdate(message.payload as OpenClawResearchUpdate)
          break

        case 'research_complete':
          this.handleResearchComplete(message.payload as OpenClawResearchComplete)
          break

        case 'chat':
          this.handleChatMessage(message.payload as ResearchChatMessage)
          break

        case 'error':
          this.handleError(message.payload as OpenClawError)
          break

        default:
          console.log('[OpenClaw] Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('[OpenClaw] Failed to parse message:', error)
    }
  }

  private handleResearchUpdate(update: OpenClawResearchUpdate): void {
    console.log('[OpenClaw] Research update:', update.researchId, update.currentStep)
    this.emit('research_update', update)
  }

  private handleResearchComplete(complete: OpenClawResearchComplete): void {
    console.log('[OpenClaw] Research complete:', complete.researchId)
    this.emit('research_complete', complete)
  }

  private handleChatMessage(message: ResearchChatMessage): void {
    this.emit('chat_message', message)
  }

  private handleError(error: OpenClawError): void {
    console.error('[OpenClaw] Error:', error.code, error.message)

    if (error.researchId) {
      this.emit('research_error', error)
    } else {
      this.emit('error', error)
    }
  }

  private handleDisconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.setConnectionState('reconnecting')
      this.reconnectAttempts++

      console.log(
        `[OpenClaw] Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`,
      )

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('[OpenClaw] Reconnection failed:', error)
        })
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      this.setConnectionState('error')
      console.error('[OpenClaw] Max reconnection attempts reached')
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval()

    this.pingInterval = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'chat',
          payload: { type: 'ping' },
          timestamp: new Date(),
          sessionId: this.sessionId || undefined,
        })
      }
    }, this.pingIntervalMs)
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private generateId(): string {
    return `research_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

// Export singleton instance
export const OpenClawService = new OpenClawServiceClass()

// Export class for testing
export { OpenClawServiceClass }
