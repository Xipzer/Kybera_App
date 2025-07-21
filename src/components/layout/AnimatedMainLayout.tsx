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
    
    // Check if we're below minimum size (not including when actually collapsed)
    if (!isChatCollapsed && size < MIN_CHAT_SIZE) {
      setIsChatDraggingBelowMin(true)
    } else if (size >= MIN_CHAT_SIZE || isChatCollapsed) {
      setIsChatDraggingBelowMin(false)
    }
  }

  const handleWalletResize = (size: number) => {
    walletSizeRef.current = size
    
    // Check if we're below minimum size (not including when actually collapsed)
    if (!isWalletCollapsed && size < MIN_WALLET_SIZE) {
      setIsWalletDraggingBelowMin(true)
    } else if (size >= MIN_WALLET_SIZE || isWalletCollapsed) {
      setIsWalletDraggingBelowMin(false)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    
    // Auto-collapse if below minimum when drag ends
    if (isChatDraggingBelowMin && chatSizeRef.current < MIN_CHAT_SIZE) {
      chatPanelRef.current?.collapse()
      setIsChatDraggingBelowMin(false)
    }
    
    if (isWalletDraggingBelowMin && walletSizeRef.current < MIN_WALLET_SIZE) {
      walletPanelRef.current?.collapse()
      setIsWalletDraggingBelowMin(false)
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
            setIsDragging(dragging)
            if (!dragging) {
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
            setIsDragging(dragging)
            if (!dragging) {
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