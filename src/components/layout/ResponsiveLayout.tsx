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

  if (isMobile) {
    return (
      <>
        <div className="flex flex-col h-screen pt-14 pb-16">
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>

        <MobileNav
          onOpenWallet={() => setMobilePanel('wallet')}
          onOpenSettings={() => setShowSettings(true)}
        />

        <MobileOverlay 
          isOpen={mobilePanel !== null} 
          onClick={() => setMobilePanel(null)} 
        />

        <AnimatedPanel
          isOpen={mobilePanel === 'wallet'}
          direction="right"
          className="pt-14"
        >
          <WalletDrawer />
        </AnimatedPanel>

        <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
      </>
    )
  }

  return <MainLayout>{children}</MainLayout>
}