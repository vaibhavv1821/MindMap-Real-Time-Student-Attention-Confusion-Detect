import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'bordered' | 'interactive'
  glow?: boolean
}

export const Card = ({
  children,
  className = '',
  variant = 'default',
  glow = false,
  ...props
}: CardProps) => {
  const baseStyles = 'rounded-xl bg-white border border-slate-200 shadow-sm p-4 text-slate-900 transition-colors duration-150'

  const variantStyles = {
    default: '',
    glass: '', // Clean white card (no glassmorphism)
    bordered: 'border-slate-300 shadow-none',
    interactive: 'hover:border-blue-400 hover:shadow-md cursor-pointer',
  }

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
