/**
 * Code by Xipzer
 */

import { ReactNode, useState, useEffect } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { MainLayout } from './AnimatedMainLayout'
import { MobileNav } from './MobileNav'
import { AnimatedPanel, MobileOverlay } from '../common/AnimatedPanel'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { SettingsPanel } from '../settings/SettingsPanel'
import { useUIStore } from '../../store/uiStore'

interface ResponsiveLayoutProps {
  children: ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 1024px)')
  const [mobilePanel, setMobilePanel] = useState<'wallet' | 'settings' | null>(null)
  const { theme: uiTheme } = useUIStore()

  useEffect(() => {
    if (isMobile) {
      document.documentElement.classList.remove('light', 'dark', 'xipz', 'ogDark', 'ogLight')
      document.documentElement.classList.add(uiTheme)
    }
  }, [isMobile, uiTheme])

  useEffect(() => {
    if (!isMobile) {
      setMobilePanel(null)
    }
  }, [isMobile])

  useEffect(() => {
    if (isMobile && mobilePanel !== null) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
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
          activePanel={mobilePanel}
        />

        <MobileOverlay isOpen={mobilePanel !== null} onClick={closePanel} />

        <AnimatedPanel
          isOpen={mobilePanel === 'wallet'}
          direction="right"
          width="w-full sm:w-[85vw] sm:max-w-[400px]"
          className="pb-[64px]"
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
        >
          <div className="h-full overflow-y-auto overscroll-contain">
            <SettingsPanel />
          </div>
        </AnimatedPanel>
      </>
    )
  }

  return <MainLayout>{children}</MainLayout>
}