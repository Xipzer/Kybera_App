/**
 * Code by Xipzer
 *
 * Provider-agnostic LLM harness types. A single normalized surface over
 * Anthropic, OpenAI, and xAI so the agent loop never touches provider quirks.
 */

export type ProviderId = 'anthropic' | 'openai' | 'xai'

export type AuthKind = 'oauth' | 'apikey'

export interface OAuthTokens {
  kind: 'oauth'
  access: string
  refresh: string
  /** Epoch ms at which the access token should be treated as expired. */
  expires: number
  /** OpenAI Codex: chatgpt account id extracted from the JWT (sent as a header). */
  accountId?: string
}

export interface ApiKeyCredential {
  kind: 'apikey'
  key: string
}

export type ProviderCredential = OAuthTokens | ApiKeyCredential

export interface ProviderModel {
  id: string
  label: string
  contextWindow: number
}

/** Normalized chat message shared across providers. */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  /** Tool calls the assistant wants to make (assistant role). */
  toolCalls?: LLMToolCall[]
  /** For role 'tool': which call this result answers. */
  toolCallId?: string
  toolName?: string
}

export interface LLMToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

/** JSON-schema tool definition, provider-agnostic. */
export interface LLMTool {
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface ChatRequest {
  model: string
  system?: string
  messages: LLMMessage[]
  tools?: LLMTool[]
  maxTokens?: number
  temperature?: number
  signal?: AbortSignal
}

/** Streaming events normalized across providers. */
export type StreamEvent =
  | { type: 'text'; delta: string }
  | { type: 'tool_call'; call: LLMToolCall }
  | { type: 'done'; stopReason: 'end' | 'tool_use' | 'max_tokens' | 'error'; usage?: TokenUsage }
  | { type: 'error'; error: string }

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

/**
 * A provider adapter normalizes one vendor's API. OAuth/API-key handling and
 * request/response shaping live here; the agent loop only sees StreamEvents.
 */
export interface ProviderAdapter {
  id: ProviderId
  label: string
  models: ProviderModel[]
  defaultModel: string
  supportsOAuth: boolean

  /** Stream a chat completion, yielding normalized events. */
  streamChat(req: ChatRequest, credential: ProviderCredential): AsyncGenerator<StreamEvent>
}
