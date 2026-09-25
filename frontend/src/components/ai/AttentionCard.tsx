import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export interface AttentionCardProps {
  score: number // 0-100
  trend?: 'up' | 'down' | 'stable'
  className?: string
}

export const AttentionCard = ({ score, trend = 'up', className = '' }: AttentionCardProps) => {
  const getVariant = (s: number) => {
    if (s >= 70) return { color: 'text-success', bg: 'bg-success', label: 'High Attention' }
    if (s >= 40) return { color: 'text-warning', bg: 'bg-warning', label: 'Moderate' }
    return { color: 'text-danger', bg: 'bg-danger', label: 'Low Focus' }
  }

  const { color, bg, label } = getVariant(score)

  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-accent/10 text-accent">
            <Icons.Brain size={20} />
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider">
              Live Attention
            </h4>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`text-3xl font-bold tracking-tight ${color}`}>
                {score}%
              </span>
              <Badge variant={score >= 70 ? 'success' : score >= 40 ? 'warning' : 'danger'} size="sm">
                {label}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end">
          {trend === 'up' && <Icons.TrendingUp className="text-success" size={22} />}
          {trend === 'down' && <Icons.TrendingDown className="text-danger" size={22} />}
          {trend === 'stable' && <Icons.Activity className="text-accent" size={22} />}
          <span className="text-[10px] text-muted mt-1">Real-Time</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 w-full bg-background-tertiary h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${bg}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </Card>
  )
}
