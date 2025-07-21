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
  theme?: 'light' | 'dark' | 'xipz'
}

export function EmptyState({ icon: Icon, title, description, action, className = '', theme }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
        theme === 'xipz' ? 'bg-primary-800/50' : 'bg-surface-elevated'
      }`}>
        <Icon className={`w-8 h-8 ${
          theme === 'xipz' ? 'text-primary-400' : 'text-text-tertiary'
        }`} />
      </div>
      
      <h3 className={`text-lg font-semibold mb-2 ${
        theme === 'xipz' ? 'text-primary-100' : 'text-text-primary'
      }`}>
        {title}
      </h3>
      
      {description && (
        <p className={`text-sm mb-6 max-w-sm ${
          theme === 'xipz' ? 'text-primary-300' : 'text-text-secondary'
        }`}>
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-white rounded-lg hover:shadow-lg transition-all duration-300 font-medium"
          style={{
            background: theme === 'xipz'
              ? 'linear-gradient(135deg, rgb(239, 68, 68) 0%, rgb(220, 38, 38) 100%)'
              : 'linear-gradient(135deg, rgb(0, 225, 255) 0%, rgb(255, 0, 153) 100%)'
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}