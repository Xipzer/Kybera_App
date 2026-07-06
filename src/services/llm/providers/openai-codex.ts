/**
 * Code by Xipzer
 *
 * OpenAI adapter that supports BOTH auth modes, matching how OpenCode/Codex
 * treat ChatGPT OAuth tokens:
 *
 *  - OAuth (ChatGPT Plus/Pro): the Codex subscription token only works against
 *    the Codex Responses API at chatgpt.com/backend-api/codex/responses, with
 *    the `chatgpt-account-id` header. Request/response use the Responses format.
 *  - API key: the standard Chat Completions API at api.openai.com/v1.
 */

import type {
  ChatRequest,
  LLMMessage,
  LLMTool,
  ProviderAdapter,
  ProviderCredential,
  ProviderModel,
  StreamEvent,
} from '../types'
import { OpenAICompatibleAdapter } from './openai-compatible'

const CODEX_URL = '/api/openai-codex/responses'
const CODEX_INSTRUCTIONS =
  'You are a helpful AI assistant embedded in the Kybera self-custody crypto wallet.'

interface ResponsesInputItem {
  type: string
  role?: string
  content?: { type: string; text: string }[]
  call_id?: string
  name?: string
  arguments?: string
  output?: string
}

function toResponsesInput(messages: LLMMessage[]): ResponsesInputItem[] {
  const items: ResponsesInputItem[] = []
  for (const m of messages) {
    if (m.role === 'system') continue // folded into `instructions`
    if (m.role === 'tool') {
      items.push({ type: 'function_call_output', call_id: m.toolCallId, output: m.content })
      continue
    }
    if (m.role === 'assistant') {
      if (m.content) {
        items.push({
          type: 'message',
          role: 'assistant',
          content: [{ type: 'output_text', text: m.content }],
        })
      }
      for (const call of m.toolCalls ?? []) {
        items.push({
          type: 'function_call',
          call_id: call.id,
          name: call.name,
          arguments: JSON.stringify(call.arguments),
        })
      }
      continue
    }
    items.push({
      type: 'message',
      role: 'user',
      content: [{ type: 'input_text', text: m.content }],
    })
  }
  return items
}

function toResponsesTools(tools: LLMTool[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))
}

export class OpenAIAdapter implements ProviderAdapter {
  id = 'openai' as const
  label = 'OpenAI (GPT)'
  supportsOAuth = true
  defaultModel = 'gpt-5.5'
  models: ProviderModel[] = [
    { id: 'gpt-5.5', label: 'GPT-5.5', contextWindow: 400000 },
    { id: 'gpt-5.4', label: 'GPT-5.4', contextWindow: 400000 },
    { id: 'gpt-5.4-mini', label: 'GPT-5.4 mini', contextWindow: 400000 },
  ]

  // API-key mode reuses the standard Chat Completions adapter.
  private apiKeyAdapter = new OpenAICompatibleAdapter({
    id: 'openai',
    label: 'OpenAI (GPT)',
    apiUrl: '/api/openai/v1/chat/completions',
    defaultModel: this.defaultModel,
    supportsOAuth: true,
    models: this.models,
  })

  async *streamChat(
    req: ChatRequest,
    credential: ProviderCredential,
  ): AsyncGenerator<StreamEvent> {
    if (credential.kind === 'apikey') {
      yield* this.apiKeyAdapter.streamChat(req, credential)
      return
    }

    // OAuth → Codex Responses API.
    const instructions = [CODEX_INSTRUCTIONS, req.system].filter(Boolean).join('\n\n')
    const body = {
      model: req.model,
      stream: true,
      store: false,
      instructions,
      input: toResponsesInput(req.messages),
      tools: req.tools?.length ? toResponsesTools(req.tools) : undefined,
      tool_choice: req.tools?.length ? 'auto' : undefined,
    }

    // The Codex-CLI identity headers (user-agent, originator, session_id) that
    // Cloudflare gates on are injected by the proxy server-side, because the
    // browser can't set user-agent (a forbidden fetch header).
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      authorization: `Bearer ${credential.access}`,
      'openai-beta': 'responses=experimental',
    }
    if (credential.accountId) headers['chatgpt-account-id'] = credential.accountId

    const res = await fetch(CODEX_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: req.signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      yield { type: 'error', error: `OpenAI Codex API error ${res.status}: ${text}` }
      return
    }

    yield* parseResponsesSSE(res.body)
  }
}

/** Parse the Responses API SSE stream into normalized StreamEvents. */
async function* parseResponsesSSE(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const toolArgs = new Map<string, { name: string; args: string }>()
  let sawTool = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const dataLine = rawEvent.split('\n').find((l) => l.startsWith('data:'))
      if (!dataLine) continue
      const data = dataLine.slice(5).trim()
      if (!data || data === '[DONE]') continue

      let evt: Record<string, unknown>
      try {
        evt = JSON.parse(data)
      } catch {
        continue
      }

      const type = evt.type as string
      if (type === 'response.output_text.delta') {
        const delta = evt.delta as string
        if (delta) yield { type: 'text', delta }
      } else if (type === 'response.output_item.added') {
        const item = evt.item as { type?: string; call_id?: string; name?: string }
        if (item?.type === 'function_call' && item.call_id) {
          toolArgs.set(item.call_id, { name: item.name ?? '', args: '' })
        }
      } else if (type === 'response.function_call_arguments.delta') {
        const callId = evt.item_id as string
        const tb = toolArgs.get(callId)
        if (tb) tb.args += (evt.delta as string) ?? ''
      } else if (type === 'response.output_item.done') {
        const item = evt.item as {
          type?: string
          call_id?: string
          name?: string
          arguments?: string
        }
        if (item?.type === 'function_call' && item.call_id) {
          let args: Record<string, unknown> = {}
          try {
            args = item.arguments ? JSON.parse(item.arguments) : {}
          } catch {
            args = {}
          }
          sawTool = true
          yield {
            type: 'tool_call',
            call: { id: item.call_id, name: item.name ?? '', arguments: args },
          }
        }
      } else if (type === 'response.completed' || type === 'response.done') {
        yield { type: 'done', stopReason: sawTool ? 'tool_use' : 'end' }
        return
      } else if (type === 'error' || type === 'response.failed') {
        yield { type: 'error', error: JSON.stringify(evt) }
        return
      }
    }
  }

  // Stream ended without an explicit completion event — emit a terminal event
  // so the agent loop never hangs.
  yield { type: 'done', stopReason: sawTool ? 'tool_use' : 'end' }
}
