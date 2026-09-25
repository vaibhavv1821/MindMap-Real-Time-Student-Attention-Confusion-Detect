import React from 'react'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'live'
  size?: 'sm' | 'md'
  dot?: boolean
}

export const Badge = ({
  children,
  className = '',
  variant = 'default',
  size = 'md',
  dot = false,
  ...props
}: BadgeProps) => {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px] gap-1',
    md: 'px-2.5 py-0.5 text-xs gap-1.5',
  }

  const variantStyles = {
    default: 'bg-slate-100 text-slate-700 border border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    danger: 'bg-red-50 text-red-700 border border-red-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border border-purple-200',
    live: 'bg-red-50 text-red-700 border border-red-200 font-semibold',
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-emerald-600'
              : variant === 'warning'
              ? 'bg-amber-600'
              : variant === 'danger' || variant === 'live'
              ? 'bg-red-600'
              : 'bg-blue-600'
          }`}
        />
      )}
      {children}
    </span>
  )
}
