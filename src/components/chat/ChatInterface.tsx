import { useState, useEffect, useRef } from 'react'
import { Send, Settings, AlertCircle, Sparkles, Bot, Zap } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import { ChatMessage } from './ChatMessage'
import { ModelSelector } from './ModelSelector'
import { SettingsDialog } from '../settings/SettingsDialog'
import { OpenRouterService } from '../../services/ai/openrouter'
import { useTheme } from '../../hooks/useTheme'



export function ChatInterface() {
  const {
    conversations,
    activeConversationId,
    addMessage,
    createConversation,
    updateConversation,
    setLoading,
    isLoading,
  } = useChatStore()
  const { openRouterApiKey, selectedModel } = useSettingsStore()
  const { chatWallpaper, wallpaperOpacity } = useUIStore()
  const { theme } = useTheme()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get chat interface theme styles
  const styles = theme.styles.chatInterface

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
    const conversation = conversations.find((c) => c.id === conversationId)
    if (conversation && conversation.messages.length === 0) {
      const title = userMessage.slice(0, 50) + (userMessage.length > 50 ? '...' : '')
      await updateConversation(conversationId, { title })
    }

    setLoading(true)
    setStreamingContent('')

    try {
      // Prepare messages for API
      const messages = [
        ...(conversation?.messages || []).map((msg) => ({
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
        {
          onChunk: (chunk) => {
            fullResponse += chunk
            setStreamingContent(fullResponse)
          },
        },
      )

      // Add assistant message
      await addMessage(conversationId, {
        role: 'assistant',
        content: response.content || '',
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
      <div className="h-full flex items-center justify-center p-4">
        <div
          className={`max-w-md text-center p-8 ${styles.emptyStateBg} border ${styles.emptyStateBorder} rounded-2xl shadow-xl`}
        >
          {/* Animated icon container */}
          <div className="relative inline-flex mb-6">
            <div
              className={`absolute inset-0 ${styles.emptyStateIconBg} rounded-full blur-xl opacity-30 animate-pulse`}
            />
            <div
              className={`relative w-16 h-16 rounded-full ${styles.emptyStateIconBg} flex items-center justify-center shadow-lg`}
            >
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2
            className={`text-xl font-bold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent mb-3`}
          >
            API Key Required
          </h2>
          <p className="text-text-secondary mb-6">
            Please configure your OpenRouter API key to start chatting with AI.
          </p>

          <button
            onClick={() => setShowSettings(true)}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${styles.configButtonGradient} rounded-xl font-medium text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300`}
          >
            <Zap className="w-4 h-4" />
            Configure API Key
          </button>
        </div>
        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-surface-base relative overflow-hidden">
      {/* Chat wallpaper */}
      {chatWallpaper && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${chatWallpaper})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: wallpaperOpacity,
          }}
        />
      )}

      {/* Content with relative positioning to stay above wallpaper */}
      <div className="relative z-10 h-full flex flex-col">
        {/* Header - no backdrop-blur */}
        <div className={`${styles.headerBg} border-b ${styles.headerBorder} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Title with gradient */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-r ${styles.sendGradient} shadow-lg`}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h2
                  className={`text-lg font-semibold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent`}
                >
                  {activeConversation?.title || 'New Chat'}
                </h2>
              </div>
              <ModelSelector />
            </div>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2.5 rounded-xl ${styles.settingsHover} border border-transparent hover:border-white/10 transition-all duration-200 hover:scale-105`}
            >
              <Settings className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
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
            {/* Animated loading indicator */}
            {isLoading && !streamingContent && (
              <div className="flex gap-4 mb-6">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r ${styles.sendGradient} flex items-center justify-center shadow-lg ${styles.sendShadow}`}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${styles.emptyStateBg} border ${styles.emptyStateBorder}`}
                >
                  <div
                    className={`w-2 h-2 ${styles.loadingDotBg} rounded-full animate-bounce`}
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className={`w-2 h-2 ${styles.loadingDotBg} rounded-full animate-bounce`}
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className={`w-2 h-2 ${styles.loadingDotBg} rounded-full animate-bounce`}
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - no backdrop-blur */}
        <div className={`${styles.inputContainerBg} border-t ${styles.headerBorder} p-4`}>
          <div className="max-w-4xl mx-auto">
            <div
              className={`relative flex gap-3 transition-transform duration-200 ${isFocused ? 'scale-[1.01]' : ''}`}
            >
              {/* Input glow on focus */}
              <div
                className={`absolute -inset-1 bg-gradient-to-r ${styles.sendGradient} rounded-2xl blur-lg transition-opacity duration-300 ${isFocused ? 'opacity-20' : 'opacity-0'}`}
              />

              <div className="relative flex-1">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder="Type your message..."
                  rows={1}
                  className={`w-full px-4 py-3 ${styles.inputBg} border ${styles.inputBorder} rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 ${styles.inputFocusRing} ${styles.inputFocusBorder} transition-all duration-200 resize-none`}
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
              </div>

              {/* Send button with gradient */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`relative flex-shrink-0 px-4 py-3 bg-gradient-to-r ${styles.sendGradient} rounded-xl font-medium text-white shadow-lg ${styles.sendShadow} ${styles.sendDisabled} transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>

            {/* Subtle hint text */}
            <p className="text-xs text-text-tertiary mt-2 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>

        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </div>
    </div>
  )
}
