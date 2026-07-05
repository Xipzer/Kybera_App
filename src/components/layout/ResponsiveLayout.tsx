/**
 * Code by Xipzer
 */

import { ReactNode, useState, useEffect, useRef } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { MainLayout } from './AnimatedMainLayout'
import { MobileNav } from './MobileNav'
import { AnimatedPanel, MobileOverlay } from '../common/AnimatedPanel'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { SettingsPanel } from '../settings/SettingsPanel'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { useUIStore } from '../../store/uiStore'
import { applyThemeClass } from '../../utils/themeClasses'

interface ResponsiveLayoutProps {
  children: ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 1023.98px)')
  const [mobilePanel, setMobilePanel] = useState<'wallet' | 'settings' | 'notifications' | null>(null)
  const { theme: uiTheme } = useUIStore()

  useEffect(() => {
    if (isMobile) applyThemeClass(uiTheme)
  }, [isMobile, uiTheme])

  useEffect(() => {
    if (!isMobile) {
      setMobilePanel(null)
    }
  }, [isMobile])

  // Hardware/browser back closes an open mobile panel instead of leaving the app.
  // A sentinel history entry is pushed when a panel opens; closing via UI consumes
  // it with history.back() so the stack never accumulates stale entries.
  const panelHistoryPushedRef = useRef(false)

  useEffect(() => {
    const panelOpen = isMobile && mobilePanel !== null
    if (panelOpen && !panelHistoryPushedRef.current) {
      panelHistoryPushedRef.current = true
      window.history.pushState({ kyberaMobilePanel: true }, '')
    } else if (!panelOpen && panelHistoryPushedRef.current) {
      panelHistoryPushedRef.current = false
      window.history.back()
    }
  }, [isMobile, mobilePanel])

  useEffect(() => {
    const onPopState = () => {
      if (panelHistoryPushedRef.current) {
        panelHistoryPushedRef.current = false
        setMobilePanel(null)
      }
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    if (isMobile && mobilePanel !== null) {
      // iOS Safari ignores `overflow: hidden` on body; pin it with position:fixed
      // and restore the scroll position on unlock to prevent background rubber-banding.
      const scrollY = window.scrollY
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isMobile, mobilePanel])

  const closePanel = () => setMobilePanel(null)

  if (isMobile) {
    return (
      <>
        <div className="flex flex-col h-[100dvh] pb-[calc(64px+env(safe-area-inset-bottom,0px))] bg-surface-base">
          <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            {children}
          </main>
        </div>

        <MobileNav
          onOpenWallet={() => setMobilePanel(mobilePanel === 'wallet' ? null : 'wallet')}
          onClosePanel={closePanel}
          onOpenSettings={() => setMobilePanel(mobilePanel === 'settings' ? null : 'settings')}
          onOpenNotifications={() => setMobilePanel(mobilePanel === 'notifications' ? null : 'notifications')}
          activePanel={mobilePanel}
        />

        <MobileOverlay isOpen={mobilePanel !== null} onClick={closePanel} />

        <AnimatedPanel
          isOpen={mobilePanel === 'wallet'}
          direction="right"
          width="w-full sm:w-[85vw] sm:max-w-[400px]"
          className="pb-[64px]"
          onClose={closePanel}
          label="Wallets"
        >
          <div className="h-full overflow-y-auto overscroll-contain">
            <WalletDrawer />
          </div>
        </AnimatedPanel>

        <AnimatedPanel
          isOpen={mobilePanel === 'settings'}
          direction="right"
          width="w-full sm:w-[85vw] sm:max-w-[400px]"
          className="pb-[64px]"
          onClose={closePanel}
          label="Settings"
        >
          <div className="h-full overflow-y-auto overscroll-contain">
            <SettingsPanel />
          </div>
        </AnimatedPanel>

        <AnimatedPanel
          isOpen={mobilePanel === 'notifications'}
          direction="right"
          width="w-full sm:w-[85vw] sm:max-w-[400px]"
          className="pb-[64px]"
          onClose={closePanel}
          label="Notifications"
        >
          <div className="h-full overflow-y-auto overscroll-contain">
            <NotificationPanel />
          </div>
        </AnimatedPanel>
      </>
    )
  }

  return <MainLayout>{children}</MainLayout>
}