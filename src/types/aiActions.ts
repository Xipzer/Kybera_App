/**
 * Code by Xipzer
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'
export type ActionStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed'

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

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ParsedToolCall {
  id: string
  name: string
  parameters: Record<string, any>
}

export interface ActionConfig {
  name: string
  handler: (params: any, context: ActionContext) => Promise<ActionResult>
  requiresConfirmation: boolean
  riskLevel: RiskLevel
  requiresPassword?: boolean
  category: ActionCategory
  description: string
  estimatedTime?: number
}

export type ActionCategory =
  | 'wallet_management'
  | 'token_transfer'
  | 'token_swap'
  | 'token_bridge'
  | 'query'
  | 'network'

export interface ActionContext {
  walletId: string | null
  networkId: string
  password: string | null
  userAddress: string | null
  onProgress?: (message: string) => void
}

export interface ActionResult {
  success: boolean
  data?: any
  error?: string
  message?: string
  transactionHash?: string
  explorerUrl?: string
}

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
  duration?: number
  error?: string
}

export interface ActionPermissions {
  trustedActions: string[]
  maxTransferWithoutPassword: number
  dailyTransferLimit: number
  dailyTransferUsed: number
  lastResetDate: string
  blockedActions: string[]
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface StreamChunk {
  type: 'content' | 'tool_call' | 'done'
  content?: string
  toolCall?: Partial<ToolCall>
  finishReason?: string
}

export interface TransactionPreview {
  type: 'transfer' | 'swap' | 'bridge' | 'approve'
  from: string
  to: string
  amount: string
  token: string
  network: string
  estimatedGas?: string
  estimatedGasUSD?: number
  toNetwork?: string
  expectedOutput?: string
  slippage?: number
  deadline?: number
}