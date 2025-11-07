/**
 * AI Chat Orchestrator
 * Coordinates LLM calls, tool execution, and user confirmations
 */

import { AIMessage, ParsedToolCall, PendingAction, ActionResult } from '../../types'
import { EnhancedOpenRouterService } from './openrouterEnhanced'
import { ALL_TOOLS } from './tools/toolDefinitions'
import { actionExecutor } from './actionExecutor'
import { contextBuilder } from './contextBuilder'
import { useChatStore } from '../../store/chatStore'
import { useSettingsStore } from '../../store/settingsStore'

export interface ChatResponse {
  type: 'message' | 'action_required' | 'action_completed' | 'error'
  content?: string
  pendingAction?: PendingAction
  actionResult?: ActionResult
  error?: string
}

class AIChatOrchestrator {
  private conversationMessages: Map<string, AIMessage[]> = new Map()

  /**
   * Sends a message and handles the response flow
   */
  async sendMessage(
    conversationId: string,
    userMessage: string,
    onChunk?: (chunk: string) => void,
    onProgress?: (message: string) => void,
  ): Promise<ChatResponse> {
    try {
      // Get API key and model
      const { openRouterApiKey, selectedModel } = useSettingsStore.getState()
      if (!openRouterApiKey) {
        throw new Error('OpenRouter API key not configured')
      }

      // Initialize conversation history if needed
      if (!this.conversationMessages.has(conversationId)) {
        // Build system prompt with context
        const systemPrompt = await contextBuilder.buildSystemPrompt()
        this.conversationMessages.set(conversationId, [
          {
            role: 'system',
            content: systemPrompt,
          },
        ])
      }

      // Add user message to history
      const messages = this.conversationMessages.get(conversationId)!
      messages.push({
        role: 'user',
        content: userMessage,
      })

      // Save user message to database
      await useChatStore.getState().addMessage(conversationId, {
        role: 'user',
        content: userMessage,
      })

      // Send to LLM with tools
      const response = await EnhancedOpenRouterService.sendMessage(
        messages,
        selectedModel || 'openai/gpt-4-turbo-preview',
        openRouterApiKey,
        {
          tools: ALL_TOOLS,
          onChunk,
        },
      )

      // Handle response based on type
      if (response.toolCalls && response.toolCalls.length > 0) {
        // LLM wants to call a tool
        return await this.handleToolCalls(
          conversationId,
          response.toolCalls,
          response.content,
          onProgress,
        )
      } else if (response.content) {
        // Regular message response
        messages.push({
          role: 'assistant',
          content: response.content,
        })

        // Save assistant message
        await useChatStore.getState().addMessage(conversationId, {
          role: 'assistant',
          content: response.content,
        })

        return {
          type: 'message',
          content: response.content,
        }
      } else {
        throw new Error('Empty response from LLM')
      }
    } catch (error: any) {
      console.error('[AIChatOrchestrator] Error:', error)
      return {
        type: 'error',
        error: error.message || 'Failed to process message',
      }
    }
  }

  /**
   * Handles tool calls from LLM
   */
  private async handleToolCalls(
    conversationId: string,
    toolCalls: any[],
    assistantContent: string | null,
    onProgress?: (message: string) => void,
  ): Promise<ChatResponse> {
    const messages = this.conversationMessages.get(conversationId)!

    // Add assistant message with tool calls to history
    messages.push({
      role: 'assistant',
      content: assistantContent,
      tool_calls: toolCalls,
    })

    // Process first tool call (for now, handle one at a time)
    const toolCall = toolCalls[0]

    // Parse tool call
    const parsedToolCall: ParsedToolCall = {
      id: toolCall.id,
      name: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments),
    }

