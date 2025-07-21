import { LucideIcon } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }: EmptyStateProps) {
  const { theme } = useTheme()
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-surface-elevated`}>
        <Icon className={`w-8 h-8 ${theme.styles.iconSecondary}`} />
      </div>
      
      <h3 className={`text-lg font-semibold mb-2 ${theme.styles.textPrimary}`}>
        {title}
      </h3>
      
      {description && (
        <p className={`text-sm mb-6 max-w-sm ${theme.styles.textSecondary}`}>
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={theme.styles.buttonPrimary}
          style={theme.dynamicStyles.buttonPrimary}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}