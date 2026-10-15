import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { VideoTile } from './components/VideoTile'
import { AIMonitoringPanel } from './components/AIMonitoringPanel'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { AIDetectorService, AIMetrics } from '@/services/aiDetector'
import { FaceMeshFeatureExtractor } from '@/services/faceMeshExtractor'
import { TemporalFeatureAggregator, MLPredictionResult } from '@/services/temporalAnalyzer'
import { classApi, ClassItem } from '@/services/classApi'
import { communicationApi, ChatMessage } from '@/services/communicationApi'
import { WebRTCService } from '@/services/webRTCService'
import {
  generateTeacherClassroomPDFReport,
  generateStudentPersonalPDFReport,
} from '@/pages/teacher/PDFReportExporter'
import { env } from '@/config/env'

interface PeerStudent {
  id: string
  name: string
  email: string
  role?: string
  attentionScore: number
  confusionScore: number
  isHandRaised: boolean
  isCameraOff: boolean
  isMuted: boolean
  isScreenSharing: boolean
  stream?: MediaStream | null
  connectionStatus: string
  lastSeen: number
}

export default function ClassroomMeetingPage() {
  const { code, classCode } = useParams<{ code?: string; classCode?: string }>()
  const targetCode = (classCode || code || '').trim()
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const { showToast } = useToast()

  const [classInfo, setClassInfo] = useState<ClassItem | null>(null)
  const [peers, setPeers] = useState<PeerStudent[]>([])

  // Media Controls
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isHandRaised, setIsHandRaised] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [canShareScreen, setCanShareScreen] = useState(false)
  const [isOpenScreenShare, setIsOpenScreenShare] = useState(false)

  // Navigation & Drawer
  const [activeTab, setActiveTab] = useState<'ai' | 'chat' | 'participants'>('ai')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  // Real-Time Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isLoadingChat, setIsLoadingChat] = useState(true)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // WebRTC Service & Streams
  const webrtcRef = useRef<WebRTCService | null>(null)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  // Video & AI Element References
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const aiServiceRef = useRef<AIDetectorService | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  // Gates WebRTC offers until local media is available
  const localMediaReadyRef = useRef(false)
  const pendingOffersRef = useRef<string[]>([])

  // AI Telemetry Initialization
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

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin'

  // 1. Fetch Classroom Metadata & Screen Share Policy
  useEffect(() => {
    if (!targetCode) return
    classApi
      .getClassDetails(targetCode)
      .then((data) => setClassInfo(data))
      .catch(() => {
        showToast({
          type: 'info',
          title: 'Live Classroom',
          message: `Connected to room: ${targetCode.toUpperCase()}`,
        })
      })

    // Fetch initial screen share permission
    communicationApi
      .getScreenSharePermission(targetCode)
      .then((perm) => {
        setCanShareScreen(isTeacher || perm.can_share)
        setIsOpenScreenShare(perm.is_open_to_all)
      })
      .catch(() => {
        setCanShareScreen(isTeacher)
      })
  }, [targetCode, isTeacher])

  // 2. Fetch Chat History on Join
  useEffect(() => {
    if (!targetCode) return
    setIsLoadingChat(true)
    communicationApi
      .getMessages(targetCode, 50)
      .then((msgs) => {
        setChatMessages(msgs)
      })
      .catch((err) => {
        console.warn('[MindMap] Chat history fetch failed:', err)
      })
      .finally(() => {
        setIsLoadingChat(false)
      })
  }, [targetCode])

  // Scroll chat to bottom on updates
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, activeTab])

  // Keep fresh ref to user to avoid rebuilding WebRTC & tearing down media tracks on auth updates
  const userRef = useRef(user)
  userRef.current = user

  // 3. Initialize Local Media, WebRTC Service & AI Telemetry Engine
  useEffect(() => {
    let isMounted = true
    const rtc = new WebRTCService()
    webrtcRef.current = rtc
    const aiService = new AIDetectorService()
    aiServiceRef.current = aiService

    rtc.setCallbacks(
      // Send signal via WebSocket
      (targetId, signal) => {
        const currentUser = userRef.current
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && currentUser) {
          wsRef.current.send(
            JSON.stringify({
              type: 'webrtc_signal',
              target_id: targetId,
              sender_id: currentUser.id,
              sender_name: currentUser.name,
              sender_role: currentUser.role,
              signal,
            })
          )
        }
      },
      // On Remote Stream Received
      (peerId, remoteStream) => {
        setPeers((prev) => {
          const exists = prev.some((p) => p.id === peerId)
          if (exists) {
            return prev.map((p) => (p.id === peerId ? { ...p, stream: remoteStream } : p))
          }
          return [
            ...prev,
            {
              id: peerId,
              name: 'Peer',
              email: '',
              role: 'student',
              attentionScore: 85,
              confusionScore: 15,
              isHandRaised: false,
              isCameraOff: false,
              isMuted: false,
              isScreenSharing: false,
              connectionStatus: 'ONLINE',
              stream: remoteStream,
              lastSeen: Date.now(),
            },
          ]
        })
      },
      // On Peer Disconnected
      (peerId) => {
        setPeers((prev) => prev.filter((p) => p.id !== peerId))
      }
    )

      // Acquire camera & microphone and start local media once
      rtc.startLocalMedia().then(async (stream) => {
        if (!isMounted) return
        if (stream) {
          setLocalStream(stream)
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            try {
              await videoRef.current.play()
            } catch {
              // Autoplay handled
            }
          }
        }
        // Mark local media ready and flush deferred offers
        localMediaReadyRef.current = true
        const pending = pendingOffersRef.current.splice(0)
        pending.forEach((peerId) => {
          if (webrtcRef.current) webrtcRef.current.initiateOffer(peerId)
        })
        // Start AI Detection with resilient DOM attachment retry (prevents Windows camera device lock collision)
        const tryStartAI = () => {
          if (!isMounted) return
          const videoEl = videoRef.current
          const canvasEl = canvasRef.current
          if (videoEl) {
            aiService.start(
              videoEl,
              canvasEl,
              (newMetrics) => {
                if (isMounted) {
                  setMetrics(newMetrics)
                }
              },
              stream
            ).catch((err) => {
              console.error('[MindMap AI] Error starting aiService:', err)
            })
          } else {
            setTimeout(tryStartAI, 100)
          }
        }
        tryStartAI()
      })

    return () => {
      isMounted = false
      aiService.stop()
      rtc.cleanup()
    }
  }, [])

  // 5. Connect to Classroom WebSocket Infrastructure with Auto-Reconnect
  useEffect(() => {
    if (!targetCode || !user) return

    let isMounted = true
    let reconnectTimeout: any = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5

    function connectWs() {
      if (!isMounted || !targetCode || !user) return
      let wsUrl = `${env.wsBaseUrl}/${targetCode}`

      // On HTTPS, strictly enforce wss:// to prevent browser SecurityError (Mixed Content)
      if (typeof window !== 'undefined' && window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
        wsUrl = wsUrl.replace(/^ws:\/\//i, 'wss://')
      }

      let ws: WebSocket
      try {
        ws = new WebSocket(wsUrl)
      } catch (err: any) {
        console.warn('[MindMap] WebSocket connection error on', wsUrl, err)
        if (wsUrl.startsWith('ws://')) {
          try {
            ws = new WebSocket(wsUrl.replace(/^ws:\/\//i, 'wss://'))
          } catch (err2) {
            console.error('[MindMap] Secure WebSocket fallback failed:', err2)
            return
          }
        } else {
          return
        }
      }
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttempts = 0
        const token = localStorage.getItem('access_token') || ''
        // Announce identity and join room with token
        ws.send(
          JSON.stringify({
            type: 'join',
            user_id: user.id,
            user_name: user.name,
            user_role: user.role,
            token,
          })
        )
        // Request existing peers already present in the room
        ws.send(
          JSON.stringify({
            type: 'get_peers',
          })
        )
      }

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (!payload || typeof payload !== 'object') return

          const msgType = payload.type

          // A. Real-Time Chat Message
          if (msgType === 'chat_message') {
            setChatMessages((prev) => {
              const exists = prev.some(
                (m) => m.id === payload.id || (payload.temp_id && m.id === payload.temp_id)
              )
              if (exists) return prev
              const newMsg: ChatMessage = {
                id: payload.id || Math.random().toString(),
                class_code: payload.class_code || targetCode,
                sender_id: payload.sender_id || '',
                sender_name: payload.sender_name || 'Anonymous',
                sender_role: payload.sender_role || 'student',
                text: payload.text || '',
                timestamp: payload.timestamp || new Date().toISOString(),
              }
              return [...prev, newMsg]
            })
          }

          // A2. Existing Room Peers List (from get_peers)
          else if (msgType === 'room_peers' && Array.isArray(payload.peers)) {
            payload.peers.forEach((peer: any) => {
              if (!peer.peer_id || peer.peer_id === user.id) return
              setPeers((prev) => {
                const exists = prev.some((p) => p.id === peer.peer_id)
                if (exists) return prev
                return [
                  ...prev,
                  {
                    id: peer.peer_id,
                    name: peer.peer_name || (peer.peer_role === 'teacher' ? 'Instructor' : 'Classmate'),
                    email: '',
                    role: peer.peer_role || 'student',
                    attentionScore: 85,
                    confusionScore: 15,
                    isHandRaised: false,
                    isCameraOff: false,
                    isMuted: false,
                    isScreenSharing: false,
                    connectionStatus: 'ONLINE',
                    lastSeen: Date.now(),
                  },
                ]
              })
              // If teacher, initiate offer to newly found peer — deferred if local media not ready
              if (webrtcRef.current) {
                if (localMediaReadyRef.current) {
                  webrtcRef.current.initiateOffer(peer.peer_id)
                } else {
                  pendingOffersRef.current.push(peer.peer_id)
                }
              }
            })
          }

          // B. Peer Joined Room -> Initiate WebRTC Call
          else if (msgType === 'peer_joined' && payload.peer_id && payload.peer_id !== user.id) {
            setPeers((prev) => {
              const exists = prev.some((p) => p.id === payload.peer_id)
              if (exists) {
                return prev.map((p) =>
                  p.id === payload.peer_id
                    ? { ...p, name: payload.peer_name || p.name, role: payload.peer_role || p.role }
                    : p
                )
              }
              return [
                ...prev,
                {
                  id: payload.peer_id,
                  name: payload.peer_name || (payload.peer_role === 'teacher' ? 'Instructor' : 'Classmate'),
                  email: '',
                  role: payload.peer_role || 'student',
                  attentionScore: 85,
                  confusionScore: 15,
                  isHandRaised: false,
                  isCameraOff: false,
                  isMuted: false,
                  isScreenSharing: false,
                  connectionStatus: 'ONLINE',
                  lastSeen: Date.now(),
                },
              ]
            })

            // As existing participant, initiate WebRTC offer to newcomer (deferred if local media not ready)
            if (webrtcRef.current) {
              if (localMediaReadyRef.current) {
                webrtcRef.current.initiateOffer(payload.peer_id)
              } else {
                pendingOffersRef.current.push(payload.peer_id)
              }
            }
          }

          // C. WebRTC Signaling Dispatch
          else if (msgType === 'webrtc_signal' && payload.target_id === user.id) {
            if (payload.sender_id) {
              setPeers((prev) => {
                const exists = prev.some((p) => p.id === payload.sender_id)
                if (exists) {
                  return prev.map((p) =>
                    p.id === payload.sender_id && payload.sender_name
                      ? { ...p, name: payload.sender_name, role: payload.sender_role || p.role }
                      : p
                  )
                }
                return [
                  ...prev,
                  {
                    id: payload.sender_id,
                    name: payload.sender_name || (payload.sender_role === 'teacher' ? 'Instructor' : 'Classmate'),
                    email: '',
                    role: payload.sender_role || 'student',
                    attentionScore: 85,
                    confusionScore: 15,
                    isHandRaised: false,
                    isCameraOff: false,
                    isMuted: false,
                    isScreenSharing: false,
                    connectionStatus: 'ONLINE',
                    lastSeen: Date.now(),
                  },
                ]
              })
            }
            if (webrtcRef.current && payload.sender_id && payload.signal) {
              webrtcRef.current.handleSignal(payload.sender_id, payload.signal)
            }
          }

          // D. Peer Media Status Change (mic, camera, screen share)
          else if (msgType === 'peer_status' && payload.peer_id && payload.peer_id !== user.id) {
            setPeers((prev) => {
              const exists = prev.some((p) => p.id === payload.peer_id)
              if (!exists) {
                const newPeer: PeerStudent = {
                  id: payload.peer_id,
                  name: payload.peer_name || 'User',
                  email: '',
                  role: payload.peer_role || 'student',
                  attentionScore: 85,
                  confusionScore: 15,
                  isHandRaised: false,
                  isCameraOff: !payload.is_camera_on,
                  isMuted: !payload.is_mic_on,
                  isScreenSharing: !!payload.is_screen_sharing,
                  connectionStatus: 'connected',
                  lastSeen: Date.now(),
                  stream: null,
                }
                return [...prev, newPeer]
              }
              return prev.map((p) =>
                p.id === payload.peer_id
                  ? {
                      ...p,
                      role: payload.peer_role || p.role,
                      isCameraOff: !payload.is_camera_on,
                      isMuted: !payload.is_mic_on,
                      isScreenSharing: !!payload.is_screen_sharing,
                    }
                  : p
              )
            })
          }

          // E. Peer Left Room
          else if (msgType === 'peer_left' && payload.peer_id) {
            if (webrtcRef.current) {
              webrtcRef.current.removePeer(payload.peer_id)
            }
            setPeers((prev) => prev.filter((p) => p.id !== payload.peer_id))
          }

          // F. Screen Share Permission Update
          else if (msgType === 'screen_share_permission') {
            setIsOpenScreenShare(!!payload.is_open_to_all)
            const allowed = Array.isArray(payload.allowed_students) && payload.allowed_students.includes(user.id)
            setCanShareScreen(isTeacher || !!payload.is_open_to_all || allowed)
          }

          // G. Backend Permission Denied Alert
          else if (msgType === 'permission_denied') {
            showToast({
              type: 'danger',
              title: 'Permission Denied',
              message: payload.message || 'Action restricted by the instructor.',
            })
            if (payload.action === 'screen_share') {
              if (webrtcRef.current) {
                webrtcRef.current.stopScreenShare()
              }
              setIsScreenSharing(false)
            }
          }

          // H. Live Attention & Confusion Telemetry
          else if (payload.student_id && payload.student_id !== user.id) {
            setPeers((prev) => {
              const idx = prev.findIndex((p) => p.id === payload.student_id)
              const item: PeerStudent = {
                id: payload.student_id,
                name: payload.student_name || 'Student',
                email: payload.student_email || '',
                role: 'student',
                attentionScore: payload.attention_score ?? 85,
                confusionScore: payload.confusion_score ?? 15,
                isHandRaised: !!payload.is_hand_raised,
                isCameraOff: payload.connection_status === 'CAMERA_MUTED',
                isMuted: false,
                isScreenSharing: false,
                connectionStatus: payload.connection_status || 'ONLINE',
                lastSeen: Date.now(),
              }
              if (idx >= 0) {
                const copy = [...prev]
                copy[idx] = { ...copy[idx], ...item }
                return copy
              } else {
                return [...prev, item]
              }
            })
          }
        } catch {
          // Safe ignore on malformed messages
        }
      }

      ws.onclose = () => {
        if (!isMounted) return
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
          reconnectAttempts++
          reconnectTimeout = setTimeout(connectWs, delay)
        }
      }
    }

    connectWs()

    return () => {
      isMounted = false
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (wsRef.current) wsRef.current.close()
    }
  }, [targetCode, user, isTeacher])

  // Fresh refs for live state to decouple 2s telemetry timer from rapid metrics re-renders
  const metricsRef = useRef(metrics)
  metricsRef.current = metrics
  const isHandRaisedRef = useRef(isHandRaised)
  isHandRaisedRef.current = isHandRaised
  const isCameraOnRef = useRef(isCameraOn)
  isCameraOnRef.current = isCameraOn

  // 6. Emit Periodic Telemetry to WebSocket (every 2 seconds)
  useEffect(() => {
    const timer = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
        const curMetrics = metricsRef.current
        wsRef.current.send(
          JSON.stringify({
            student_id: user.id,
            student_name: user.name,
            student_email: user.email,
            attention_score: curMetrics.attentionScore,
            confusion_score: curMetrics.confusionScore,
            attention_state: curMetrics.mlPrediction.attention_state,
            confusion_state: curMetrics.mlPrediction.confusion_state,
            confidence: curMetrics.mlPrediction.confidence,
            reasons: curMetrics.mlPrediction.reasons,
            indicators: curMetrics.behaviouralIndicators,
            is_hand_raised: isHandRaisedRef.current,
            connection_status: isCameraOnRef.current ? 'ONLINE' : 'CAMERA_MUTED',
            timestamp_ms: Date.now(),
          })
        )
      }
    }, 2000)

    return () => clearInterval(timer)
  }, [user])

  // 7. Chat Send Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const text = newMessage.trim()
    if (!text || !user) return

    if (text.length > 1000) {
      showToast({ type: 'warning', title: 'Message too long', message: 'Maximum 1000 characters allowed.' })
      return
    }

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    // Emit over WebSocket if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'chat_message',
          sender_id: user.id,
          sender_name: user.name,
          sender_role: user.role,
          text,
          temp_id: tempId,
        })
      )
    } else {
      // Fallback to REST API
      try {
        const sent = await communicationApi.sendMessage(targetCode, text)
        setChatMessages((prev) => [...prev, sent])
      } catch (err: any) {
        showToast({ type: 'danger', title: 'Send Failed', message: err.message || 'Unable to deliver message.' })
        return
      }
    }

    setNewMessage('')
  }

  // Handle keyboard submit in chat (Enter to send, Shift+Enter for new line)
  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // 8. Media Toggle Handlers
  const handleToggleMic = () => {
    const nextState = !isMicOn
    setIsMicOn(nextState)
    if (webrtcRef.current) {
      webrtcRef.current.toggleAudio(nextState)
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(
        JSON.stringify({
          type: 'peer_status',
          peer_id: user.id,
          peer_name: user.name,
          peer_role: user.role,
          user_role: user.role,
          is_camera_on: isCameraOn,
          is_mic_on: nextState,
          is_screen_sharing: isScreenSharing,
        })
      )
    }
  }

  const handleToggleCamera = () => {
    const nextState = !isCameraOn
    setIsCameraOn(nextState)
    if (webrtcRef.current) {
      webrtcRef.current.toggleVideo(nextState)
    }
    if (!nextState && aiServiceRef.current) {
      aiServiceRef.current.stop()
    } else if (nextState && aiServiceRef.current && videoRef.current) {
      aiServiceRef.current.start(
        videoRef.current,
        canvasRef.current,
        (newMetrics) => {
          setMetrics(newMetrics)
        },
        localStream
      ).catch((err) => {
        console.error('[MindMap AI] Error restarting AI on camera toggle:', err)
      })
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
      wsRef.current.send(
        JSON.stringify({
          type: 'peer_status',
          peer_id: user.id,
          peer_name: user.name,
          peer_role: user.role,
          user_role: user.role,
          is_camera_on: nextState,
          is_mic_on: isMicOn,
          is_screen_sharing: isScreenSharing,
        })
      )
    }
  }

  // 9. Screen Sharing Handlers
  const handleToggleScreenShare = async () => {
    if (!webrtcRef.current) return

    if (isScreenSharing) {
      // Stop screen share
      webrtcRef.current.stopScreenShare()
      setIsScreenSharing(false)
      showToast({ type: 'info', title: 'Screen Share Ended', message: 'You stopped presenting your screen.' })

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
        wsRef.current.send(
          JSON.stringify({
            type: 'peer_status',
            peer_id: user.id,
            peer_name: user.name,
            peer_role: user.role,
            user_role: user.role,
            is_camera_on: isCameraOn,
            is_mic_on: isMicOn,
            is_screen_sharing: false,
          })
        )
      }
    } else {
      // Check permissions
      if (!isTeacher && !canShareScreen) {
        showToast({
          type: 'warning',
          title: 'Permission Required',
          message: 'The instructor has not enabled student screen sharing for this class.',
        })
        return
      }

      try {
        await webrtcRef.current.startScreenShare(() => {
          setIsScreenSharing(false)
          showToast({ type: 'info', title: 'Screen Share Stopped', message: 'Display capture ended.' })
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
            wsRef.current.send(
              JSON.stringify({
                type: 'peer_status',
                peer_id: user.id,
                peer_name: user.name,
                peer_role: user.role,
                user_role: user.role,
                is_camera_on: isCameraOn,
                is_mic_on: isMicOn,
                is_screen_sharing: false,
              })
            )
          }
        })
        setIsScreenSharing(true)
        showToast({ type: 'success', title: 'Screen Share Active', message: 'Now sharing your screen with the class.' })

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
          wsRef.current.send(
            JSON.stringify({
              type: 'peer_status',
              peer_id: user.id,
              peer_name: user.name,
              peer_role: user.role,
              user_role: user.role,
              is_camera_on: isCameraOn,
              is_mic_on: isMicOn,
              is_screen_sharing: true,
            })
          )
        }
      } catch (err: any) {
        showToast({ type: 'danger', title: 'Screen Share Failed', message: err.message || 'Could not start screen capture.' })
      }
    }
  }

  // Teacher Screen Sharing Permission Toggles
  const handleTeacherToggleScreenPolicy = async () => {
    if (!isTeacher) return
    const nextState = !isOpenScreenShare
    try {
      await communicationApi.updateScreenSharePermission(targetCode, {
        is_open_to_all: nextState,
      })
      setIsOpenScreenShare(nextState)
      showToast({
        type: 'info',
        title: 'Screen Sharing Policy',
        message: nextState ? 'All students can now share their screens.' : 'Student screen sharing is now restricted.',
      })
    } catch {
      showToast({ type: 'danger', title: 'Update Failed', message: 'Unable to update screen sharing policy.' })
    }
  }

  // 10. PDF Report Download Handler
  const handleDownloadReport = async () => {
    try {
      setIsGeneratingReport(true)
      const data = await communicationApi.getReportData(targetCode)

      if (isTeacher) {
        generateTeacherClassroomPDFReport(data as any)
      } else {
        generateStudentPersonalPDFReport(data as any)
      }

      showToast({
        type: 'success',
        title: 'PDF Report Downloaded',
        message: 'Your official MindMap academic audit report has been saved.',
      })
    } catch (err: any) {
      showToast({
        type: 'danger',
        title: 'Report Generation Failed',
        message: err.message || 'Could not retrieve report data.',
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  // 11. Leave Classroom
  const handleLeave = async () => {
    if (webrtcRef.current) {
      webrtcRef.current.cleanup()
    }
    if (aiServiceRef.current) {
      aiServiceRef.current.stop()
    }

    if (isTeacher && classInfo) {
      try {
        await classApi.endClass(classInfo.id)
        showToast({ type: 'info', title: 'Class Ended', message: 'You concluded the live session.' })
      } catch {
        // continue
      }
    } else {
      showToast({ type: 'info', title: 'Left Session', message: 'You disconnected from the classroom.' })
    }
    navigate(isTeacher ? '/teacher/dashboard' : '/student/dashboard')
  }

  const classroomTitle = classInfo?.name || 'Live AI Classroom'
  const roomCode = classInfo?.class_code || targetCode.toUpperCase() || 'ROOM'
  const instructorName = classInfo?.teacher_name || (isTeacher ? user?.name : 'Faculty Instructor')

  // Main stage spotlight determination:
  // 1. Any peer currently sharing screen
  // 2. Instructor / Teacher peer (from WebRTC peers list)
  // 3. Current user (if teacher presenting or instructor self-view)
  const screenPresenter = peers.find((p) => p.isScreenSharing)
  const teacherPeer = peers.find((p) => p.role === 'teacher' || p.role === 'admin')
  const spotlightPeer = screenPresenter || (!isTeacher ? teacherPeer : null)

  const spotlightProps = isTeacher
    ? isScreenSharing
      ? {
          peerId: user?.id,
          name: `${user?.name || 'You'} (Presenting Screen)`,
          role: 'teacher' as const,
          attentionScore: metrics.attentionScore,
          confusionScore: metrics.confusionScore,
          isMuted: !isMicOn,
          isCameraOff: false,
          isScreenSharing: true,
          stream: webrtcRef.current?.getLocalStream() || localStream,
        }
      : screenPresenter
      ? {
          peerId: screenPresenter.id,
          name: `${screenPresenter.name} (Screen Share)`,
          role: (screenPresenter.role === 'teacher' ? 'teacher' : 'student') as 'teacher' | 'student',
          attentionScore: screenPresenter.attentionScore,
          confusionScore: screenPresenter.confusionScore,
          isMuted: screenPresenter.isMuted,
          isCameraOff: screenPresenter.isCameraOff,
          isScreenSharing: true,
          stream: screenPresenter.stream,
        }
      : {
          peerId: user?.id,
          name: `${user?.name || 'Instructor'} (You)`,
          role: 'teacher' as const,
          attentionScore: metrics.attentionScore,
          confusionScore: metrics.confusionScore,
          isMuted: !isMicOn,
          isCameraOff: !isCameraOn,
          isScreenSharing: false,
          stream: localStream,
        }
    : spotlightPeer
    ? {
        peerId: spotlightPeer.id,
        name: spotlightPeer.name,
        role: (spotlightPeer.role === 'teacher' ? 'teacher' : 'student') as 'teacher' | 'student',
        attentionScore: spotlightPeer.attentionScore,
        confusionScore: spotlightPeer.confusionScore,
        isMuted: spotlightPeer.isMuted,
        isCameraOff: spotlightPeer.isScreenSharing ? false : (spotlightPeer.isCameraOff || !spotlightPeer.stream),
        isScreenSharing: spotlightPeer.isScreenSharing,
        stream: spotlightPeer.stream,
      }
    : {
        peerId: undefined,
        name: instructorName || 'Instructor',
        role: 'teacher' as const,
        attentionScore: 98,
        confusionScore: 10,
        isMuted: false,
        isCameraOff: true, // Displays instructor avatar with status instead of a black video tile!
        isScreenSharing: false,
        stream: null,
      }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden flex-col">
      {/* Active Screen Sharing Alert Banner */}
      {isScreenSharing && (
        <div className="bg-emerald-600 px-4 py-1.5 text-xs text-white flex items-center justify-between font-medium z-30 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span>You are currently presenting your screen to the classroom.</span>
          </div>
          <button
            onClick={handleToggleScreenShare}
            className="bg-emerald-800 hover:bg-emerald-900 px-2.5 py-0.5 rounded text-[11px] font-bold"
          >
            Stop Sharing
          </button>
        </div>
      )}

      {/* Top Meeting Header */}
      <header className="h-14 border-b border-slate-800 bg-slate-900 px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
            <Icons.Brain size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{classroomTitle}</span>
              <Badge variant="purple" size="sm" className="font-mono">
                {roomCode}
              </Badge>
            </h1>
            <span className="text-[11px] text-slate-400">{instructorName} • Live Session</span>
          </div>
        </div>

        {/* Live Metrics Summary */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-medium">
          <span className="text-slate-300">
            My Attention: <strong className="text-emerald-400">{metrics.attentionScore}%</strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300">
            Confusion: <strong className="text-purple-300">{metrics.confusionScore}%</strong>
          </span>
          <span className="text-slate-600">|</span>
          <Badge variant="live" size="sm" dot>
            LIVE
          </Badge>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Download PDF Report */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadReport}
            isLoading={isGeneratingReport}
            leftIcon={<Icons.Download size={14} />}
            className="text-xs"
          >
            PDF Report
          </Button>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium"
            title="Toggle Panel"
          >
            {sidebarOpen ? 'Hide Panel' : 'Show Panel'}
          </button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleLeave}
            leftIcon={<Icons.PhoneOff size={15} />}
          >
            {isTeacher ? 'End Session' : 'Leave'}
          </Button>
        </div>
      </header>

      {/* Main Classroom Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Video Stage Grid */}
        <div className="flex-1 p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto">
          {/* Main Spotlight Tile (Instructor / Screen Presenter) */}
          <VideoTile
            name={spotlightProps.name}
            role={spotlightProps.role}
            attentionScore={spotlightProps.attentionScore}
            confusionScore={spotlightProps.confusionScore}
            isMuted={spotlightProps.isMuted}
            isCameraOff={spotlightProps.isCameraOff}
            isScreenSharing={spotlightProps.isScreenSharing}
            stream={spotlightProps.stream}
            className="md:col-span-2 h-72 md:h-full min-h-[320px]"
          />

          {/* Connected Classroom Members Grid */}
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3 overflow-y-auto">
            {/* Local User Tile */}
            <VideoTile
              name={`${user?.name || 'You'} (Me)`}
              role={isTeacher ? 'teacher' : 'student'}
              attentionScore={metrics.attentionScore}
              confusionScore={metrics.confusionScore}
              isMuted={!isMicOn}
              isCameraOff={!isCameraOn}
              isHandRaised={isHandRaised}
              isScreenSharing={isScreenSharing}
              isLocalUser={true}
              stream={localStream}
              videoRef={videoRef}
              canvasRef={canvasRef}
              className="h-44"
            />

            {/* Real Connected Peer Tiles (Excluding the Spotlighted Peer) */}
            {peers
              .filter((p) => p.id !== spotlightProps.peerId)
              .map((p) => (
                <VideoTile
                  key={p.id}
                  name={p.name}
                  role={p.role === 'teacher' ? 'teacher' : 'student'}
                  attentionScore={p.attentionScore}
                  confusionScore={p.confusionScore}
                  isHandRaised={p.isHandRaised}
                  isMuted={p.isMuted}
                  isCameraOff={p.isCameraOff}
                  isScreenSharing={p.isScreenSharing}
                  stream={p.stream}
                  className="h-44"
                />
              ))}
          </div>
        </div>

        {/* Right Collapsible Drawer (AI Panel / Real-Time Chat / Roster) */}
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
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === 'ai'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  AI Panel
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === 'chat'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Chat ({chatMessages.length})
                </button>
                <button
                  onClick={() => setActiveTab('participants')}
                  className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                    activeTab === 'participants'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Roster ({peers.length + 1})
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-1 p-3.5 overflow-y-auto">
                {/* 1. AI TELEMETRY PANEL */}
                {activeTab === 'ai' && (
                  <div className="text-slate-900">
                    <AIMonitoringPanel
                      metrics={metrics}
                      onStartCalibration={() => aiServiceRef.current?.startCalibration()}
                    />
                  </div>
                )}

                {/* 2. REAL-TIME CHAT PANEL */}
                {activeTab === 'chat' && (
                  <div className="flex flex-col h-full justify-between gap-3">
                    {/* Chat Messages List */}
                    <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                      {isLoadingChat ? (
                        <div className="text-center py-8 text-xs text-slate-400">Loading messages...</div>
                      ) : chatMessages.length === 0 ? (
                        <div className="text-center py-10 px-4 text-xs text-slate-500">
                          <Icons.MessageSquare className="mx-auto mb-2 opacity-50" size={24} />
                          <p className="font-medium text-slate-400">No messages yet</p>
                          <p className="mt-1">Send a message to start classroom discussion.</p>
                        </div>
                      ) : (
                        chatMessages.map((m) => {
                          const isMe = m.sender_id === user?.id
                          const isSenderTeacher = m.sender_role === 'teacher' || m.sender_role === 'admin'
                          return (
                            <div
                              key={m.id}
                              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1.5 mb-1 px-1">
                                <span
                                  className={`text-[11px] font-semibold ${
                                    isSenderTeacher ? 'text-amber-400' : isMe ? 'text-blue-400' : 'text-slate-300'
                                  }`}
                                >
                                  {isMe ? 'You' : m.sender_name}
                                </span>
                                {isSenderTeacher && (
                                  <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1 rounded font-medium">
                                    Teacher
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500">
                                  {new Date(m.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div
                                className={`p-2.5 rounded-xl text-xs max-w-[88%] break-words whitespace-pre-wrap ${
                                  isMe
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-tl-none'
                                }`}
                              >
                                {m.text}
                              </div>
                            </div>
                          )
                        })
                      )}
                      <div ref={chatBottomRef} />
                    </div>

                    {/* Chat Input Box */}
                    <form onSubmit={handleSendMessage} className="flex flex-col gap-1.5 pt-2 border-t border-slate-800">
                      <div className="flex gap-2 items-center">
                        <textarea
                          placeholder="Type message... (Enter to send, Shift+Enter for new line)"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={handleChatKeyDown}
                          rows={2}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 resize-none"
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          type="submit"
                          disabled={!newMessage.trim()}
                          className="h-full px-3"
                        >
                          <Icons.Send size={15} />
                        </Button>
                      </div>
                      <span className="text-[10px] text-slate-500 text-right">
                        {newMessage.length}/1000
                      </span>
                    </form>
                  </div>
                )}

                {/* 3. PARTICIPANTS / ROSTER PANEL */}
                {activeTab === 'participants' && (
                  <div className="space-y-3">
                    {/* Teacher Screen Sharing Permission Control Card */}
                    {isTeacher && (
                      <div className="p-3 rounded-lg bg-slate-850 border border-slate-800 text-xs mb-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200">Allow Student Screen Sharing</span>
                          <button
                            onClick={handleTeacherToggleScreenPolicy}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                              isOpenScreenShare ? 'bg-blue-600' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                isOpenScreenShare ? 'translate-x-4' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {isOpenScreenShare
                            ? 'All students in this room are currently permitted to share screen.'
                            : 'Students must be authorized by teacher to present.'}
                        </p>
                      </div>
                    )}

                    {/* Self Roster Card */}
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <div>
                          <span className="font-semibold text-white">{user?.name || 'You'} (Me)</span>
                          <span className="text-[10px] text-slate-400 block">{user?.role}</span>
                        </div>
                        {isHandRaised && <Icons.Hand className="text-amber-500" size={14} />}
                        {isScreenSharing && (
                          <span className="text-[9px] bg-emerald-600/80 px-1 py-0.2 rounded text-white">
                            Sharing
                          </span>
                        )}
                      </div>
                      <Badge variant={metrics.attentionScore >= 70 ? 'success' : 'danger'} size="sm">
                        {metrics.attentionScore}% Att.
                      </Badge>
                    </div>

                    {/* Connected Classmates */}
                    {peers.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800 border border-slate-700 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              s.isCameraOff ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          <div>
                            <span className="font-semibold text-white">{s.name}</span>
                            <span className="text-[10px] text-slate-400 block">{s.role || 'Student'}</span>
                          </div>
                          {s.isHandRaised && <Icons.Hand className="text-amber-500" size={14} />}
                          {s.isScreenSharing && (
                            <span className="text-[9px] bg-emerald-600/80 px-1 py-0.2 rounded text-white">
                              Sharing
                            </span>
                          )}
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
        {/* Mic Toggle */}
        <button
          onClick={handleToggleMic}
          className={`p-2.5 rounded-lg border transition-colors ${
            isMicOn
              ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
              : 'bg-red-600 text-white border-red-600'
          }`}
          title={isMicOn ? 'Mute Microphone' : 'Unmute Microphone'}
        >
          {isMicOn ? <Icons.Mic size={18} /> : <Icons.MicOff size={18} />}
        </button>

        {/* Camera Toggle */}
        <button
          onClick={handleToggleCamera}
          className={`p-2.5 rounded-lg border transition-colors ${
            isCameraOn
              ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
              : 'bg-red-600 text-white border-red-600'
          }`}
          title={isCameraOn ? 'Turn Off Camera' : 'Turn On Camera'}
        >
          {isCameraOn ? <Icons.Video size={18} /> : <Icons.VideoOff size={18} />}
        </button>

        {/* Screen Share Toggle */}
        <button
          onClick={handleToggleScreenShare}
          className={`p-2.5 rounded-lg border transition-colors ${
            isScreenSharing
              ? 'bg-emerald-600 text-white border-emerald-600 ring-2 ring-emerald-400'
              : canShareScreen
              ? 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
              : 'bg-slate-850 border-slate-800 text-slate-500 cursor-not-allowed'
          }`}
          title={
            isScreenSharing
              ? 'Stop Sharing Screen'
              : canShareScreen
              ? 'Share Screen'
              : 'Screen sharing requires teacher permission'
          }
        >
          <Icons.ScreenShare size={18} />
        </button>

        {/* Raise Hand Toggle */}
        <button
          onClick={() => {
            const next = !isHandRaised
            setIsHandRaised(next)
            showToast({
              type: 'warning',
              title: 'Hand Raised',
              message: next ? 'You raised your hand.' : 'You lowered your hand.',
            })
          }}
          className={`p-2.5 rounded-lg border transition-colors ${
            isHandRaised
              ? 'bg-amber-500 text-slate-950 font-bold border-amber-500'
              : 'bg-slate-800 border-slate-700 text-white hover:bg-slate-700'
          }`}
          title="Raise Hand"
        >
          <Icons.Hand size={18} />
        </button>

        {/* Leave Session */}
        <Button variant="danger" size="sm" className="ml-4" onClick={handleLeave}>
          {isTeacher ? 'End Session' : 'Leave Room'}
        </Button>
      </footer>
    </div>
  )
}