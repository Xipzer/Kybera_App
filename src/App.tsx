/**
 * Code by Xipzer
 */

import { useEffect, useRef } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom'
import { applyThemeClass } from './utils/themeClasses'
import { useWalletStore } from './store/walletStore'
import { useChatStore } from './store/chatStore'
import { useSettingsStore } from './store/settingsStore'
import { useUIStore, type NavItem } from './store/uiStore'
import { useAuthStore } from './store/authStore'
import { ResponsiveLayout } from './components/layout/ResponsiveLayout'
import { ChatInterface } from './components/chat/ChatInterface'
import { UnlockScreen } from './components/UnlockScreen'
import { initializeMemoryProtection } from './services/security/memoryProtection'
import { cleanupDiscoveredTokens } from './utils/dbUtils'

const queryClient = new QueryClient()

const NAV_PATHS: Record<NavItem, string> = {
  research: '/',
  portfolio: '/portfolio',
  watchlist: '/watchlist',
  markets: '/markets',
  yield: '/yield',
}

function pathToNav(pathname: string): NavItem {
  if (pathname.startsWith('/portfolio')) return 'portfolio'
  if (pathname.startsWith('/watchlist')) return 'watchlist'
  if (pathname.startsWith('/markets')) return 'markets'
  if (pathname.startsWith('/yield')) return 'yield'
  return 'research'
}

/**
 * Two-way sync between the router path and the zustand nav state.
 * URL is the source of truth on mount (deep links win over persisted nav);
 * afterwards NavRail/MobileNav clicks push new history entries.
 */
function RouteSync() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeNavItem = useUIStore((s) => s.activeNavItem)
  const setActiveNavItem = useUIStore((s) => s.setActiveNavItem)
  const mountedRef = useRef(false)

  useEffect(() => {
    const nav = pathToNav(location.pathname)
    if (nav !== useUIStore.getState().activeNavItem) setActiveNavItem(nav)
  }, [location.pathname, setActiveNavItem])

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    if (pathToNav(location.pathname) !== activeNavItem) {
      navigate(NAV_PATHS[activeNavItem])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNavItem])

  return null
}

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
          <RouteSync />
          <ResponsiveLayout>
            <ChatInterface />
          </ResponsiveLayout>
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  )
}

export default App