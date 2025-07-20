import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useWalletStore } from './store/walletStore'
import { useChatStore } from './store/chatStore'
import { useSettingsStore } from './store/settingsStore'
import { MainLayout } from './components/layout/MainLayout'
import { ChatInterface } from './components/chat/ChatInterface'
import { UnlockScreen } from './components/auth/UnlockScreen'

const queryClient = new QueryClient()

function App() {
  const { isLocked, loadWallets } = useWalletStore()
  const { loadConversations } = useChatStore()
  const { loadSettings } = useSettingsStore()

  useEffect(() => {
    // Load persisted data on app start
    loadWallets()
    loadConversations()
    loadSettings()
  }, [loadWallets, loadConversations, loadSettings])

  if (isLocked) {
    return <UnlockScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MainLayout>
          <ChatInterface />
        </MainLayout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App