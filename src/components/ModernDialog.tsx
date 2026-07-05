/**
 * Code by Xipzer
 */

import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

interface ModernDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg'
  preventClose?: boolean
}

interface ModernDialogHeaderProps {
  icon: React.ReactNode
  title: string
  subtitle?: string
  onClose: () => void
  backButton?: React.ReactNode
}

interface ModernDialogSectionProps {
  children: React.ReactNode
  className?: string
}

interface ModernDialogActionsProps {
  children: React.ReactNode
}

interface ModernAlertProps {
  type: 'info' | 'success' | 'warning' | 'error'
  title?: string
  children: React.ReactNode
  icon?: React.ReactNode
}

interface ModernInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  icon?: React.ReactNode
  rightElement?: React.ReactNode
}

interface ModernTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
}

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  loading?: boolean
  fullWidth?: boolean
}

const widthClasses = {
  sm: 'w-full sm:w-[400px]',
  md: 'w-full sm:w-[500px]',
  lg: 'w-full sm:w-[600px]',
}

export function ModernDialog({
  open,
  onOpenChange,
  children,
  width = 'md',
  preventClose = false,
}: ModernDialogProps) {
  const { theme } = useTheme()

  const dialogBg = `${theme.styles.dialogContainer} rounded-2xl`

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          onEscapeKeyDown={preventClose ? (e) => e.preventDefault() : undefined}
          onPointerDownOutside={preventClose ? (e) => e.preventDefault() : undefined}
          onInteractOutside={preventClose ? (e) => e.preventDefault() : undefined}
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${widthClasses[width]} max-h-[90vh] overflow-hidden ${dialogBg} z-[9999] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]`}
        >
          <div className="relative overflow-y-auto max-h-[90vh]">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export function ModernDialogHeader({
  icon,
  title,
  subtitle,
  onClose,
  backButton,
}: ModernDialogHeaderProps) {
  const { theme } = useTheme()

  return (
    <div className="sticky top-0 z-10 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 bg-inherit border-b border-border-subtle">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          {backButton || (
            <div className={`p-2.5 sm:p-3 rounded-xl ${theme.styles.wallet.titleIconBg} shadow-lg`}>
              <div className="text-white">{icon}</div>
            </div>
          )}
          <div>
            <Dialog.Title
              className={`text-lg sm:text-xl font-semibold ${theme.styles.textPrimary}`}
            >
              {title}
            </Dialog.Title>
            {subtitle && (
              <p className={`text-xs sm:text-sm ${theme.styles.textSecondary} mt-0.5`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <Dialog.Close asChild>
          <button onClick={onClose} className={theme.styles.buttonIcon}>
            <X className={`w-4 h-4 sm:w-5 sm:h-5 ${theme.styles.iconSecondary}`} />
          </button>
        </Dialog.Close>
      </div>
    </div>
  )
}

export function ModernDialogSection({ children, className = '' }: ModernDialogSectionProps) {
  return <div className={`px-4 sm:px-6 pt-4 sm:pt-5 ${className}`}>{children}</div>
}

export function ModernDialogActions({ children }: ModernDialogActionsProps) {
  return (
    <div className="sticky bottom-0 px-4 sm:px-6 pb-4 sm:pb-5 bg-inherit">
      <div className="flex gap-3 sm:gap-4">{children}</div>
    </div>
  )
}

export function ModernAlert({ type, title, children, icon }: ModernAlertProps) {
  const { theme } = useTheme()

  const alertStyles = {
    info: {
      container: 'p-3 sm:p-4 bg-accent-500/20 border border-primary-800/50 rounded-lg',
      icon: 'text-accent-400',
      title: 'text-accent-400',
      text: theme.styles.info.text,
    },
    success: {
      container: 'p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg',
      icon: 'text-green-400',
      title: 'text-green-400',
      text: 'text-sm text-green-200',
    },
    warning: {
      container: 'p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg',
      icon: 'text-amber-400',
      title: 'text-amber-400',
      text: 'text-sm text-amber-200',
    },
    error: {
      container: theme.styles.error.container,
      icon: 'text-red-400',
      title: 'text-red-400',
      text: theme.styles.error.text,
    },
  }

  const styles = alertStyles[type]

  return (
    <div className={styles.container}>
      <div className="flex gap-3">
        {icon && <div className={`flex-shrink-0 ${styles.icon}`}>{icon}</div>}
        <div className="flex-1 min-w-0">
          {title && <p className={`font-semibold text-sm mb-1 ${styles.title}`}>{title}</p>}
          <div className={`text-xs sm:text-sm ${styles.text}`}>{children}</div>
        </div>
      </div>
    </div>
  )
}

export function ModernInput({
  label,
  hint,
  icon,
  rightElement,
  className = '',
  ...props
}: ModernInputProps) {
  const { theme } = useTheme()

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {label && <label className={theme.styles.label}>{label}</label>}
      <div className="relative">
        {icon && (
          <div className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.styles.iconSecondary}`}>
            {icon}
          </div>
        )}
        <input
          className={`${theme.styles.input} ${icon ? 'pl-10' : ''} ${rightElement ? 'pr-10' : ''} ${className}`}
          style={{ fontSize: '16px' }}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightElement}</div>
        )}
      </div>
      {hint && <p className={`text-[10px] sm:text-xs ${theme.styles.textTertiary}`}>{hint}</p>}
    </div>
  )
}

