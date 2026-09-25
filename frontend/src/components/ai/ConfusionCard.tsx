import React from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export interface ConfusionCardProps {
  score: number // 0-100
  isHighAlert?: boolean
  className?: string
}

export const ConfusionCard = ({
  score,
  isHighAlert = false,
  className = '',
}: ConfusionCardProps) => {
  return (
    <Card className={`relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Icons.Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-xs font-medium text-muted uppercase tracking-wider">
              Confusion Score
            </h4>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-bold tracking-tight text-purple-400">
                {score}%
              </span>
              <Badge variant={score > 50 ? 'danger' : 'purple'} size="sm">
                {score > 50 ? 'Spike Detected' : 'Normal'}
              </Badge>
            </div>
          </div>
        </div>

        {score > 50 && (
          <div className="p-2 rounded-xl bg-danger/10 text-danger animate-pulse-live">
            <Icons.AlertTriangle size={22} />
          </div>
        )}
      </div>

      <div className="mt-4 w-full bg-background-tertiary h-2 rounded-full overflow-hidden">
        <div
          className="h-full transition-all duration-500 rounded-full bg-gradient-to-r from-purple-500 to-danger"
          style={{ width: `${score}%` }}
        />
      </div>
    </Card>
  )
}
