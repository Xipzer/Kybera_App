import { useState, useEffect, useRef, useCallback } from 'react'
import { Settings, AlertCircle, Sparkles, Bot, Zap, ArrowUp } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import { ChatMessage } from './ChatMessage'
import { ModelSelector } from './ModelSelector'
import { SettingsDialog } from '../settings/SettingsDialog'
import { OpenRouterService } from '../../services/ai/openrouter'
import { useTheme } from '../../hooks/useTheme'

// Line height for textarea (in pixels)
const LINE_HEIGHT = 24
const MAX_LINES = 11
const BASE_INPUT_PADDING = 80 // Base padding for input area (container + margins)

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
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [inputHeight, setInputHeight] = useState(48) // Default single line height
  const [hasScroll, setHasScroll] = useState(false) // Track if textarea needs scrolling

  // Auto-resize textarea based on content
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // If empty, reset to default size
    if (!textarea.value) {
      textarea.style.height = '48px'
      setHasScroll(false)
      setInputHeight(48)
      return
    }

    // Reset height to get the correct scrollHeight
    textarea.style.height = '48px'

    // Calculate the new height (capped at max lines)
    const maxHeight = LINE_HEIGHT * MAX_LINES
    const scrollHeight = textarea.scrollHeight
    const newHeight = Math.min(scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`

    // Check if content exceeds max height (needs scrolling)
    const needsScroll = scrollHeight > maxHeight
    setHasScroll(needsScroll)

    // Update input height for dynamic padding (add extra for button row if scrolling)
    setInputHeight(needsScroll ? newHeight + 48 : newHeight)
  }, [])

  // Get chat interface theme styles
  const styles = theme.styles.chatInterface

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConversation?.messages])

  // Adjust height when input changes
  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

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

        {/* Messages area - with dynamic padding at bottom for floating input */}
        <div className="flex-1 overflow-y-auto">
          <div
            className="max-w-5xl mx-auto px-4 pt-4"
            style={{ paddingBottom: `${inputHeight + BASE_INPUT_PADDING}px` }}
          >
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

        {/* Floating input area - ChatGPT style */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
          <div className="max-w-5xl mx-auto pointer-events-auto">
            <div
              className={`${styles.inputSolidBg} border ${styles.inputBorder} rounded-2xl shadow-lg overflow-hidden`}
            >
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Ask anything"
                  rows={1}
                  className={`w-full px-4 ${hasScroll ? '' : 'pr-14'} bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none`}
                  style={{
                    height: '48px',
                    maxHeight: `${LINE_HEIGHT * MAX_LINES}px`,
                    lineHeight: `${LINE_HEIGHT}px`,
                    paddingTop: '14px',
                    paddingBottom: '10px',
                  }}
                />

                {/* Circular send button - inline when no scroll */}
                {!hasScroll && (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`absolute bottom-2 right-2 w-9 h-9 rounded-full bg-gradient-to-r ${styles.sendGradient} flex items-center justify-center text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Send button row - separate when scrolling */}
              {hasScroll && (
                <div className="flex justify-end px-3 py-2 border-t border-white/5">
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`w-9 h-9 rounded-full bg-gradient-to-r ${styles.sendGradient} flex items-center justify-center text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100`}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </div>
    </div>
  )
}
