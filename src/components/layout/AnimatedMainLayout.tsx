import { ReactNode, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useUIStore } from '../../store/uiStore'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { ChatSidebar } from '../chat/ChatSidebar'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const { theme } = useUIStore()
  
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isWalletCollapsed, setIsWalletCollapsed] = useState(false)
  
  const chatPanelRef = useRef<any>(null)
  const walletPanelRef = useRef<any>(null)
  const lastSizeRef = useRef<{ chat: number; wallet: number }>({ chat: 20, wallet: 25 })

  useEffect(() => {
    // Remove all theme classes first
    document.documentElement.classList.remove('light', 'dark', 'xipz')
    // Add the current theme class
    document.documentElement.classList.add(theme)
  }, [theme])

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

  return (
    <div className="h-screen bg-bg-subtle">
      <PanelGroup direction="horizontal" className="h-full">
        <Panel
          ref={chatPanelRef}
          id="chat-sidebar"
          order={1}
          defaultSize={20}
          minSize={15}
          maxSize={30}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => {
            setIsChatCollapsed(true)
          }}
          onExpand={() => {
            setIsChatCollapsed(false)
          }}
        >
          <div onDoubleClick={handleChatDoubleClick} className="h-full bg-surface-base">
            <AnimatePresence mode="wait">
              {isChatCollapsed ? (
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
              )}
            </AnimatePresence>
          </div>
        </Panel>

        <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent transition-colors" />

        <Panel id="main-content" order={2}>
          <div className="h-full">{children}</div>
        </Panel>

        <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent transition-colors" />

        <Panel
          ref={walletPanelRef}
          id="wallet-drawer"
          order={3}
          defaultSize={25}
          minSize={25}
          maxSize={40}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => {
            setIsWalletCollapsed(true)
          }}
          onExpand={() => {
            setIsWalletCollapsed(false)
          }}
        >
          <div onDoubleClick={handleWalletDoubleClick} className="h-full bg-surface-base">
            <AnimatePresence mode="wait">
              {isWalletCollapsed ? (
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
              )}
            </AnimatePresence>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}