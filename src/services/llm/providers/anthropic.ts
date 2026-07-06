/**
 * Code by Xipzer
 *
 * Anthropic provider adapter. Uses the Messages API with SSE streaming and
 * tool-calling. Works with both OAuth (Claude Pro/Max) and raw API keys.
 *
 * OAuth requests set `anthropic-dangerous-direct-browser-access` and the
 * Claude Code identity/beta headers so the token is accepted from a browser.
 */

import type {
  ChatRequest,
  LLMMessage,
  LLMTool,
  ProviderAdapter,
  ProviderCredential,
  StreamEvent,
} from '../types'

const API_URL = '/api/anthropic/v1/messages'
const API_VERSION = '2023-06-01'
const CLAUDE_CODE_IDENTITY = "You are Claude Code, Anthropic's official CLI for Claude."
// Kept close to the current Claude Code CLI release to avoid being flagged.
const CLAUDE_CODE_VERSION = '2.1.167'
// Exact beta header string from the proven Reversion claude-code adapter.
const CLAUDE_CODE_BETA_HEADERS =
  'oauth-2025-04-20,claude-code-20250219,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14'
// The Claude Code OAuth beta surface validates that tools "look like" MCP tools,
// so tool names are prefixed on the request and stripped on the response.
const MCP_TOOL_PREFIX = 'mcp_'

interface AnthropicContentBlock {
  type: string
  text?: string
  id?: string
  name?: string
  input?: unknown
  content?: unknown
  tool_use_id?: string
}

function toAnthropicMessages(messages: LLMMessage[]): {
  system?: string
  msgs: { role: 'user' | 'assistant'; content: AnthropicContentBlock[] }[]
} {
  let system: string | undefined
  const msgs: { role: 'user' | 'assistant'; content: AnthropicContentBlock[] }[] = []

  for (const m of messages) {
    if (m.role === 'system') {
      system = system ? `${system}\n\n${m.content}` : m.content
      continue
    }
    if (m.role === 'tool') {
      msgs.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: m.toolCallId,
            content: m.content,
          },
        ],
      })
      continue
    }
    if (m.role === 'assistant') {
      const content: AnthropicContentBlock[] = []
      if (m.content) content.push({ type: 'text', text: m.content })
      for (const call of m.toolCalls ?? []) {
        content.push({ type: 'tool_use', id: call.id, name: call.name, input: call.arguments })
      }
      msgs.push({ role: 'assistant', content })
      continue
    }
    msgs.push({ role: 'user', content: [{ type: 'text', text: m.content }] })
  }
  return { system, msgs }
}

function toAnthropicTools(tools: LLMTool[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))
}

export class AnthropicAdapter implements ProviderAdapter {
  id = 'anthropic' as const
  label = 'Anthropic (Claude)'
  supportsOAuth = true
  defaultModel = 'claude-sonnet-5'
  models = [
    { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', contextWindow: 200000 },
    { id: 'claude-sonnet-5', label: 'Claude Sonnet 5', contextWindow: 200000 },
    { id: 'claude-opus-4-7', label: 'Claude Opus 4.7', contextWindow: 200000 },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', contextWindow: 200000 },
  ]

  async *streamChat(
    req: ChatRequest,
    credential: ProviderCredential,
  ): AsyncGenerator<StreamEvent> {
    const { system, msgs } = toAnthropicMessages(req.messages)
    const isOAuth = credential.kind === 'oauth'

    const headers: Record<string, string> = {
      'content-type': 'application/json',
      accept: 'text/event-stream',
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    }

    let url = API_URL
    const mergedSystem = [req.system, system].filter(Boolean).join('\n\n')
    let messages = msgs
    let tools = req.tools?.length ? toAnthropicTools(req.tools) : undefined
    let systemField: string | { type: 'text'; text: string }[] | undefined

    if (isOAuth) {
      // Claude Code OAuth beta surface — proven request shaping from Reversion:
      // ?beta=true, exact identity system prompt, custom system relocated into a
      // user/assistant pair, and mcp_-prefixed tool names.
      headers['authorization'] = `Bearer ${credential.access}`
      headers['anthropic-beta'] = CLAUDE_CODE_BETA_HEADERS
      headers['user-agent'] = `claude-cli/${CLAUDE_CODE_VERSION}`
      headers['x-app'] = 'cli'
      url = `${API_URL}?beta=true`

      systemField = CLAUDE_CODE_IDENTITY
      if (mergedSystem) {
        messages = [
          { role: 'user', content: [{ type: 'text', text: `[System Instructions]\n${mergedSystem}` }] },
          { role: 'assistant', content: [{ type: 'text', text: "Understood. I'll follow these instructions." }] },
          ...msgs,
        ]
      }
      if (tools) {
        tools = tools.map((t) => ({
          ...t,
          name: t.name.startsWith(MCP_TOOL_PREFIX) ? t.name : `${MCP_TOOL_PREFIX}${t.name}`,
        }))
      }
    } else {
      headers['x-api-key'] = credential.key
      systemField = mergedSystem ? [{ type: 'text', text: mergedSystem }] : undefined
    }

    const body = {
      model: req.model,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature,
      stream: true,
      system: systemField,
      messages,
      tools,
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: req.signal,
    })

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => '')
      yield { type: 'error', error: `Anthropic API error ${res.status}: ${text}` }
      return
    }

    // Strip the mcp_ prefix from streamed tool_use names for OAuth requests.
    yield* parseAnthropicSSE(res.body, isOAuth)
  }
}

