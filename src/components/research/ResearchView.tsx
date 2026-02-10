/**
 * Code by Xipzer
 */

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react'
import {
  Settings,
  ArrowUp,
  Bot,
  Sparkles,
  AlertCircle,
  Zap,
  BarChart3,
  Eye,
  TrendingUp,
  Sprout,
  Search,
} from 'lucide-react'
import * as Tabs from '@radix-ui/react-tabs'
import { NotificationBell } from '../notifications/NotificationBell'
import { useResearchStore } from '../../store/researchStore'
import { useSettingsStore } from '../../store/settingsStore'
import { useUIStore } from '../../store/uiStore'
import { ResearchCard } from './ResearchCard'
import { ApeInterface } from './ApeInterface'
import { ChatMessage } from '../chat/ChatMessage'
import { ActionConfirmationDialog } from '../chat/ActionConfirmationDialog'
import { SettingsDialog } from '../settings/SettingsDialog'

import { PortfolioView } from '../portfolio/PortfolioView'
import { WatchlistView } from '../watchlist/WatchlistView'
import { PredictionMarketsView } from '../markets/PredictionMarketsView'
import { YieldView } from '../defi/YieldView'
import { useTheme } from '../../hooks/useTheme'
import { themeClasses } from '../../utils/themeClasses'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { isValidAddress, detectNetworkFromAddress } from '../../utils/networks'
import { TokenResearch, ResearchNetwork } from '../../types/research'

const LINE_HEIGHT = 24
const MAX_LINES = 6

