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
  const { walletDrawerOpen, walletDrawerWidth, setWalletDrawerWidth, theme, chatSidebarOpen, toggleChatSidebar, toggleWalletDrawer } =
    useUIStore()

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <header className="h-14 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleChatSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={chatSidebarOpen ? "Hide chat sidebar" : "Show chat sidebar"}
          >
            {chatSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">SmartWallet AI</h1>
          </div>
        </div>
        
        <button
          onClick={toggleWalletDrawer}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={walletDrawerOpen ? "Hide wallet drawer" : "Show wallet drawer"}
        >
          {walletDrawerOpen ? (
            <PanelRightClose className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Wallet className="w-5 h-5 text-gray-600 dark:text-gray-400" />
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
              <PanelResizeHandle className="w-px bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
            </>
          )}

          <Panel>
            <div className="h-full">{children}</div>
          </Panel>

          {walletDrawerOpen && (
            <>
              <PanelResizeHandle className="w-px bg-gray-200 dark:bg-gray-800 hover:bg-blue-500 transition-colors" />
              <Panel
                defaultSize={walletDrawerWidth / window.innerWidth * 100}
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