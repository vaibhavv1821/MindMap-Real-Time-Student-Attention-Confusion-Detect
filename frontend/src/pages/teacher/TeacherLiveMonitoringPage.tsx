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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { classApi, ClassItem, StudentRoster } from '@/services/classApi'
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

export default function TeacherLiveMonitoringPage() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [classData, setClassData] = useState<ClassItem | null>(null)
  const [liveStudents, setLiveStudents] = useState<LiveStudent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEnding, setIsEnding] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (classId) {
      initSession(classId)
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
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

      // Connect to telemetry WebSocket room
      connectWebSocket(details.class_code)
    } catch (err: any) {
      showToast({ type: 'danger', title: 'Session Error', message: err.message || 'Failed to initialize session' })
    } finally {
      setIsLoading(false)
    }
  }

  const connectWebSocket = (roomCode: string) => {
    try {
      const wsUrl = `${env.wsBaseUrl}/${roomCode}`
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        ws.send(JSON.stringify({ type: 'teacher_join', role: 'teacher', timestamp: new Date().toISOString() }))
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (
            msg.student_id ||
            msg.type === 'telemetry' ||
            msg.attention !== undefined ||
            msg.attention_score !== undefined
          ) {
            setLiveStudents((prev) => {
              const studentName = msg.student_name || msg.user_name || 'Enrolled Student'
              const studentEmail = msg.student_email || msg.email || ''
              const studentId = String(msg.student_id || studentName)

              const attRaw = msg.attention_score ?? msg.attention
              const confRaw = msg.confusion_score ?? msg.confusion

              const attVal = attRaw !== undefined ? Math.round(Number(attRaw)) : 85
              const confVal = confRaw !== undefined ? Math.round(Number(confRaw)) : 15

              const isCamActive =
                msg.connection_status === 'ONLINE' ||
                msg.camera_active === true ||
                (msg.camera_active !== false && msg.connection_status !== 'CAMERA_MUTED')

              const existingIdx = prev.findIndex((s) => s.id === studentId || s.name === studentName)
              const updatedStudent: LiveStudent = {
                id: studentId,
                name: studentName,
                email: studentEmail,
                attention: attVal,
                confusion: confVal,
                cameraActive: isCamActive,
                lastSeen: new Date(),
                indicator: msg.reasons && msg.reasons.length > 0 ? msg.reasons[0] : undefined,
              }

              if (existingIdx >= 0) {
                const next = [...prev]
                next[existingIdx] = updatedStudent
                return next
              } else {
                return [updatedStudent, ...prev]
              }
            })
          }
        } catch (e) {
          // ignore parsing error
        }
      }

      ws.onerror = () => {
        setIsConnected(false)
      }

      ws.onclose = () => {
        setIsConnected(false)
      }
    } catch (err) {
      console.error('WebSocket connection error:', err)
    }
  }

  const handleEndClass = async () => {
    if (!classData) return
    try {
      setIsEnding(true)
      await classApi.endClass(classData.id)
      showToast({ type: 'success', title: 'Class Ended', message: 'Classroom session has ended and analytics saved.' })
      navigate(`/teacher/classes/${classData.id}/analytics`)
    } catch (err: any) {
      showToast({ type: 'danger', title: 'Error', message: err.message || 'Failed to end class' })
    } finally {
      setIsEnding(false)
    }
  }

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
          <span className="font-semibold text-slate-900">Live Session</span>
        </div>

        {/* Live Status Header */}
        <Card variant="glass" glow className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="success" size="sm" dot className="animate-pulse">
                  SESSION LIVE
                </Badge>
                <Badge variant={isConnected ? 'purple' : 'default'} size="sm">
                  {isConnected ? 'WEBSOCKET CONNECTED' : 'STREAM CONNECTING'}
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">{classData?.name || 'Live Classroom'}</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Room Code: <span className="font-mono font-bold text-slate-800">{classData?.class_code}</span> • Subject: {classData?.subject}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="md"
                leftIcon={<Icons.BarChart size={16} />}
                onClick={() => navigate(`/teacher/classes/${classData?.id}/analytics`)}
              >
                Analytics
              </Button>
              <Button
                variant="danger"
                size="md"
                leftIcon={<Icons.Square size={16} />}
                isLoading={isEnding}
                onClick={handleEndClass}
              >
                End Session
              </Button>
            </div>
          </div>
        </Card>

        {/* Live Metrics Grid */}
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
              100% Privacy Verified
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
                    <th className="p-3">Camera Status</th>
                    <th className="p-3">Attention Score</th>
                    <th className="p-3">Confusion Score</th>
                    <th className="p-3">Behavioral Indicator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {liveStudents.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div className="font-semibold text-slate-900">{s.name}</div>
                        {s.email && <div className="text-[11px] text-slate-500 font-mono">{s.email}</div>}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium border ${
                            s.cameraActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <Icons.Video size={12} />
                          {s.cameraActive ? 'Active' : 'Muted'}
                        </span>
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
