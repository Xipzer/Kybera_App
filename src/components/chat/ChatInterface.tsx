import { useState, useEffect, useRef } from 'react'
import { Send, Settings, AlertCircle } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useSettingsStore } from '../../store/settingsStore'
import { ChatMessage } from './ChatMessage'
import { ModelSelector } from './ModelSelector'
import { SettingsDialog } from './SettingsDialog'
import { OpenRouterService } from '../../services/ai/openrouter'
import * as ScrollArea from '@radix-ui/react-scroll-area'

export function ChatInterface() {
  const { conversations, activeConversationId, addMessage, createConversation, updateConversation, setLoading, isLoading } = useChatStore()
  const { openRouterApiKey, selectedModel } = useSettingsStore()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    if (!openRouterApiKey) {
      setShowSettings(true)
      return
    }

    let conversationId = activeConversationId
    if (!conversationId) {
      conversationId = await createConversation()
    }

    const userMessage = input
    setInput('')

    // Add user message
    await addMessage(conversationId, {
      role: 'user',
      content: userMessage,
    })

    // Update conversation title if it's the first message
    const conversation = conversations.find(c => c.id === conversationId)
    if (conversation && conversation.messages.length === 0) {
      const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '')
      await updateConversation(conversationId, { title })
    }

    setLoading(true)
    setStreamingContent('')

    try {
      // Prepare messages for API
      const messages = [
        ...(conversation?.messages || []).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user' as const, content: userMessage },
      ]

      let fullResponse = ''
      
      // Call OpenRouter API with streaming
      const response = await OpenRouterService.sendMessage(
        messages,
        selectedModel,
        openRouterApiKey!,
        (chunk) => {
          fullResponse += chunk
          setStreamingContent(fullResponse)
        }
      )

      // Add assistant message
      await addMessage(conversationId, {
        role: 'assistant',
        content: response,
      })
    } catch (error) {
      console.error('Error calling OpenRouter:', error)
      await addMessage(conversationId, {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
      })
    } finally {
      setLoading(false)
      setStreamingContent('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (!openRouterApiKey) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md text-center p-8">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            API Key Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please configure your OpenRouter API key to start chatting.
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Configure API Key
          </button>
        </div>
        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {activeConversation?.title || 'New Chat'}
            </h2>
            <ModelSelector />
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <ScrollArea.Root className="flex-1">
        <ScrollArea.Viewport className="h-full w-full">
          <div className="max-w-4xl mx-auto p-4">
            {activeConversation?.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && streamingContent && (
              <ChatMessage
                message={{
                  id: 'streaming',
                  conversationId: activeConversationId!,
                  role: 'assistant',
                  content: streamingContent,
                  timestamp: new Date(),
                }}
              />
            )}
            {isLoading && !streamingContent && (
              <div className="flex gap-4 mb-6">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-200" />
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse animation-delay-400" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex select-none touch-none p-0.5 bg-gray-100 dark:bg-gray-900 transition-colors duration-[160ms] ease-out hover:bg-gray-200 dark:hover:bg-gray-800 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="flex-1 bg-gray-400 dark:bg-gray-600 rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px]" />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      <div className="border-t border-gray-200 dark:border-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              style={{ minHeight: '44px', maxHeight: '200px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
    </div>
  )
}