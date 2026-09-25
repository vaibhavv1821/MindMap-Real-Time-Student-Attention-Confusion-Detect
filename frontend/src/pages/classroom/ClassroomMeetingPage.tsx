import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { VideoTile } from './components/VideoTile'
import { AIMonitoringPanel } from './components/AIMonitoringPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Icons } from '@/components/ui/Icons'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { AIDetectorService, AIMetrics } from '@/services/aiDetector'
import { FaceMeshFeatureExtractor } from '@/services/faceMeshExtractor'
import { TemporalFeatureAggregator, MLPredictionResult } from '@/services/temporalAnalyzer'
import { classApi, ClassItem } from '@/services/classApi'
import { env } from '@/config/env'

interface PeerStudent {
  id: string
  name: string
  email: string
  attentionScore: number
  confusionScore: number
  isHandRaised: boolean
  connectionStatus: string
  lastSeen: number
}

export default function ClassroomMeetingPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { showToast } = useToast()

  const [classInfo, setClassInfo] = useState<ClassItem | null>(null)
  const [peers, setPeers] = useState<PeerStudent[]>([])

  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai' | 'chat' | 'participants'>('ai')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; isTeacher: boolean }>>([
    { id: '1', sender: 'MindMap System', text: 'Classroom session initialized. Facial focus & confusion telemetry active.', time: 'System', isTeacher: true },
  ])
  const [newMessage, setNewMessage] = useState('')

  // AI Telemetry State with Phase 1 Feature Vector & Phase 2 ML Prediction
  const initialVector = FaceMeshFeatureExtractor.getEmptyFeatureVector()
  const initialTemporal = TemporalFeatureAggregator.emptyVector()
  const initialPrediction: MLPredictionResult = {
    attention_state: 'ATTENTIVE',
    attention_score: 92,
    confusion_state: 'NORMAL',
    confusion_score: 14,
    confidence: 94,
    reasons: [
      'Stable screen gaze (center focus)',
      'Low head movement (steady posture)',
      'Normal blink dynamics',
    ],
    indicators: {
      sustained_gaze_away: false,
      excessive_head_movement: false,
      prolonged_eye_closure: false,
      high_brow_furrow: false,
      stable_screen_gaze: true,
      attention_drop_indicator: 0.08,
      confusion_indicator: 0.14,
    },
    temporal_features: initialTemporal,
    model_status: 'TRAINED_DEMO_MODEL',
    timestamp_ms: Date.now(),
  }

  const [metrics, setMetrics] = useState<AIMetrics>({
    featureVector: initialVector,
    temporalFeatures: initialTemporal,
    behaviouralIndicators: initialPrediction.indicators,
    mlPrediction: initialPrediction,
    attentionScore: 92,
    confusionScore: 14,
    statusLevel: 'HIGH',
    earLeft: 0.28,
    earRight: 0.28,
    earAverage: 0.28,
    blinkDetected: false,
    blinkCount: 14,
    blinkRatePerMin: 15,
    eyeClosureDurationMs: 0,
    gazeDirection: 'CENTER',
    gazeDeviation: 0.05,
    gazeHRatio: 0.5,
    gazeVRatio: 0.5,
    eyebrowFurrowRatio: 0.45,
    eyebrowFurrowScore: 12,
    browRaise: 0.15,
    headPitch: 0,
    headYaw: 0,
    headRoll: 0,
    eyeOpenness: 0.85,
    calibrationStatus: 'UNCALIBRATED',
    calibrationProgress: 0,
    baselineDeviation: {
      deltaEAR: 0,
      deltaHeadYaw: 0,
      deltaHeadPitch: 0,
      deltaFurrow: 0,
      personalizedAttentionScore: 92,
      personalizedConfusionScore: 14,
    },
    faceDetected: true,
    faceCount: 1,
    landmarkCount: 468,
    faceTrackingStatus: 'TRACKED',
    cameraStatus: 'ACTIVE',
    fps: 30,
    latencyMs: 2,
  })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const aiServiceRef = useRef<AIDetectorService | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // 1. Fetch real class metadata from MongoDB
  useEffect(() => {
    if (!code) return
    classApi
      .getClassDetails(code)
      .then((data) => setClassInfo(data))
      .catch(() => {
        showToast({ type: 'warning', title: 'Live Session', message: `Connected to classroom: ${code.toUpperCase()}` })
      })
  }, [code])

  // 2. Start local MediaPipe FaceMesh & AI Telemetry Engine
  useEffect(() => {
    aiServiceRef.current = new AIDetectorService()
    if (videoRef.current && canvasRef.current) {
      aiServiceRef.current.start(videoRef.current, canvasRef.current, (newMetrics) => {
        setMetrics(newMetrics)
      })
    }

    return () => {
      if (aiServiceRef.current) {
        aiServiceRef.current.stop()
      }
    }
  }, [])

  // 3. Connect to WebSocket room and stream telemetry
  useEffect(() => {
    if (!code) return
    const wsUrl = `${env.wsBaseUrl}/${code}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      console.log(`[MindMap] Connected to classroom WebSocket: ${code}`)
    }

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload && payload.student_id && payload.student_id !== user?.id) {
          setPeers((prev) => {
            const idx = prev.findIndex((p) => p.id === payload.student_id)
            const item: PeerStudent = {
              id: payload.student_id,
              name: payload.student_name || 'Student',
              email: payload.student_email || '',
              attentionScore: payload.attention_score ?? 85,
              confusionScore: payload.confusion_score ?? 15,
              isHandRaised: !!payload.is_hand_raised,
              connectionStatus: payload.connection_status || 'ONLINE',
              lastSeen: Date.now(),
            }
            if (idx >= 0) {
              const copy = [...prev]
              copy[idx] = item
              return copy
            } else {
              return [...prev, item]
            }
          })
        }
      } catch {
        // ignore malformed message
      }
    }

    return () => {
      ws.close()
    }
  }, [code, user?.id])

  // 4. Emit periodic telemetry to WebSocket (every 2 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
        wsRef.current.send(
          JSON.stringify({
            student_id: user.id,
            student_name: user.name,
            student_email: user.email,
            attention_score: metrics.attentionScore,
            confusion_score: metrics.confusionScore,
            attention_state: metrics.mlPrediction.attention_state,
            confusion_state: metrics.mlPrediction.confusion_state,
            confidence: metrics.mlPrediction.confidence,
            reasons: metrics.mlPrediction.reasons,
            indicators: metrics.behaviouralIndicators,
            is_hand_raised: isHandRaised,
            connection_status: isCameraOn ? 'ONLINE' : 'CAMERA_MUTED',
            timestamp_ms: Date.now(),
          })
        )
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [user, metrics, isHandRaised, isCameraOn])

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setChatMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: user?.name || 'You',
        text: newMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isTeacher: user?.role === 'teacher',
      },
    ])
    setNewMessage('')
  }

  const handleLeave = async () => {
    if (user?.role === 'teacher' && classInfo) {
      try {
        await classApi.endClass(classInfo.id)
        showToast({ type: 'info', title: 'Class Ended', message: 'You concluded the live session.' })
      } catch {
        // fallback
      }
    } else {
      showToast({ type: 'info', title: 'Left Session', message: 'You disconnected from the classroom.' })
    }
    navigate(user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
  }

  const isTeacher = user?.role === 'teacher'
  const classroomTitle = classInfo?.name || 'Live AI Classroom'
  const roomCode = classInfo?.class_code || code?.toUpperCase() || 'ROOM'
  const instructorName = classInfo?.teacher_name || (isTeacher ? user?.name : 'Faculty Instructor')

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden flex-col">
      {/* Top Meeting Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
            <Icons.Brain size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{classroomTitle}</span>
              <Badge variant="purple" size="sm" className="font-mono">{roomCode}</Badge>
            </h1>
            <span className="text-[11px] text-slate-400">{instructorName} • Live Session</span>
          </div>
        </div>

        {/* Live Metrics Summary */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium">
          <span className="text-slate-300">My Attention: <strong className="text-emerald-400">{metrics.attentionScore}%</strong></span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">Confusion: <strong className="text-purple-300">{metrics.confusionScore}%</strong></span>
          <span className="text-slate-600">|</span>
          <Badge variant="live" size="sm" dot>LIVE</Badge>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium"
            title="Toggle Panel"
          >
            {sidebarOpen ? 'Hide Panel' : 'Show Panel'}
          </button>
          <Button variant="danger" size="sm" onClick={handleLeave} leftIcon={<Icons.PhoneOff size={15} />}>
            {isTeacher ? 'End Session' : 'Leave Session'}
          </Button>
        </div>
      </header>

      {/* Main Classroom Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Video Stage Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
          {/* Main Spotlight Tile */}
          <VideoTile
            name={instructorName || 'Instructor'}
            role="teacher"
            attentionScore={isTeacher ? metrics.attentionScore : 98}
            isMuted={false}
            className="md:col-span-2 h-72 md:h-full min-h-[320px]"
          />

          {/* Student Grid */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3 overflow-y-auto">
            {/* Local User Tile */}
            <VideoTile
              name={`${user?.name || 'You'} (Me)`}
              role={user?.role === 'teacher' ? 'teacher' : 'student'}
              attentionScore={metrics.attentionScore}
              confusionScore={metrics.confusionScore}
              isMuted={!isMicOn}
              isCameraOff={!isCameraOn}
              isHandRaised={isHandRaised}
              isLocalUser={true}
              videoRef={videoRef}
              canvasRef={canvasRef}
              className="h-44"
            />

            {/* Real Connected Peer Tiles */}
            {peers.map((p) => (
              <VideoTile
                key={p.id}
                name={p.name}
                role="student"
                attentionScore={p.attentionScore}
                confusionScore={p.confusionScore}
                isHandRaised={p.isHandRaised}
                className="h-44"
              />
            ))}
          </div>
        </div>

        {/* Right Collapsible Drawer (AI Panel / Chat / Roster) */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 340, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="border-l border-slate-800 bg-slate-900 flex flex-col shrink-0 overflow-hidden"
            >
              {/* Drawer Tabs */}
              <div className="flex border-b border-slate-800 bg-slate-950/60">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex-1 py-2.5 text-xs font-medium ${activeTab === 'ai' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
                >
                  AI Panel
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-2.5 text-xs font-medium ${activeTab === 'chat' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
                >
                  Chat ({chatMessages.length})
                </button>
                <button
                  onClick={() => setActiveTab('participants')}
                  className={`flex-1 py-2.5 text-xs font-medium ${activeTab === 'participants' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-400'}`}
                >
                  Roster ({peers.length + 1})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-4 overflow-y-auto text-slate-900">
                {activeTab === 'ai' && (
                  <AIMonitoringPanel
                    metrics={metrics}
                    onStartCalibration={() => aiServiceRef.current?.startCalibration()}
                  />
                )}

                {activeTab === 'chat' && (
                  <div className="flex flex-col h-full justify-between gap-4">
                    <div className="space-y-2.5 overflow-y-auto flex-1">
                      {chatMessages.map((m) => (
                        <div key={m.id} className="text-xs">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`font-semibold ${m.isTeacher ? 'text-blue-400' : 'text-slate-200'}`}>{m.sender}</span>
                            <span className="text-[10px] text-slate-500">{m.time}</span>
                          </div>
                          <p className="text-slate-300 bg-slate-800 p-2.5 rounded-lg border border-slate-700">{m.text}</p>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <Input
                        placeholder="Type message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="text-xs"
                      />
                      <Button variant="primary" size="sm" type="submit">
                        <Icons.Send size={15} />
                      </Button>
                    </form>
                  </div>
                )}

                {activeTab === 'participants' && (
                  <div className="space-y-2">
                    {/* Self */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{user?.name || 'You'} (Me)</span>
                        {isHandRaised && <Icons.Hand className="text-amber-500" size={14} />}
                      </div>
                      <Badge variant={metrics.attentionScore >= 70 ? 'success' : 'danger'} size="sm">
                        {metrics.attentionScore}% Att.
                      </Badge>
                    </div>

                    {/* Connected peers */}
                    {peers.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{s.name}</span>
                          {s.isHandRaised && <Icons.Hand className="text-amber-500" size={14} />}
                        </div>
                        <Badge variant={s.attentionScore >= 70 ? 'success' : 'danger'} size="sm">
                          {s.attentionScore}% Att.
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Control Bar */}
      <footer className="h-14 border-t border-slate-800 bg-slate-900 px-6 flex items-center justify-center gap-3 shrink-0">
        <button
          onClick={() => setIsMicOn(!isMicOn)}
          className={`p-2.5 rounded-lg border transition-colors ${
            isMicOn ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-red-600 text-white border-red-600'
          }`}
          title={isMicOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {isMicOn ? <Icons.Mic size={18} /> : <Icons.MicOff size={18} />}
        </button>

        <button
          onClick={() => {
            const nextState = !isCameraOn
            setIsCameraOn(nextState)
            if (!nextState && aiServiceRef.current) {
              aiServiceRef.current.stop()
            }
          }}
          className={`p-2.5 rounded-lg border transition-colors ${
            isCameraOn ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700' : 'bg-red-600 text-white border-red-600'
          }`}
          title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCameraOn ? <Icons.Video size={18} /> : <Icons.VideoOff size={18} />}
        </button>

        <button
          onClick={() => {
            setIsScreenSharing(!isScreenSharing)
            showToast({ type: 'info', title: 'Screen Share', message: isScreenSharing ? 'Stopped sharing' : 'Started sharing' })
          }}
          className={`p-2.5 rounded-lg border transition-colors ${
            isScreenSharing ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
          }`}
          title="Share Screen"
        >
          <Icons.ScreenShare size={18} />
        </button>

        <button
          onClick={() => {
            setIsHandRaised(!isHandRaised)
            showToast({ type: 'warning', title: 'Hand Raised', message: isHandRaised ? 'Lowered hand' : 'Raised hand' })
          }}
          className={`p-2.5 rounded-lg border transition-colors ${
            isHandRaised ? 'bg-amber-500 text-slate-950 font-bold border-amber-500' : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
          }`}
          title="Raise Hand"
        >
          <Icons.Hand size={18} />
        </button>

        <Button variant="danger" size="sm" className="ml-4" onClick={handleLeave}>
          {isTeacher ? 'End Session' : 'Leave Room'}
        </Button>
      </footer>
    </div>
  )
}