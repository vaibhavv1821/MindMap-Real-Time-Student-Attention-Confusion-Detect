import React, { useState, useEffect } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { generateSessionPDFReport } from '../teacher/PDFReportExporter'
import { useToast } from '@/components/ui/Toast'
import { useAuthContext } from '@/context/AuthContext'
import { classApi, EnrollmentItem, StudentStats, AttendanceRecord } from '@/services/classApi'
import { useNavigate } from 'react-router-dom'

export default function StudentReportsPage() {
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [classes, setClasses] = useState<EnrollmentItem[]>([])
  const [selectedClass, setSelectedClass] = useState<EnrollmentItem | null>(null)
  const [stats, setStats] = useState<StudentStats | null>(null)
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const studentNav = [
    { label: 'Dashboard', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/student/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile', path: '/student/profile', icon: <Icons.User size={18} /> },
  ]

  useEffect(() => {
    fetchStudentData()
  }, [])

  const fetchStudentData = async () => {
    try {
      setIsLoading(true)
      const [classList, studentStats, attendanceList] = await Promise.allSettled([
        classApi.getStudentClasses(),
        classApi.getStudentStats(),
        classApi.getStudentAttendance(),
      ])

      if (classList.status === 'fulfilled') {
        setClasses(classList.value)
        if (classList.value.length > 0) {
          setSelectedClass(classList.value[0])
        }
      }

      if (studentStats.status === 'fulfilled') {
        setStats(studentStats.value)
      }

      if (attendanceList.status === 'fulfilled') {
        setAttendanceRecords(attendanceList.value)
      }
    } catch (err: any) {
      showToast({ type: 'danger', title: 'Failed to load report data', message: err.message || 'Error fetching data' })
    } finally {
      setIsLoading(false)
    }
  }

  const avgAttention = stats?.overall_avg_attention && stats.overall_avg_attention > 0
    ? Math.round(stats.overall_avg_attention)
    : 0
  const avgConfusion = stats?.overall_avg_confusion && stats.overall_avg_confusion > 0
    ? Math.round(stats.overall_avg_confusion)
    : 0

  const attentionData = attendanceRecords.length > 0
    ? attendanceRecords.map((r, idx) => ({
        time: r.class_code || `Session ${idx + 1}`,
        attention: Math.round(r.avg_attention || 0),
        confusion: Math.round(r.avg_confusion || 0),
      }))
    : []

  const subjectData = classes.map((c) => ({
    subject: c.subject || c.class_name,
    score: avgAttention > 0 ? avgAttention : 0,
  }))

  const handleExportPDF = () => {
    const className = selectedClass ? selectedClass.class_name : 'Personal Session Report'
    const classCode = selectedClass ? selectedClass.class_code : 'MINDMAP-STUDENT'

    generateSessionPDFReport({
      className: `${className} - Personal Student Report`,
      classCode,
      instructor: selectedClass ? selectedClass.teacher_name : 'MindMap AI Platform',
      date: new Date().toLocaleDateString(),
      totalStudents: 1,
      avgAttention,
      avgConfusion,
      students: [
        {
          name: `${user?.name || 'Student'} (You)`,
          email: user?.email || 'student@mindmap.edu',
          attention: avgAttention,
          confusion: avgConfusion,
          status: 'Present',
        },
      ],
    })
    showToast({ type: 'success', title: 'Report Exported', message: 'Downloaded your personal focus report.' })
  }

  const attendanceRate = stats && stats.total_classes_enrolled > 0
    ? Math.min(100, Math.round((stats.total_sessions_attended / stats.total_classes_enrolled) * 100))
    : 100

  return (
    <DashboardLayout navItems={studentNav} title="Personal AI Analytics & Session Reports">
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          </div>
        ) : classes.length === 0 ? (
          <Card variant="glass" className="p-8 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <Icons.Download size={24} />
            </div>
            <h3 className="text-lg font-bold text-white">No Enrolled Classes Found</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Join a classroom using the room code provided by your teacher to view personal AI performance reports.
            </p>
            <Button variant="glow" onClick={() => navigate('/student/classes')}>
              Join a Class
            </Button>
          </Card>
        ) : (
          <>
            {/* Class Selector Bar */}
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider shrink-0">
                Select Class:
              </span>
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => setSelectedClass(cls)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 flex items-center gap-2 ${
                    selectedClass?.id === cls.id
                      ? 'bg-accent text-white shadow-lg shadow-accent/20'
                      : 'bg-card border border-border text-muted hover:text-white'
                  }`}
                >
                  <span>{cls.class_name}</span>
                  <span className="font-mono text-[10px] opacity-75">({cls.class_code})</span>
                  {cls.is_live && (
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  )}
                </button>
              ))}
            </div>

            {/* Top Personal Summary Header */}
            <Card variant="glass" glow className="p-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="success" size="sm" dot font-mono>
                      PERSONAL FOCUS REPORT
                    </Badge>
                    <Badge variant="purple" size="sm">
                      100% PRIVACY PRESERVED
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedClass ? `${selectedClass.class_name} Performance` : 'Personal Overview'}
                  </h2>
                  <p className="text-xs text-muted mt-0.5">
                    Student: {user?.name} ({user?.email}) • Code: {selectedClass?.class_code} • Average Focus: {avgAttention}%
                  </p>
                </div>

                <Button
                  variant="glow"
                  size="md"
                  leftIcon={<Icons.Download size={18} />}
                  onClick={handleExportPDF}
                >
                  Export My PDF Report
                </Button>
              </div>
            </Card>

            {/* Core Personal Stat Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
              <Card variant="default" className="p-4">
                <span className="text-[10px] text-muted uppercase font-bold block">Enrolled Classes</span>
                <span className="text-xl font-bold text-white mt-1 block">{classes.length}</span>
              </Card>

              <Card variant="default" className="p-4">
                <span className="text-[10px] text-muted uppercase font-bold block">My Avg Attention</span>
                <span className="text-xl font-bold text-success mt-1 block">{avgAttention}%</span>
              </Card>

              <Card variant="default" className="p-4">
                <span className="text-[10px] text-muted uppercase font-bold block">My Avg Confusion</span>
                <span className="text-xl font-bold text-purple-400 mt-1 block">{avgConfusion}%</span>
              </Card>

              <Card variant="default" className="p-4">
                <span className="text-[10px] text-muted uppercase font-bold block">Attended Sessions</span>
                <span className="text-xl font-bold text-accent mt-1 block">{stats?.total_sessions_attended ?? 0}</span>
              </Card>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timeline Chart */}
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Personal Attention vs Confusion Timeline</h3>
                    <p className="text-xs text-muted">Session focus dynamics calculated in-browser via MediaPipe</p>
                  </div>
                  <Badge variant="purple" size="sm">Personal Stream</Badge>
                </div>

                {attentionData.length === 0 ? (
                  <div className="h-64 w-full flex flex-col items-center justify-center text-slate-400 space-y-2 border border-dashed border-border rounded-lg">
                    <Icons.TrendingUp size={28} />
                    <p className="text-xs font-medium text-slate-300">No session focus dynamics recorded yet.</p>
                    <p className="text-[11px] text-muted">Join a live class to record personal attention & confusion metrics.</p>
                  </div>
                ) : (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={attentionData}>
                        <defs>
                          <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3ECF8E" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3ECF8E" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                        <XAxis dataKey="time" stroke="#8A8A8E" fontSize={11} />
                        <YAxis stroke="#8A8A8E" fontSize={11} domain={[0, 100]} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#121214', borderColor: '#2A2A2E', borderRadius: '12px', color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="attention" stroke="#3ECF8E" fillOpacity={1} fill="url(#colorAtt)" name="Attention %" />
                        <Area type="monotone" dataKey="confusion" stroke="#A855F7" fillOpacity={1} fill="url(#colorConf)" name="Confusion %" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>

              {/* Subject Breakdown Bar Chart */}
              <Card variant="glass" className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Attention Score by Enrolled Class</h3>
                    <p className="text-xs text-muted">Semester subject focus performance</p>
                  </div>
                  <Badge variant="success" size="sm">Active Focus</Badge>
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subjectData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                      <XAxis dataKey="subject" stroke="#8A8A8E" fontSize={11} />
                      <YAxis stroke="#8A8A8E" fontSize={11} domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#121214', borderColor: '#2A2A2E', borderRadius: '12px', color: '#fff' }}
                      />
                      <Bar dataKey="score" fill="#4F8CFF" radius={[8, 8, 0, 0]} name="Avg Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
