import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'
import { classApi, EnrollmentItem, StudentStats } from '@/services/classApi'
import { JoinClassroomModal } from './JoinClassroomModal'

export default function StudentDashboard() {
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const [isJoinModalOpen, setJoinModalOpen] = useState(false)
  const [classes, setClasses] = useState<EnrollmentItem[]>([])
  const [stats, setStats] = useState<StudentStats>({
    total_classes_enrolled: 0,
    total_sessions_attended: 0,
    overall_avg_attention: 0,
    overall_avg_confusion: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const studentNav = [
    { label: 'Dashboard', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/student/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile', path: '/student/profile', icon: <Icons.User size={18} /> },
  ]

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [classData, statData] = await Promise.all([
        classApi.getStudentClasses().catch(() => []),
        classApi.getStudentStats().catch(() => ({
          total_classes_enrolled: 0,
          total_sessions_attended: 0,
          overall_avg_attention: 0,
          overall_avg_confusion: 0,
        })),
      ])
      setClasses(classData)
      setStats(statData)
    } catch (err: any) {
      showToast({
        type: 'danger',
        title: 'Error',
        message: err?.message || 'Could not load your classes.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const liveClasses = classes.filter((c) => c.is_live)

  return (
    <DashboardLayout navItems={studentNav} title="Student Dashboard">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student Portal</span>
            {liveClasses.length > 0 ? (
              <Badge variant="live" size="sm" dot>
                {liveClasses.length} Live Session(s) Active
              </Badge>
            ) : (
              <Badge variant="default" size="sm">
                {classes.length} Class(es) Enrolled
              </Badge>
            )}
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Welcome back, {user?.name || 'Student'}!
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {liveClasses.length > 0
              ? `${liveClasses[0].class_name} is currently live. Click below to enter.`
              : 'Join a class using your instructor\'s Room Code or view your enrolled schedule.'}
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setJoinModalOpen(true)} leftIcon={<Icons.Plus size={16} />}>
          Join with Room Code
        </Button>
      </div>

      {/* 4-Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card variant="default" className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Enrolled Classes</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{classes.length}</div>
          <span className="text-[11px] text-slate-500">Active Curriculum</span>
        </Card>

        <Card variant="default" className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Sessions Attended</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.total_sessions_attended}</div>
          <span className="text-[11px] text-slate-500">Participation Record</span>
        </Card>

        <Card variant="default" className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Overall Attention</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {stats.overall_avg_attention > 0 ? `${stats.overall_avg_attention}%` : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-500">Client-Side AI Inference</span>
        </Card>

        <Card variant="default" className="p-4 bg-white border-slate-200 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Overall Confusion</div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            {stats.overall_avg_confusion > 0 ? `${stats.overall_avg_confusion}%` : 'N/A'}
          </div>
          <span className="text-[11px] text-slate-500">Blink & Brow Dynamics</span>
        </Card>
      </div>

      {/* Enrolled Classes List */}
      <Card variant="default" className="p-5 bg-white border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">My Enrolled Classes</h3>
            <p className="text-xs text-slate-500">Classes joined via Room Code with live MediaPipe focus monitoring</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setJoinModalOpen(true)} leftIcon={<Icons.Plus size={14} />}>
            Join New Class
          </Button>
        </div>

        {isLoading ? (
          <div className="flex h-36 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : classes.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
            <Icons.Video size={32} className="mx-auto text-slate-300 mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No Classes Enrolled</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You haven't joined any classes yet. Ask your teacher for the Room Code and click "Join with Room Code".
            </p>
            <div className="mt-3">
              <Button variant="primary" size="sm" onClick={() => setJoinModalOpen(true)} leftIcon={<Icons.Plus size={14} />}>
                Join with Room Code
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classes.map((c) => (
              <div
                key={c.id}
                className="p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-blue-600">{c.class_code}</span>
                    {c.is_live ? (
                      <Badge variant="live" size="sm" dot>
                        LIVE NOW
                      </Badge>
                    ) : (
                      <Badge variant="default" size="sm">
                        Enrolled
                      </Badge>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{c.class_name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">Subject: {c.subject}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Instructor: {c.teacher_name}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  {c.is_live ? (
                    <Link to={`/student/class/${c.class_code}`}>
                      <Button variant="primary" size="sm" className="w-full" leftIcon={<Icons.Video size={14} />}>
                        Enter Live Class
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" className="w-full" disabled>
                      Waiting for Instructor
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <JoinClassroomModal
        isOpen={isJoinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        onClassJoined={() => loadData()}
      />
    </DashboardLayout>
  )
}
