import React from 'react'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy' | 'away'
}

export const Avatar = ({
  src,
  name,
  size = 'md',
  status,
  className = '',
  ...props
}: AvatarProps) => {
  const sizeStyles = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base',
    xl: 'w-14 h-14 text-lg font-bold',
  }

  const statusColor = {
    online: 'bg-success',
    offline: 'bg-muted',
    busy: 'bg-danger',
    away: 'bg-warning',
  }

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    return n.slice(0, 2).toUpperCase()
  }

  return (
    <div className={`relative inline-block ${className}`} {...props}>
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeStyles[size]} rounded-full object-cover border border-border/80`}
        />
      ) : (
        <div
          className={`${sizeStyles[size]} rounded-full bg-gradient-to-br from-accent/30 to-purple-600/30 border border-accent/40 flex items-center justify-center font-medium text-white shadow-inner`}
        >
          {getInitials(name)}
        </div>
      )}
      {status && (
        <span
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${statusColor[status]}`}
        />
      )}
    </div>
  )
}
