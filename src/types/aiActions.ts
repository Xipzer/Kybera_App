/**
 * Types for AI-powered action system
 * Enables LLM to perform wallet operations via function calling
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'

/**
 * OpenAI-compatible function/tool definition
 */
export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: {
      type: 'object'
      properties: Record<string, ToolParameter>
      required?: string[]
    }
  }
}

export interface ToolParameter {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  enum?: string[]
  items?: ToolParameter
  properties?: Record<string, ToolParameter>
}

/**
 * Tool call from LLM (OpenAI format)
 */
export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string // JSON string
  }
}

/**
 * Parsed tool call with validated parameters
 */
export interface ParsedToolCall {
  id: string
  name: string
  parameters: Record<string, any>
}

/**
 * Action configuration in registry
 */
export interface ActionConfig {
  name: string
  handler: (params: any, context: ActionContext) => Promise<ActionResult>
  requiresConfirmation: boolean
  riskLevel: RiskLevel
  requiresPassword?: boolean // For critical actions
  category: ActionCategory
  description: string
  estimatedTime?: number // Estimated execution time in ms
}

export type ActionCategory =
  | 'wallet_management'
  | 'token_transfer'
  | 'token_swap'
  | 'token_bridge'
  | 'query'
  | 'network'

/**
 * Context provided to action handlers
 */
export interface ActionContext {
  walletId: string | null
  networkId: string
  password: string | null
  userAddress: string | null
  onProgress?: (message: string) => void
}

/**
 * Result from action execution
 */
export interface ActionResult {
  success: boolean
  data?: any
  error?: string
  message?: string // Human-readable message
  transactionHash?: string
  explorerUrl?: string
}

/**
 * Pending action awaiting user confirmation
 */
export interface PendingAction {
  id: string
  toolCallId: string
  name: string
  parameters: Record<string, any>
  riskLevel: RiskLevel
  status: ActionStatus
  createdAt: Date
  estimatedTime?: number
  category: ActionCategory
  description: string
}

/**
 * Action execution record for audit trail
 */
export interface ActionHistoryEntry {
  id: string
  actionName: string
  parameters: Record<string, any>
  result: ActionResult
  status: ActionStatus
  executedAt: Date
  walletId: string | null
  networkId: string
  conversationId?: string
  duration?: number // Execution time in ms
  error?: string
}

/**
 * Permission settings for actions
 */
export interface ActionPermissions {
  // Actions that don't require confirmation
  trustedActions: string[]
  // Maximum transfer amounts (USD)
  maxTransferWithoutPassword: number
  // Daily limits
  dailyTransferLimit: number
  dailyTransferUsed: number
  lastResetDate: string
  // Blocked actions
  blockedActions: string[]
}

/**
 * Enhanced message with tool calls
 */
export interface AIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string // For tool response messages
  name?: string // Tool name for tool responses
}

/**
 * Streaming response chunk from OpenRouter
 */
export interface StreamChunk {
  type: 'content' | 'tool_call' | 'done'
  content?: string
  toolCall?: Partial<ToolCall>
  finishReason?: string
}

/**
 * Transaction preview for confirmation
 */
export interface TransactionPreview {
  type: 'transfer' | 'swap' | 'bridge' | 'approve'
  from: string
  to: string
  amount: string
  token: string
  network: string
  estimatedGas?: string
  estimatedGasUSD?: number
  toNetwork?: string // For bridge operations
  expectedOutput?: string // For swaps
  slippage?: number
  deadline?: number
}