const ResearchParticles = memo(function ResearchParticles({ color, opacity = 0.4 }: { color: string; opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const particles: { x: number; y: number; vx: number; vy: number; size: number; opacity: number }[] = []
    const particleCount = 35
    let initialized = false

    const initParticles = () => {
      const w = canvas.width
      const h = canvas.height
      if (w === 0 || h === 0) return
      if (!initialized) {
        for (let i = 0; i < particleCount; i++) {
          particles.push({
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.25,
            vy: (Math.random() - 0.5) * 0.25,
            size: Math.random() * 1.5 + 0.5,
            opacity: (Math.random() * 0.3 + 0.1) * opacity,
          })
        }
        initialized = true
      } else {
        particles.forEach((p) => {
          if (p.x > w) p.x = Math.random() * w
          if (p.y > h) p.y = Math.random() * h
        })
      }
    }

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      initParticles()
    }

    requestAnimationFrame(() => {
      resize()
    })

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    let animationId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p, i) => {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${color}, ${p.opacity})`
        ctx.fill()

        particles.slice(i + 1).forEach((p2) => {
          const dx = p.x - p2.x
          const dy = p.y - p2.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(p.x, p.y)
            ctx.lineTo(p2.x, p2.y)
            ctx.strokeStyle = `rgba(${color}, ${0.04 * opacity * (1 - dist / 120)})`
            ctx.stroke()
          }
        })
      })

      animationId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      ro.disconnect()
      cancelAnimationFrame(animationId)
    }
  }, [color, opacity])

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />
})

export function ResearchView() {
  const { theme, isDark } = useTheme()
  const tc = themeClasses(isDark)
  const styles = theme.styles.chatInterface
  const isMobile = useMediaQuery('(max-width: 1024px)')

  const { chatWallpaper, wallpaperOpacity, particlesApp } = useUIStore()

  const connectionState = useResearchStore((state) => state.connectionState)
  const allResearches = useResearchStore((state) => state.researches)
  const messages = useResearchStore((state) => state.messages)
  const isResearching = useResearchStore((state) => state.isResearching)
  const currentResearchStep = useResearchStore((state) => state.currentResearchStep)
  const researchProgress = useResearchStore((state) => state.researchProgress)
  const connectionError = useResearchStore((state) => state.connectionError)
  const pendingAction = useResearchStore((state) => state.pendingAction)

  const connect = useResearchStore((state) => state.connect)
  const disconnect = useResearchStore((state) => state.disconnect)
  const requestResearch = useResearchStore((state) => state.requestResearch)
  const sendMessage = useResearchStore((state) => state.sendMessage)
  const dismissResearch = useResearchStore((state) => state.dismissResearch)
  const markAsTraded = useResearchStore((state) => state.markAsTraded)
  const approveAction = useResearchStore((state) => state.approveAction)
  const rejectAction = useResearchStore((state) => state.rejectAction)

  const researches = useMemo(() => allResearches.filter((r) => !r.dismissed), [allResearches])

  const { openClawGatewayUrl, openClawAuthToken, openClawAutoConnect } = useSettingsStore()

  const [activeTab, setActiveTab] = useState('research')
  const [input, setInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [selectedResearch, setSelectedResearch] = useState<TokenResearch | null>(null)
  const [showApeInterface, setShowApeInterface] = useState(false)
  const [inputHeight, setInputHeight] = useState(48)
  const [hasScroll, setHasScroll] = useState(false)
  const [refreshingId, setRefreshingId] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  useEffect(() => {
    if (openClawGatewayUrl && openClawAutoConnect && connectionState === 'disconnected') {
      connect(openClawGatewayUrl, openClawAuthToken || undefined).catch(console.error)
    }
  }, [openClawGatewayUrl, openClawAuthToken, openClawAutoConnect, connectionState, connect])

  const activeNavItem = useUIStore((s) => s.activeNavItem)
  useEffect(() => {
    if (!isMobile) setActiveTab(activeNavItem)
  }, [isMobile, activeNavItem])

  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, researches])

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const threshold = 100
    isNearBottomRef.current =
      container.scrollHeight - container.scrollTop - container.clientHeight < threshold
  }, [])

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

  const handleSend = async () => {
    if (!input.trim() || connectionState !== 'connected') return

    const trimmedInput = input.trim()
    setInput('')

    if (isValidAddress(trimmedInput)) {
      const network = detectNetworkFromAddress(trimmedInput) as ResearchNetwork
      await requestResearch(trimmedInput, network)
    } else {
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

  const handleRefresh = async (research: TokenResearch) => {
    if (connectionState !== 'connected' || refreshingId) return

    if (!research.contractAddress || !research.network) {
      console.error('Cannot refresh: missing contract address or network')
      return
    }

    setRefreshingId(research.id)
    try {
      await requestResearch(research.contractAddress, research.network)
      dismissResearch(research.id)
    } catch (error) {
      console.error('Failed to refresh research:', error)
    } finally {
      setRefreshingId(null)
    }
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

  const notConfiguredContent = (
    <div className="flex-1 flex items-center justify-center p-4">
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

        <button
          onClick={() => setShowSettings(true)}
          className={`hidden lg:inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r ${styles.configButtonGradient} rounded-xl font-medium text-white shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300`}
        >
          <Settings className="w-4 h-4" />
          Configure OpenClaw
        </button>

        <p className="lg:hidden text-sm text-text-tertiary">
          Tap the <span className="text-text-primary font-medium">Settings</span> tab below to
          configure
        </p>
      </div>
    </div>
  )

  const tabTriggerClass = "flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover rounded-lg data-[state=active]:text-accent data-[state=active]:bg-accent/10 transition-colors whitespace-nowrap touch-manipulation min-h-[44px]"

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col bg-surface-base relative overflow-hidden">
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
        {activeTab !== 'research' && !isMobile && (
          <div className="flex items-center justify-end gap-2 px-4 pt-3 pb-0 flex-shrink-0">
            <NotificationBell />
            <button
              onClick={() => setShowSettings(true)}
              className={`${theme.styles.buttonIcon} p-2 rounded-lg`}
              title="Settings"
            >
              <Settings className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        )}

        {(activeTab === 'research' || isMobile) && (
          <div className="p-3 sm:p-4 pb-0">
            <div
              className={`${styles.headerBg} border ${styles.headerBorder} rounded-xl p-3 sm:p-4 relative overflow-hidden`}
            >
              {particlesApp && (
                <>
                  <ResearchParticles
                    color={theme.styles.unlockScreen.particleColor}
                    opacity={theme.styles.unlockScreen.particleOpacity ?? 0.6}
                  />
                  <div
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                      background: `radial-gradient(ellipse at 50% 0%, rgba(${theme.styles.unlockScreen.particleColor}, 0.15), transparent 70%)`,
                    }}
                  />
                </>
              )}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <img src="/kybera-icon.png" alt="Kybera" className="w-7 h-7 rounded-lg shadow-md" />
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        connectionState === 'connected'
                          ? 'bg-green-400 animate-pulse'
                          : connectionState === 'connecting' || connectionState === 'reconnecting'
                            ? 'bg-yellow-400 animate-pulse'
                            : connectionState === 'error'
                              ? 'bg-red-400'
                              : 'bg-text-tertiary'
                      }`}
                    />
                    <span
                      className={`text-xs font-medium ${
                        connectionState === 'connected'
                          ? 'text-green-400'
                          : connectionState === 'connecting' || connectionState === 'reconnecting'
                            ? 'text-yellow-400'
                            : connectionState === 'error'
                              ? 'text-red-400'
                              : 'text-text-tertiary'
                      }`}
                    >
                      {connectionState === 'connected'
                        ? 'Connected'
                        : connectionState === 'connecting'
                          ? 'Connecting...'
                          : connectionState === 'reconnecting'
                            ? 'Reconnecting...'
                            : connectionState === 'error'
                              ? 'Error'
                              : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {connectionState === 'disconnected' && (
                    <button
                      onClick={handleConnect}
                      className={`px-3 py-1.5 bg-accent-500/20 hover:bg-accent-500/30 border border-accent-500/30 rounded-full text-xs font-medium ${theme.styles.iconAccent} transition-colors touch-manipulation`}
                    >
                      Connect
                    </button>
                  )}
                  {connectionState === 'connected' && (
                    <button
                      onClick={disconnect}
                      className="px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 rounded-full text-xs font-medium text-red-400 transition-all duration-200 touch-manipulation"
                    >
                      Disconnect
                    </button>
                  )}
                  <NotificationBell className="hidden lg:flex" />
                  <button
                    onClick={() => setShowSettings(true)}
                    className={`${theme.styles.buttonIcon} p-2 rounded-lg hidden lg:flex`}
                    title="Settings"
                  >
                    <Settings className="w-4 h-4 text-text-secondary" />
                  </button>
                </div>
              </div>

              {isResearching && (
                <div className="mt-3 pt-3 border-t border-white/10 relative z-10">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-text-secondary">
                      {currentResearchStep || 'Researching...'}
                    </span>
                    <span className={theme.styles.iconAccent}>{researchProgress}%</span>
                  </div>
                  <div className="h-1 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${styles.sendGradient} transition-all duration-300`}
                      style={{ width: `${researchProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isMobile && (
          <Tabs.List className="flex gap-1 px-3 sm:px-4 py-2 overflow-x-auto flex-shrink-0 border-b border-border-subtle">
            <Tabs.Trigger value="research" className={tabTriggerClass}>
              <Search className="w-4 h-4" />
              Research
            </Tabs.Trigger>
            <Tabs.Trigger value="portfolio" className={tabTriggerClass}>
              <BarChart3 className="w-4 h-4" />
              Portfolio
            </Tabs.Trigger>
            <Tabs.Trigger value="watchlist" className={tabTriggerClass}>
              <Eye className="w-4 h-4" />
              Watchlist
            </Tabs.Trigger>
            <Tabs.Trigger value="markets" className={tabTriggerClass}>
              <TrendingUp className="w-4 h-4" />
              Markets
            </Tabs.Trigger>
            <Tabs.Trigger value="yield" className={tabTriggerClass}>
              <Sprout className="w-4 h-4" />
              Yield
            </Tabs.Trigger>
          </Tabs.List>
        )}

        <Tabs.Content value="research" className="flex-1 flex flex-col min-h-0">
          {!openClawGatewayUrl ? (
            notConfiguredContent
          ) : (
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto overscroll-contain relative"
            >
              <div
                className="max-w-7xl mx-auto px-3 sm:px-4 pt-4"
                style={{ paddingBottom: `${inputHeight + (isMobile ? 100 : 32)}px` }}
              >
                {researches.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {researches.map((research) => (
                      <ResearchCard
                        key={research.id}
                        research={research}
                        onApe={handleApe}
                        onFade={handleFade}
                        onRefresh={handleRefresh}
                        isRefreshing={refreshingId === research.id}
                      />
                    ))}
                  </div>
                )}

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

                {!isResearching &&
                  researches.length === 0 &&
                  messages.length === 0 &&
                  connectionState === 'connected' && (
                    <div className="flex items-center justify-center h-full absolute inset-0 pointer-events-none -translate-y-8">
                      <div
                        className={`max-w-md text-center p-8 ${styles.inputSolidBg} border ${styles.emptyStateBorder} rounded-2xl shadow-xl pointer-events-auto`}
                      >
                        <div className="relative inline-flex mb-6">
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${styles.sendGradient} rounded-2xl blur-xl opacity-30 animate-pulse`}
                          />
                          <div
                            className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${styles.sendGradient} flex items-center justify-center shadow-lg`}
                          >
                            <Sparkles className="w-8 h-8 text-white" />
                          </div>
                        </div>
                        <h3
                          className={`text-xl font-bold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent mb-3`}
                        >
                          Ready to Research
                        </h3>
                        <p className="text-text-secondary">
                          Paste a contract address to start AI-powered OSINT research, or ask
                          questions about tokens.
                        </p>
                      </div>
                    </div>
                  )}

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
          )}

          <div className="absolute left-0 right-0 bottom-0 p-3 sm:p-4 pointer-events-none z-20">
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
                      fontSize: '16px',
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
                  <div className={`flex justify-end px-3 py-2 border-t ${tc.borderSubtle}`}>
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
        </Tabs.Content>

        <Tabs.Content value="portfolio" className="flex-1 min-h-0 overflow-hidden">
          <PortfolioView />
        </Tabs.Content>

        <Tabs.Content value="watchlist" className="flex-1 min-h-0 overflow-hidden">
          <WatchlistView />
        </Tabs.Content>

        <Tabs.Content value="markets" className="flex-1 min-h-0 overflow-hidden">
          <PredictionMarketsView />
        </Tabs.Content>

        <Tabs.Content value="yield" className="flex-1 min-h-0 overflow-hidden">
          <YieldView />
        </Tabs.Content>

        {!isMobile && <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />}
      </div>

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

      <ActionConfirmationDialog
        action={pendingAction}
        open={!!pendingAction}
        onApprove={approveAction}
        onReject={() => rejectAction()}
      />
    </Tabs.Root>
  )
}