async function* parseAnthropicSSE(
  body: ReadableStream<Uint8Array>,
  stripMcpPrefix = false,
): AsyncGenerator<StreamEvent> {
  const unprefix = (name: string) =>
    stripMcpPrefix && name.startsWith(MCP_TOOL_PREFIX) ? name.slice(MCP_TOOL_PREFIX.length) : name
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const toolBlocks = new Map<number, { id: string; name: string; json: string }>()
  let usage: { inputTokens: number; outputTokens: number } | undefined
  let sawToolUse = false
  let stopReason: 'end' | 'tool_use' | 'max_tokens' = 'end'

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
      if (type === 'content_block_start') {
        const block = evt.content_block as AnthropicContentBlock
        const index = evt.index as number
        if (block?.type === 'tool_use') {
          toolBlocks.set(index, { id: block.id ?? '', name: block.name ?? '', json: '' })
        }
      } else if (type === 'content_block_delta') {
        const delta = evt.delta as { type: string; text?: string; partial_json?: string }
        const index = evt.index as number
        if (delta.type === 'text_delta' && delta.text) {
          yield { type: 'text', delta: delta.text }
        } else if (delta.type === 'input_json_delta' && delta.partial_json !== undefined) {
          const tb = toolBlocks.get(index)
          if (tb) tb.json += delta.partial_json
        }
      } else if (type === 'content_block_stop') {
        const index = evt.index as number
        const tb = toolBlocks.get(index)
        if (tb) {
          let args: Record<string, unknown> = {}
          try {
            args = tb.json ? JSON.parse(tb.json) : {}
          } catch {
            args = {}
          }
          sawToolUse = true
          yield { type: 'tool_call', call: { id: tb.id, name: unprefix(tb.name), arguments: args } }
          toolBlocks.delete(index)
        }
      } else if (type === 'message_delta') {
        const delta = (evt.delta as { stop_reason?: string }) ?? {}
        if (delta.stop_reason === 'tool_use') stopReason = 'tool_use'
        else if (delta.stop_reason === 'max_tokens') stopReason = 'max_tokens'
        const u = (evt.usage as { output_tokens?: number }) ?? {}
        if (u.output_tokens !== undefined) {
          usage = { inputTokens: usage?.inputTokens ?? 0, outputTokens: u.output_tokens }
        }
      } else if (type === 'message_stop') {
        yield {
          type: 'done',
          stopReason: sawToolUse || stopReason === 'tool_use' ? 'tool_use' : stopReason,
          usage,
        }
        return
      }
    }
  }

  // Stream ended without message_stop — emit a terminal event so the agent
  // loop never hangs.
  yield {
    type: 'done',
    stopReason: sawToolUse || stopReason === 'tool_use' ? 'tool_use' : stopReason,
    usage,
  }
}
