/**
 * Code by Xipzer
 */

import { ReactNode, useState, useEffect, useRef } from 'react'
import { Panel, PanelGroup, PanelResizeHandle, ImperativePanelHandle } from 'react-resizable-panels'
import { useUIStore } from '../../store/uiStore'
import { applyThemeClass } from '../../utils/themeClasses'
import { WalletDrawer } from '../wallet/WalletDrawer'
import { NavRail, NAV_RAIL_COLLAPSED } from './NavRail'
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

  const walletPanelRef = useRef<ImperativePanelHandle>(null)
  const walletSizeRef = useRef(25)
  const wasCollapsedOnDragStart = useRef({ wallet: false })

  useEffect(() => {
    applyThemeClass(uiTheme)
  }, [uiTheme])

  const handleWalletDoubleClick = () => {
    if (isWalletCollapsed) {
      setIsWalletCollapsed(false)
      walletPanelRef.current?.expand()
    }
  }

  const handleWalletResize = (size: number) => {
    walletSizeRef.current = size

    if (wasCollapsedOnDragStart.current.wallet && isDragging) {
      setIsWalletDraggingBelowMin(size < MIN_WALLET_SIZE)
    } else if (!isWalletCollapsed && size < MIN_WALLET_SIZE) {
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
    <div className="h-screen bg-bg-subtle overflow-hidden">
      <NavRail />
      <PanelGroup direction="horizontal" className="h-full" style={{ marginLeft: NAV_RAIL_COLLAPSED, width: `calc(100vw - ${NAV_RAIL_COLLAPSED})` }}>
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
            className="h-full bg-surface-base transition-opacity duration-200 ml-auto w-full max-w-[520px]"
            style={{
              opacity: isWalletDraggingBelowMin ? 0.5 : 1,
              pointerEvents: isWalletDraggingBelowMin ? 'none' : 'auto',
            }}
          >
            <WalletDrawer collapsed={isWalletCollapsed} />
          </div>
        </Panel>
      </PanelGroup>
    </div>
  )
}