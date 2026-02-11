/**
 * Code by Xipzer
 */

import * as Popover from '@radix-ui/react-popover'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '../../store/notificationStore'
import { useTheme } from '../../hooks/useTheme'
import { NotificationPanel } from './NotificationPanel'

interface NotificationBellProps {
  className?: string
}

export function NotificationBell({ className = '' }: NotificationBellProps) {
  const { theme } = useTheme()
  const unreadCount = useNotificationStore((s) => s.unreadCount)

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          className={`${theme.styles.buttonIcon} p-2 rounded-lg relative ${className}`}
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-text-secondary" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none shadow-lg">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="w-[380px] max-h-[520px] bg-surface-base border border-border-subtle rounded-xl shadow-2xl z-[9999] overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          sideOffset={8}
          align="end"
        >
          <NotificationPanel compact />
          <Popover.Arrow className="fill-surface-base" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
