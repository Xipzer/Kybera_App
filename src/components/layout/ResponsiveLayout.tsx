import { ReactNode, useState, useEffect } from 'react'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { MainLayout } from './AnimatedMainLayout'
import { MobileNav } from './MobileNav'
import { AnimatedPanel, MobileOverlay } from '../common/AnimatedPanel'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { SettingsDialog } from '../settings/SettingsDialog'

interface ResponsiveLayoutProps {
  children: ReactNode
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const isMobile = useMediaQuery('(max-width: 1024px)')
  const [mobilePanel, setMobilePanel] = useState<'wallet' | 'settings' | null>(null)
  const [showSettings, setShowSettings] = useState(false)

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

  if (isMobile) {
    return (
      <>
        {/* Main mobile container - no top padding since header is removed */}
        <div className="flex flex-col h-[100dvh] pb-[72px] bg-bg-base">
          {/* Main content area - scrollable */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation only */}
        <MobileNav
          onOpenWallet={() => setMobilePanel('wallet')}
          onOpenSettings={() => setShowSettings(true)}
        />

        {/* Mobile overlay for panels */}
        <MobileOverlay isOpen={mobilePanel !== null} onClick={() => setMobilePanel(null)} />

        {/* Wallet panel - slides from right */}
        <AnimatedPanel
          isOpen={mobilePanel === 'wallet'}
          direction="right"
          width="w-full sm:w-[85vw] sm:max-w-[400px]"
          className="pt-0"
        >
          {/* Mobile wallet header */}
          <div className="sticky top-0 z-10 h-14 px-4 flex items-center justify-between bg-surface-base/95 backdrop-blur-xl border-b border-border-subtle">
            <h2 className="text-lg font-semibold text-text-primary">Wallets</h2>
            <button
              onClick={() => setMobilePanel(null)}
              className="p-2 rounded-xl bg-surface-hover hover:bg-surface-elevated transition-colors active:scale-95 touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Close wallet panel"
            >
              <svg
                className="w-5 h-5 text-text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="h-[calc(100dvh-56px)] overflow-y-auto overscroll-contain">
            <WalletDrawer />
          </div>
        </AnimatedPanel>

        {/* Settings dialog */}
        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </>
    )
  }

  return <MainLayout>{children}</MainLayout>
}
