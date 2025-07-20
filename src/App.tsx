/**
 * Code by Xipzer
 */

import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { useWalletStore } from './store/walletStore'
import { useChatStore } from './store/chatStore'
import { useSettingsStore } from './store/settingsStore'
import { useUIStore } from './store/uiStore'
import { useAuthStore } from './store/authStore'
import { ResponsiveLayout } from './components/layout/ResponsiveLayout'
import { ChatInterface } from './components/chat/ChatInterface'
import { UnlockScreen } from './components/UnlockScreen'
import { OpenClawDeepLinkBanner } from './components/common/OpenClawDeepLinkBanner'
import { initializeMemoryProtection } from './services/security/memoryProtection'
import { cleanupDiscoveredTokens } from './utils/dbUtils'

const queryClient = new QueryClient()

function App() {
  const { isLocked, loadWallets, loadWalletGroups } = useWalletStore()
  const { loadConversations } = useChatStore()
  const { loadSettings } = useSettingsStore()
  const { theme } = useUIStore()
  const { loadAuth } = useAuthStore()

  useEffect(() => {
    initializeMemoryProtection()
    loadAuth()
    cleanupDiscoveredTokens().catch(() => {})
  }, [])

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'xipz')
    document.documentElement.classList.add(theme)
  }, [theme])

  useEffect(() => {
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
        <OpenClawDeepLinkBanner />
        <ResponsiveLayout>
          <ChatInterface />
        </ResponsiveLayout>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App