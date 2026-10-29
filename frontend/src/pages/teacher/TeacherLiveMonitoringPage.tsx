import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { classApi, ClassItem } from '@/services/classApi'
import { communicationApi, ClassReportData } from '@/services/communicationApi'
import { WebRTCService } from '@/services/webRTCService'
import { VideoTile } from '@/pages/classroom/components/VideoTile'
import { generateTeacherClassroomPDFReport } from './PDFReportExporter'
import { useAuthContext } from '@/context/AuthContext'
import { env } from '@/config/env'
import { useToast } from '@/components/ui/Toast'

interface LiveStudent {
  id: string
  name: string
  email: string
  attention: number
  confusion: number
  cameraActive: boolean
  lastSeen: Date
  indicator?: string
}

interface PeerStudent {
  id: string
  name: string
  email: string
  stream?: MediaStream
  isCameraOff: boolean
  isMuted: boolean
  isScreenSharing: boolean
  attentionScore: number
  confusionScore: number
  lastSeen: number
}

export default function TeacherLiveMonitoringPage() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { user } = useAuthContext()

  const [classData, setClassData] = useState<ClassItem | null>(null)
  const [liveStudents, setLiveStudents] = useState<LiveStudent[]>([])
  const [peers, setPeers] = useState<PeerStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEnding, setIsEnding] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Media & Screen Sharing State (Teacher uses Screen Sharing and Mic only — No camera)
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [displayStream, setDisplayStream] = useState<MediaStream | null>(null)
  const [isMicOn, setIsMicOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isOpenScreenShare, setIsOpenScreenShare] = useState(false)
  const [isUpdatingPermission, setIsUpdatingPermission] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const webrtcRef = useRef<WebRTCService | null>(null)
  // Tracks whether local media is ready so WebRTC offers are not sent prematurely
  const localMediaReadyRef = useRef(false)
  // Buffer of peer IDs that need an offer once local media is ready
  const pendingOffersRef = useRef<string[]>([])

  useEffect(() => {
    if (classId) {
      initSession(classId)
    }
    return () => {
      if (webrtcRef.current) {
        webrtcRef.current.cleanup()
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [classId])

  // Periodic background telemetry sync with MongoDB Atlas (every 3.5s)
  // Ensures scores and attendance continuously update even during brief WebSocket re-negotiations
  useEffect(() => {
    if (!classId) return
    const syncTimer = setInterval(async () => {
      try {
        const roster = await classApi.getClassStudents(classId)
        if (Array.isArray(roster) && roster.length > 0) {
          setLiveStudents((prev) => {
            return roster.map((s) => {
              const existing = prev.find(
                (p) =>
                  p.id === s.student_id ||
                  (s.email && p.email && p.email.toLowerCase().trim() === s.email.toLowerCase().trim()) ||
                  (s.name && p.name && p.name.toLowerCase().trim() === s.name.toLowerCase().trim())
              )
              const hasOnline = s.connection_status === 'ONLINE' || (existing?.cameraActive ?? false)
              return {
                id: s.student_id,
                name: s.name,
                email: s.email,
                attention: s.avg_attention > 0 ? Math.round(s.avg_attention) : (existing?.attention ?? 85),
                confusion: s.avg_confusion > 0 ? Math.round(s.avg_confusion) : (existing?.confusion ?? 15),
                cameraActive: hasOnline,
                lastSeen: existing?.lastSeen || new Date(),
                indicator: existing?.indicator,
              }
            })
          })
        }
      } catch {
        // silent sync
      }
    }, 3500)

    return () => clearInterval(syncTimer)
  }, [classId])

  const initSession = async (id: string) => {
    try {
      setIsLoading(true)
      const details = await classApi.getClassDetails(id)
      setClassData(details)

      // Pre-populate with enrolled students if any
      const roster = await classApi.getClassStudents(id)
      const initialList: LiveStudent[] = roster.map((s) => ({
        id: s.student_id,
        name: s.name,
        email: s.email,
        attention: s.avg_attention > 0 ? s.avg_attention : 85,
        confusion: s.avg_confusion > 0 ? s.avg_confusion : 15,
        cameraActive: s.connection_status === 'ONLINE',
        lastSeen: new Date(),
      }))
      setLiveStudents(initialList)

      // Fetch initial screen share permission
      try {
        const perm = await communicationApi.getScreenSharePermission(details.class_code)
        setIsOpenScreenShare(perm.is_open_to_all)
      } catch {
        setIsOpenScreenShare(false)
      }

      // Initialize WebRTC Manager
      initWebRTC()

      // Connect to classroom WebSocket room
      connectWebSocket(details.class_code)
    } catch (err: any) {
      showToast({ type: 'danger', title: 'Session Error', message: err.message || 'Failed to initialize session' })
    } finally {
      setIsLoading(false)
    }
  }

  // 1. Initialize WebRTC Media & Event Routing
  // Teacher uses screen-share only — no camera acquisition needed here.
  const initWebRTC = () => {
    const rtc = new WebRTCService()
    webrtcRef.current = rtc

    rtc.setCallbacks(
      // Send signal via WebSocket
      (targetId, signal) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
          wsRef.current.send(
            JSON.stringify({
              type: 'webrtc_signal',
              target_id: targetId,
              sender_id: user.id,
              sender_name: user.name,
              sender_role: 'teacher',
              signal,
            })
          )
        }
      },
      // On Remote Stream Received (Student Video & Audio)
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
              name: 'Student',
              email: '',
              attentionScore: 85,
              confusionScore: 15,
              isCameraOff: false,
              isMuted: false,
              isScreenSharing: false,
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

    // Teacher acquires microphone audio only (no camera) — screen share is added on demand.
    // This avoids a camera permission prompt and the camera device being locked.
    navigator.mediaDevices
      .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false })
      .then((audioStream) => {
        setLocalStream(audioStream)
        // Mark local media as ready so WebRTC offers to students can proceed
        localMediaReadyRef.current = true
        const pending = pendingOffersRef.current.splice(0)
        pending.forEach((peerId) => {
          if (webrtcRef.current) webrtcRef.current.initiateOffer(peerId)
        })
      })
      .catch(() => {
        // Even if mic is denied, mark ready so WebRTC signaling still works
        // (teacher can still receive student streams and share screen)
        localMediaReadyRef.current = true
        const pending = pendingOffersRef.current.splice(0)
        pending.forEach((peerId) => {
          if (webrtcRef.current) webrtcRef.current.initiateOffer(peerId)
        })
      })
  }

  // 2. Connect to Classroom WebSocket Infrastructure with auto-reconnect
  const connectWebSocket = (roomCode: string) => {
    let isMountedWs = true
    let reconnectAttempts = 0
    const maxReconnectAttempts = 8

    function connectWsInner() {
      if (!isMountedWs) return
      try {
        let wsUrl = `${env.wsBaseUrl}/${encodeURIComponent(roomCode.trim())}`
        if (typeof window !== 'undefined' && window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
          wsUrl = wsUrl.replace(/^ws:\/\//i, 'wss://')
        }

        let ws: WebSocket
        try {
          ws = new WebSocket(wsUrl)
        } catch (innerErr) {
          if (wsUrl.startsWith('ws://')) {
            ws = new WebSocket(wsUrl.replace(/^ws:\/\//i, 'wss://'))
          } else {
            throw innerErr
          }
        }
        wsRef.current = ws

        ws.onopen = () => {
          reconnectAttempts = 0
          setIsConnected(true)
          const token = localStorage.getItem('access_token') || ''
          ws.send(
            JSON.stringify({
              type: 'join',
              user_id: user?.id,
              user_name: user?.name || 'Instructor',
              user_role: 'teacher',
              token,
            })
          )
          // Request existing peers in room
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

          // A1. Room Peers List (from get_peers) -> Initiate WebRTC offers to all present students
          if (msgType === 'room_peers' && Array.isArray(payload.peers)) {
            payload.peers.forEach((peer: any) => {
              if (!peer.peer_id || peer.peer_id === user?.id) return
              setPeers((prev) => {
                const exists = prev.some((p) => p.id === peer.peer_id)
                if (exists) return prev
                return [
                  ...prev,
                  {
                    id: peer.peer_id,
                    name: peer.peer_name || 'Student',
                    email: '',
                    attentionScore: 85,
                    confusionScore: 15,
                    isCameraOff: false,
                    isMuted: false,
                    isScreenSharing: false,
                    lastSeen: Date.now(),
                  },
                ]
              })
              // Only initiate offer once local media is ready to avoid sending an empty SDP
              if (localMediaReadyRef.current && webrtcRef.current) {
                webrtcRef.current.initiateOffer(peer.peer_id)
              } else {
                pendingOffersRef.current.push(peer.peer_id)
              }
            })
          }

          // A2. Student Joined Classroom -> Teacher Initiates WebRTC Offer
          else if (msgType === 'peer_joined' && payload.peer_id && payload.peer_id !== user?.id) {
            setPeers((prev) => {
              const exists = prev.some((p) => p.id === payload.peer_id)
              if (exists) {
                return prev.map((p) =>
                  p.id === payload.peer_id ? { ...p, name: payload.peer_name || p.name } : p
                )
              }
              return [
                ...prev,
                {
                  id: payload.peer_id,
                  name: payload.peer_name || 'Student',
                  email: '',
                  attentionScore: 85,
                  confusionScore: 15,
                  isCameraOff: false,
                  isMuted: false,
                  isScreenSharing: false,
                  lastSeen: Date.now(),
                },
              ]
            })

            // Teacher as existing participant initiates WebRTC mesh call (deferred if local media not ready)
            if (localMediaReadyRef.current && webrtcRef.current) {
              webrtcRef.current.initiateOffer(payload.peer_id)
            } else {
              pendingOffersRef.current.push(payload.peer_id)
            }
          }

          // B. WebRTC Signaling Dispatch (Answer / Candidate from Student)
          else if (msgType === 'webrtc_signal' && payload.target_id === user?.id) {
            if (payload.sender_id) {
              setPeers((prev) => {
                const exists = prev.some((p) => p.id === payload.sender_id)
                if (exists) return prev
                return [
                  ...prev,
                  {
                    id: payload.sender_id,
                    name: payload.sender_name || 'Student',
                    email: '',
                    attentionScore: 85,
                    confusionScore: 15,
                    isCameraOff: false,
                    isMuted: false,
                    isScreenSharing: false,
                    lastSeen: Date.now(),
                  },
                ]
              })
            }
            if (webrtcRef.current && payload.sender_id && payload.signal) {
              webrtcRef.current.handleSignal(payload.sender_id, payload.signal)
            }
          }

          // C. Peer Status Update (Mic, Camera, Screen Share)
          else if (msgType === 'peer_status' && payload.peer_id && payload.peer_id !== user?.id) {
            setPeers((prev) =>
              prev.map((p) =>
                p.id === payload.peer_id
                  ? {
                      ...p,
                      isCameraOff: !payload.is_camera_on,
                      isMuted: !payload.is_mic_on,
                      isScreenSharing: !!payload.is_screen_sharing,
                    }
                  : p
              )
            )
          }

          // D. Peer Left Room
          else if (msgType === 'peer_left' && payload.peer_id) {
            if (webrtcRef.current) {
              webrtcRef.current.removePeer(payload.peer_id)
            }
            setPeers((prev) => prev.filter((p) => p.id !== payload.peer_id))
          }

          // E. Screen Share Policy Update
          else if (msgType === 'screen_share_permission') {
            setIsOpenScreenShare(!!payload.is_open_to_all)
          }

          // F. Student AI Telemetry Stream
          // Matches payloads with type='telemetry' OR containing student_id/attention fields
          if (
            payload.student_id ||
            payload.type === 'telemetry' ||
            payload.attention !== undefined ||
            payload.attention_score !== undefined
          ) {
            const studentId = String(payload.student_id || payload.peer_id || '').trim()
            const studentName = String(payload.student_name || payload.user_name || '').trim()
            const studentEmail = String(payload.student_email || payload.email || '').trim().toLowerCase()

            const attRaw = payload.attention_score ?? payload.attention
            const confRaw = payload.confusion_score ?? payload.confusion

            const attVal = attRaw !== undefined ? Math.round(Number(attRaw)) : 85
            const confVal = confRaw !== undefined ? Math.round(Number(confRaw)) : 15

            const isCamActive =
              payload.camera_active === true ||
              payload.connection_status === 'ONLINE' ||
              (payload.camera_active !== false && payload.connection_status !== 'CAMERA_MUTED')

            // Update live telemetry roster — match by ID, Email, or Name (case-insensitive)
            setLiveStudents((prev) => {
              const existingIdx = prev.findIndex((s) => {
                if (studentId && (s.id === studentId || s.id === payload.student_id)) return true
                if (studentEmail && s.email && s.email.toLowerCase().trim() === studentEmail) return true
                if (studentName && s.name && s.name.toLowerCase().trim() === studentName.toLowerCase()) return true
                return false
              })

              const updatedStudent: LiveStudent = {
                id: studentId || (existingIdx >= 0 ? prev[existingIdx].id : studentName || 'Student'),
                name: studentName || (existingIdx >= 0 ? prev[existingIdx].name : 'Student'),
                email: studentEmail || (existingIdx >= 0 ? prev[existingIdx].email : ''),
                attention: attVal,
                confusion: confVal,
                cameraActive: isCamActive,
                lastSeen: new Date(),
                indicator: payload.reasons && payload.reasons.length > 0 ? payload.reasons[0] : undefined,
              }

              if (existingIdx >= 0) {
                const next = [...prev]
                next[existingIdx] = updatedStudent
                return next
              } else {
                return [updatedStudent, ...prev]
              }
            })

            // Also update peer card attention/confusion badges
            setPeers((prev) =>
              prev.map((p) => {
                const match =
                  (studentId && p.id === studentId) ||
                  (studentName && p.name.toLowerCase().trim() === studentName.toLowerCase())
                return match ? { ...p, attentionScore: attVal, confusionScore: confVal } : p
              })
            )
          }
        } catch {
          // ignore malformed payloads
        }
      }

        ws.onerror = () => setIsConnected(false)
        ws.onclose = () => {
          setIsConnected(false)
          if (!isMountedWs) return
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 12000)
            reconnectAttempts++
            setTimeout(connectWsInner, delay)
          }
        }
      } catch (err) {
        console.error('[Teacher WS] WebSocket connection error:', err)
      }
    }

    connectWsInner()

    // Expose cleanup so caller can stop reconnecting on unmount
    return () => {
      isMountedWs = false
      if (wsRef.current) wsRef.current.close()
    }
  }

  // 3. Media Controls Handlers (Mic & Screen Sharing Only - Teacher Camera Disabled)
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
          peer_role: 'teacher',
          user_role: 'teacher',
          is_camera_on: false,
          is_mic_on: nextState,
          is_screen_sharing: isScreenSharing,
        })
      )
    }
  }

  const handleToggleScreenShare = async () => {
    if (!webrtcRef.current) return

    if (isScreenSharing) {
      webrtcRef.current.stopScreenShare()
      setIsScreenSharing(false)
      setDisplayStream(null)
      showToast({ type: 'info', title: 'Screen Share Ended', message: 'You stopped presenting your screen.' })

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
        wsRef.current.send(
          JSON.stringify({
            type: 'peer_status',
            peer_id: user.id,
            peer_name: user.name,
            peer_role: 'teacher',
            user_role: 'teacher',
            is_camera_on: false,
            is_mic_on: isMicOn,
            is_screen_sharing: false,
          })
        )
      }
    } else {
      try {
        const screenStream = await webrtcRef.current.startScreenShare(() => {
          setIsScreenSharing(false)
          setDisplayStream(null)
          showToast({ type: 'info', title: 'Screen Share Stopped', message: 'Display capture ended.' })
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
            wsRef.current.send(
              JSON.stringify({
                type: 'peer_status',
                peer_id: user.id,
                peer_name: user.name,
                peer_role: 'teacher',
                user_role: 'teacher',
                is_camera_on: false,
                is_mic_on: isMicOn,
                is_screen_sharing: false,
              })
            )
          }
        })
        if (screenStream) {
          setDisplayStream(screenStream)
        }
        setIsScreenSharing(true)
        showToast({ type: 'success', title: 'Screen Share Active', message: 'Now presenting your screen to the class.' })

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && user) {
          wsRef.current.send(
            JSON.stringify({
              type: 'peer_status',
              peer_id: user.id,
              peer_name: user.name,
              peer_role: 'teacher',
              user_role: 'teacher',
              is_camera_on: false,
              is_mic_on: isMicOn,
              is_screen_sharing: true,
            })
          )
        }
      } catch (err: any) {
        showToast({ type: 'warning', title: 'Screen Share Cancelled', message: err.message || 'Permission denied.' })
      }
    }
  }

  // 4. Teacher Screen Share Permission Management
  const handleToggleStudentScreenSharePermission = async () => {
    if (!classData) return
    const nextState = !isOpenScreenShare
    try {
      setIsUpdatingPermission(true)
      await communicationApi.updateScreenSharePermission(classData.class_code, { is_open_to_all: nextState })
      setIsOpenScreenShare(nextState)
      showToast({
        type: 'success',
        title: nextState ? 'Student Sharing Enabled' : 'Student Sharing Restricted',
        message: nextState
          ? 'All students in this classroom can now share their screen.'
          : 'Student screen sharing has been restricted.',
      })
    } catch (err: any) {
      showToast({ type: 'danger', title: 'Permission Error', message: err.message || 'Failed to update policy.' })
    } finally {
      setIsUpdatingPermission(false)
    }
  }

  // 5. PDF Summary Export
  const handleExportPDF = async () => {
    if (!classData) return
    try {
      setIsExportingPDF(true)
      const data = await communicationApi.getReportData(classData.id)
      generateTeacherClassroomPDFReport(data as ClassReportData)
      showToast({ type: 'success', title: 'PDF Exported', message: `Downloaded session summary for ${classData.name}.` })
    } catch {
      generateTeacherClassroomPDFReport({
        class_id: classData.id,
        class_code: classData.class_code,
        class_name: classData.name,
        instructor_name: user?.name || 'Class Instructor',
        date_range: 'Live Session Summary',
        generated_at: new Date().toISOString(),
        has_data: liveStudents.length > 0,
        total_students_enrolled: liveStudents.length,
        total_sessions_conducted: 1,
        overall_avg_attention: avgAttention,
        overall_avg_confusion: avgConfusion,
        sessions: [
          {
            session_id: 'live_session',
            started_at: new Date().toISOString(),
            avg_attention: avgAttention,
            avg_confusion: avgConfusion,
            peak_students: liveStudents.length,
          },
        ],
        student_roster: liveStudents.map((s) => ({
          student_id: s.id,
          student_name: s.name,
          student_email: s.email,
          attendance_status: s.cameraActive ? 'PRESENT' : 'ABSENT',
          sessions_attended: 1,
          avg_attention: s.attention,
          avg_confusion: s.confusion,
        })),
        data_limitations_notice: 'Notice: Metrics are estimated from real-time client-side facial landmark telemetry (EAR, Gaze, Brow, Head Pose). Zero raw video frames stored.',
      })
      showToast({ type: 'success', title: 'PDF Exported', message: `Downloaded session summary for ${classData.name}.` })
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleEndClass = async () => {
    if (!classData) return
    try {
      setIsEnding(true)

      // Auto-generate session PDF report before ending class
      try {
        const reportData = await communicationApi.getReportData(classData.id)
        generateTeacherClassroomPDFReport(reportData as ClassReportData)
        showToast({ type: 'success', title: 'Session Report Downloaded', message: 'PDF report saved to your downloads.' })
      } catch {
        // Fallback: generate from live in-memory data if API fails
        const liveSnapshot = liveStudents
        const snapAvgAtt = liveSnapshot.length > 0
          ? Math.round(liveSnapshot.reduce((a, s) => a + s.attention, 0) / liveSnapshot.length)
          : 85
        const snapAvgConf = liveSnapshot.length > 0
          ? Math.round(liveSnapshot.reduce((a, s) => a + s.confusion, 0) / liveSnapshot.length)
          : 15
        generateTeacherClassroomPDFReport({
          class_id: classData.id,
          class_code: classData.class_code,
          class_name: classData.name,
          instructor_name: user?.name || 'Class Instructor',
          date_range: new Date().toLocaleDateString(),
          generated_at: new Date().toISOString(),
          has_data: liveSnapshot.length > 0,
          total_students_enrolled: liveSnapshot.length,
          total_sessions_conducted: 1,
          overall_avg_attention: snapAvgAtt,
          overall_avg_confusion: snapAvgConf,
          sessions: [
            {
              session_id: 'live_session',
              started_at: new Date().toISOString(),
              avg_attention: snapAvgAtt,
              avg_confusion: snapAvgConf,
              peak_students: liveSnapshot.length,
            },
          ],
          student_roster: liveSnapshot.map((s) => ({
            student_id: s.id,
            student_name: s.name,
            student_email: s.email,
            attendance_status: s.cameraActive ? 'PRESENT' : 'ABSENT',
            sessions_attended: 1,
            avg_attention: s.attention,
            avg_confusion: s.confusion,
          })),
          data_limitations_notice:
            'Notice: Metrics are estimated from real-time client-side facial landmark telemetry (EAR, Gaze, Brow, Head Pose). Zero raw video frames stored.',
        })
        showToast({ type: 'success', title: 'Session Report Downloaded', message: 'PDF report saved from live session data.' })
      }

      await classApi.endClass(classData.id)
      showToast({ type: 'info', title: 'Class Ended', message: 'Classroom session has ended and analytics saved.' })
      navigate(`/teacher/classes/${classData.id}/analytics`)
    } catch (err: any) {
      showToast({ type: 'danger', title: 'Error', message: err.message || 'Failed to end class' })
    } finally {
      setIsEnding(false)
    }
  }

  // Active Presenter Detection
  const activePresenter = isScreenSharing
    ? `${user?.name || 'Teacher'} (You)`
    : peers.find((p) => p.isScreenSharing)?.name

  // Distribution calculations
  const highAttCount = liveStudents.filter((s) => s.attention >= 70).length
  const medAttCount = liveStudents.filter((s) => s.attention >= 40 && s.attention < 70).length
  const lowAttCount = liveStudents.filter((s) => s.attention < 40).length

  const attentionDistData = [
    { category: 'High (70-100%)', count: highAttCount, fill: '#10B981' },
    { category: 'Medium (40-69%)', count: medAttCount, fill: '#F59E0B' },
    { category: 'Low (< 40%)', count: lowAttCount, fill: '#EF4444' },
  ]

  const lowConfCount = liveStudents.filter((s) => s.confusion < 20).length
  const medConfCount = liveStudents.filter((s) => s.confusion >= 20 && s.confusion < 50).length
  const highConfCount = liveStudents.filter((s) => s.confusion >= 50).length

  const confusionDistData = [
    { category: 'Low (< 20%)', count: lowConfCount, fill: '#10B981' },
    { category: 'Medium (20-49%)', count: medConfCount, fill: '#8B5CF6' },
    { category: 'High (>= 50%)', count: highConfCount, fill: '#EF4444' },
  ]

  const avgAttention = liveStudents.length > 0
    ? Math.round(liveStudents.reduce((acc, s) => acc + s.attention, 0) / liveStudents.length)
    : 85

  const avgConfusion = liveStudents.length > 0
    ? Math.round(liveStudents.reduce((acc, s) => acc + s.confusion, 0) / liveStudents.length)
    : 15

  return (
    <DashboardLayout title={`Live Monitoring: ${classData?.name || 'Classroom'}`}>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/teacher/classes" className="hover:text-slate-900 transition-colors">
            Classes
          </Link>
          <Icons.ChevronRight size={14} />
          {classData && (
            <>
              <Link to={`/teacher/classes/${classData.id}`} className="hover:text-slate-900 transition-colors">
                {classData.name}
              </Link>
              <Icons.ChevronRight size={14} />
            </>
          )}
          <span className="font-semibold text-slate-900">Live Session & Communication</span>
        </div>

        {/* Live Status Header & Meeting Controls Bar */}
        <Card variant="glass" glow className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Badge variant="success" size="sm" dot className="animate-pulse">
                  SESSION LIVE
                </Badge>
                <Badge variant={isConnected ? 'purple' : 'default'} size="sm">
                  {isConnected ? 'WEBSOCKET CONNECTED' : 'STREAM CONNECTING'}
                </Badge>
                <Badge variant="info" size="sm">
                  WebRTC Mesh Active
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{classData?.name || 'Live Classroom'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Room Code: <span className="font-mono font-bold text-slate-800">{classData?.class_code}</span> • Subject: {classData?.subject}
              </p>
            </div>

            {/* Teacher Classroom Meeting Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Mic Toggle */}
              <Button
                variant={isMicOn ? 'outline' : 'danger'}
                size="sm"
                onClick={handleToggleMic}
                leftIcon={isMicOn ? <Icons.Mic size={15} /> : <Icons.MicOff size={15} />}
              >
                {isMicOn ? 'Mute Mic' : 'Unmute Mic'}
              </Button>

              {/* Screen Share Toggle */}
              <Button
                variant={isScreenSharing ? 'glow' : 'outline'}
                size="sm"
                onClick={handleToggleScreenShare}
                leftIcon={<Icons.ScreenShare size={15} />}
                className={isScreenSharing ? 'border-emerald-500 text-emerald-400 font-bold' : ''}
              >
                {isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
              </Button>

              {/* Student Screen Share Permission Switch */}
              <Button
                variant={isOpenScreenShare ? 'primary' : 'outline'}
                size="sm"
                isLoading={isUpdatingPermission}
                onClick={handleToggleStudentScreenSharePermission}
                leftIcon={<Icons.Shield size={14} />}
                title={isOpenScreenShare ? 'Students are permitted to share screen' : 'Students cannot share screen'}
              >
                {isOpenScreenShare ? 'Student Sharing: ON' : 'Student Sharing: OFF'}
              </Button>

              {/* PDF Report Export */}
              <Button
                variant="outline"
                size="sm"
                isLoading={isExportingPDF}
                leftIcon={<Icons.Download size={14} />}
                onClick={handleExportPDF}
              >
                PDF Summary
              </Button>

              {/* End Session */}
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Icons.Square size={15} />}
                isLoading={isEnding}
                onClick={handleEndClass}
              >
                End Session
              </Button>
            </div>
          </div>
        </Card>

        {/* Active Screen Sharing Presentation Banner (Consolidated live status) */}
        {activePresenter && (
          <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 text-xs font-semibold">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <Icons.ScreenShare size={16} className="text-emerald-600" />
              <span>
                <strong>{isScreenSharing ? 'You are' : `${activePresenter} is`}</strong> currently presenting screen to the classroom.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                LIVE STREAM ACTIVE
              </span>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 1: LIVE CLASSROOM VIDEO GRID (TEACHER & STUDENT WEBCAMS) */}
        {/* ========================================================================= */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Icons.Video size={18} className="text-blue-600" />
                <span>Live Classroom Video & Audio Streams</span>
              </h3>
              <p className="text-xs text-slate-500">
                Bidirectional WebRTC communication • Student webcams & instructor screen presentation
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="purple" size="sm">
                {peers.length} Student{peers.length !== 1 ? 's' : ''} in Call
              </Badge>
              <Badge variant="success" size="sm">
                P2P Voice & Video
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Teacher's Screen Share Video Tile (Only visible when presenting) */}
            {isScreenSharing && displayStream && (
              <VideoTile
                name={`${user?.name || 'Instructor'} (Your Screen - Live)`}
                role="teacher"
                isLocalUser={true}
                stream={displayStream}
                isMuted={!isMicOn}
                isCameraOff={false}
                isScreenSharing={true}
                className="col-span-full h-72 md:h-80"
              />
            )}

            {/* Connected Student Video Tiles */}
            {peers.map((peer) => (
              <VideoTile
                key={peer.id}
                name={peer.name}
                role="student"
                isLocalUser={false}
                stream={peer.stream}
                isMuted={peer.isMuted}
                isCameraOff={peer.isCameraOff}
                isScreenSharing={peer.isScreenSharing}
                attentionScore={peer.attentionScore}
                confusionScore={peer.confusionScore}
                className="h-48"
              />
            ))}
          </div>

          {peers.length === 0 && !isScreenSharing && (
            <div className="mt-4 p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-1">
              <p className="text-xs font-semibold text-slate-700">Waiting for students to join...</p>
              <p className="text-[11px] text-slate-500">
                Share room code <strong className="font-mono text-slate-800">{classData?.class_code}</strong>. Student cameras and audio will appear here automatically when they enter.
              </p>
            </div>
          )}
        </Card>

        {/* ========================================================================= */}
        {/* SECTION 2: LIVE ATTENTION & CONFUSION TELEMETRY METRICS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
          <Card variant="default" className="p-4">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Connected Students</span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">{liveStudents.length}</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Average Attention</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">{avgAttention}%</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Average Confusion</span>
            <span className="text-2xl font-bold text-purple-600 mt-1 block">{avgConfusion}%</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-slate-500 uppercase font-bold block">Focus Status</span>
            <span className="text-xl font-bold text-slate-800 mt-1 block">
              {avgConfusion > 30 ? 'Confusion Spike' : avgAttention >= 70 ? 'High Engagement' : 'Moderate Flow'}
            </span>
          </Card>
        </div>

        {/* Distribution Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attention Distribution Chart */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Attention Distribution</h3>
                <p className="text-xs text-slate-500">Active students categorized by attention score</p>
              </div>
              <Badge variant="success" size="sm">
                {liveStudents.length > 0 ? `${Math.round((highAttCount / liveStudents.length) * 100)}% Engaged` : 'Ready'}
              </Badge>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attentionDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="category" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[6, 6, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Confusion Distribution Chart */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Confusion Distribution</h3>
                <p className="text-xs text-slate-500">Active students categorized by detected confusion</p>
              </div>
              <Badge variant={highConfCount > 0 ? 'danger' : 'purple'} size="sm">
                {highConfCount > 0 ? `${highConfCount} Confused` : 'Clear Flow'}
              </Badge>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={confusionDistData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="category" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[6, 6, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Live Student Telemetry Roster */}
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Student Telemetry Streams</h3>
              <p className="text-xs text-slate-500">Real-time attention and confusion indicators computed client-side</p>
            </div>
            <Badge variant="purple" size="sm">
              100% Privacy Preserved (Zero Video Uploads)
            </Badge>
          </div>

          {liveStudents.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Icons.Users size={20} />
              </div>
              <p className="text-xs text-slate-500">Waiting for students to join room {classData?.class_code}...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Student</th>
                    <th className="p-3">Media Status</th>
                    <th className="p-3">Attention Score</th>
                    <th className="p-3">Confusion Score</th>
                    <th className="p-3">Behavioral Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {liveStudents.map((s, i) => {
                    const peer = peers.find((p) => p.id === s.id || p.name === s.name)
                    return (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">{s.name}</div>
                          {s.email && <div className="text-[11px] text-slate-500 font-mono">{s.email}</div>}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                                peer ? (!peer.isCameraOff ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200') : (s.cameraActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200')
                              }`}
                            >
                              <Icons.Video size={11} />
                              <span>{peer ? (!peer.isCameraOff ? 'Camera On' : 'Camera Off') : (s.cameraActive ? 'Online' : 'Offline')}</span>
                            </span>
                            {peer && (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                                  !peer.isMuted ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                {peer.isMuted ? <Icons.MicOff size={11} /> : <Icons.Mic size={11} />}
                                <span>{peer.isMuted ? 'Muted' : 'Mic Active'}</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono font-bold">
                          <span className={s.attention >= 70 ? 'text-emerald-600' : 'text-red-600'}>
                            {s.attention}%
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-purple-600">
                          {s.confusion}%
                        </td>
                        <td className="p-3">
                          {s.indicator ? (
                            <Badge variant={s.confusion >= 40 ? 'purple' : s.attention >= 70 ? 'success' : 'danger'} size="sm">
                              {s.indicator}
                            </Badge>
                          ) : s.confusion >= 40 ? (
                            <Badge variant="purple" size="sm">
                              Brow Furrowing Detected
                            </Badge>
                          ) : s.attention >= 70 ? (
                            <Badge variant="success" size="sm">
                              Focused & Screen Attentive
                            </Badge>
                          ) : (
                            <Badge variant="danger" size="sm">
                              Head Aversion / Distracted
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
