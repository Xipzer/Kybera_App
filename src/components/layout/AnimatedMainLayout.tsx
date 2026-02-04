import { ReactNode, useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { useUIStore } from '../../store/uiStore'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { useTheme } from '../../hooks/useTheme'

interface MainLayoutProps {
  children: ReactNode
}

const MIN_WALLET_SIZE = 25
const COLLAPSED_SIZE = 4

export function MainLayout({ children }: MainLayoutProps) {
  const { theme: uiTheme } = useUIStore()
  const { theme } = useTheme()

  const [isWalletCollapsed, setIsWalletCollapsed] = useState(false)
  const [isWalletDraggingBelowMin, setIsWalletDraggingBelowMin] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const walletPanelRef = useRef<any>(null)
  const walletSizeRef = useRef(25)
  const wasCollapsedOnDragStart = useRef({ wallet: false })

  useEffect(() => {
    // Remove all theme classes first
    document.documentElement.classList.remove('light', 'dark', 'xipz', 'ogDark', 'ogLight')
    // Add the current theme class
    document.documentElement.classList.add(uiTheme)
  }, [uiTheme])

  // Double-click handler for expanding collapsed wallet panel
  const handleWalletDoubleClick = () => {
    if (isWalletCollapsed) {
      setIsWalletCollapsed(false)
      walletPanelRef.current?.expand()
    }
  }

  const handleWalletResize = (size: number) => {
    walletSizeRef.current = size

    // Clear dragging below min if we're expanding from collapsed
    if (wasCollapsedOnDragStart.current.wallet && isDragging && size > COLLAPSED_SIZE) {
      setIsWalletDraggingBelowMin(false)
    }
    // Only set dragging below min for expanded panels
    else if (!isWalletCollapsed && size < MIN_WALLET_SIZE) {
      setIsWalletDraggingBelowMin(true)
    } else if (!isWalletCollapsed && size >= MIN_WALLET_SIZE) {
      setIsWalletDraggingBelowMin(false)
    }
  }

  const handleDragStart = () => {
    // Track initial collapsed state when drag starts
    wasCollapsedOnDragStart.current.wallet = isWalletCollapsed
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)

    // Handle wallet panel
    if (wasCollapsedOnDragStart.current.wallet) {
      // If started from collapsed, any drag should expand (even 1px)
      if (walletSizeRef.current > COLLAPSED_SIZE) {
        // Panel was collapsed and dragged out - expand it
        setIsWalletCollapsed(false)
        // Force expansion by calling expand after state update
        requestAnimationFrame(() => {
          walletPanelRef.current?.expand()
          // Double-check and resize if needed
          requestAnimationFrame(() => {
            if (walletSizeRef.current < MIN_WALLET_SIZE) {
              walletPanelRef.current?.resize(MIN_WALLET_SIZE)
            }
          })
        })
      }
      // No else - if still at COLLAPSED_SIZE, leave it collapsed
    } else {
      // Started from expanded - auto-collapse if below minimum
      if (walletSizeRef.current < MIN_WALLET_SIZE) {
        walletPanelRef.current?.collapse()
        setIsWalletDraggingBelowMin(false)
      }
    }
  }

  return (
    <div className="h-screen bg-bg-subtle">
      <PanelGroup direction="horizontal" className="h-full">
        <Panel id="main-content" order={1}>
          <div className="h-full">{children}</div>
        </Panel>

        <PanelResizeHandle
          className={`w-px transition-colors ${theme.styles.resizeHandle} ${theme.styles.resizeHandleHover}`}
          onDragging={(dragging) => {
            if (dragging) {
              handleDragStart()
            } else {
              handleDragEnd()
            }
          }}
        />

        <Panel
          ref={walletPanelRef}
          id="wallet-drawer"
          order={2}
          defaultSize={25}
          minSize={4}
          maxSize={40}
          collapsible={true}
          collapsedSize={4}
          onCollapse={() => {
            setIsWalletCollapsed(true)
            setIsWalletDraggingBelowMin(false)
          }}
          onExpand={() => {
            setIsWalletCollapsed(false)
          }}
          onResize={handleWalletResize}
        >
          <div
            onDoubleClick={handleWalletDoubleClick}
            className="h-full bg-surface-base transition-opacity duration-200"
            style={{
              opacity: isWalletDraggingBelowMin ? 0.5 : 1,
            }}
          >
            <AnimatePresence mode="wait">
              {!isWalletDraggingBelowMin &&
                (isWalletCollapsed ? (
                  <motion.div
                    key="collapsed-wallet"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <WalletDrawer collapsed />
                  </motion.div>
                ) : (
                  <motion.div
                    key="expanded-wallet"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <WalletDrawer />
                  </motion.div>
                ))}
            </AnimatePresence>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}