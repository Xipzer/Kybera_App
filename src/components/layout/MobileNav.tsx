import { useState } from 'react'
import { Wallet, MessageSquare, Settings, Menu, X, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../hooks/useTheme'



interface MobileNavProps {
  onOpenChat: () => void
  onOpenWallet: () => void
  onOpenSettings: () => void
}

export function MobileNav({ onOpenChat, onOpenWallet, onOpenSettings }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { theme } = useTheme()
  const styles = theme.styles.mobileNav

  const menuItems = [
    { icon: MessageSquare, label: 'Chats', onClick: onOpenChat },
    { icon: Wallet, label: 'Wallets', onClick: onOpenWallet },
    { icon: Settings, label: 'Settings', onClick: onOpenSettings },
  ]

  return (
    <>
      {/* Mobile Header Bar with glassmorphism */}
      <div
        className={`lg:hidden fixed top-0 left-0 right-0 h-14 ${styles.headerBg} backdrop-blur-xl border-b ${styles.headerBorder} z-50`}
      >
        <div className="flex items-center justify-between h-full px-4">
          {/* Logo and title */}
          <div className="flex items-center gap-2.5">
            <img src="/kybera-icon.png" alt="Kybera" className="w-8 h-8 rounded-lg shadow-lg" />
            <h1
              className={`text-lg font-bold bg-gradient-to-r ${styles.titleGradient} bg-clip-text text-transparent`}
            >
              Kybera
            </h1>
          </div>

          {/* Menu toggle button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`p-2.5 rounded-xl ${styles.menuButtonBg} ${styles.menuButtonHover} transition-all duration-200 active:scale-95`}
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
              className={`lg:hidden fixed inset-0 ${styles.overlayBg} backdrop-blur-sm z-40`}
              onClick={() => setIsOpen(false)}
            />

            {/* Slide-in panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`lg:hidden fixed right-0 top-14 bottom-0 w-72 ${styles.panelBg} backdrop-blur-xl border-l ${styles.panelBorder} z-50 shadow-2xl`}
            >
              <div className="p-4">
                {/* Menu header */}
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
                  <Sparkles className={`w-4 h-4 ${styles.navIconActive}`} />
                  <span className={`text-sm font-medium ${styles.navTextColor}`}>Navigation</span>
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
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl ${styles.navItemHover} transition-all duration-200 active:scale-[0.98] group`}
                    >
                      <div
                        className={`p-2 rounded-lg bg-gradient-to-r ${styles.logoGradient} shadow-md group-hover:shadow-lg transition-shadow`}
                      >
                        <item.icon className="w-4 h-4 text-white" />
                      </div>
                      <span className={`font-medium ${styles.navTextColor}`}>{item.label}</span>
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
        className={`lg:hidden fixed bottom-0 left-0 right-0 h-20 ${styles.bottomBarBg} backdrop-blur-xl border-t ${styles.bottomBarBorder} z-30 pb-safe`}
      >
        <div className="flex items-center justify-around h-full px-4">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl ${styles.bottomItemHover} transition-all duration-200 active:scale-95 min-w-[70px]`}
            >
              <div className={`p-2 rounded-xl bg-gradient-to-r ${styles.logoGradient} shadow-md`}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <span className={`text-xs font-medium ${styles.navIconColor}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
