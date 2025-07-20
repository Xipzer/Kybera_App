/**
 * Code by Xipzer
 */

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface Conversation {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  pinned?: boolean
}

export interface ChatModel {
  id: string
  name: string
  provider: string
  maxTokens: number
}