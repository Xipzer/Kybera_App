import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  className?: string
}

export function Skeleton({ 
  variant = 'text', 
  width, 
  height, 
  className = '',
  style,
  ...props 
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-gray-200 dark:bg-gray-800'
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-lg'
  }
  
  const combinedStyle = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'circular' ? width : undefined),
    ...style
  }
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={combinedStyle}
      {...props}
    />
  )
}

// Specialized skeleton components
export function WalletSkeleton() {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <Skeleton variant="text" width="60%" className="mb-2" />
          <Skeleton variant="text" width="40%" height="14px" />
        </div>
        <Skeleton variant="circular" width={32} height={32} />
      </div>
    </div>
  )
}

export function ChatSkeleton() {
  return (
    <div className="p-3 rounded-lg">
      <div className="flex items-center gap-2">
        <Skeleton variant="circular" width={16} height={16} />
        <div className="flex-1">
          <Skeleton variant="text" width="70%" className="mb-1" />
          <Skeleton variant="text" width="30%" height="12px" />
        </div>
      </div>
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <div className="flex gap-4 mb-6">
      <Skeleton variant="circular" width={32} height={32} />
      <div className="flex-1 max-w-[70%]">
        <Skeleton variant="text" width="80%" className="mb-2" />
        <Skeleton variant="text" width="60%" className="mb-2" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
  )
}