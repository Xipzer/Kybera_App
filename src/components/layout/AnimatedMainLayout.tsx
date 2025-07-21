import { ReactNode, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useUIStore } from '../../store/uiStore'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { ChatSidebar } from '../chat/ChatSidebar'
import { useTheme } from '../../hooks/useTheme'

interface MainLayoutProps {
  children: ReactNode
}

const MIN_CHAT_SIZE = 15
const MIN_WALLET_SIZE = 25
const COLLAPSED_SIZE = 4

export function MainLayout({ children }: MainLayoutProps) {
  const { theme: uiTheme } = useUIStore()
  const { theme } = useTheme()
  
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isWalletCollapsed, setIsWalletCollapsed] = useState(false)
  const [isChatDraggingBelowMin, setIsChatDraggingBelowMin] = useState(false)
  const [isWalletDraggingBelowMin, setIsWalletDraggingBelowMin] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  
  const chatPanelRef = useRef<any>(null)
  const walletPanelRef = useRef<any>(null)
  const chatSizeRef = useRef(20)
  const walletSizeRef = useRef(25)
  const wasCollapsedOnDragStart = useRef({ chat: false, wallet: false })

  useEffect(() => {
    // Remove all theme classes first
    document.documentElement.classList.remove('light', 'dark', 'xipz')
    // Add the current theme class
    document.documentElement.classList.add(uiTheme)
  }, [uiTheme])

  // Double-click handlers for expanding collapsed panels
  const handleChatDoubleClick = () => {
    if (isChatCollapsed) {
      setIsChatCollapsed(false)
      chatPanelRef.current?.expand()
    }
  }

  const handleWalletDoubleClick = () => {
    if (isWalletCollapsed) {
      setIsWalletCollapsed(false)
      walletPanelRef.current?.expand()
    }
  }

  const handleChatResize = (size: number) => {
    chatSizeRef.current = size
    
    // Clear dragging below min if we're expanding from collapsed
    if (wasCollapsedOnDragStart.current.chat && isDragging && size > COLLAPSED_SIZE + 5) {
      setIsChatDraggingBelowMin(false)
    }
    // Only set dragging below min for expanded panels
    else if (!isChatCollapsed && size < MIN_CHAT_SIZE) {
      setIsChatDraggingBelowMin(true)
    } else if (!isChatCollapsed && size >= MIN_CHAT_SIZE) {
      setIsChatDraggingBelowMin(false)
    }
  }

  const handleWalletResize = (size: number) => {
    walletSizeRef.current = size
    
    // Clear dragging below min if we're expanding from collapsed
    if (wasCollapsedOnDragStart.current.wallet && isDragging && size > COLLAPSED_SIZE + 5) {
      setIsWalletDraggingBelowMin(false)
    }
    // Only set dragging below min for expanded panels
    else if (!isWalletCollapsed && size < MIN_WALLET_SIZE) {
      setIsWalletDraggingBelowMin(true)
    } else if (!isWalletCollapsed && size >= MIN_WALLET_SIZE) {
      setIsWalletDraggingBelowMin(false)
    }
  }

  const handleDragStart = () => {
    // Track initial collapsed state when drag starts
    wasCollapsedOnDragStart.current.chat = isChatCollapsed
    wasCollapsedOnDragStart.current.wallet = isWalletCollapsed
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    
    // Auto-expand if started from collapsed and dragged beyond threshold
    const EXPAND_THRESHOLD = 5 // 5px beyond collapsed size
    
    // Handle chat panel
    if (wasCollapsedOnDragStart.current.chat) {
      if (chatSizeRef.current > COLLAPSED_SIZE + EXPAND_THRESHOLD) {
        // Panel was collapsed and dragged out - expand it
        setIsChatCollapsed(false)
        // Force expansion by calling expand after state update
        requestAnimationFrame(() => {
          chatPanelRef.current?.expand()
          // Double-check and resize if needed
          requestAnimationFrame(() => {
            if (chatSizeRef.current < MIN_CHAT_SIZE) {
              chatPanelRef.current?.resize(MIN_CHAT_SIZE)
            }
          })
        })
      }
    } else {
      // Only auto-collapse if started from expanded and below minimum
      if (chatSizeRef.current < MIN_CHAT_SIZE) {
        chatPanelRef.current?.collapse()
        setIsChatDraggingBelowMin(false)
      }
    }
    
    // Handle wallet panel
    if (wasCollapsedOnDragStart.current.wallet) {
      if (walletSizeRef.current > COLLAPSED_SIZE + EXPAND_THRESHOLD) {
        // Panel was collapsed and dragged out - expand it
        setIsWalletCollapsed(false)
        // Force expansion by calling expand after state update
        requestAnimationFrame(() => {
          walletPanelRef.current?.expand()
          // Double-check and resize if needed
          requestAnimationFrame(() => {
            if (walletSizeRef.current < MIN_WALLET_SIZE) {
              walletPanelRef.current?.resize(MIN_WALLET_SIZE)
            }
          })
        })
      }
    } else {
      // Only auto-collapse if started from expanded and below minimum
      if (walletSizeRef.current < MIN_WALLET_SIZE) {
        walletPanelRef.current?.collapse()
        setIsWalletDraggingBelowMin(false)
      }
    }
  }

  return (
    <div className="h-screen bg-bg-subtle">
      <PanelGroup direction="horizontal" className="h-full">
        <Panel
          ref={chatPanelRef}
          id="chat-sidebar"
          order={1}
          defaultSize={20}
          minSize={4}
          maxSize={30}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => {
            setIsChatCollapsed(true)
            setIsChatDraggingBelowMin(false)
          }}
          onExpand={() => {
            setIsChatCollapsed(false)
          }}
          onResize={handleChatResize}
        >
          <div 
            onDoubleClick={handleChatDoubleClick} 
            className="h-full bg-surface-base transition-opacity duration-200"
            style={{
              opacity: isChatDraggingBelowMin ? 0.5 : 1
            }}
          >
            <AnimatePresence mode="wait">
              {!isChatDraggingBelowMin && (
                isChatCollapsed ? (
                  <motion.div
                    key="collapsed-chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <ChatSidebar collapsed />
                  </motion.div>
                ) : (
                  <motion.div
                    key="expanded-chat"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <ChatSidebar />
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        </Panel>

        <PanelResizeHandle 
          className={`w-px transition-colors ${theme.styles.resizeHandle} ${theme.styles.resizeHandleHover}`}
          onDragging={(dragging) => {
            if (dragging) {
              handleDragStart()
            } else {
              handleDragEnd()
            }
          }}
        />

        <Panel id="main-content" order={2}>
          <div className="h-full">{children}</div>
        </Panel>

        <PanelResizeHandle 
          className={`w-px transition-colors ${theme.styles.resizeHandle} ${theme.styles.resizeHandleHover}`}
          onDragging={(dragging) => {
            if (dragging) {
              handleDragStart()
            } else {
              handleDragEnd()
            }
          }}
        />

        <Panel
          ref={walletPanelRef}
          id="wallet-drawer"
          order={3}
          defaultSize={25}
          minSize={4}
          maxSize={40}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => {
            setIsWalletCollapsed(true)
            setIsWalletDraggingBelowMin(false)
          }}
          onExpand={() => {
            setIsWalletCollapsed(false)
          }}
          onResize={handleWalletResize}
        >
          <div 
            onDoubleClick={handleWalletDoubleClick} 
            className="h-full bg-surface-base transition-opacity duration-200"
            style={{
              opacity: isWalletDraggingBelowMin ? 0.5 : 1
            }}
          >
            <AnimatePresence mode="wait">
              {!isWalletDraggingBelowMin && (
                isWalletCollapsed ? (
                  <motion.div
                    key="collapsed-wallet"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <WalletDrawer collapsed />
                  </motion.div>
                ) : (
                  <motion.div
                    key="expanded-wallet"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <WalletDrawer />
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}