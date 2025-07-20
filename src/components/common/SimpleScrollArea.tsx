import { ReactNode, useRef, useEffect, useState } from 'react'

interface SimpleScrollAreaProps {
  children: ReactNode
  className?: string
}

export function SimpleScrollArea({ children, className = '' }: SimpleScrollAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showScrollbar, setShowScrollbar] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [thumbHeight, setThumbHeight] = useState(0)

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const checkScroll = () => {
      const { scrollHeight, clientHeight, scrollTop } = scrollElement
      const isScrollable = scrollHeight > clientHeight
      setShowScrollbar(isScrollable)

      if (isScrollable) {
        const scrollPercentage = scrollTop / (scrollHeight - clientHeight)
        setScrollProgress(scrollPercentage)
        
        const viewportRatio = clientHeight / scrollHeight
        setThumbHeight(Math.max(viewportRatio * 100, 20)) // Min 20% height
      }
    }

    checkScroll()
    scrollElement.addEventListener('scroll', checkScroll)
    
    // Check on resize
    const resizeObserver = new ResizeObserver(checkScroll)
    resizeObserver.observe(scrollElement)

    return () => {
      scrollElement.removeEventListener('scroll', checkScroll)
      resizeObserver.disconnect()
    }
  }, [children])

  const handleThumbDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const startY = e.clientY
    const startScrollTop = scrollElement.scrollTop
    const { scrollHeight, clientHeight } = scrollElement
    const maxScroll = scrollHeight - clientHeight

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - startY
      const trackHeight = clientHeight
      const thumbSpace = trackHeight - (trackHeight * thumbHeight / 100)
      const scrollRatio = deltaY / thumbSpace
      
      scrollElement.scrollTop = startScrollTop + (scrollRatio * maxScroll)
    }

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div
        ref={scrollRef}
        className="h-full w-full overflow-y-auto scrollbar-hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      
      {/* Invisible hover area to trigger scrollbar visibility */}
      {showScrollbar && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-3"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onWheel={(e) => {
            // Forward wheel events to the scroll container with smooth scrolling
            if (scrollRef.current) {
              e.stopPropagation()
              // Multiply deltaY for faster scrolling (similar to browser default)
              const scrollSpeed = 3
              scrollRef.current.scrollBy({
                top: e.deltaY * scrollSpeed,
                behavior: 'smooth'
              })
            }
          }}
        />
      )}
      
      {showScrollbar && isHovered && (
        <div 
          className="absolute right-0 top-0 bottom-0 w-2.5 p-0.5 bg-transparent hover:bg-surface-hover transition-all duration-[160ms] ease-out"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onWheel={(e) => {
            // Forward wheel events to the scroll container with smooth scrolling
            if (scrollRef.current) {
              e.stopPropagation()
              // Multiply deltaY for faster scrolling (similar to browser default)
              const scrollSpeed = 3
              scrollRef.current.scrollBy({
                top: e.deltaY * scrollSpeed,
                behavior: 'smooth'
              })
            }
          }}
        >
          <div
            className="relative h-full w-full"
            onClick={(e) => {
              // Click on track to jump
              const rect = e.currentTarget.getBoundingClientRect()
              const clickY = e.clientY - rect.top
              const trackHeight = rect.height
              const scrollElement = scrollRef.current
              if (!scrollElement) return
              
              const { scrollHeight, clientHeight } = scrollElement
              const maxScroll = scrollHeight - clientHeight
              const scrollRatio = clickY / trackHeight
              
              scrollElement.scrollTop = scrollRatio * maxScroll
            }}
          >
            <div
              className="absolute left-0 right-0 bg-red-500 rounded-[10px] hover:bg-red-600 transition-colors cursor-pointer"
              style={{
                top: `${scrollProgress * (100 - thumbHeight)}%`,
                height: `${thumbHeight}%`,
              }}
              onMouseDown={handleThumbDrag}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Hide native scrollbar
const style = document.createElement('style')
style.textContent = `
  .scrollbar-hidden::-webkit-scrollbar {
    display: none;
  }
`
document.head.appendChild(style)