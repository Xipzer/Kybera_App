import { Wallet, Settings, Home } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

interface MobileNavProps {
  onOpenWallet: () => void
  onClosePanel: () => void
  onOpenSettings: () => void
  activePanel?: 'wallet' | 'settings' | null
}

export function MobileNav({
  onOpenWallet,
  onClosePanel,
  onOpenSettings,
  activePanel,
}: MobileNavProps) {
  const { theme } = useTheme()
  const styles = theme.styles.mobileNav

  // Handle Research tab - closes any panel if open
  const handleResearchClick = () => {
    if (activePanel !== null) {
      onClosePanel()
    }
  }

  // Handle Wallets tab - if settings is open, close it and open wallet
  const handleWalletClick = () => {
    onOpenWallet()
  }

  // Handle Settings tab - if wallet is open, close it and open settings
  const handleSettingsClick = () => {
    onOpenSettings()
  }

  // Bottom tab items - main navigation
  const bottomTabs = [
    { icon: Home, label: 'Research', onClick: handleResearchClick, isActive: activePanel === null },
    {
      icon: Wallet,
      label: 'Wallets',
      onClick: handleWalletClick,
      isActive: activePanel === 'wallet',
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: handleSettingsClick,
      isActive: activePanel === 'settings',
    },
  ]

  return (
    <>
      {/* Bottom Tab Bar - Always visible, z-50 to stay above panels */}
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Background with glassmorphism */}
        <div
          className={`absolute inset-0 ${styles.bottomBarBg} backdrop-blur-xl border-t ${styles.bottomBarBorder}`}
        />

        {/* Tab items container */}
        <div className="relative flex items-center justify-around h-[72px] px-2">
          {bottomTabs.map((tab) => (
            <button
              key={tab.label}
              onClick={tab.onClick}
              className={`flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-2xl transition-all duration-200 active:scale-95 touch-manipulation min-w-[72px] min-h-[56px] ${
                tab.isActive ? `${styles.bottomItemActive}` : `${styles.bottomItemHover}`
              }`}
            >
              <div
                className={`p-2 rounded-xl transition-all ${
                  tab.isActive
                    ? `bg-gradient-to-r ${styles.logoGradient} shadow-lg`
                    : 'bg-transparent'
                }`}
              >
                <tab.icon
                  className={`w-5 h-5 ${tab.isActive ? 'text-white' : styles.navIconColor}`}
                />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  tab.isActive ? styles.navIconActive : styles.navIconColor
                }`}
              >
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </nav>
    </>
  )
}
