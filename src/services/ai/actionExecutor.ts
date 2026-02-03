/**
 * Action Executor Service
 * Validates and executes AI-requested actions with proper security checks
 */

import {
  ActionContext,
  ActionResult,
  ParsedToolCall,
  ActionHistoryEntry,
  PendingAction,
} from '../../types'
import { getActionConfig } from './actions/actionRegistry'
import { useWalletStore } from '../../store/walletStore'
import { db } from '../storage/database'

class ActionExecutor {
  private pendingActions: Map<string, PendingAction> = new Map()

  /**
   * Validates a tool call
   */
  validateToolCall(toolCall: ParsedToolCall): { valid: boolean; error?: string } {
    const config = getActionConfig(toolCall.name)

    if (!config) {
      return { valid: false, error: `Unknown action: ${toolCall.name}` }
    }

    // Validate required parameters
    // This would be more sophisticated in production, validating types, formats, etc.
    if (!toolCall.parameters || typeof toolCall.parameters !== 'object') {
      return { valid: false, error: 'Invalid parameters' }
    }

    return { valid: true }
  }

  /**
   * Creates a pending action for user confirmation
   */
  async createPendingAction(toolCall: ParsedToolCall): Promise<PendingAction> {
    const config = getActionConfig(toolCall.name)

    if (!config) {
      throw new Error(`Unknown action: ${toolCall.name}`)
    }

    const pendingAction: PendingAction = {
      id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      toolCallId: toolCall.id,
      name: toolCall.name,
      parameters: toolCall.parameters,
      riskLevel: config.riskLevel,
      status: 'pending',
      createdAt: new Date(),
      estimatedTime: config.estimatedTime,
      category: config.category,
      description: config.description,
    }

    this.pendingActions.set(pendingAction.id, pendingAction)

    return pendingAction
  }

  /**
   * Checks if an action requires confirmation
   */
  requiresConfirmation(actionName: string): boolean {
    const config = getActionConfig(actionName)
    return config?.requiresConfirmation || false
  }

  /**
   * Approves a pending action
   */
  approveAction(actionId: string): void {
    const action = this.pendingActions.get(actionId)
    if (action) {
      action.status = 'approved'
      this.pendingActions.set(actionId, action)
    }
  }

  /**
   * Rejects a pending action
   */
  rejectAction(actionId: string): void {
    const action = this.pendingActions.get(actionId)
    if (action) {
      action.status = 'rejected'
      this.pendingActions.set(actionId, action)
    }
  }

  /**
   * Gets a pending action by ID
   */
  getPendingAction(actionId: string): PendingAction | undefined {
    return this.pendingActions.get(actionId)
  }

  /**
   * Executes an action
   */
  async executeAction(
    toolCall: ParsedToolCall,
    conversationId?: string,
    onProgress?: (message: string) => void,
  ): Promise<ActionResult> {
    const startTime = Date.now()

    try {
      // Validate the tool call
      const validation = this.validateToolCall(toolCall)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          message: `Validation failed: ${validation.error}`,
        }
      }

      // Get action config
      const config = getActionConfig(toolCall.name)
      if (!config) {
        return {
          success: false,
          error: 'Action not found',
          message: `No handler found for action: ${toolCall.name}`,
        }
      }

      // Build execution context
      const { activeWalletId, activeNetwork, password } = useWalletStore.getState()
      const wallet = useWalletStore
        .getState()
        .wallets.find((w) => w.id === activeWalletId)

      const context: ActionContext = {
        walletId: activeWalletId,
        networkId: activeNetwork.id,
        password: password,
        userAddress: wallet?.address || null,
        onProgress,
      }

      // Execute the action
      onProgress?.(`Executing ${config.description}...`)

      const result = await config.handler(toolCall.parameters, context)

      const duration = Date.now() - startTime

      // Record to history
      await this.recordActionHistory({
        id: `history-${Date.now()}`,
        actionName: toolCall.name,
        parameters: toolCall.parameters,
        result,
        status: result.success ? 'completed' : 'failed',
        executedAt: new Date(),
        walletId: activeWalletId,
        networkId: activeNetwork.id,
        conversationId,
        duration,
        error: result.error,
      })

      return result
    } catch (error: any) {
      const duration = Date.now() - startTime

      // Record failure to history
      await this.recordActionHistory({
        id: `history-${Date.now()}`,
        actionName: toolCall.name,
        parameters: toolCall.parameters,
        result: { success: false, error: error.message },
        status: 'failed',
        executedAt: new Date(),
        walletId: useWalletStore.getState().activeWalletId,
        networkId: useWalletStore.getState().activeNetwork.id,
        conversationId,
        duration,
        error: error.message,
      })

      return {
        success: false,
        error: error.message || 'Execution failed',
        message: `Failed to execute ${toolCall.name}: ${error.message}`,
      }
    }
  }

  /**
   * Executes a pending action (after user confirmation)
   */
  async executePendingAction(
    actionId: string,
    conversationId?: string,
    onProgress?: (message: string) => void,
  ): Promise<ActionResult> {
    const pendingAction = this.pendingActions.get(actionId)

    if (!pendingAction) {
      return {
        success: false,
        error: 'Action not found',
        message: 'Pending action not found',
      }
    }

    if (pendingAction.status !== 'approved') {
      return {
        success: false,
        error: 'Action not approved',
        message: 'Action must be approved before execution',
      }
    }

    // Update status
    pendingAction.status = 'executing'
    this.pendingActions.set(actionId, pendingAction)

    // Execute
    const toolCall: ParsedToolCall = {
      id: pendingAction.toolCallId,
      name: pendingAction.name,
      parameters: pendingAction.parameters,
    }

    const result = await this.executeAction(toolCall, conversationId, onProgress)

    // Update status
    pendingAction.status = result.success ? 'completed' : 'failed'
    this.pendingActions.set(actionId, pendingAction)

    // Clean up after 5 minutes
    setTimeout(() => {
      this.pendingActions.delete(actionId)
    }, 5 * 60 * 1000)

    return result
  }

  /**
   * Records action execution to history
   */
  private async recordActionHistory(entry: ActionHistoryEntry): Promise<void> {
    try {
      await db.aiActionHistory.add({
        ...entry,
        executedAt: entry.executedAt.getTime(),
      })
    } catch (error) {
      console.error('[ActionExecutor] Failed to record action history:', error)
    }
  }

  /**
   * Gets action history
   */
  async getActionHistory(limit: number = 50): Promise<ActionHistoryEntry[]> {
    try {
      const records = await db.aiActionHistory.orderBy('executedAt').reverse().limit(limit).toArray()

      return records.map((r) => ({
        ...r,
        executedAt: new Date(r.executedAt),
      }))
    } catch (error) {
      console.error('[ActionExecutor] Failed to get action history:', error)
      return []
    }
  }

  /**
   * Clears all pending actions
   */
  clearPendingActions(): void {
    this.pendingActions.clear()
  }

  /**
   * Gets all pending actions
   */
  getPendingActions(): PendingAction[] {
    return Array.from(this.pendingActions.values())
  }
}

export const actionExecutor = new ActionExecutor()
