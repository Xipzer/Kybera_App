import { ReactNode, useEffect, useRef, useCallback } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useUIStore } from '../../store/uiStore'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { ChatSidebar } from '../chat/ChatSidebar'
import { Wallet, Menu, PanelLeftClose, PanelRightClose } from 'lucide-react'

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
    <div className="h-screen flex flex-col bg-bg-subtle">
      <header className="h-14 border-b border-border-subtle flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleChatSidebar}
            className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
            title={chatSidebarOpen ? 'Hide chat sidebar' : 'Show chat sidebar'}
          >
            {chatSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5 text-text-secondary" />
            ) : (
              <Menu className="w-5 h-5 text-text-secondary" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-accent" />
            <h1 className="text-xl font-semibold text-text-primary">SmartWallet AI</h1>
          </div>
        </div>

        <button
          onClick={toggleWalletDrawer}
          className="p-2 rounded-lg hover:bg-surface-hover transition-colors"
          title={walletDrawerOpen ? 'Hide wallet drawer' : 'Show wallet drawer'}
        >
          {walletDrawerOpen ? (
            <PanelRightClose className="w-5 h-5 text-text-secondary" />
          ) : (
            <Wallet className="w-5 h-5 text-text-secondary" />
          )}
        </button>
      </header>

      <div className="flex-1 overflow-hidden">
        <PanelGroup direction="horizontal" className="h-full" autoSaveId="main-layout">
          {chatSidebarOpen && (
            <>
              <Panel id="chat-sidebar" order={1} defaultSize={20} minSize={15} maxSize={30}>
                <ChatSidebar />
              </Panel>
              <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent transition-colors" />
            </>
          )}

          <Panel id="main-content" order={2}>
            <div className="h-full">{children}</div>
          </Panel>

          {walletDrawerOpen && (
            <>
              <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent transition-colors" />
              <Panel id="wallet-drawer" order={3} defaultSize={25} minSize={15} maxSize={40} onResize={handleWalletResize}>
                <WalletDrawer />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}
