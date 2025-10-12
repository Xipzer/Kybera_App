import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useWalletStore } from './store/walletStore'
import { useChatStore } from './store/chatStore'
import { useSettingsStore } from './store/settingsStore'
import { useUIStore } from './store/uiStore'
import { ResponsiveLayout } from './components/layout/ResponsiveLayout'
import { ChatInterface } from './components/chat/ChatInterface'
import { UnlockScreen } from './components/auth/UnlockScreen'
import { initializeMemoryProtection } from './services/security/memoryProtection'
import { cleanupDiscoveredTokens } from './utils/cleanupTokens'
import './services/blockchain/alchemyStatus' // Log Alchemy configuration status

const queryClient = new QueryClient()

function App() {
  const { isLocked, loadWallets, loadWalletGroups } = useWalletStore()
  const { loadConversations } = useChatStore()
  const { loadSettings } = useSettingsStore()
  const { theme } = useUIStore()

  useEffect(() => {
    // Initialize security and memory protection
    initializeMemoryProtection()
    
    // One-time cleanup of accumulated tokens to fix RPC overload
    cleanupDiscoveredTokens()
      .then(result => {
        console.log('Token cleanup completed:', result)
      })
      .catch(error => {
        console.error('Token cleanup failed:', error)
      })
  }, [])

  useEffect(() => {
    // Apply theme class to document root
    document.documentElement.classList.remove('light', 'dark', 'xipz')
    document.documentElement.classList.add(theme)
  }, [theme])

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