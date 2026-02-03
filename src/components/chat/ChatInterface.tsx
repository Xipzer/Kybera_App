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

// Theme color configurations for chat interface
const chatThemeColors = {
  light: {
    headerBg: 'bg-white/70',
    headerBorder: 'border-gray-200/50',
    titleGradient: 'from-cyan-600 via-teal-500 to-cyan-600',
    settingsHover: 'hover:bg-gray-100/80',
    inputContainerBg: 'bg-white/70',
    inputBg: 'bg-white/90',
    inputBorder: 'border-gray-200/60',
    inputFocusBorder: 'focus:border-cyan-400',
    inputFocusRing: 'focus:ring-cyan-400/20',
    sendGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
    sendShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
    sendDisabled: 'disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none',
    loadingDotBg: 'bg-cyan-400',
    emptyStateBg: 'bg-white/60',
    emptyStateBorder: 'border-gray-200/50',
    emptyStateIconBg: 'bg-gradient-to-br from-yellow-400 to-orange-400',
    configButtonGradient: 'from-cyan-500 to-teal-500',
  },
  dark: {
    headerBg: 'bg-surface-elevated/50',
    headerBorder: 'border-border-subtle',
    titleGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
    settingsHover: 'hover:bg-white/10',
    inputContainerBg: 'bg-surface-elevated/50',
    inputBg: 'bg-white/5',
    inputBorder: 'border-white/10',
    inputFocusBorder: 'focus:border-cyan-500/50',
    inputFocusRing: 'focus:ring-cyan-500/20',
    sendGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
    sendShadow: 'shadow-cyan-500/25 hover:shadow-cyan-500/40',
    sendDisabled: 'disabled:from-slate-600 disabled:to-slate-700 disabled:shadow-none',
    loadingDotBg: 'bg-cyan-400',
    emptyStateBg: 'bg-surface-elevated/50',
    emptyStateBorder: 'border-border-subtle',
    emptyStateIconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
    configButtonGradient: 'from-cyan-500 to-pink-500',
  },
  xipz: {
    headerBg: 'bg-primary-900/50',
    headerBorder: 'border-primary-800/50',
    titleGradient: 'from-red-400 via-red-500 to-red-400',
    settingsHover: 'hover:bg-primary-800/50',
    inputContainerBg: 'bg-primary-900/50',
    inputBg: 'bg-primary-900/50',
    inputBorder: 'border-primary-800/50',
    inputFocusBorder: 'focus:border-red-500/50',
    inputFocusRing: 'focus:ring-red-500/20',
    sendGradient: 'from-red-500 via-red-600 to-red-500',
    sendShadow: 'shadow-red-500/25 hover:shadow-red-500/40',
    sendDisabled: 'disabled:from-primary-700 disabled:to-primary-800 disabled:shadow-none',
    loadingDotBg: 'bg-red-400',
    emptyStateBg: 'bg-primary-900/50',
    emptyStateBorder: 'border-primary-800/50',
    emptyStateIconBg: 'bg-gradient-to-br from-yellow-500 to-orange-500',
    configButtonGradient: 'from-red-500 to-red-600',
  },
}

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
  const { themeName } = useTheme()
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Get theme-specific colors
  const colors = chatThemeColors[themeName] || chatThemeColors.dark

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
          className={`max-w-md text-center p-8 ${colors.emptyStateBg} border ${colors.emptyStateBorder} rounded-2xl shadow-xl`}
        >
          {/* Animated icon container */}
          <div className="relative inline-flex mb-6">
            <div
              className={`absolute inset-0 ${colors.emptyStateIconBg} rounded-full blur-xl opacity-30 animate-pulse`}
            />
            <div
              className={`relative w-16 h-16 rounded-full ${colors.emptyStateIconBg} flex items-center justify-center shadow-lg`}
            >
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2
            className={`text-xl font-bold bg-gradient-to-r ${colors.titleGradient} bg-clip-text text-transparent mb-3`}
          >
            API Key Required
          </h2>
          <p className="text-text-secondary mb-6">
            Please configure your OpenRouter API key to start chatting with AI.
          </p>

          <button
            onClick={() => setShowSettings(true)}
            className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${colors.configButtonGradient} rounded-xl font-medium text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300`}
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
        <div className={`${colors.headerBg} border-b ${colors.headerBorder} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Title with gradient */}
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl bg-gradient-to-r ${colors.sendGradient} shadow-lg`}>
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <h2
                  className={`text-lg font-semibold bg-gradient-to-r ${colors.titleGradient} bg-clip-text text-transparent`}
                >
                  {activeConversation?.title || 'New Chat'}
                </h2>
              </div>
              <ModelSelector />
            </div>

            {/* Settings button */}
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2.5 rounded-xl ${colors.settingsHover} border border-transparent hover:border-white/10 transition-all duration-200 hover:scale-105`}
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
                  className={`flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r ${colors.sendGradient} flex items-center justify-center shadow-lg ${colors.sendShadow}`}
                >
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl ${colors.emptyStateBg} border ${colors.emptyStateBorder}`}
                >
                  <div
                    className={`w-2 h-2 ${colors.loadingDotBg} rounded-full animate-bounce`}
                    style={{ animationDelay: '0ms' }}
                  />
                  <div
                    className={`w-2 h-2 ${colors.loadingDotBg} rounded-full animate-bounce`}
                    style={{ animationDelay: '150ms' }}
                  />
                  <div
                    className={`w-2 h-2 ${colors.loadingDotBg} rounded-full animate-bounce`}
                    style={{ animationDelay: '300ms' }}
                  />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input area - no backdrop-blur */}
        <div className={`${colors.inputContainerBg} border-t ${colors.headerBorder} p-4`}>
          <div className="max-w-4xl mx-auto">
            <div
              className={`relative flex gap-3 transition-transform duration-200 ${isFocused ? 'scale-[1.01]' : ''}`}
            >
              {/* Input glow on focus */}
              <div
                className={`absolute -inset-1 bg-gradient-to-r ${colors.sendGradient} rounded-2xl blur-lg transition-opacity duration-300 ${isFocused ? 'opacity-20' : 'opacity-0'}`}
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
                  className={`w-full px-4 py-3 ${colors.inputBg} border ${colors.inputBorder} rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 ${colors.inputFocusRing} ${colors.inputFocusBorder} transition-all duration-200 resize-none`}
                  style={{ minHeight: '48px', maxHeight: '200px' }}
                />
              </div>

              {/* Send button with gradient */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`relative flex-shrink-0 px-4 py-3 bg-gradient-to-r ${colors.sendGradient} rounded-xl font-medium text-white shadow-lg ${colors.sendShadow} ${colors.sendDisabled} transition-all duration-300 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100`}
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
