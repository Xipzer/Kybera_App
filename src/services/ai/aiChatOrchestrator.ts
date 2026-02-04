/**
 * AI Chat Orchestrator
 * 
 * NOTE: This service has been deprecated in favor of the OpenClaw integration.
 * The ResearchView component now handles AI interactions directly through
 * the OpenClaw WebSocket service.
 * 
 * This file is kept for reference and potential future wallet-action integration.
 */

import { AIMessage, PendingAction, ActionResult } from '../../types'

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
   * @deprecated Use OpenClaw service through ResearchView instead
   */
  async sendMessage(
    _conversationId: string,
    _userMessage: string,
    _onChunk?: (chunk: string) => void,
    _onProgress?: (message: string) => void,
  ): Promise<ChatResponse> {
    // AI functionality has been moved to OpenClaw integration
    // This method is kept for API compatibility but should not be used
    console.warn('[AIChatOrchestrator] sendMessage is deprecated. Use OpenClaw service instead.')

    return {
      type: 'error',
      error:
        'AI Chat is now handled through OpenClaw. Please configure your OpenClaw Gateway in Settings.',
    }
  }

  /**
   * @deprecated Use OpenClaw service through ResearchView instead
   */
  async executePendingAction(
    _conversationId: string,
    _actionId: string,
    _onProgress?: (message: string) => void,
    _onChunk?: (chunk: string) => void,
  ): Promise<ChatResponse> {
    return {
      type: 'error',
      error: 'Pending actions are now handled through OpenClaw.',
    }
  }

  /**
   * @deprecated Use OpenClaw service through ResearchView instead
   */
  async rejectPendingAction(
    _conversationId: string,
    _actionId: string,
    _onChunk?: (chunk: string) => void,
  ): Promise<ChatResponse> {
    return {
      type: 'error',
      error: 'Action rejection is now handled through OpenClaw.',
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
