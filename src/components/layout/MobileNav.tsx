import { useState } from 'react'
import { Wallet, MessageSquare, Settings, Menu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface MobileNavProps {
  onOpenChat: () => void
  onOpenWallet: () => void
  onOpenSettings: () => void
}

export function MobileNav({ onOpenChat, onOpenWallet, onOpenSettings }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { icon: MessageSquare, label: 'Chats', onClick: onOpenChat },
    { icon: Wallet, label: 'Wallets', onClick: onOpenWallet },
    { icon: Settings, label: 'Settings', onClick: onOpenSettings },
  ]

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">SmartWallet</h1>
          </div>
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isOpen ? (
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="lg:hidden fixed right-0 top-14 bottom-0 w-72 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 z-50"
            >
              <div className="p-4">
                <nav className="space-y-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => {
                        item.onClick()
                        setIsOpen(false)
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-gray-100">{item.label}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Tab Bar for Mobile */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-30">
        <div className="flex items-center justify-around h-full">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <item.icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}