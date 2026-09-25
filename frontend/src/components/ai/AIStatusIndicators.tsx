import React from 'react'
import { Icons } from '@/components/ui/Icons'

export const BlinkIndicator = ({ blinkRate }: { blinkRate: number }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background-secondary border border-border/60 text-xs">
    <Icons.Eye className="text-accent" size={16} />
    <span className="text-muted">Blinks:</span>
    <span className="font-semibold text-white">{blinkRate} / min</span>
  </div>
)

export const EyeTrackingIndicator = ({ direction }: { direction: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background-secondary border border-border/60 text-xs">
    <Icons.Sparkles className="text-purple-400" size={16} />
    <span className="text-muted">Gaze:</span>
    <span className="font-semibold text-white">{direction}</span>
  </div>
)

export const FaceDetectionIndicator = ({ detected }: { detected: boolean }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background-secondary border border-border/60 text-xs">
    <Icons.ShieldCheck className={detected ? 'text-success' : 'text-danger'} size={16} />
    <span className="text-muted">Face Mesh:</span>
    <span className={`font-semibold ${detected ? 'text-success' : 'text-danger'}`}>
      {detected ? 'Tracked' : 'Not Found'}
    </span>
  </div>
)

export const CameraIndicator = ({ active }: { active: boolean }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background-secondary border border-border/60 text-xs">
    <Icons.Video className={active ? 'text-success' : 'text-muted'} size={16} />
    <span className="text-muted">Camera:</span>
    <span className={`font-semibold ${active ? 'text-success' : 'text-muted'}`}>
      {active ? 'Active' : 'Offline'}
    </span>
  </div>
)
