import { useState } from 'react'
import { Wallet, MessageSquare, Settings, Menu, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'

// Theme color configurations for mobile nav
const mobileNavThemeColors = {
  light: {
    headerBg: 'bg-white/80',
    headerBorder: 'border-gray-200/50',
    logoGradient: 'from-cyan-500 via-teal-400 to-cyan-600',
    titleGradient: 'from-cyan-600 via-teal-500 to-cyan-600',
    menuButtonBg: 'bg-gray-100/80',
    menuButtonHover: 'hover:bg-gray-200/80',
    overlayBg: 'bg-black/40',
    panelBg: 'bg-white/95',
    panelBorder: 'border-gray-200/50',
    navItemHover: 'hover:bg-gray-100',
    navItemActive: 'bg-cyan-50',
    navIconColor: 'text-gray-500',
    navIconActive: 'text-cyan-600',
    navTextColor: 'text-gray-700',
    bottomBarBg: 'bg-white/90',
    bottomBarBorder: 'border-gray-200/50',
    bottomItemHover: 'hover:bg-gray-100/80',
  },
  dark: {
    headerBg: 'bg-slate-900/80',
    headerBorder: 'border-white/5',
    logoGradient: 'from-cyan-500 via-cyan-400 to-pink-500',
    titleGradient: 'from-cyan-400 via-cyan-300 to-pink-400',
    menuButtonBg: 'bg-white/5',
    menuButtonHover: 'hover:bg-white/10',
    overlayBg: 'bg-black/60',
    panelBg: 'bg-slate-900/95',
    panelBorder: 'border-white/10',
    navItemHover: 'hover:bg-white/5',
    navItemActive: 'bg-cyan-500/10',
    navIconColor: 'text-white/50',
    navIconActive: 'text-cyan-400',
    navTextColor: 'text-white/80',
    bottomBarBg: 'bg-slate-900/90',
    bottomBarBorder: 'border-white/5',
    bottomItemHover: 'hover:bg-white/5',
  },
  xipz: {
    headerBg: 'bg-primary-900/80',
    headerBorder: 'border-primary-800/50',
    logoGradient: 'from-red-500 via-red-600 to-red-500',
    titleGradient: 'from-red-400 via-red-500 to-red-400',
    menuButtonBg: 'bg-primary-800/50',
    menuButtonHover: 'hover:bg-primary-800/80',
    overlayBg: 'bg-black/60',
    panelBg: 'bg-primary-900/95',
    panelBorder: 'border-primary-800/50',
    navItemHover: 'hover:bg-primary-800/50',
    navItemActive: 'bg-red-500/10',
    navIconColor: 'text-primary-400',
    navIconActive: 'text-red-400',
    navTextColor: 'text-primary-100',
    bottomBarBg: 'bg-primary-900/90',
    bottomBarBorder: 'border-primary-800/50',
    bottomItemHover: 'hover:bg-primary-800/50',
  },
}

interface MobileNavProps {
  onOpenChat: () => void
  onOpenWallet: () => void
  onOpenSettings: () => void
}

export function MobileNav({ onOpenChat, onOpenWallet, onOpenSettings }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { themeName } = useTheme()
  const colors = mobileNavThemeColors[themeName] || mobileNavThemeColors.dark

  const menuItems = [
    { icon: MessageSquare, label: 'Chats', onClick: onOpenChat },
    { icon: Wallet, label: 'Wallets', onClick: onOpenWallet },
    { icon: Settings, label: 'Settings', onClick: onOpenSettings },
  ]

  return (
    <>
      {/* Mobile Header Bar with glassmorphism */}
      <div
        className={`lg:hidden fixed top-0 left-0 right-0 h-14 ${colors.headerBg} backdrop-blur-xl border-b ${colors.headerBorder} z-50`}
      >
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo and title */}
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${colors.logoGradient} shadow-lg`}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1
              className={`text-lg font-bold bg-gradient-to-r ${colors.titleGradient} bg-clip-text text-transparent`}
            >
              OpenWallet
            </h1>
          </div>

          {/* Menu toggle button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2.5 rounded-xl ${colors.menuButtonBg} ${colors.menuButtonHover} transition-all duration-200 active:scale-95`}
          >
            {isOpen ? (
              <X className="w-5 h-5 text-text-secondary" />
            ) : (
              <Menu className="w-5 h-5 text-text-secondary" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay and Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`lg:hidden fixed inset-0 ${colors.overlayBg} backdrop-blur-sm z-40`}
              onClick={() => setIsOpen(false)}
            />

            {/* Slide-in panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`lg:hidden fixed right-0 top-14 bottom-0 w-72 ${colors.panelBg} backdrop-blur-xl border-l ${colors.panelBorder} z-50 shadow-2xl`}
            >
              <div className="p-4">
                {/* Menu header */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                  <Sparkles className={`w-4 h-4 ${colors.navIconActive}`} />
                  <span className={`text-sm font-medium ${colors.navTextColor}`}>Navigation</span>
                </div>

                {/* Menu items */}
                <nav className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.onClick()
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl ${colors.navItemHover} transition-all duration-200 active:scale-[0.98] group`}
                    >
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-r ${colors.logoGradient} shadow-md group-hover:shadow-lg transition-shadow`}
                      >
                        <item.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`font-medium ${colors.navTextColor}`}>{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar for Mobile */}
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 h-20 ${colors.bottomBarBg} backdrop-blur-xl border-t ${colors.bottomBarBorder} z-30 pb-safe`}
      >
        <div className="flex items-center justify-around h-full px-4">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl ${colors.bottomItemHover} transition-all duration-200 active:scale-95 min-w-[70px]`}
            >
              <div className={`p-2 rounded-xl bg-gradient-to-r ${colors.logoGradient} shadow-md`}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <span className={`text-xs font-medium ${colors.navIconColor}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
