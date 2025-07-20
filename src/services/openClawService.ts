/**
 * Code by Xipzer
 */

import {
  ResearchNetwork,
  OpenClawResearchUpdate,
  OpenClawResearchComplete,
  OpenClawError,
  ResearchChatMessage,
} from '../types/research'
import { dexScreenerService } from './research/dexScreenerService'
import { getToolDefinition, executeAction, createPendingAction, TOOL_DEFINITIONS } from './openClawActions'
import { PendingAction } from '../types/aiActions'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

export type OpenClawEventType =
  | 'connection_change'
  | 'research_started'
  | 'research_update'
  | 'research_complete'
  | 'research_error'
  | 'chat_message'
  | 'action_requested'
  | 'action_result'
  | 'error'

export interface OpenClawEvent {
  type: OpenClawEventType
  data: unknown
}

type EventListener = (event: OpenClawEvent) => void

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
  // @ts-expect-error write-only
  private _pingIntervalMs = 30000
  // @ts-expect-error write-only
  private _sessionId: string | null = null
  private pendingRequests: Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason: unknown) => void }
  > = new Map()
  private researchContext: Map<string, { contractAddress: string; network: string }> = new Map()
  private runIdToResearchId: Map<string, string> = new Map()
  private streamingResponses: Map<string, string> = new Map()
  private completedResearchIds: Set<string> = new Set()
  private lastChatEmit: Map<string, number> = new Map()
  private connectPromise: Promise<void> | null = null
  private reconnectTimeout: number | null = null
  private isAuthenticated = false
  private _authResolve: (() => void) | null = null
  private _authReject: ((error: Error) => void) | null = null

  configure(config: OpenClawConfig): void {
    this.config = config
    this.maxReconnectAttempts = config.reconnectAttempts ?? 5
    this.reconnectDelay = config.reconnectDelay ?? 2000
    this._pingIntervalMs = config.pingInterval ?? 30000
  }

  async connect(): Promise<void> {
    if (!this.config?.gatewayUrl) {
      throw new Error('OpenClaw Gateway URL not configured')
    }

    if (this.connectionState === 'connected' && this.isAuthenticated) {
      return
    }

    if (this.connectPromise) {
      return this.connectPromise
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    if (this.connectionState === 'connecting') {
      return
    }

    this.setConnectionState('connecting')
    this.isAuthenticated = false

    let resolveConnect: () => void
    let rejectConnect: (err: Error) => void
    this.connectPromise = new Promise((resolve, reject) => {
      resolveConnect = resolve
      rejectConnect = reject
    })

    try {
      let rawUrl = this.config!.gatewayUrl.trim()

      if (rawUrl.startsWith('http://')) {
        rawUrl = 'ws://' + rawUrl.slice(7)
      } else if (rawUrl.startsWith('https://')) {
        rawUrl = 'wss://' + rawUrl.slice(8)
      } else if (!rawUrl.startsWith('ws://') && !rawUrl.startsWith('wss://')) {
        rawUrl = 'ws://' + rawUrl
      }

      let wsUrl: string
      try {
        const url = new URL(rawUrl)
        if (this.config!.authToken) {
          url.searchParams.set('token', this.config!.authToken)
        }
        wsUrl = url.toString()
      } catch (urlError) {
        console.error('[OpenClaw] Invalid URL format:', rawUrl, urlError)
        this.setConnectionState('error')
        this.connectPromise = null
        rejectConnect!(new Error(`Invalid gateway URL: ${rawUrl}`))
        return
      }

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
      }

      this._authResolve = () => {
        this.setConnectionState('connected')
        this.isAuthenticated = true
        this.connectPromise = null
        resolveConnect!()
      }

      this._authReject = (error: Error) => {
        this.connectPromise = null
        this.setConnectionState('error')
        rejectConnect!(error)
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      this.ws.onerror = (error) => {
        console.error('[OpenClaw] WebSocket error:', error)
        this.emit('error', { message: 'WebSocket connection error' })
        if (this.connectionState === 'connecting' || !this.isAuthenticated) {
          this.connectPromise = null
          this.setConnectionState('error')
          if (this._authReject) {
            this._authReject(new Error('WebSocket connection failed'))
            this._authReject = null
            this._authResolve = null
          }
        }
      }

      this.ws.onclose = () => {
        this.stopPingInterval()

        if (this.connectionState !== 'disconnected') {
          this.handleDisconnection()
        }
      }
    } catch (error) {
      console.error('[OpenClaw] Connection error:', error)
      this.setConnectionState('error')
      this.connectPromise = null
      rejectConnect!(error instanceof Error ? error : new Error(String(error)))
    }

    return this.connectPromise!
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.setConnectionState('disconnected')
    this.stopPingInterval()
    this.isAuthenticated = false
    this.connectPromise = null
    this._authResolve = null
    this._authReject = null

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this._sessionId = null
    this.pendingRequests.clear()
    this.runIdToResearchId.clear()
    this.completedResearchIds.clear()
    this.streamingResponses.clear()
    this.lastChatEmit.clear()
    this.researchContext.clear()
    this.reconnectAttempts = 0
  }

  private static readonly SKILL_URL = 'https://app.kybera.xyz/SKILL.md'

  async requestResearch(contractAddress: string, network: ResearchNetwork): Promise<string> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to OpenClaw Gateway')
    }

    const researchId = this.generateId()

    const researchPrompt = `[KYBERA RESEARCH REQUEST]
Research ID: ${researchId}
Timestamp: ${new Date().toISOString()}
Contract: ${contractAddress}
Network: ${network}

Read ${OpenClawServiceClass.SKILL_URL} and follow the "Part 1: Token Research" instructions exactly.

If you have the Kybera skill cached at ~/.openclaw/skills/kybera.md, use that. Otherwise, fetch from the URL above and cache it if possible.`

    const request = {
      type: 'req',
      id: researchId,
      method: 'agent',
      params: {
        message: researchPrompt,
        idempotencyKey: researchId,
        agentId: 'main',
      },
    }

    this.researchContext.set(researchId, { contractAddress, network })

    this.sendRaw(request)
    this.emit('research_started', { researchId, contractAddress, network })

    return researchId
  }

  async sendChatMessage(content: string, _researchId?: string): Promise<void> {
    if (this.connectionState !== 'connected') {
      throw new Error('Not connected to OpenClaw Gateway')
    }

    const msgId = this.generateId()

    const messageWithSkillRef = `[KYBERA COMMAND]
${content}

If this is a wallet action request, use the Kybera skill (cached at ~/.openclaw/skills/kybera.md or fetch from ${OpenClawServiceClass.SKILL_URL}) and follow "Part 2: Wallet Actions" to respond with the appropriate JSON action block.`

    const request = {
      type: 'req',
      id: msgId,
      method: 'agent',
      params: {
        message: messageWithSkillRef,
        idempotencyKey: msgId,
        agentId: 'main',
      },
    }

    this.runIdToResearchId.set(msgId, msgId)
    this.sendRaw(request)
  }

  async executeActionWithConfirmation(action: PendingAction): Promise<void> {
    const result = await executeAction(action.name, action.parameters)

    this.emit('action_result', {
      actionId: action.id,
      toolCallId: action.toolCallId,
      ...result,
    })

    if (this.connectionState === 'connected') {
      const response = {
        type: 'req',
        id: this.generateId(),
        method: 'agent',
        params: {
          message: `Tool result for ${action.name}: ${JSON.stringify(result)}`,
          idempotencyKey: this.generateId(),
          agentId: 'main',
          toolResult: {
            toolCallId: action.toolCallId,
            result: result,
          },
        },
      }
      this.sendRaw(response)
    }
  }

  async rejectAction(action: PendingAction, reason?: string): Promise<void> {
    this.emit('action_result', {
      actionId: action.id,
      toolCallId: action.toolCallId,
      success: false,
      message: reason || 'Action rejected by user',
      error: 'USER_REJECTED',
    })

    if (this.connectionState === 'connected') {
      const response = {
        type: 'req',
        id: this.generateId(),
        method: 'agent',
        params: {
          message: `Tool ${action.name} was rejected by user: ${reason || 'No reason provided'}`,
          idempotencyKey: this.generateId(),
          agentId: 'main',
          toolResult: {
            toolCallId: action.toolCallId,
            result: { success: false, error: 'USER_REJECTED', message: reason || 'Action rejected by user' },
          },
        },
      }
      this.sendRaw(response)
    }
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  isConnected(): boolean {
    return this.connectionState === 'connected'
  }

  on(event: OpenClawEventType | 'all', listener: EventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)

    return () => {
      this.listeners.get(event)?.delete(listener)
    }
  }

  off(event: OpenClawEventType | 'all', listener: EventListener): void {
    this.listeners.get(event)?.delete(listener)
  }

  private setConnectionState(state: ConnectionState): void {
    const previousState = this.connectionState
    this.connectionState = state

    if (previousState !== state) {
      this.emit('connection_change', { previousState, currentState: state })
    }
  }

  private emit(type: OpenClawEventType, data: unknown): void {
    const event: OpenClawEvent = { type, data }

    this.listeners.get(type)?.forEach((listener) => listener(event))

    this.listeners.get('all')?.forEach((listener) => listener(event))
  }

  private sendRaw(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.error('[OpenClaw] Cannot send message: WebSocket not open')
    }
  }

  private handleChallenge(_nonce: string): void {
    const connectRequest = {
      type: 'req',
      id: this.generateId(),
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'webchat-ui',
          version: '1.0.0',
          platform: 'linux',
          mode: 'ui',
        },
        auth: { token: this.config?.authToken || '' },
      },
    }
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(connectRequest))
    }
  }

  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)

      if (message.type === 'event') {
        switch (message.event) {
          case 'connect.challenge':
            this.handleChallenge(message.payload?.nonce)
            return
          case 'connect.success':
            this._sessionId = message.payload?.sessionId
            return
          case 'connect.error':
            console.error('[OpenClaw] Authentication failed:', message.payload?.message)
            this.emit('error', { message: message.payload?.message || 'Authentication failed' })
            return
          case 'agent': {
            const agentPayload = message.payload
            const runId = agentPayload?.runId

            if (!runId) return

            const researchId = this.runIdToResearchId.get(runId) || runId

            if (agentPayload?.stream === 'lifecycle') {
              const phase = agentPayload.data?.phase
              if (phase === 'start') {
                this.emit('research_update', {
                  researchId,
                  status: 'researching',
                  currentStep: 'AI agent started processing...',
                  progress: 20,
                })
              } else if (phase === 'end') {
                const accumulatedText = this.streamingResponses.get(runId)
                if (accumulatedText) {
                  this.completedResearchIds.add(researchId)
                  this.streamingResponses.delete(runId)
                  this.lastChatEmit.delete(runId)
                  this.runIdToResearchId.delete(runId)
                  this.handleAgentResponse(researchId, { text: accumulatedText })
                }
              } else if (phase === 'error') {
                this.runIdToResearchId.delete(runId)
                this.emit('research_error', {
                  researchId,
                  message: agentPayload.data?.error || 'Agent error',
                })
              }
            } else if (agentPayload?.stream === 'assistant') {
              const streamText = agentPayload?.data?.text
              if (streamText) {
                this.streamingResponses.set(runId, streamText)

                this.emit('chat_message', {
                  id: runId,
                  role: 'assistant',
                  content: streamText,
                  timestamp: new Date(),
                  isStreaming: true,
                  researchId,
                })
                this.emit('research_update', {
                  researchId,
                  status: 'researching',
                  currentStep: 'OpenClaw is cooking...',
                  progress: 50,
                })
                this.parseAndExecuteActions(streamText, runId)
              }

              const toolUse = agentPayload?.data?.toolUse || agentPayload?.toolUse
              if (toolUse) {
                this.handleToolCall(runId, toolUse)
              }
            } else if (agentPayload?.stream === 'tool_use' || agentPayload?.stream === 'tool_call') {
              const toolData = agentPayload?.data || agentPayload
              if (toolData?.name || toolData?.function?.name) {
                this.handleToolCall(runId, toolData)
              }
            } else if (agentPayload?.stream === 'text') {
              const textContent = agentPayload?.data?.text || agentPayload?.text
              if (textContent && runId) {
                this.streamingResponses.set(runId, textContent)
                this.emit('chat_message', {
                  id: runId,
                  role: 'assistant',
                  content: textContent,
                  timestamp: new Date(),
                  isStreaming: true,
                  researchId,
                })
                this.parseAndExecuteActions(textContent, runId)
              }
            } else if (
              agentPayload?.stream === 'result' ||
              agentPayload?.text ||
              agentPayload?.content
            ) {
              this.handleAgentResponse(researchId, agentPayload)
            }
            return
          }
          case 'chat': {
            const chatPayload = message.payload
            const chatRunId = chatPayload?.runId || `msg_${Date.now()}`

            let chatText: string | null = null

            if (chatPayload?.message?.content && Array.isArray(chatPayload.message.content)) {
              const textBlocks = chatPayload.message.content
                .filter((block: { type: string }) => block.type === 'text')
                .map((block: { text: string }) => block.text)
              chatText = textBlocks.join('')
            } else if (typeof chatPayload?.message === 'string') {
              chatText = chatPayload.message
            } else if (typeof chatPayload?.text === 'string') {
              chatText = chatPayload.text
            }

            if (chatText) {
              const messageId = chatRunId
              const isDelta = chatPayload?.state === 'delta'

              if (isDelta && messageId) {
                this.streamingResponses.set(messageId, chatText)
              }

              this.emit('chat_message', {
                id: messageId,
                role: 'assistant',
                content: chatText,
                timestamp: new Date(),
                isStreaming: isDelta,
                researchId: this.runIdToResearchId.get(chatRunId) || chatRunId,
              })
            }
            return
          }
          default:
        }
        return
      }

      if (message.type === 'res') {
        if (message.ok && message.payload?.type === 'hello-ok') {
          this._sessionId = message.id
          if (message.payload?.policy?.tickIntervalMs) {
            this._pingIntervalMs = message.payload.policy.tickIntervalMs
          }
          if (this._authResolve) {
            this._authResolve()
            this._authResolve = null
            this._authReject = null
          }
          return
        } else if (message.ok && message.id) {
          if (message.payload?.status === 'accepted') {
            const acceptedRunId = message.payload.runId
            if (acceptedRunId) {
              this.runIdToResearchId.set(acceptedRunId, message.id)
              const ctx = this.researchContext.get(message.id)
              if (ctx) {
                this.researchContext.set(acceptedRunId, ctx)
              }
            }
            this.emit('research_update', {
              researchId: message.id,
              status: 'researching',
              currentStep: 'Request accepted, AI is processing...',
              progress: 10,
            })
            return
          }

          if (message.payload && message.payload.status !== 'accepted') {
            if (this.completedResearchIds.has(message.id)) {
              return
            }
            this.handleAgentResponse(message.id, message.payload)
          }
          return
        } else if (!message.ok) {
          const errorMsg = message.error?.message || message.payload?.message || 'Request failed'
          console.error('[OpenClaw] Request failed:', errorMsg, 'id:', message.id)

          if (this._authReject && !this.isAuthenticated) {
            this._authReject(new Error(errorMsg))
            this._authReject = null
            this._authResolve = null
            if (this.ws) {
              this.ws.close(1000, 'Authentication failed')
            }
          } else if (message.id) {
            this.emit('research_error', {
              researchId: message.id,
              message: errorMsg,
              code: message.error?.code,
            })
          } else {
            this.emit('error', { message: errorMsg })
          }
          return
        }
      }

      if (message.sessionId) {
        this._sessionId = message.sessionId
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
      }
    } catch (error) {
      console.error('[OpenClaw] Failed to parse message:', error)
    }
  }

  private handleResearchUpdate(update: OpenClawResearchUpdate): void {
    this.emit('research_update', update)
  }

  private handleResearchComplete(complete: OpenClawResearchComplete): void {
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

  private async handleAgentResponse(requestId: string, payload: unknown): Promise<void> {
    const response = payload as Record<string, unknown>
    let responseText = ''

    if (response.result && typeof response.result === 'object') {
      const result = response.result as Record<string, unknown>
      if (Array.isArray(result.payloads)) {
        responseText = result.payloads
          .map((p: { text?: string }) => p.text || '')
          .filter(Boolean)
          .join('\n\n')
      }
    }

    if (!responseText) {
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>
        responseText = String(data.text || data.message || data.content || '')
      } else {
        responseText = String(
          response.text ||
            response.message ||
            response.content ||
            response.response ||
            (typeof payload === 'string' ? payload : ''),
        )
      }
    }

    if (!responseText) {
      console.warn('[OpenClaw] Could not extract text from response, using JSON')
      responseText = JSON.stringify(payload, null, 2)
    }

    const research = this.parseResearchResponse(requestId, responseText)

    if (
      (research.tokenName as string) === 'Unknown Token' &&
      (research.tokenSymbol as string) === '???'
    ) {
      console.warn('[OpenClaw] Failed to parse research response - no token info found')
      if (!this.completedResearchIds.has(requestId)) {
        this.emit('chat_message', {
          id: requestId,
          role: 'assistant',
          content: responseText,
          timestamp: new Date(),
          isStreaming: false,
          researchId: requestId,
        })
        this.emit('research_error', {
          researchId: requestId,
          message: 'Could not parse token information from response',
        })
      }
      return
    }

    this.emit('research_complete', {
      researchId: requestId,
      research,
    })

    this.fetchTokenLogoAsync(requestId, research)
  }

  private handleToolCall(runId: string, toolData: Record<string, unknown>): void {
    const funcData = toolData.function as Record<string, unknown> | undefined
    const toolName = (toolData.name || funcData?.name) as string
    const toolCallId = (toolData.id || toolData.toolCallId || `tool_${Date.now()}`) as string

    let params: Record<string, unknown> = {}
    if (toolData.input) {
      params = toolData.input as Record<string, unknown>
    } else if (toolData.arguments) {
      try {
        params = typeof toolData.arguments === 'string' ? JSON.parse(toolData.arguments as string) : toolData.arguments as Record<string, unknown>
      } catch {
        params = {}
      }
    } else if (funcData?.arguments) {
      try {
        params = typeof funcData.arguments === 'string' ? JSON.parse(funcData.arguments as string) : funcData.arguments as Record<string, unknown>
      } catch {
        params = {}
      }
    }

    const toolDef = getToolDefinition(toolName)
    if (!toolDef) {
      console.warn(`[OpenClaw] Unknown tool: ${toolName}`)
      return
    }

    if (toolDef.requiresConfirmation) {
      const pendingAction = createPendingAction(toolCallId, toolName, params)
      if (pendingAction) {
        this.emit('action_requested', { action: pendingAction, runId })
      }
    } else {
      executeAction(toolName, params).then((result) => {
        this.emit('action_result', {
          actionId: `auto_${toolCallId}`,
          toolCallId,
          ...result,
        })

        this.emit('chat_message', {
          id: `result_${toolCallId}`,
          role: 'assistant',
          content: result.success
            ? `✓ ${result.message}${result.data ? '\n\n```json\n' + JSON.stringify(result.data, null, 2) + '\n```' : ''}`
            : `✗ ${result.message}${result.error ? `: ${result.error}` : ''}`,
          timestamp: new Date(),
          isStreaming: false,
        })
      })
    }
  }

  private executedActions: Set<string> = new Set()

  private parseAndExecuteActions(text: string, runId: string): void {
    const jsonBlockRegex = /```json\s*([\s\S]*?)```/g
    let match

    while ((match = jsonBlockRegex.exec(text)) !== null) {
      try {
        const jsonStr = match[1].trim()
        const actionKey = `${runId}_${jsonStr.substring(0, 100)}`

        if (this.executedActions.has(actionKey)) continue

        const parsed = JSON.parse(jsonStr)

        if (parsed.action && typeof parsed.action === 'string') {
          const actionName = parsed.action
          const params = parsed.params || {}

          const toolDef = TOOL_DEFINITIONS.find((t) => t.name === actionName)
          if (!toolDef) {
            console.warn(`[OpenClaw] Unknown action in response: ${actionName}`)
            continue
          }

          this.executedActions.add(actionKey)

          if (toolDef.requiresConfirmation) {
            const pendingAction = createPendingAction(`json_${Date.now()}`, actionName, params)
            if (pendingAction) {
              this.emit('action_requested', { action: pendingAction, runId })
            }
          } else {
            executeAction(actionName, params).then((result) => {
              this.emit('action_result', {
                actionId: `auto_${actionName}_${Date.now()}`,
                toolCallId: `json_${Date.now()}`,
                ...result,
              })

              this.emit('chat_message', {
                id: `result_${actionName}_${Date.now()}`,
                role: 'assistant',
                content: result.success
                  ? `✓ ${result.message}${result.data ? '\n\n```json\n' + JSON.stringify(result.data, null, 2) + '\n```' : ''}`
                  : `✗ ${result.message}${result.error ? `: ${result.error}` : ''}`,
                timestamp: new Date(),
                isStreaming: false,
              })
            })
          }
        }
      } catch {
        continue
      }
    }
  }

  private async fetchTokenLogoAsync(
    researchId: string,
    research: Record<string, unknown>,
  ): Promise<void> {
    const contractAddress = research.contractAddress as string
    const network = research.network as string

    if (!contractAddress || !network || network === 'unknown') return

    try {
      const logo = await dexScreenerService.getTokenLogo(
        contractAddress,
        network as ResearchNetwork,
      )
      if (logo) {
        this.emit('research_update', {
          researchId,
          status: 'completed',
          partialData: { tokenLogo: logo },
        })
      }
    } catch (error) {
      console.error('[OpenClaw] Error fetching token logo:', error)
    }
  }

  private parseResearchResponse(researchId: string, responseText: string): Record<string, unknown> {
    let tokenName = 'Unknown Token'
    let tokenSymbol = '???'
    let marketCap = 0
    let price = 0
    const pros: string[] = []
    const cons: string[] = []
    let rating: 'green' | 'yellow' | 'orange' | 'red' = 'yellow'
    let explicitRatingFound = false
    let ratingReason = ''

    for (const line of responseText.split('\n')) {
      if (tokenName === 'Unknown Token' || tokenSymbol === '???') {
        const tokenMatch1 = line.match(/\*\*([^(]+)\s*\(([^)]+)\)\*\*/)
        if (tokenMatch1) {
          tokenName = tokenMatch1[1]
            .trim()
            .replace(/^[#\s]+/, '')
            .replace(/[🦑🐸🚀💎🔥✨🌙⭐]/g, '')
            .trim()
          tokenSymbol = tokenMatch1[2].trim().replace(/\$/g, '')
        }

        const tokenMatch2 = line.match(/^#+\s*([^($]+)\s*\(\$?([A-Z0-9]+)\)/i)
        if (tokenMatch2 && tokenName === 'Unknown Token') {
          tokenName = tokenMatch2[1]
            .trim()
            .replace(/[🦑🐸🚀💎🔥✨🌙⭐]/g, '')
            .trim()
          tokenSymbol = tokenMatch2[2].trim()
        }

        const tokenMatch3 = line.match(/(?:Token|Name):\s*\*?\*?([^(,\n]+)/i)
        if (tokenMatch3 && tokenName === 'Unknown Token') {
          tokenName = tokenMatch3[1].trim().replace(/\*\*/g, '')
        }

        const tokenMatch4 = line.match(/(?:Symbol|Ticker):\s*\$?([A-Z0-9]+)/i)
        if (tokenMatch4 && tokenSymbol === '???') {
          tokenSymbol = tokenMatch4[1].trim()
        }

        if (line.startsWith('#') && tokenSymbol === '???') {
          const symbolMatch = line.match(/\$([A-Z0-9]{2,10})/i)
          if (symbolMatch) {
            tokenSymbol = symbolMatch[1].toUpperCase()
          }
        }
      }

      const mcapMatch = line.match(/Market\s*Cap[^\d]*\$?([\d,.]+)\s*([KMB])?/i)
      if (mcapMatch && marketCap === 0) {
        marketCap = this.parseNumber(mcapMatch[1] + (mcapMatch[2] || ''))
      }

      const priceMatch = line.match(/(?:Price|Current Price)[^\d]*\$?([\d.]+(?:e[+-]?\d+)?)/i)
      if (priceMatch && price === 0) {
        price = parseFloat(priceMatch[1])
      }

      const lineLower = line.toLowerCase()

      const ratingMatch = line.match(
        /(?:Rating:\s*)?(?:🟩\s*SAFE|🟨\s*POTENTIAL|🟧\s*HIGH\s*RISK|🟥\s*AVOID)\s*[—\-–:]*\s*(.*)/i,
      )
      if (ratingMatch && ratingMatch[1]) {
        ratingReason = ratingMatch[1].trim()
      }

      if (lineLower.includes('🟥') && lineLower.includes('avoid')) {
        rating = 'red'
        explicitRatingFound = true
      } else if (lineLower.includes('🟧') && lineLower.includes('high risk')) {
        rating = 'orange'
        explicitRatingFound = true
      } else if (lineLower.includes('🟨') && lineLower.includes('potential')) {
        rating = 'yellow'
        explicitRatingFound = true
      } else if (lineLower.includes('🟩') && lineLower.includes('safe')) {
        rating = 'green'
        explicitRatingFound = true
      } else if (/rating:\s*avoid/i.test(lineLower)) {
        rating = 'red'
        explicitRatingFound = true
      } else if (/rating:\s*high\s*risk/i.test(lineLower)) {
        rating = 'orange'
        explicitRatingFound = true
      } else if (/rating:\s*potential/i.test(lineLower)) {
        rating = 'yellow'
        explicitRatingFound = true
      } else if (/rating:\s*safe/i.test(lineLower)) {
        rating = 'green'
        explicitRatingFound = true
      } else if (!explicitRatingFound) {
        if (lineLower.includes('avoid') && !lineLower.includes('to avoid')) {
          rating = 'red'
        } else if (lineLower.includes('high risk')) {
          rating = 'orange'
        } else if (lineLower.includes('low risk') || lineLower.includes('safe bet')) {
          rating = 'green'
        }
      }

      const isHeaderOrCategory =
        line.startsWith('#') ||
        line.startsWith('|') ||
        /^#+\s/.test(line) ||
        /^\*\*[^*]+\*\*$/.test(line.trim()) ||
        /^(risk factors|cons|critical red flags|risk assessment|identity|pros|positives|green flags)/i.test(
          line.trim(),
        )

      if (isHeaderOrCategory) continue

      if (
        line.includes('🟥') ||
        line.includes('🚨') ||
        line.includes('Red Flag') ||
        line.includes('⚠️') ||
        line.includes('❌')
      ) {
        const text = line
          .replace(/[🟥🚨⚠️❌]/g, '')
          .replace(/\*\*/g, '')
          .replace(/^[-*]\s*/, '')
          .trim()
        if (
          text.length > 10 &&
          !cons.includes(text) &&
          !text.toLowerCase().includes('red flag') &&
          !text.toLowerCase().includes('risk factor') &&
          !text.toLowerCase().includes('critical') &&
          !text.toLowerCase().startsWith('rating') &&
          !/^rating\s*:/i.test(text) &&
          !/^[A-Z\s]+$/.test(text)
        ) {
          cons.push(text)
        }
      }

      if (line.includes('🟩') || line.includes('✅') || line.includes('✓')) {
        const text = line
          .replace(/[🟩✅✓]/g, '')
          .replace(/\*\*/g, '')
          .replace(/^[-*]\s*/, '')
          .trim()
        if (
          text.length > 10 &&
          !pros.includes(text) &&
          !text.toLowerCase().includes('green flag') &&
          !text.toLowerCase().includes('positive') &&
          !/^[A-Z\s]+$/.test(text)
        ) {
          pros.push(text)
        }
      }
    }

    const context = this.researchContext.get(researchId)

    this.researchContext.delete(researchId)

    return {
      id: researchId,
      contractAddress: context?.contractAddress || '',
      network: context?.network || 'base',
      tokenName,
      tokenSymbol,
      marketCap,
      price,
      pros: pros.slice(0, 5),
      cons: cons.slice(0, 5),
      rating,
      ratingReason,
      timestamp: new Date(),
      status: 'completed',
      rawResponse: responseText,
      sources: [],
    }
  }

  private parseNumber(str: string): number {
    const num = parseFloat(str.replace(/[,$]/g, ''))
    if (str.toUpperCase().includes('K')) return num * 1000
    if (str.toUpperCase().includes('M')) return num * 1000000
    if (str.toUpperCase().includes('B')) return num * 1000000000
    return num
  }

  private handleDisconnection(): void {
    if (!this.isAuthenticated && this.reconnectAttempts === 0) {
      this.setConnectionState('error')
      return
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
      this.reconnectTimeout = null
    }

    this.isAuthenticated = false
    this.connectPromise = null

    this.runIdToResearchId.clear()
    this.completedResearchIds.clear()
    this.streamingResponses.clear()
    this.lastChatEmit.clear()

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.setConnectionState('reconnecting')
      this.reconnectAttempts++

      this.reconnectTimeout = window.setTimeout(() => {
        this.reconnectTimeout = null
        this.connect().catch(() => {})
      }, this.reconnectDelay * this.reconnectAttempts)
    } else {
      this.setConnectionState('error')
    }
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

declare global {
  // eslint-disable-next-line no-var
  var __openClawServiceInstance: OpenClawServiceClass | undefined
  // eslint-disable-next-line no-var
  var __openClawModuleId: string | undefined
}

const MODULE_ID = `${Date.now()}_${Math.random().toString(36).slice(2)}`

if (globalThis.__openClawServiceInstance && globalThis.__openClawModuleId !== MODULE_ID) {
  globalThis.__openClawServiceInstance.disconnect()
}

export const OpenClawService = globalThis.__openClawServiceInstance ?? new OpenClawServiceClass()
globalThis.__openClawServiceInstance = OpenClawService
globalThis.__openClawModuleId = MODULE_ID

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    OpenClawService.disconnect()
  })
}

export { OpenClawServiceClass }