/**
 * Code by Xipzer
 */

import * as Popover from '@radix-ui/react-popover'
import { LuBrain } from 'react-icons/lu'
import { BarChart3, Eye, TrendingUp, Sprout, Bell, Settings } from 'lucide-react'
import { useUIStore, type NavItem } from '../../store/uiStore'
import { useNotificationStore } from '../../store/notificationStore'
import { NotificationPanel } from '../notifications/NotificationPanel'
import { useTheme } from '../../hooks/useTheme'

export const NAV_RAIL_COLLAPSED = 'calc(4vw / 1.04)'
export const NAV_RAIL_EXPANDED = '220px'

const NAV_ITEMS: { id: NavItem; label: string; icon: typeof BarChart3 | typeof LuBrain }[] = [
  { id: 'research', label: 'Research', icon: LuBrain },
  { id: 'portfolio', label: 'Portfolio', icon: BarChart3 },
  { id: 'watchlist', label: 'Watchlist', icon: Eye },
  { id: 'markets', label: 'Markets', icon: TrendingUp },
  { id: 'yield', label: 'Yield', icon: Sprout },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function NavRail() {
  const { activeNavItem, setActiveNavItem } = useUIStore()
  const unreadCount = useNotificationStore((s) => s.unreadCount)
  const { theme } = useTheme()

  return (
    <aside
      className="group/rail fixed top-0 left-0 bottom-0 z-[110] bg-surface-base border-r border-border-subtle flex flex-col py-1.5 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:shadow-[6px_0_24px_rgba(0,0,0,0.12)]"
      style={{ width: NAV_RAIL_COLLAPSED }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.width = NAV_RAIL_EXPANDED }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.width = NAV_RAIL_COLLAPSED }}
    >
      <nav className="flex flex-col gap-0.5 px-1 flex-1 mt-1">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveNavItem(item.id)}
            className={`flex items-center justify-center group-hover/rail:justify-start gap-3 h-[40px] group-hover/rail:px-[11px] rounded-lg text-sm font-medium whitespace-nowrap transition-colors duration-150 w-full ${
              activeNavItem === item.id
                ? `${theme.styles.iconAccent} bg-accent/10 font-semibold`
                : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }`}
          >
            <item.icon className={`w-[18px] h-[18px] flex-shrink-0 ${activeNavItem === item.id ? 'drop-shadow-[0_0_4px_rgba(var(--color-accent-500),0.4)]' : ''}`} />
            <span className="opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200 delay-[50ms] hidden group-hover/rail:inline">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="h-px bg-border-subtle mx-2 my-1 flex-shrink-0" />

      <div className="px-1 pb-1">
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              className="relative flex items-center justify-center group-hover/rail:justify-start gap-3 h-[40px] group-hover/rail:px-[11px] rounded-lg text-sm font-medium whitespace-nowrap text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors duration-150 w-full"
            >
              <div className="relative flex-shrink-0">
                <Bell className="w-[18px] h-[18px]" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold leading-none shadow-lg">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="opacity-0 group-hover/rail:opacity-100 transition-opacity duration-200 delay-[50ms] hidden group-hover/rail:inline">
                Notifications
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="w-[380px] max-h-[520px] bg-surface-base border border-border-subtle rounded-xl shadow-2xl z-[120] overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
              side="right"
              sideOffset={8}
              align="end"
            >
              <NotificationPanel compact />
              <Popover.Arrow className="fill-surface-base" />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </aside>
  )
}
