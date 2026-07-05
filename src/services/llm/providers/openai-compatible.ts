/**
 * Code by Xipzer
 *
 * Shared adapter for OpenAI-compatible Chat Completions APIs (OpenAI, xAI).
 * SSE streaming with tool-calling; works with OAuth bearer tokens or API keys.
 */

import type {
  ChatRequest,
  LLMMessage,
  LLMTool,
  ProviderAdapter,
  ProviderCredential,
  ProviderId,
  ProviderModel,
  StreamEvent,
} from '../types'

interface OpenAIMessage {
  role: string
  content: string | null
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  tool_call_id?: string
  name?: string
}

function toOpenAIMessages(system: string | undefined, messages: LLMMessage[]): OpenAIMessage[] {
  const out: OpenAIMessage[] = []
  if (system) out.push({ role: 'system', content: system })
  for (const m of messages) {
    if (m.role === 'tool') {
      out.push({ role: 'tool', content: m.content, tool_call_id: m.toolCallId, name: m.toolName })
      continue
    }
    if (m.role === 'assistant' && m.toolCalls?.length) {
      out.push({
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.toolCalls.map((c) => ({
          id: c.id,
          type: 'function',
          function: { name: c.name, arguments: JSON.stringify(c.arguments) },
        })),
      })
      continue
    }
    out.push({ role: m.role, content: m.content })
  }
  return out
}

function toOpenAITools(tools: LLMTool[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }))
}

export interface OpenAICompatConfig {
  id: ProviderId
  label: string
  apiUrl: string
  defaultModel: string
  models: ProviderModel[]
  supportsOAuth: boolean
}

export class OpenAICompatibleAdapter implements ProviderAdapter {
  id: ProviderId
  label: string
  models: ProviderModel[]
  defaultModel: string
  supportsOAuth: boolean
  private apiUrl: string

  constructor(config: OpenAICompatConfig) {
    this.id = config.id
    this.label = config.label
    this.models = config.models
    this.defaultModel = config.defaultModel
    this.supportsOAuth = config.supportsOAuth
    this.apiUrl = config.apiUrl
  }

  async *streamChat(
    req: ChatRequest,
    credential: ProviderCredential,
  ): AsyncGenerator<StreamEvent> {
    const system = [req.system].filter(Boolean).join('\n\n') || undefined
    const token = credential.kind === 'oauth' ? credential.access : credential.key

    const body = {
      model: req.model,
      stream: true,
      temperature: req.temperature,
      max_tokens: req.maxTokens ?? 4096,
      messages: toOpenAIMessages(system, req.messages),
      tools: req.tools?.length ? toOpenAITools(req.tools) : undefined,
    }

    const res = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'text/event-stream',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: req.signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      yield { type: 'error', error: `${this.label} API error ${res.status}: ${text}` }
      return
    }

    yield* parseOpenAISSE(res.body)
  }
}

async function* parseOpenAISSE(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const toolCalls = new Map<number, { id: string; name: string; args: string }>()
  let stopReason: 'end' | 'tool_use' | 'max_tokens' = 'end'

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let nl: number
    while ((nl = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line.startsWith('data:')) continue
      const data = line.slice(5).trim()
      if (data === '[DONE]') {
        for (const tc of toolCalls.values()) {
          let args: Record<string, unknown> = {}
          try {
            args = tc.args ? JSON.parse(tc.args) : {}
          } catch {
            args = {}
          }
          yield { type: 'tool_call', call: { id: tc.id, name: tc.name, arguments: args } }
        }
        yield { type: 'done', stopReason: toolCalls.size ? 'tool_use' : stopReason }
        return
      }

      let chunk: {
        choices?: {
          delta?: {
            content?: string
            tool_calls?: {
              index: number
              id?: string
              function?: { name?: string; arguments?: string }
            }[]
          }
          finish_reason?: string
        }[]
      }
      try {
        chunk = JSON.parse(data)
      } catch {
        continue
      }

      const choice = chunk.choices?.[0]
      const delta = choice?.delta
      if (delta?.content) yield { type: 'text', delta: delta.content }

      for (const tc of delta?.tool_calls ?? []) {
        const existing = toolCalls.get(tc.index) ?? { id: '', name: '', args: '' }
        if (tc.id) existing.id = tc.id
        if (tc.function?.name) existing.name = tc.function.name
        if (tc.function?.arguments) existing.args += tc.function.arguments
        toolCalls.set(tc.index, existing)
      }

      if (choice?.finish_reason === 'tool_calls') stopReason = 'tool_use'
      else if (choice?.finish_reason === 'length') stopReason = 'max_tokens'
    }
  }

  // Stream ended without an explicit [DONE].
  for (const tc of toolCalls.values()) {
    let args: Record<string, unknown> = {}
    try {
      args = tc.args ? JSON.parse(tc.args) : {}
    } catch {
      args = {}
    }
    yield { type: 'tool_call', call: { id: tc.id, name: tc.name, arguments: args } }
  }
  yield { type: 'done', stopReason: toolCalls.size ? 'tool_use' : stopReason }
}
