import React, { useRef, useEffect } from 'react'
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
  isScreenSharing?: boolean
  stream?: MediaStream | null
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
  isScreenSharing = false,
  stream,
  videoRef,
  canvasRef,
  className = '',
}: VideoTileProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const targetVideoRef = videoRef || localVideoRef

  useEffect(() => {
    const el = targetVideoRef.current
    if (!el) return

    if (stream) {
      if (el.srcObject !== stream) {
        el.srcObject = stream
      }
      if (!isLocalUser) {
        const playPromise = el.play()
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('[VideoTile] Autoplay pending user interaction:', err)
            const handleUserGesture = () => {
              if (targetVideoRef.current) {
                targetVideoRef.current.play().catch(() => {})
              }
              window.removeEventListener('click', handleUserGesture)
              window.removeEventListener('keydown', handleUserGesture)
            }
            window.addEventListener('click', handleUserGesture, { once: true })
            window.addEventListener('keydown', handleUserGesture, { once: true })
          })
        }
      }
    } else if (stream === null) {
      el.srcObject = null
    }
  }, [stream, isLocalUser, targetVideoRef])

  useEffect(() => {
    if (!stream) return
    const handleTrackAdded = () => {
      if (targetVideoRef.current && !isLocalUser) {
        targetVideoRef.current.play().catch(() => {})
      }
    }
    stream.addEventListener('addtrack', handleTrackAdded)
    return () => {
      stream.removeEventListener('addtrack', handleTrackAdded)
    }
  }, [stream, isLocalUser])

  return (
    <div
      className={`relative rounded-xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center ${
        isHandRaised ? 'ring-2 ring-amber-500' : ''
      } ${isScreenSharing ? 'ring-2 ring-emerald-500' : ''} ${className}`}
    >
      <div className="relative w-full h-full flex items-center justify-center bg-slate-950">
        <video
          ref={targetVideoRef}
          autoPlay
          playsInline
          muted={isLocalUser}
          className={`w-full h-full transition-opacity duration-200 ${
            isCameraOff ? 'opacity-0 pointer-events-none' : 'opacity-100'
          } ${
            isScreenSharing
              ? 'object-contain transform-none'
              : isLocalUser
              ? 'object-cover transform -scale-x-100'
              : 'object-cover transform-none'
          }`}
        />
        {canvasRef && !isScreenSharing && !isCameraOff && (
          <canvas
            ref={canvasRef}
            width={320}
            height={240}
            className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 opacity-60"
          />
        )}

        {isCameraOff && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center bg-slate-950 z-0">
            <Avatar name={name} size="lg" />
            <span className="text-xs text-slate-400 font-medium">
              {name} {stream === null && !isLocalUser ? '(Connecting / Offline)' : '(Camera Off)'}
            </span>
          </div>
        )}
      </div>

      {/* Top Bar Overlay */}
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between z-10 pointer-events-none">
        <span className="text-xs font-medium text-white bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700/60 flex items-center gap-1.5">
          <span>{name}</span>
          {isLocalUser && <span className="text-[10px] text-blue-400 font-semibold">(You)</span>}
          {isScreenSharing && (
            <span className="text-[10px] bg-emerald-600/90 text-white px-1.5 py-0.2 rounded font-medium flex items-center gap-1">
              <Icons.ScreenShare size={10} />
              <span>Presenting</span>
            </span>
          )}
        </span>

        {role === 'student' && attentionScore !== undefined && !isScreenSharing && (
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

        {confusionScore > 50 && !isScreenSharing && (
          <span className="px-2 py-0.5 rounded bg-purple-700 text-white font-medium text-[10px]">
            Confused ({confusionScore}%)
          </span>
        )}
      </div>
    </div>
  )
}
