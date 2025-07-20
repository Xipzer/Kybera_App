import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useWalletStore } from './store/walletStore'
import { useChatStore } from './store/chatStore'
import { useSettingsStore } from './store/settingsStore'
import { ResponsiveLayout } from './components/layout/ResponsiveLayout'
import { ChatInterface } from './components/chat/ChatInterface'
import { UnlockScreen } from './components/auth/UnlockScreen'

const queryClient = new QueryClient()

function App() {
  const { isLocked, loadWallets, loadWalletGroups } = useWalletStore()
  const { loadConversations } = useChatStore()
  const { loadSettings } = useSettingsStore()

  useEffect(() => {
    // Load persisted data on app start
    loadWallets()
    loadWalletGroups()
    loadConversations()
    loadSettings()
  }, [loadWallets, loadWalletGroups, loadConversations, loadSettings])

  if (isLocked) {
    return <UnlockScreen />
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ResponsiveLayout>
          <ChatInterface />
        </ResponsiveLayout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App