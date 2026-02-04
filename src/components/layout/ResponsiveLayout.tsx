import { ReactNode, useState, useEffect } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { MainLayout } from './AnimatedMainLayout'
import { MobileNav } from './MobileNav'
import { AnimatedPanel, MobileOverlay } from '../common/AnimatedPanel'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { SettingsPanel } from '../settings/SettingsPanel'

interface ResponsiveLayoutProps {
  children: ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 1024px)')
  const [mobilePanel, setMobilePanel] = useState<'wallet' | 'settings' | null>(null)

  // Close mobile panels when switching to desktop
  useEffect(() => {
    if (!isMobile) {
      setMobilePanel(null)
    }
  }, [isMobile])

  // Prevent body scroll when mobile panel is open
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
        {/* Main mobile container - bottom nav always visible */}
        <div className="flex flex-col h-[100dvh] pb-[72px] bg-bg-base">
          {/* Main content area - scrollable */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation - always visible on all screens */}
        <MobileNav
          onOpenWallet={() => setMobilePanel(mobilePanel === 'wallet' ? null : 'wallet')}
          onClosePanel={closePanel}
          onOpenSettings={() => setMobilePanel(mobilePanel === 'settings' ? null : 'settings')}
          activePanel={mobilePanel}
        />

        {/* Mobile overlay for panels */}
        <MobileOverlay isOpen={mobilePanel !== null} onClick={closePanel} />

        {/* Wallet panel - slides from right */}
        <AnimatedPanel
          isOpen={mobilePanel === 'wallet'}
          direction="right"
          width="w-full sm:w-[85vw] sm:max-w-[400px]"
          className="pb-[72px]"
        >
          <div className="h-full overflow-y-auto overscroll-contain">
            <WalletDrawer />
          </div>
        </AnimatedPanel>

        {/* Settings panel - slides from right */}
        <AnimatedPanel
          isOpen={mobilePanel === 'settings'}
          direction="right"
          width="w-full sm:w-[85vw] sm:max-w-[400px]"
          className="pb-[72px]"
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
