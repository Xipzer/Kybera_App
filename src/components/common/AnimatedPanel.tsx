import { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface AnimatedPanelProps {
  isOpen: boolean
  direction: 'left' | 'right'
  children: ReactNode
  className?: string
  width?: string
}

export function AnimatedPanel({ 
  isOpen, 
  direction, 
  children, 
  className = '',
  width = 'w-80'
}: AnimatedPanelProps) {
  const variants = {
    open: { x: 0 },
    closed: { x: direction === 'left' ? '-100%' : '100%' }
  }

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          initial="closed"
          animate="open"
          exit="closed"
          variants={variants}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 30,
          }}
          className={`fixed top-0 ${direction}-0 h-full ${width} bg-white dark:bg-gray-900 border-${direction === 'left' ? 'r' : 'l'} border-gray-200 dark:border-gray-800 z-40 ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Overlay component for mobile
export function MobileOverlay({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClick}
        />
      )}
    </AnimatePresence>
  )
}