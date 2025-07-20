import { ReactNode, useEffect } from 'react'
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
    walletDrawerWidth,
    setWalletDrawerWidth,
    theme,
    chatSidebarOpen,
    toggleChatSidebar,
    toggleWalletDrawer,
  } = useUIStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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
            <Wallet className="w-6 h-6 text-accent-500" />
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
        <PanelGroup direction="horizontal" className="h-full">
          {chatSidebarOpen && (
            <>
              <Panel defaultSize={20} minSize={15} maxSize={30}>
                <ChatSidebar />
              </Panel>
              <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent-500 transition-colors" />
            </>
          )}

          <Panel>
            <div className="h-full">{children}</div>
          </Panel>

          {walletDrawerOpen && (
            <>
              <PanelResizeHandle className="w-px bg-border-subtle hover:bg-accent-500 transition-colors" />
              <Panel
                defaultSize={(walletDrawerWidth / window.innerWidth) * 100}
                minSize={15}
                maxSize={40}
                onResize={(size) => setWalletDrawerWidth((size / 100) * window.innerWidth)}
              >
                <WalletDrawer />
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    </div>
  )
}
