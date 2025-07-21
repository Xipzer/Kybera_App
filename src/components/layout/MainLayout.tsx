import { ReactNode, useEffect, useRef, useCallback } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useUIStore } from '../../store/uiStore'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { ChatSidebar } from '../chat/ChatSidebar'
import { } from 'lucide-react'

interface MainLayoutProps {
  children: ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const {
    walletDrawerOpen,
    setWalletDrawerWidth,
    theme,
    chatSidebarOpen,
    toggleChatSidebar,
    toggleWalletDrawer,
  } = useUIStore()

  const resizeTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Remove all theme classes first
    document.documentElement.classList.remove('light', 'dark', 'xipz')
    // Add the current theme class
    document.documentElement.classList.add(theme)
  }, [theme])

  // Debounced resize handler for wallet panel
  const handleWalletResize = useCallback(
    (size: number) => {
      // Clear existing timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      // Set new timeout to update store
      resizeTimeoutRef.current = setTimeout(() => {
        setWalletDrawerWidth((size / 100) * window.innerWidth)
      }, 100) // Debounce by 100ms
    },
    [setWalletDrawerWidth],
  )

  return (
    <div className="h-screen bg-bg-subtle">
        <PanelGroup direction="horizontal" className="h-full" autoSaveId="main-layout">
          {!chatSidebarOpen && (
            <>
              <Panel id="chat-sidebar-collapsed" order={1} style={{ width: '52px', minWidth: '52px', maxWidth: '52px', flexShrink: 0 }}>
                <ChatSidebar collapsed onToggle={toggleChatSidebar} />
              </Panel>
              <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent transition-colors" />
            </>
          )}
          
          {chatSidebarOpen && (
            <>
              <Panel id="chat-sidebar" order={1} defaultSize={20} minSize={15} maxSize={30}>
                <ChatSidebar onToggle={toggleChatSidebar} />
              </Panel>
              <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent transition-colors" />
            </>
          )}

          <Panel id="main-content" order={2}>
            <div className="h-full">{children}</div>
          </Panel>

          {!walletDrawerOpen && (
            <>
              <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent transition-colors" />
              <Panel id="wallet-drawer-collapsed" order={3} style={{ width: '52px', minWidth: '52px', maxWidth: '52px', flexShrink: 0 }}>
                <WalletDrawer collapsed onToggle={toggleWalletDrawer} />
              </Panel>
            </>
          )}
          
          {walletDrawerOpen && (
            <>
              <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent transition-colors" />
              <Panel id="wallet-drawer" order={3} defaultSize={25} minSize={25} maxSize={40} onResize={handleWalletResize}>
                <WalletDrawer onToggle={toggleWalletDrawer} />
              </Panel>
            </>
          )}
        </PanelGroup>
    </div>
  )
}
