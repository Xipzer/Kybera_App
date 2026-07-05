/**
 * Code by Xipzer
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Conversation, Message } from '../types'
import { db, StoredConversation } from '../services/database'

interface ChatState {
  conversations: Conversation[]
  activeConversationId: string | null
  isLoading: boolean

  createConversation: (title?: string) => Promise<string>
  deleteConversation: (id: string) => Promise<void>
  setActiveConversation: (id: string) => void
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp' | 'conversationId'>) => Promise<void>
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>
  loadConversations: () => Promise<void>
  setLoading: (loading: boolean) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      conversations: [],
      activeConversationId: null,
      isLoading: false,

      createConversation: async (title = 'New Chat') => {
        const conversation: Conversation = {
          id: Date.now().toString(),
          title,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        }

        await db.conversations.add({
          ...conversation,
          createdAt: conversation.createdAt.getTime(),
          updatedAt: conversation.updatedAt.getTime(),
        })

        set((state) => ({
          conversations: [...state.conversations, conversation],
          activeConversationId: conversation.id,
        }))

        return conversation.id
      },

      deleteConversation: async (id) => {
        await db.conversations.delete(id)
        await db.messages.where('conversationId').equals(id).delete()

        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        }))
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id })
      },

      addMessage: async (conversationId, messageData) => {
        const message: Message = {
          id: Date.now().toString(),
          conversationId,
          timestamp: new Date(),
          role: messageData.role,
          content: messageData.content,
        }

        await db.messages.add({
          id: message.id,
          conversationId: message.conversationId,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp.getTime(),
        })

        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, message],
                  updatedAt: new Date(),
                }
              : conv,
          ),
        }))

        await db.conversations.update(conversationId, {
          updatedAt: Date.now(),
        })
      },

      updateConversation: async (id, updates) => {
        const updateData: Partial<StoredConversation> = {
          updatedAt: Date.now(),
        }
        if (updates.title) updateData.title = updates.title
        if (updates.pinned !== undefined) updateData.pinned = updates.pinned
        await db.conversations.update(id, updateData)

        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates, updatedAt: new Date() } : conv,
          ),
        }))
      },

      loadConversations: async () => {
        const storedMessages = await db.messages.toArray()

        const conversations = (await db.conversations.toArray()).map((conv) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: storedMessages
            .filter((msg) => msg.conversationId === conv.id)
            .map((msg) => ({
              ...msg,
              timestamp: new Date(msg.timestamp),
            }))
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        }))

        set({ conversations })
      },

      setLoading: (loading) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'chat-store',
      partialize: (state) => ({
        activeConversationId: state.activeConversationId,
      }),
    },
  ),
)