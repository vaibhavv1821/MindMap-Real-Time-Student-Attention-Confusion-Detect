import React, { useRef } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Icons } from '@/components/ui/Icons'

export interface VideoTileProps {
  name: string
  role: 'teacher' | 'student'
  attentionScore?: number
  confusionScore?: number
  isMuted?: boolean
  isCameraOff?: boolean
  isHandRaised?: boolean
  isLocalUser?: boolean
  videoRef?: React.RefObject<HTMLVideoElement>
  canvasRef?: React.RefObject<HTMLCanvasElement>
  className?: string
}

export const VideoTile = ({
  name,
  role,
  attentionScore = 90,
  confusionScore = 12,
  isMuted = false,
  isCameraOff = false,
  isHandRaised = false,
  isLocalUser = false,
  videoRef,
  canvasRef,
  className = '',
}: VideoTileProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const targetVideoRef = videoRef || localVideoRef

  return (
    <div
      className={`relative rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center ${
        isHandRaised ? 'ring-2 ring-amber-500' : ''
      } ${className}`}
    >
      {!isCameraOff ? (
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
          <video
            ref={targetVideoRef}
            autoPlay
            playsInline
            muted={isLocalUser}
            className="w-full h-full object-cover transform -scale-x-100"
          />
          {canvasRef && (
            <canvas
              ref={canvasRef}
              width={320}
              height={240}
              className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 opacity-60"
            />
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 p-4 text-center">
          <Avatar name={name} size="lg" />
          <span className="text-xs text-slate-400 font-medium">{name} (Camera Muted)</span>
        </div>
      )}

      {/* Top Bar Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
        <span className="text-xs font-medium text-white bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700/60 flex items-center gap-1">
          <span>{name}</span>
          {isLocalUser && <span className="text-[10px] text-blue-400">(You)</span>}
        </span>

        {role === 'student' && attentionScore !== undefined && (
          <Badge
            variant={attentionScore >= 70 ? 'success' : attentionScore >= 40 ? 'warning' : 'danger'}
            size="sm"
            dot
          >
            {attentionScore}% Att.
          </Badge>
        )}
      </div>

      {/* Bottom Bar Overlay */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-1.5">
          {isMuted ? (
            <span className="p-1 rounded bg-red-600/90 text-white">
              <Icons.MicOff size={13} />
            </span>
          ) : (
            <span className="p-1 rounded bg-slate-950/80 text-white">
              <Icons.Mic size={13} />
            </span>
          )}

          {isHandRaised && (
            <span className="p-1 rounded bg-amber-500 text-slate-950 font-bold flex items-center gap-1 text-[11px]">
              <Icons.Hand size={13} />
              <span>Hand Raised</span>
            </span>
          )}
        </div>

        {confusionScore > 50 && (
          <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-medium text-[10px]">
            Confused ({confusionScore}%)
          </span>
        )}
      </div>
    </div>
  )
}
