import { ReactNode, useRef, useState, useEffect } from 'react'

interface BetterScrollAreaProps {
  children: ReactNode
  className?: string
}

export function BetterScrollArea({ children, className = '' }: BetterScrollAreaProps) {
  useEffect(() => {
    // Inject styles to hide scrollbar
    const styleId = 'better-scrollarea-styles'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        /* Hide scrollbar completely */
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;  /* Chrome, Safari and Opera */
        }
      `
      document.head.appendChild(style)
    }
  }, [])

  return (
    <div className={`h-full w-full overflow-y-auto no-scrollbar ${className}`}>
      {children}
    </div>
  )
}