import { ReactNode, useEffect, useRef } from 'react'
import * as ScrollArea from '@radix-ui/react-scroll-area'

interface CustomScrollAreaProps {
  children: ReactNode
  className?: string
}

export function CustomScrollArea({ children, className = '' }: CustomScrollAreaProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Force thumb to always be visible by overriding Radix's internal styles
    const observer = new MutationObserver(() => {
      const thumb = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-thumb]')
      if (thumb instanceof HTMLElement) {
        thumb.style.opacity = '1'
      }
    })

    if (scrollAreaRef.current) {
      observer.observe(scrollAreaRef.current, {
        attributes: true,
        attributeFilter: ['style'],
        subtree: true,
      })

      // Initial setting
      const thumb = scrollAreaRef.current.querySelector('[data-radix-scroll-area-thumb]')
      if (thumb instanceof HTMLElement) {
        thumb.style.opacity = '1'
      }
    }

    return () => observer.disconnect()
  }, [])

  return (
    <div ref={scrollAreaRef} className={`h-full w-full ${className}`}>
      <ScrollArea.Root className="h-full w-full">
        <ScrollArea.Viewport className="h-full w-full rounded-[inherit]">
          {children}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          className="flex select-none touch-none p-0.5 bg-transparent transition-colors duration-[160ms] ease-out hover:bg-surface-hover data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2.5"
          orientation="vertical"
        >
          <ScrollArea.Thumb className="flex-1 bg-border-default rounded-[10px] relative before:content-[''] before:absolute before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:w-full before:h-full before:min-w-[44px] before:min-h-[44px] hover:bg-border-subtle" />
        </ScrollArea.Scrollbar>
        <ScrollArea.Corner className="bg-surface-base" />
      </ScrollArea.Root>
    </div>
  )
}