    // Check if action requires confirmation
    if (actionExecutor.requiresConfirmation(parsedToolCall.name)) {
      // Create pending action for user approval
      const pendingAction = await actionExecutor.createPendingAction(parsedToolCall)

      return {
        type: 'action_required',
        content: assistantContent || undefined,
        pendingAction,
      }
    } else {
      // Execute immediately (low-risk actions)
      const result = await actionExecutor.executeAction(
        parsedToolCall,
        conversationId,
        onProgress,
      )

      // Add tool response to messages
      messages.push({
        role: 'tool',
        content: result.message || JSON.stringify(result.data),
        tool_call_id: toolCall.id,
        name: parsedToolCall.name,
      })

      return {
        type: 'action_completed',
        actionResult: result,
      }
    }
  }

  /**
   * Executes an approved pending action
   */
  async executePendingAction(
    conversationId: string,
    actionId: string,
    onProgress?: (message: string) => void,
    onChunk?: (chunk: string) => void,
  ): Promise<ChatResponse> {
    try {
      const pendingAction = actionExecutor.getPendingAction(actionId)
      if (!pendingAction) {
        throw new Error('Pending action not found')
      }

      // Execute the action
      const result = await actionExecutor.executePendingAction(
        actionId,
        conversationId,
        onProgress,
      )

      const messages = this.conversationMessages.get(conversationId)!

      // Add tool response to conversation
      messages.push({
        role: 'tool',
        content: result.message || JSON.stringify(result.data),
        tool_call_id: pendingAction.toolCallId,
        name: pendingAction.name,
      })

      // Get follow-up response from LLM
      const { openRouterApiKey, selectedModel } = useSettingsStore.getState()
      if (!openRouterApiKey) {
        throw new Error('OpenRouter API key not configured')
      }

      const followUpResponse = await EnhancedOpenRouterService.sendMessage(
        messages,
        selectedModel || 'openai/gpt-4-turbo-preview',
        openRouterApiKey,
        {
          tools: ALL_TOOLS,
          onChunk,
        },
      )

      if (followUpResponse.content) {
        messages.push({
          role: 'assistant',
          content: followUpResponse.content,
        })

        // Save assistant response
        await useChatStore.getState().addMessage(conversationId, {
          role: 'assistant',
          content: followUpResponse.content,
        })
      }

      return {
        type: 'action_completed',
        actionResult: result,
        content: followUpResponse.content || undefined,
      }
    } catch (error: any) {
      console.error('[AIChatOrchestrator] Error executing action:', error)
      return {
        type: 'error',
        error: error.message || 'Failed to execute action',
      }
    }
  }

  /**
   * Rejects a pending action
   */
  async rejectPendingAction(
    conversationId: string,
    actionId: string,
    onChunk?: (chunk: string) => void,
  ): Promise<ChatResponse> {
    try {
      const pendingAction = actionExecutor.getPendingAction(actionId)
      if (!pendingAction) {
        throw new Error('Pending action not found')
      }

      // Mark as rejected
      actionExecutor.rejectAction(actionId)

      const messages = this.conversationMessages.get(conversationId)!

      // Add rejection message to conversation
      messages.push({
        role: 'tool',
        content: 'Action rejected by user',
        tool_call_id: pendingAction.toolCallId,
        name: pendingAction.name,
      })

      // Get follow-up response from LLM
      const { openRouterApiKey, selectedModel } = useSettingsStore.getState()
      if (!openRouterApiKey) {
        throw new Error('OpenRouter API key not configured')
      }

      const followUpResponse = await EnhancedOpenRouterService.sendMessage(
        messages,
        selectedModel || 'openai/gpt-4-turbo-preview',
        openRouterApiKey,
        {
          tools: ALL_TOOLS,
          onChunk,
        },
      )

      if (followUpResponse.content) {
        messages.push({
          role: 'assistant',
          content: followUpResponse.content,
        })

        // Save assistant response
        await useChatStore.getState().addMessage(conversationId, {
          role: 'assistant',
          content: followUpResponse.content,
        })

        return {
          type: 'message',
          content: followUpResponse.content,
        }
      }

      return {
        type: 'message',
        content: 'Action was rejected.',
      }
    } catch (error: any) {
      console.error('[AIChatOrchestrator] Error rejecting action:', error)
      return {
        type: 'error',
        error: error.message || 'Failed to reject action',
      }
    }
  }

  /**
   * Clears conversation history
   */
  clearConversation(conversationId: string): void {
    this.conversationMessages.delete(conversationId)
  }

  /**
   * Gets conversation message count
   */
  getMessageCount(conversationId: string): number {
    return this.conversationMessages.get(conversationId)?.length || 0
  }
}

export const aiChatOrchestrator = new AIChatOrchestrator()
