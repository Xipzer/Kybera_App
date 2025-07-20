/**
 * Code by Xipzer
 */

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

  const handleResearchClick = () => {
    if (activePanel !== null) {
      onClosePanel()
    }
  }

  const bottomTabs = [
    { icon: Home, label: 'Research', onClick: handleResearchClick, isActive: activePanel === null },
    {
      icon: Wallet,
      label: 'Wallets',
      onClick: onOpenWallet,
      isActive: activePanel === 'wallet',
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: onOpenSettings,
      isActive: activePanel === 'settings',
    },
  ]

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div
        className={`absolute inset-0 -bottom-[env(safe-area-inset-bottom,0px)] ${styles.bottomBarBg} backdrop-blur-2xl`}
      />

      <div
        className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent ${styles.logoGradient} to-transparent opacity-40`}
      />

      <div className="relative flex items-center justify-around h-[64px] px-4">
        {bottomTabs.map((tab) => (
          <button
            key={tab.label}
            onClick={tab.onClick}
            className="relative flex flex-col items-center justify-center gap-0.5 px-5 py-1.5 touch-manipulation min-w-[72px] group"
          >
            {tab.isActive && (
              <div
                className={`absolute top-1 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-r ${styles.logoGradient} opacity-15 blur-lg`}
              />
            )}

            <div className="relative">
              <tab.icon
                className={`w-[22px] h-[22px] transition-all duration-300 ${
                  tab.isActive
                    ? `${styles.navIconActive} drop-shadow-[0_0_6px_rgba(var(--color-accent-500),0.5)]`
                    : `${styles.navIconColor} group-hover:text-text-secondary`
                }`}
              />
            </div>

            <span
              className={`text-[10px] font-semibold tracking-wide transition-all duration-300 ${
                tab.isActive
                  ? styles.navIconActive
                  : `${styles.navIconColor} group-hover:text-text-secondary`
              }`}
            >
              {tab.label}
            </span>

            {tab.isActive && (
              <div
                className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gradient-to-r ${styles.logoGradient} shadow-[0_0_6px_rgba(var(--color-accent-500),0.6)]`}
              />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}