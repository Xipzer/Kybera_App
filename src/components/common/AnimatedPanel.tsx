/**
 * Code by Xipzer
 */

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
  width = 'w-full sm:w-[85vw] sm:max-w-[400px]',
}: AnimatedPanelProps) {
  const variants = {
    open: { x: 0 },
    closed: { x: direction === 'left' ? '-100%' : '100%' },
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
            stiffness: 350,
            damping: 30,
          }}
          className={`fixed top-0 ${direction}-0 h-[100dvh] ${width} bg-surface-base border-${direction === 'left' ? 'r' : 'l'} border-border-subtle z-40 shadow-2xl ${className}`}
          style={{
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function MobileOverlay({ isOpen, onClick }: { isOpen: boolean; onClick: () => void }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden touch-manipulation"
          onClick={onClick}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}
    </AnimatePresence>
  )
}