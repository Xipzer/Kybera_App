/**
 * Code by Xipzer
 */

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
    document.documentElement.classList.remove('light', 'dark', 'xipz', 'ogDark', 'ogLight')
    document.documentElement.classList.add(uiTheme)
  }, [uiTheme])

  const handleWalletDoubleClick = () => {
    if (isWalletCollapsed) {
      setIsWalletCollapsed(false)
      walletPanelRef.current?.expand()
    }
  }

  const handleWalletResize = (size: number) => {
    walletSizeRef.current = size

    if (wasCollapsedOnDragStart.current.wallet && isDragging && size > COLLAPSED_SIZE) {
      setIsWalletDraggingBelowMin(false)
    }
    else if (!isWalletCollapsed && size < MIN_WALLET_SIZE) {
      setIsWalletDraggingBelowMin(true)
    } else if (!isWalletCollapsed && size >= MIN_WALLET_SIZE) {
      setIsWalletDraggingBelowMin(false)
    }
  }

  const handleDragStart = () => {
    wasCollapsedOnDragStart.current.wallet = isWalletCollapsed
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)

    if (wasCollapsedOnDragStart.current.wallet) {
      if (walletSizeRef.current > COLLAPSED_SIZE) {
        setIsWalletCollapsed(false)
        requestAnimationFrame(() => {
          walletPanelRef.current?.expand()
          requestAnimationFrame(() => {
            if (walletSizeRef.current < MIN_WALLET_SIZE) {
              walletPanelRef.current?.resize(MIN_WALLET_SIZE)
            }
          })
        })
      }
    } else {
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