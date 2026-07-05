/**
 * Code by Xipzer
 */

import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter } from 'react-router-dom'
import { applyThemeClass } from './utils/themeClasses'
import { useWalletStore } from './store/walletStore'
import { useChatStore } from './store/chatStore'
import { useSettingsStore } from './store/settingsStore'
import { useUIStore } from './store/uiStore'
import { useAuthStore } from './store/authStore'
import { ResponsiveLayout } from './components/layout/ResponsiveLayout'
import { ChatInterface } from './components/chat/ChatInterface'
import { UnlockScreen } from './components/UnlockScreen'
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
    applyThemeClass(theme)
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
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <ResponsiveLayout>
            <ChatInterface />
          </ResponsiveLayout>
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  )
}

export default App