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

export default function ClassroomMeetingPage() {
  const { code } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { showToast } = useToast()

  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [activeTab, setActiveTab] = useState<'ai' | 'chat' | 'participants'>('ai')
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Chat state
  const [chatMessages, setChatMessages] = useState([
    { id: '1', sender: 'Prof. Vance', text: 'Welcome everyone! Today we discuss wave functions.', time: '10:01 AM', isTeacher: true },
    { id: '2', sender: 'Alex Johnson', text: 'Does this apply to multi-electron atoms?', time: '10:04 AM', isTeacher: false },
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
      'Stable screen gaze (92% center focus)',
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

  const handleLeave = () => {
    showToast({ type: 'info', title: 'Left Session', message: 'You disconnected from the classroom.' })
    navigate(user?.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard')
  }

  const studentsList = [
    { name: user?.name || 'Alex Johnson (You)', attention: metrics.attentionScore, confusion: metrics.confusionScore, hand: isHandRaised },
    { name: 'Sarah Miller', attention: 88, confusion: 12, hand: false },
    { name: 'David Clark', attention: 42, confusion: 65, hand: true },
    { name: 'Emma Watson', attention: 96, confusion: 4, hand: false },
    { name: 'Liam Brown', attention: 78, confusion: 20, hand: false },
  ]

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
              <span>Quantum Physics 101</span>
              <Badge variant="info" size="sm">{code?.toUpperCase() || 'QUANTUM-101'}</Badge>
            </h1>
            <span className="text-[11px] text-slate-400">Prof. Robert Vance • Live Classroom Session</span>
          </div>
        </div>

        {/* Live Metrics Summary */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium">
          <span className="text-slate-300">Class Attention: <strong className="text-emerald-400">{metrics.attentionScore}%</strong></span>
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
            Leave Session
          </Button>
        </div>
      </header>

      {/* Main Classroom Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Video Stage Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
          {/* Main Teacher Spotlight Tile */}
          <VideoTile
            name="Prof. Robert Vance"
            role="teacher"
            attentionScore={98}
            isMuted={false}
            className="md:col-span-2 h-72 md:h-full min-h-[320px]"
          />

          {/* Student Grid */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3 overflow-y-auto">
            <VideoTile
              name={user?.name || 'Alex Johnson'}
              role="student"
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
            <VideoTile name="Sarah Miller" role="student" attentionScore={88} confusionScore={12} className="h-44" />
            <VideoTile name="David Clark" role="student" attentionScore={42} confusionScore={65} isHandRaised={true} className="h-44" />
            <VideoTile name="Emma Watson" role="student" attentionScore={96} confusionScore={4} className="h-44" />
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
                  Roster ({studentsList.length})
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
                    {studentsList.map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{s.name}</span>
                          {s.hand && <Icons.Hand className="text-amber-500" size={14} />}
                        </div>
                        <Badge variant={s.attention >= 70 ? 'success' : 'danger'} size="sm">
                          {s.attention}% Att.
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
          End Session
        </Button>
      </footer>
    </div>
  )
}