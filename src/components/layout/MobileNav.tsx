import { Wallet, Settings, Home } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

interface MobileNavProps {
  onOpenWallet: () => void
  onOpenSettings: () => void
}

export function MobileNav({ onOpenWallet, onOpenSettings }: MobileNavProps) {
  const { theme } = useTheme()
  const styles = theme.styles.mobileNav

  // Bottom tab items - main navigation
  const bottomTabs = [
    { icon: Home, label: 'Research', onClick: () => {}, isActive: true },
    { icon: Wallet, label: 'Wallets', onClick: onOpenWallet, isActive: false },
    { icon: Settings, label: 'Settings', onClick: onOpenSettings, isActive: false },
  ]

  return (
    <>
      {/* Bottom Tab Bar - Modern floating style */}
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-30`}
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
