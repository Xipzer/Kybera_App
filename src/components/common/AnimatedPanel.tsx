/**
 * Code by Xipzer
 */

import { ReactNode, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'

interface AnimatedPanelProps {
  isOpen: boolean
  direction: 'left' | 'right'
  children: ReactNode
  className?: string
  width?: string
  onClose?: () => void
  label?: string
}

export function AnimatedPanel({
  isOpen,
  direction,
  children,
  className = '',
  width = 'w-full sm:w-[85vw] sm:max-w-[400px]',
  onClose,
  label,
}: AnimatedPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const variants = {
    open: { x: 0 },
    closed: { x: direction === 'left' ? '-100%' : '100%' },
  }

  useEffect(() => {
    if (!isOpen || !onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    // Move focus into the panel for keyboard/SR users.
    panelRef.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (!onClose) return
    const dismissed =
      direction === 'right' ? info.offset.x > 80 : info.offset.x < -80
    if (dismissed) onClose()
  }

  const borderClass = direction === 'left' ? 'border-r' : 'border-l'

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={label}
          tabIndex={-1}
          initial="closed"
          animate="open"
          exit="closed"
          variants={variants}
          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
          drag={onClose ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ [direction === 'right' ? 'right' : 'left']: 0.4, [direction === 'right' ? 'left' : 'right']: 0 }}
          onDragEnd={handleDragEnd}
          className={`fixed top-0 ${direction}-0 h-[100dvh] ${width} bg-surface-base ${borderClass} border-border-subtle z-40 shadow-2xl outline-none ${className}`}
          style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 touch-manipulation"
          onClick={onClick}
          onTouchMove={(e) => e.preventDefault()}
        />
      )}
    </AnimatePresence>
  )
}