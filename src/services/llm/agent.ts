/**
 * Code by Xipzer
 *
 * In-client agentic tool-calling loop. Replaces the external OpenClaw agent:
 * Kybera now drives the conversation directly against a provider adapter,
 * executing tools locally (with confirmation gating for risky actions) and
 * feeding results back until the model stops requesting tools.
 */

import type {
  ChatRequest,
  LLMMessage,
  LLMToolCall,
  ProviderCredential,
  ProviderId,
} from './types'
import { getAdapter } from './providers'
import { getLLMTools, toolRequiresConfirmation } from './tools'
import { executeAction, getToolDefinition } from '../agentActions'
import type { ActionResult } from '../agentActions'

const MAX_TURNS = 8

export interface AgentCallbacks {
  onTextDelta: (delta: string) => void
  onToolResult: (call: LLMToolCall, result: ActionResult) => void
  /** Resolve true to approve a risky tool, false to reject. */
  confirmTool: (call: LLMToolCall) => Promise<boolean>
  onError: (message: string) => void
}

export interface AgentRunOptions {
  provider: ProviderId
  model: string
  credential: ProviderCredential
  system: string
  history: LLMMessage[]
  signal?: AbortSignal
}

/**
 * Run the agent loop to completion. Returns the final assistant text and the
 * full message list (so the caller can persist conversation state).
 */
export async function runAgent(
  opts: AgentRunOptions,
  cb: AgentCallbacks,
): Promise<{ text: string; messages: LLMMessage[] }> {
  const adapter = getAdapter(opts.provider)
  const tools = getLLMTools()
  const messages: LLMMessage[] = [...opts.history]
  let finalText = ''

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const req: ChatRequest = {
      model: opts.model,
      system: opts.system,
      messages,
      tools,
      signal: opts.signal,
    }

    let assistantText = ''
    const toolCalls: LLMToolCall[] = []
    let stopReason: string = 'end'
    let errored = false

    for await (const evt of adapter.streamChat(req, opts.credential)) {
      if (evt.type === 'text') {
        assistantText += evt.delta
        cb.onTextDelta(evt.delta)
      } else if (evt.type === 'tool_call') {
        toolCalls.push(evt.call)
      } else if (evt.type === 'done') {
        stopReason = evt.stopReason
      } else if (evt.type === 'error') {
        cb.onError(evt.error)
        errored = true
      }
    }

    if (errored) return { text: finalText, messages }

    finalText = assistantText

    // Record the assistant turn (text + any tool calls).
    messages.push({
      role: 'assistant',
      content: assistantText,
      toolCalls: toolCalls.length ? toolCalls : undefined,
    })

    if (stopReason !== 'tool_use' || toolCalls.length === 0) {
      return { text: finalText, messages }
    }

    // Execute each requested tool and append results for the next turn.
    for (const call of toolCalls) {
      const def = getToolDefinition(call.name)
      let result: ActionResult

      if (!def) {
        result = { success: false, message: `Unknown tool: ${call.name}`, error: 'UNKNOWN_TOOL' }
      } else if (toolRequiresConfirmation(call.name)) {
        const approved = await cb.confirmTool(call)
        result = approved
          ? await executeAction(call.name, call.arguments)
          : { success: false, message: 'Action rejected by user', error: 'REJECTED' }
      } else {
        result = await executeAction(call.name, call.arguments)
      }

      cb.onToolResult(call, result)
      messages.push({
        role: 'tool',
        toolCallId: call.id,
        toolName: call.name,
        content: JSON.stringify(result),
      })
    }
  }

  return { text: finalText, messages }
}
