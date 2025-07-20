// Theme mapping for systematic color replacement
export const colorMappings = {
  // Background colors
  'bg-white': 'bg-surface-base',
  'dark:bg-gray-900': 'dark:bg-surface-base',
  'bg-gray-50': 'bg-bg-subtle',
  'dark:bg-gray-800': 'dark:bg-surface-elevated',
  'bg-gray-100': 'bg-surface-elevated',
  'dark:bg-gray-700': 'dark:bg-surface-overlay',
  'hover:bg-gray-50': 'hover:bg-surface-hover',
  'dark:hover:bg-gray-800': 'dark:hover:bg-surface-hover',

  // Text colors
  'text-gray-900': 'text-text-primary',
  'dark:text-gray-100': 'dark:text-text-primary',
  'text-gray-600': 'text-text-secondary',
  'dark:text-gray-400': 'dark:text-text-secondary',
  'text-gray-500': 'text-text-tertiary',
  'dark:text-gray-500': 'dark:text-text-tertiary',

  // Border colors
  'border-gray-200': 'border-border-subtle',
  'dark:border-gray-800': 'dark:border-border-subtle',
  'border-gray-300': 'border-border-default',
  'dark:border-gray-700': 'dark:border-border-default',
  'border-gray-400': 'border-border-strong',
  'dark:border-gray-600': 'dark:border-border-strong',

  // Button/Interactive colors
  'bg-blue-600': 'bg-accent-500',
  'hover:bg-blue-700': 'hover:bg-accent-600',
  'bg-blue-50': 'bg-accent-50',
  'dark:bg-blue-900/20': 'dark:bg-accent-900/20',
  'text-blue-600': 'text-accent-500',
  'dark:text-blue-400': 'dark:text-accent-400',
  'border-blue-500': 'border-accent-500',
  'focus:ring-blue-500': 'focus:ring-accent-500',

  // Special states
  'bg-red-50': 'bg-accent-50',
  'dark:bg-red-900/20': 'dark:bg-accent-900/20',
  'text-red-600': 'text-accent-500',
  'dark:text-red-400': 'dark:text-accent-400',
  'border-red-200': 'border-accent-200',
  'dark:border-red-800': 'dark:border-accent-800',
}

// Component-specific theme classes
export const componentThemes = {
  button: {
    primary:
      'bg-gradient-candy-red text-white hover:shadow-lg hover:shadow-accent-500/30 transition-all duration-300',
    secondary:
      'bg-surface-elevated text-text-primary border border-border-default hover:bg-surface-hover hover:border-accent-500/50 transition-all duration-300',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors',
  },
  card: {
    base: 'bg-surface-base border border-border-subtle rounded-lg',
    elevated: 'bg-surface-elevated border border-border-subtle rounded-lg shadow-lg',
  },
  input: {
    base: 'bg-surface-elevated text-text-primary border border-border-subtle placeholder-text-tertiary focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors',
  },
  dialog: {
    overlay: 'bg-primary-950/80 backdrop-blur-sm',
    content: 'bg-surface-base border border-border-subtle shadow-2xl',
  },
}
