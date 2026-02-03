/**
 * OpenRouter Service with Function Calling Support
 */

import { AIMessage, ToolCall, ToolDefinition } from '../../types'

interface OpenRouterStreamChunk {
  id: string
  model: string
  choices: {
    delta: {
      role?: string
      content?: string
      tool_calls?: Array<{
        index: number
        id?: string
        type?: 'function'
        function?: {
          name?: string
          arguments?: string
        }
      }>
    }
    finish_reason?: string | null
  }[]
}

export interface OpenRouterResponse {
  content: string | null
  toolCalls?: ToolCall[]
  finishReason?: string
}

export class OpenRouterService {
  private static OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

  /**
   * Sends a message with optional tool support
   */
  static async sendMessage(
    messages: AIMessage[],
    model: string,
    apiKey: string,
    options?: {
      tools?: ToolDefinition[]
      onChunk?: (chunk: string) => void
      onToolCall?: (toolCall: Partial<ToolCall>) => void
    },
  ): Promise<OpenRouterResponse> {
    const requestBody: any = {
      model,
      messages,
      stream: !!(options?.onChunk || options?.onToolCall),
    }

    // Add tools if provided
    if (options?.tools && options.tools.length > 0) {
      requestBody.tools = options.tools
      requestBody.tool_choice = 'auto'
    }

    const response = await fetch(this.OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'SmartWallet AI',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error?.message || 'Failed to get response from OpenRouter')
    }

    if (requestBody.stream) {
      return this.handleStreamingResponse(response, options?.onChunk, options?.onToolCall)
    } else {
      return this.handleNonStreamingResponse(response)
    }
  }

  /**
   * Handles streaming response with tool calls
   */
  private static async handleStreamingResponse(
    response: Response,
    onChunk?: (chunk: string) => void,
    onToolCall?: (toolCall: Partial<ToolCall>) => void,
  ): Promise<OpenRouterResponse> {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) throw new Error('No response body')

    let fullContent = ''
    let toolCalls: ToolCall[] = []
    let currentToolCalls: Map<number, Partial<ToolCall>> = new Map()
    let finishReason: string | undefined

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') continue

          try {
            const parsed: OpenRouterStreamChunk = JSON.parse(data)
            const choice = parsed.choices?.[0]

            if (!choice) continue

            // Handle content chunks
            if (choice.delta?.content) {
              fullContent += choice.delta.content
              onChunk?.(choice.delta.content)
            }

            // Handle tool call chunks
            if (choice.delta?.tool_calls) {
              for (const toolCallChunk of choice.delta.tool_calls) {
                const index = toolCallChunk.index

                if (!currentToolCalls.has(index)) {
                  currentToolCalls.set(index, {
                    id: toolCallChunk.id,
                    type: 'function',
                    function: {
                      name: '',
                      arguments: '',
                    },
                  })
                }

                const currentToolCall = currentToolCalls.get(index)!

                // Update tool call with new data
                if (toolCallChunk.id) {
                  currentToolCall.id = toolCallChunk.id
                }
                if (toolCallChunk.function?.name) {
                  currentToolCall.function!.name = toolCallChunk.function.name
                }
                if (toolCallChunk.function?.arguments) {
                  currentToolCall.function!.arguments += toolCallChunk.function.arguments
                }

                // Notify listener of partial tool call
                onToolCall?.(currentToolCall)
              }
            }

            // Handle finish reason
            if (choice.finish_reason) {
              finishReason = choice.finish_reason
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn('[OpenRouter] Failed to parse SSE chunk:', e)
          }
        }
      }
    }

    // Convert accumulated tool calls to final format
    toolCalls = Array.from(currentToolCalls.values())
      .filter((tc) => tc.id && tc.function?.name)
      .map((tc) => tc as ToolCall)

    return {
      content: fullContent || null,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason,
    }
  }

  /**
   * Handles non-streaming response
   */
  private static async handleNonStreamingResponse(response: Response): Promise<OpenRouterResponse> {
    const data = await response.json()
    const choice = data.choices?.[0]

    if (!choice) {
      throw new Error('No choices in response')
    }

    return {
      content: choice.message?.content || null,
      toolCalls: choice.message?.tool_calls,
      finishReason: choice.finish_reason,
    }
  }

  /**
   * Gets available models
   */
  static async getModels(apiKey: string): Promise<any[]> {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch models')
    }

    const data = await response.json()
    return data.data || []
  }
}
