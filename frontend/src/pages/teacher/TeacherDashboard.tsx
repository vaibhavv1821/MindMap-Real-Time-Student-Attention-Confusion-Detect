import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Icons } from '@/components/ui/Icons'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { classApi, ClassItem, StudentRoster } from '@/services/classApi'
import { CreateClassroomModal } from './CreateClassroomModal'
import { generateSessionPDFReport } from './PDFReportExporter'
import { env } from '@/config/env'

export default function TeacherDashboard() {
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)
  const [students, setStudents] = useState<StudentRoster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<StudentRoster | null>(null)

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'ALL' | 'FOCUSED' | 'MODERATE' | 'LOW' | 'CONFUSED' | 'HAND'>('ALL')
  const [sortBy, setSortBy] = useState<'ATTENTION_ASC' | 'ATTENTION_DESC' | 'CONFUSION_DESC' | 'NAME'>('ATTENTION_ASC')

  const wsRef = useRef<WebSocket | null>(null)

  const teacherNav = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Classrooms', path: '/teacher/classrooms', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Export Reports', path: '/teacher/reports', icon: <Icons.Download size={18} /> },
    { label: 'Settings', path: '/teacher/settings', icon: <Icons.Settings size={18} /> },
  ]

  // Load teacher classes
  const loadClasses = async () => {
    try {
      const data = await classApi.getTeacherClasses()
      setClasses(data)
      if (data.length > 0) {
        // Prefer LIVE class if exists, else first class
        const live = data.find((c) => c.status === 'LIVE') || data[0]
        setSelectedClass(live)
      } else {
        setSelectedClass(null)
      }
    } catch (err: any) {
      showToast({
        type: 'danger',
        title: 'Error',
        message: err?.message || 'Could not load classes.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClasses()
  }, [])

  // When selected class changes, load roster and connect WebSocket
  useEffect(() => {
    if (!selectedClass) {
      setStudents([])
      return
    }

    // Load initial roster from MongoDB
    classApi
      .getClassStudents(selectedClass.id)
      .then((roster) => setStudents(roster))
      .catch(() => {})

    // Connect to WebSocket for this classroom code
    const wsUrl = `${env.wsBaseUrl}/${selectedClass.class_code}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload && payload.student_id) {
          setStudents((prev) => {
            const index = prev.findIndex((s) => s.student_id === payload.student_id)
            const updatedItem: StudentRoster = {
              student_id: payload.student_id,
              name: payload.student_name || 'Student',
              email: payload.student_email || '',
              enrolled_at: payload.timestamp_ms ? new Date(payload.timestamp_ms).toLocaleTimeString() : 'Just now',
              status: 'ACTIVE',
              avg_attention: payload.attention_score ?? 85,
              avg_confusion: payload.confusion_score ?? 15,
              connection_status: payload.connection_status || 'ONLINE',
              is_hand_raised: !!payload.is_hand_raised,
            }

            if (index >= 0) {
              const copy = [...prev]
              copy[index] = { ...copy[index], ...updatedItem }
              return copy
            } else {
              return [updatedItem, ...prev]
            }
          })
        }
      } catch {
        // ignore parse error
      }
    }

    return () => {
      ws.close()
    }
  }, [selectedClass?.id, selectedClass?.class_code])

  // Calculate real classroom summary stats from actual students
  const totalStudents = students.length
  const onlineCount = students.filter((s) => s.connection_status === 'ONLINE').length
  const avgAttention =
    totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.avg_attention || 0), 0) / totalStudents)
      : selectedClass?.avg_attention || 0
  const avgConfusion =
    totalStudents > 0
      ? Math.round(students.reduce((acc, s) => acc + (s.avg_confusion || 0), 0) / totalStudents)
      : selectedClass?.avg_confusion || 0
  const focusedCount = students.filter((s) => s.avg_attention >= 70).length
  const confusedCount = students.filter((s) => s.avg_confusion >= 50).length
  const handRaisedCount = students.filter((s) => s.is_hand_raised).length

  const handleExportPDF = () => {
    if (!selectedClass) return
    generateSessionPDFReport({
      className: selectedClass.name,
      classCode: selectedClass.class_code,
      instructor: selectedClass.teacher_name,
      date: new Date().toLocaleDateString(),
      totalStudents: totalStudents,
      avgAttention: avgAttention,
      avgConfusion: avgConfusion,
      students: students.map((s) => ({
        name: s.name,
        email: s.email,
        attention: s.avg_attention,
        confusion: s.avg_confusion,
        status: s.connection_status === 'ONLINE' ? 'Present' : 'Offline',
      })),
    })
    showToast({ type: 'success', title: 'Report Downloaded', message: 'Real session PDF exported successfully.' })
  }

  // Filter & Sort Logic
  const filteredStudents = students
    .filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false

      if (filterTab === 'FOCUSED') return s.avg_attention >= 70
      if (filterTab === 'MODERATE') return s.avg_attention >= 40 && s.avg_attention < 70
      if (filterTab === 'LOW') return s.avg_attention < 40
      if (filterTab === 'CONFUSED') return s.avg_confusion >= 50
      if (filterTab === 'HAND') return s.is_hand_raised
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'ATTENTION_ASC') return a.avg_attention - b.avg_attention
      if (sortBy === 'ATTENTION_DESC') return b.avg_attention - a.avg_attention
      if (sortBy === 'CONFUSION_DESC') return b.avg_confusion - a.avg_confusion
      return a.name.localeCompare(b.name)
    })

  return (
    <DashboardLayout navItems={teacherNav} title="Classroom Dashboard">
      {/* 1. Header & Class Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Teacher Portal</span>
            {selectedClass ? (
              <Badge variant={selectedClass.status === 'LIVE' ? 'live' : 'purple'} size="sm" dot={selectedClass.status === 'LIVE'}>
                {selectedClass.class_code} ({selectedClass.status})
              </Badge>
            ) : (
              <Badge variant="default" size="sm">No Class Selected</Badge>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {selectedClass ? selectedClass.name : 'Welcome, Instructor'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Instructor: {user?.name || selectedClass?.teacher_name || 'Teacher'} • {totalStudents} Enrolled / Connected
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {classes.length > 1 && (
            <select
              value={selectedClass?.id || ''}
              onChange={(e) => {
                const found = classes.find((c) => c.id === e.target.value)
                if (found) setSelectedClass(found)
              }}
              className="text-xs font-medium border border-slate-300 rounded-lg px-3 py-1.5 bg-white text-slate-800"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.class_code}) - {c.status}
                </option>
              ))}
            </select>
          )}

          {selectedClass && selectedClass.status === 'LIVE' && (
            <Link to={`/classroom/${selectedClass.class_code.toLowerCase()}`}>
              <Button variant="primary" size="sm" leftIcon={<Icons.Video size={15} />}>
                Enter Live Room
              </Button>
            </Link>
          )}

          <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(true)} leftIcon={<Icons.Plus size={15} />}>
            New Class
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} leftIcon={<Icons.Download size={15} />} disabled={!selectedClass}>
            Export PDF
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : !selectedClass ? (
        <Card variant="default" className="p-12 text-center bg-white border-slate-200">
          <Icons.Brain size={40} className="mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Classroom Selected</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don't have any classes created yet. Create a class to view real-time student attention and confusion telemetry.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={() => setCreateModalOpen(true)} leftIcon={<Icons.Plus size={16} />}>
              Create Classroom
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {/* 2. Real Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card variant="default" className="p-4 bg-white border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Average Attention</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">{avgAttention}%</div>
              <span className="text-[11px] text-slate-500">Live AI Feature Vector</span>
            </Card>

            <Card variant="default" className="p-4 bg-white border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Average Confusion</div>
              <div className={`text-2xl font-bold mt-1 ${avgConfusion > 30 ? 'text-amber-500' : 'text-slate-800'}`}>
                {avgConfusion}%
              </div>
              <span className="text-[11px] text-slate-500">{confusedCount} student(s) confused</span>
            </Card>

            <Card variant="default" className="p-4 bg-white border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Students Present</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">{onlineCount} / {totalStudents}</div>
              <span className="text-[11px] text-slate-500">MongoDB Enrolled</span>
            </Card>

            <Card variant="default" className="p-4 bg-white border-slate-200 shadow-sm">
              <div className="text-xs font-medium text-slate-500">Hands Raised</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">{handRaisedCount}</div>
              <span className="text-[11px] text-slate-500">Immediate assistance</span>
            </Card>
          </div>

          {/* 3. Real Student Telemetry Roster */}
          <Card variant="default" className="p-5 bg-white border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Enrolled Student Telemetry</h3>
                <p className="text-xs text-slate-500">Real-time Attention & Confusion from client-side MediaPipe inference</p>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Icons.Search size={14} />}
                  className="w-full sm:w-48 text-xs"
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 py-3 overflow-x-auto text-xs font-medium">
              {[
                { id: 'ALL', label: `All (${students.length})` },
                { id: 'FOCUSED', label: `Focused (${focusedCount})` },
                { id: 'CONFUSED', label: `Confused (${confusedCount})` },
                { id: 'HAND', label: `Hands Raised (${handRaisedCount})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterTab(tab.id as any)}
                  className={`px-3 py-1 rounded-lg border transition-colors ${
                    filterTab === tab.id
                      ? 'bg-blue-50 text-blue-700 border-blue-200 font-semibold'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Student List */}
            {filteredStudents.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                {students.length === 0
                  ? `No students have joined ${selectedClass.class_code} yet. Share the code with students to start receiving telemetry.`
                  : 'No students match the selected filter.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <div
                    key={s.student_id}
                    onClick={() => setSelectedStudent(s)}
                    className="py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} size="sm" status={s.connection_status === 'ONLINE' ? 'online' : 'offline'} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{s.name}</span>
                          {s.is_hand_raised && (
                            <Badge variant="purple" size="sm">Hand Raised</Badge>
                          )}
                          <Badge variant={s.connection_status === 'ONLINE' ? 'success' : 'default'} size="sm">
                            {s.connection_status}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-slate-400">{s.email || 'Student Account'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-600">{s.avg_attention}%</div>
                        <span className="text-[10px] text-slate-400">Attention</span>
                      </div>
                      <div className="text-right">
                        <div className={`text-xs font-bold ${s.avg_confusion > 30 ? 'text-amber-500' : 'text-slate-700'}`}>
                          {s.avg_confusion}%
                        </div>
                        <span className="text-[10px] text-slate-400">Confusion</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <CreateClassroomModal
        isOpen={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onClassCreated={() => loadClasses()}
      />
    </DashboardLayout>
  )
}
