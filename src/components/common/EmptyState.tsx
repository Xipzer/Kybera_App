import { LucideIcon } from 'lucide-react'

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
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-16 h-16 bg-surface-elevated rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-text-tertiary" />
      </div>
      
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm text-text-secondary mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-gradient-candy-red text-white rounded-lg hover:shadow-lg hover:shadow-accent-500/30 transition-all duration-300 font-medium"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}