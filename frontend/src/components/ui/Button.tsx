import React, { ButtonHTMLAttributes, forwardRef } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glow'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-lg'

    const sizeStyles = {
      sm: 'px-2.5 py-1.5 text-xs gap-1.5',
      md: 'px-3.5 py-2 text-sm gap-2',
      lg: 'px-5 py-2.5 text-sm font-semibold gap-2',
    }

    const variantStyles = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent shadow-sm',
      glow: 'bg-blue-600 hover:bg-blue-700 text-white border border-transparent shadow-sm', // Aliased for minimal design
      secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200',
      outline: 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-sm',
      ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
      danger: 'bg-red-600 hover:bg-red-700 text-white border border-transparent shadow-sm',
    }

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'
