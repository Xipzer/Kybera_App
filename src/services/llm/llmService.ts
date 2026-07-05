/**
 * Code by Xipzer
 *
 * LLMService — the public harness the app talks to. Replaces OpenClawService.
 * Runs the in-client agent loop against the configured provider (Anthropic /
 * OpenAI / xAI via OAuth or API key) and emits the same event surface the
 * research store already consumes, so the UI is unchanged.
 */

import type { LLMMessage, LLMToolCall, ProviderId } from './types'
import { runAgent } from './agent'
import { KYBERA_SYSTEM_PROMPT } from './systemPrompt'
import { getUsableCredential } from './oauth/manager'
import { getAdapter } from './providers'
import { createPendingAction } from '../agentActions'
import type { ActionResult } from '../agentActions'
import type { PendingAction } from '../../types/aiActions'
import type { ResearchNetwork } from '../../types/research'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export type LLMEventType =
  | 'connection_change'
  | 'research_started'
  | 'research_complete'
  | 'research_error'
  | 'chat_message'
  | 'action_requested'
  | 'action_result'
  | 'error'

export interface LLMEvent {
  type: LLMEventType
  data: unknown
}

type Listener = (event: LLMEvent) => void

interface HarnessConfig {
  provider: ProviderId
  model: string
}

class LLMServiceClass {
  private listeners = new Map<LLMEventType, Set<Listener>>()
  private connectionState: ConnectionState = 'disconnected'
  private config: HarnessConfig | null = null
  private history: LLMMessage[] = []
  private abortController: AbortController | null = null
  private pendingConfirmations = new Map<string, (approved: boolean) => void>()

  configure(config: HarnessConfig): void {
    this.config = config
  }

  on(type: LLMEventType, listener: Listener): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type)!.add(listener)
    return () => this.listeners.get(type)?.delete(listener)
  }

  private emit(type: LLMEventType, data: unknown): void {
    this.listeners.get(type)?.forEach((l) => l({ type, data }))
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state
    this.emit('connection_change', { currentState: state })
  }

  getConnectionState(): ConnectionState {
    return this.connectionState
  }

  /** Verify a usable credential exists for the configured provider. */
  async connect(): Promise<void> {
    if (!this.config) throw new Error('LLM harness not configured')
    this.setConnectionState('connecting')
    try {
      const cred = await getUsableCredential(this.config.provider)
      if (!cred) throw new Error(`No credential for ${this.config.provider}. Sign in first.`)
      this.setConnectionState('connected')
    } catch (err) {
      this.setConnectionState('error')
      throw err
    }
  }

  disconnect(): void {
    this.abortController?.abort()
    this.abortController = null
    this.history = []
    this.pendingConfirmations.clear()
    this.setConnectionState('disconnected')
  }

  private newId(): string {
    return crypto.randomUUID()
  }

  async requestResearch(contractAddress: string, network: ResearchNetwork): Promise<string> {
    const researchId = this.newId()
    this.emit('research_started', { researchId, contractAddress, network })
    const prompt = `Research this token and provide a complete verdict.\nContract: ${contractAddress}\nNetwork: ${network}`
    await this.runTurn(prompt, researchId)
    return researchId
  }

  async sendChatMessage(content: string): Promise<void> {
    await this.runTurn(content, this.newId())
  }

  private async runTurn(userText: string, runId: string): Promise<void> {
    if (!this.config) throw new Error('LLM harness not configured')
    const cred = await getUsableCredential(this.config.provider)
    if (!cred) {
      this.emit('error', { message: 'Not signed in to an AI provider' })
      return
    }

    this.history.push({ role: 'user', content: userText })
    this.abortController = new AbortController()
    // Fail loudly instead of spinning forever if the stream stalls (e.g. a
    // misconfigured proxy or an upstream that never closes the connection).
    const timeout = setTimeout(() => this.abortController?.abort(), 120_000)

    let streamed = ''
    const emitStream = (final: boolean) => {
      this.emit('chat_message', {
        id: runId,
        role: 'assistant',
        content: streamed,
        timestamp: new Date(),
        isStreaming: !final,
      })
    }

    try {
      const { messages } = await runAgent(
        {
          provider: this.config.provider,
          model: this.config.model,
          credential: cred,
          system: KYBERA_SYSTEM_PROMPT,
          history: this.history,
          signal: this.abortController.signal,
        },
        {
          onTextDelta: (delta) => {
            streamed += delta
            emitStream(false)
          },
          onToolResult: (call, result) => this.emitActionResult(call, result),
          confirmTool: (call) => this.requestConfirmation(call),
          onError: (message) => this.emit('error', { message }),
        },
      )
      this.history = messages
      emitStream(true)
    } catch (err) {
      this.emit('error', { message: err instanceof Error ? err.message : 'Agent run failed' })
    } finally {
      clearTimeout(timeout)
      this.abortController = null
    }
  }

  /** Bridge a tool result into the app's action_result event (drives result cards). */
  private emitActionResult(call: LLMToolCall, result: ActionResult): void {
    this.emit('action_result', {
      actionName: call.name,
      toolCallId: call.id,
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error,
    })
  }

  /** Ask the UI to confirm a risky tool; resolves when the user approves/rejects. */
  private requestConfirmation(call: LLMToolCall): Promise<boolean> {
    const action: PendingAction | null = createPendingAction(call.id, call.name, call.arguments)
    if (!action) return Promise.resolve(false)
    return new Promise<boolean>((resolve) => {
      this.pendingConfirmations.set(action.id, resolve)
      this.emit('action_requested', { action })
    })
  }

  resolveConfirmation(actionId: string, approved: boolean): void {
    const resolver = this.pendingConfirmations.get(actionId)
    if (resolver) {
      this.pendingConfirmations.delete(actionId)
      resolver(approved)
    }
  }

  clearHistory(): void {
    this.history = []
  }
}

export const LLMService = new LLMServiceClass()

export function getProviderModels(provider: ProviderId) {
  return getAdapter(provider).models
}