export function ModernTextarea({ label, hint, className = '', ...props }: ModernTextareaProps) {
  const { theme } = useTheme()

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {label && <label className={theme.styles.label}>{label}</label>}
      <textarea
        className={`${theme.styles.textarea} ${className}`}
        style={{ fontSize: '16px' }}
        {...props}
      />
      {hint && <p className={`text-[10px] sm:text-xs ${theme.styles.textTertiary}`}>{hint}</p>}
    </div>
  )
}

const buttonSizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 sm:py-2.5 text-xs sm:text-sm',
  lg: 'px-5 py-3 text-sm sm:text-base',
}

export const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(function ModernButton(
  {
    variant = 'primary',
    size = 'md',
    icon,
    loading,
    fullWidth,
    children,
    className = '',
    disabled,
    style,
    ...props
  },
  ref,
) {
  const { theme } = useTheme()

  const getButtonStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          className: `${theme.styles.buttonPrimary} ${buttonSizes[size]}`,
          style: theme.dynamicStyles.buttonPrimary,
        }
      case 'secondary':
        return {
          className: `bg-surface-hover border border-border-subtle text-text-secondary hover:bg-surface-overlay hover:text-text-primary hover:border-border-default transition-all duration-200 ${buttonSizes[size]}`,
          style: {},
        }
      case 'danger':
        return {
          className: `px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white font-medium transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 ${buttonSizes[size]}`,
          style: {},
        }
      case 'ghost':
        return {
          className: `${theme.styles.buttonIcon} ${buttonSizes[size]} ${theme.styles.textSecondary} hover:text-text-primary`,
          style: {},
        }
      default:
        return {
          className: `${theme.styles.buttonPrimary} ${buttonSizes[size]}`,
          style: theme.dynamicStyles.buttonPrimary,
        }
    }
  }

  const buttonStyles = getButtonStyles()

  return (
    <button
      ref={ref}
      className={`${fullWidth ? 'flex-1' : ''} ${buttonStyles.className} rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 ${className}`}
      disabled={disabled || loading}
      style={{ ...buttonStyles.style, ...style }}
      {...props}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      ) : icon ? (
        <span className="w-4 h-4">{icon}</span>
      ) : null}
      {children}
    </button>
  )
})

interface SeedPhraseGridProps {
  words: string[]
  hidden?: boolean
  editable?: boolean
  onChange?: (words: string[]) => void
}

export function SeedPhraseGrid({
  words,
  hidden = false,
  editable = false,
  onChange,
}: SeedPhraseGridProps) {
  const { theme } = useTheme()

  return (
    <div className={`p-3 sm:p-4 ${theme.styles.groupContainer}`}>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
        {words.map((word, index) => (
          <div
            key={index}
            className={`flex items-center gap-1.5 sm:gap-2 p-2 sm:p-2.5 rounded-lg ${theme.styles.listItem}`}
          >
            <span
              className={`text-[10px] sm:text-xs ${theme.styles.textTertiary} w-4 sm:w-5 font-mono`}
            >
              {index + 1}.
            </span>
            {editable ? (
              <input
                type="text"
                value={word}
                onChange={(e) => {
                  if (onChange) {
                    const newWords = [...words]
                    newWords[index] = e.target.value
                    onChange(newWords)
                  }
                }}
                className={`flex-1 bg-transparent font-mono text-xs sm:text-sm ${theme.styles.textPrimary} focus:outline-none`}
              />
            ) : (
              <span className={`font-mono text-xs sm:text-sm ${theme.styles.textPrimary}`}>
                {hidden ? '••••' : word}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

interface ModernToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}

export function ModernToggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: ModernToggleProps) {
  const { theme } = useTheme()

  return (
    <label
      className={`flex items-start gap-3 cursor-pointer group ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => !disabled && onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-border-strong rounded-full peer-checked:bg-accent-500 transition-colors border border-border-default peer-checked:border-accent-500/50" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white border border-black/10 rounded-full shadow-md transition-transform peer-checked:translate-x-4" />
      </div>
      <div className="flex-1">
        <span
          className={`text-sm font-medium ${theme.styles.textPrimary} group-hover:text-text-primary transition-colors`}
        >
          {label}
        </span>
        {description && (
          <p className={`text-xs ${theme.styles.textTertiary} mt-0.5`}>{description}</p>
        )}
      </div>
    </label>
  )
}

interface ModernNumberInputProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label?: string
  disabled?: boolean
}

export function ModernNumberInput({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  disabled,
}: ModernNumberInputProps) {
  const { theme } = useTheme()

  return (
    <div className="space-y-1.5 sm:space-y-2">
      {label && <label className={theme.styles.label}>{label}</label>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${theme.styles.buttonIcon} border border-border-subtle ${theme.styles.textSecondary} disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center font-medium`}
        >
          -
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => {
            onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || min)))
          }}
          disabled={disabled}
          className={`w-14 sm:w-16 px-2 py-1.5 sm:py-2 text-center text-sm font-medium bg-surface-hover border border-border-subtle rounded-lg ${theme.styles.textPrimary} focus:outline-none focus:ring-2 focus:ring-accent/50 disabled:opacity-50`}
          style={{ fontSize: '16px' }}
        />
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg ${theme.styles.buttonIcon} border border-border-subtle ${theme.styles.textSecondary} disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center font-medium`}
        >
          +
        </button>
      </div>
    </div>
  )
}