import { ReactNode, useRef, useState, useEffect } from 'react'

interface BetterScrollAreaProps {
  children: ReactNode
  className?: string
}

export function BetterScrollArea({ children, className = '' }: BetterScrollAreaProps) {
  return (
    <div className={`h-full w-full overflow-y-auto ${className}`}>
      {children}
    </div>
  )
}