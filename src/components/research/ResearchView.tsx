/**
 * ResearchView Component
 * Main research interface with token input, chat, and research results
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Wifi,
  WifiOff,
  Settings,
  ArrowUp,
  Bot,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Zap,
} from 'lucide-react'
import { useResearchStore } from '../../store/researchStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import { ResearchCard } from './ResearchCard'
import { ApeInterface } from './ApeInterface'
import { ChatMessage } from '../chat/ChatMessage'
import { SettingsDialog } from '../settings/SettingsDialog'
import { useTheme } from '../../hooks/useTheme'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { TokenResearch, ResearchNetwork } from '../../types/research'

// Detect network from contract address format
const detectNetwork = (address: string): ResearchNetwork => {
  // Solana addresses are base58, typically 32-44 chars, no 0x prefix
  if (!address.startsWith('0x') && address.length >= 32 && address.length <= 44) {
    return 'solana'
  }
  // Default to Base for EVM addresses
  return 'base'
}

// Validate contract address
const isValidAddress = (address: string): boolean => {
  // EVM address
  if (address.startsWith('0x') && address.length === 42) {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }
  // Solana address (base58)
  if (!address.startsWith('0x') && address.length >= 32 && address.length <= 44) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)
  }
  return false
}

const LINE_HEIGHT = 24
const MAX_LINES = 6

export function ResearchView() {
  const { theme, themeName } = useTheme()
  const styles = theme.styles.chatInterface
  const isDark = themeName === 'dark' || themeName === 'xipz'
  const isMobile = useMediaQuery('(max-width: 1024px)')

  // Wallpaper settings
  const { chatWallpaper, wallpaperOpacity } = useUIStore()

  // Store state - use individual selectors to prevent unnecessary re-renders
  const connectionState = useResearchStore((state) => state.connectionState)
  const allResearches = useResearchStore((state) => state.researches)
  const messages = useResearchStore((state) => state.messages)
  const isResearching = useResearchStore((state) => state.isResearching)
  const currentResearchStep = useResearchStore((state) => state.currentResearchStep)
  const researchProgress = useResearchStore((state) => state.researchProgress)
  const connectionError = useResearchStore((state) => state.connectionError)

  // Actions
  const connect = useResearchStore((state) => state.connect)
  const disconnect = useResearchStore((state) => state.disconnect)
  const requestResearch = useResearchStore((state) => state.requestResearch)
  const sendMessage = useResearchStore((state) => state.sendMessage)
  const dismissResearch = useResearchStore((state) => state.dismissResearch)
  const markAsTraded = useResearchStore((state) => state.markAsTraded)

  // Memoize filtered researches to prevent infinite loops
  const researches = useMemo(() => allResearches.filter((r) => !r.dismissed), [allResearches])

  const { openClawGatewayUrl, openClawAuthToken, openClawAutoConnect } = useSettingsStore()

  // Local state
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [selectedResearch, setSelectedResearch] = useState<TokenResearch | null>(null)
  const [showApeInterface, setShowApeInterface] = useState(false)
  const [inputHeight, setInputHeight] = useState(48)
  const [hasScroll, setHasScroll] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-connect on mount if configured
  useEffect(() => {
    if (openClawGatewayUrl && openClawAutoConnect && connectionState === 'disconnected') {
      connect(openClawGatewayUrl, openClawAuthToken || undefined).catch(console.error)
    }
  }, [openClawGatewayUrl, openClawAuthToken, openClawAutoConnect, connectionState, connect])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, researches])

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    if (!textarea.value) {
      textarea.style.height = '48px'
      setHasScroll(false)
      setInputHeight(48)
      return
    }

    textarea.style.height = '48px'
    const maxHeight = LINE_HEIGHT * MAX_LINES
    const scrollHeight = textarea.scrollHeight
    const newHeight = Math.min(scrollHeight, maxHeight)
    textarea.style.height = `${newHeight}px`

    const needsScroll = scrollHeight > maxHeight
    setHasScroll(needsScroll)
    setInputHeight(needsScroll ? newHeight + 48 : newHeight)
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [input, adjustTextareaHeight])

  // Handle send
  const handleSend = async () => {
    if (!input.trim() || connectionState !== 'connected') return

    const trimmedInput = input.trim()
    setInput('')

    // Check if it's a contract address
    if (isValidAddress(trimmedInput)) {
      const network = detectNetwork(trimmedInput)
      await requestResearch(trimmedInput, network)
    } else {
      // It's a chat message / follow-up question
      await sendMessage(trimmedInput)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleApe = (research: TokenResearch) => {
    setSelectedResearch(research)
    setShowApeInterface(true)
  }

  const handleFade = (research: TokenResearch) => {
    dismissResearch(research.id)
  }

  const handleTradeComplete = (txHash: string, amount: number) => {
    if (selectedResearch) {
      markAsTraded(selectedResearch.id, amount, txHash)
    }
  }

  const handleConnect = () => {
    if (openClawGatewayUrl) {
      connect(openClawGatewayUrl, openClawAuthToken || undefined).catch(console.error)
    } else {
      setShowSettings(true)
    }
  }

  // Connection status indicator
  const ConnectionStatus = () => {
    const statusConfig: Record<
      string,
      { icon: typeof Wifi; color: string; bg: string; label: string; spin?: boolean }
    > = {
      connected: { icon: Wifi, color: 'text-green-400', bg: 'bg-green-500/20', label: 'Connected' },
      connecting: {
        icon: Loader2,
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/20',
        label: 'Connecting...',
        spin: true,
      },
      reconnecting: {
        icon: RefreshCw,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        label: 'Reconnecting...',
        spin: true,
      },
      disconnected: {
        icon: WifiOff,
        color: 'text-text-tertiary',
        bg: 'bg-white/5',
        label: 'Disconnected',
      },
      error: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Error' },
    }

    const config = statusConfig[connectionState]
    const Icon = config.icon

    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg}`}>
        <Icon className={`w-4 h-4 ${config.color} ${config.spin ? 'animate-spin' : ''}`} />
        <span className={`text-sm ${config.color}`}>{config.label}</span>
      </div>
    )
  }

  // Not configured state
  if (!openClawGatewayUrl) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div
          className={`max-w-md text-center p-8 ${styles.emptyStateBg} border ${styles.emptyStateBorder} rounded-2xl shadow-xl`}
        >
          <div className="relative inline-flex mb-6">
            <div
              className={`absolute inset-0 bg-gradient-to-br ${styles.sendGradient} rounded-full blur-xl opacity-30 animate-pulse`}
            />
            <div
              className={`relative w-16 h-16 rounded-full bg-gradient-to-br ${styles.sendGradient} flex items-center justify-center shadow-lg`}
            >
              <Zap className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2
            className={`text-xl font-bold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent mb-3`}
          >
            Connect to OpenClaw
          </h2>
          <p className="text-text-secondary mb-6">
            Configure your OpenClaw Gateway URL to start researching tokens with AI-powered OSINT
            analysis.
          </p>

          {/* Desktop: Button opens settings dialog */}
          <button
            onClick={() => setShowSettings(true)}
            className={`hidden lg:inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${styles.configButtonGradient} rounded-xl font-medium text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300`}
          >
            <Settings className="w-4 h-4" />
            Configure OpenClaw
          </button>

          {/* Mobile: Guide to settings tab */}
          <p className="lg:hidden text-sm text-text-tertiary">
            Tap the <span className="text-text-primary font-medium">Settings</span> tab below to
            configure
          </p>
        </div>
        {/* Settings dialog - desktop only */}
        {!isMobile && <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-surface-base relative overflow-hidden">
      {/* Wallpaper overlay */}
      {chatWallpaper && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${chatWallpaper})`,
            opacity: wallpaperOpacity,
          }}
        />
      )}

      <div className="relative z-10 h-full flex flex-col">
        {/* Header */}
        <div className={`${styles.headerBg} border-b ${styles.headerBorder} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/kybera-icon.png" alt="Kybera" className="w-8 h-8 rounded-lg shadow-lg" />
              <ConnectionStatus />
            </div>

            <div className="flex items-center gap-2">
              {connectionState === 'disconnected' && (
                <button
                  onClick={handleConnect}
                  className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 rounded-full text-sm text-cyan-400 transition-colors touch-manipulation"
                >
                  Connect
                </button>
              )}
              {connectionState === 'connected' && (
                <button
                  onClick={disconnect}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-full text-sm text-red-400 transition-colors touch-manipulation"
                >
                  Disconnect
                </button>
              )}
              {/* Settings button - hidden on mobile since it's in the nav bar */}
              <button
                onClick={() => setShowSettings(true)}
                className={`${theme.styles.buttonIcon} p-2 rounded-lg hidden lg:flex`}
                title="Settings"
              >
                <Settings className="w-4 h-4 text-text-secondary" />
              </button>
            </div>
          </div>

          {/* Research progress */}
          {isResearching && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-text-secondary">
                  {currentResearchStep || 'Researching...'}
                </span>
                <span className="text-cyan-500">{researchProgress}%</span>
              </div>
              <div className="h-1 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${researchProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div
            className="max-w-7xl mx-auto px-3 sm:px-4 pt-4"
            style={{ paddingBottom: `${inputHeight + (isMobile ? 100 : 32)}px` }}
          >
            {/* Research results */}
            {researches.length > 0 && (
              <div className="space-y-4 mb-6">
                {researches.map((research) => (
                  <ResearchCard
                    key={research.id}
                    research={research}
                    onApe={handleApe}
                    onFade={handleFade}
                  />
                ))}
              </div>
            )}

            {/* Chat messages */}
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={{
                  id: message.id,
                  conversationId: 'research',
                  role: message.role,
                  content: message.content,
                  timestamp: message.timestamp,
                }}
              />
            ))}

            {/* Loading indicator */}
            {isResearching && messages.length === 0 && researches.length === 0 && (
              <div className="flex gap-4 mb-6">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-r ${styles.sendGradient} flex items-center justify-center shadow-lg`}
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

            {/* Empty state */}
            {!isResearching &&
              researches.length === 0 &&
              messages.length === 0 &&
              connectionState === 'connected' && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center mx-auto mb-4 border border-border-subtle">
                    <Sparkles className="w-8 h-8 text-cyan-500" />
                  </div>
                  <h3 className="text-lg font-medium text-text-primary mb-2">Ready to Research</h3>
                  <p className="text-text-secondary max-w-sm mx-auto">
                    Paste a contract address to start AI-powered OSINT research, or ask questions
                    about tokens.
                  </p>
                </div>
              )}

            {/* Connection error */}
            {connectionError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-400 mb-1">Connection Error</h4>
                  <p className="text-sm text-red-300/80">{connectionError}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Floating input area */}
        <div className="absolute left-0 right-0 bottom-0 p-3 sm:p-4 pointer-events-none">
          <div className="max-w-7xl mx-auto pointer-events-auto">
            <div
              className={`${styles.inputSolidBg} border ${styles.inputBorder} rounded-2xl shadow-lg overflow-hidden`}
            >
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={
                    connectionState === 'connected'
                      ? 'Paste contract address or ask a question...'
                      : 'Connect to OpenClaw to start...'
                  }
                  disabled={connectionState !== 'connected'}
                  rows={1}
                  className={`w-full px-4 ${hasScroll ? '' : 'pr-14'} bg-transparent text-text-primary placeholder:text-text-tertiary focus:outline-none resize-none disabled:opacity-50 text-base`}
                  style={{
                    height: '48px',
                    maxHeight: `${LINE_HEIGHT * MAX_LINES}px`,
                    lineHeight: `${LINE_HEIGHT}px`,
                    paddingTop: '14px',
                    paddingBottom: '10px',
                    fontSize: '16px', // Prevents iOS zoom on focus
                  }}
                />

                {!hasScroll && (
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || connectionState !== 'connected'}
                    className={`absolute bottom-2 right-2 w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r ${styles.sendGradient} flex items-center justify-center text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 touch-manipulation`}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                )}
              </div>

              {hasScroll && (
                <div
                  className={`flex justify-end px-3 py-2 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}
                >
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || connectionState !== 'connected'}
                    className={`w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r ${styles.sendGradient} flex items-center justify-center text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 touch-manipulation`}
                  >
                    <ArrowUp className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Settings dialog - desktop only, mobile uses the settings panel via nav */}
        {!isMobile && <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />}
      </div>

      {/* Ape Interface Modal */}
      {showApeInterface && selectedResearch && (
        <ApeInterface
          research={selectedResearch}
          onClose={() => {
            setShowApeInterface(false)
            setSelectedResearch(null)
          }}
          onTradeComplete={handleTradeComplete}
        />
      )}
    </div>
  )
}
