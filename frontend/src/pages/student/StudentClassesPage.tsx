import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'
import { classApi, EnrollmentItem } from '@/services/classApi'
import { JoinClassroomModal } from './JoinClassroomModal'

export default function StudentClassesPage() {
  const { showToast } = useToast()
  const [classes, setClasses] = useState<EnrollmentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isJoinOpen, setIsJoinOpen] = useState(false)

  const studentNav = [
    { label: 'Overview', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Calendar size={18} /> },
    { label: 'Attendance', path: '/student/attendance', icon: <Icons.CheckCircle size={18} /> },
    { label: 'AI Reports', path: '/student/reports', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile & Settings', path: '/student/profile', icon: <Icons.Settings size={18} /> },
  ]

  const loadClasses = async () => {
    setIsLoading(true)
    try {
      const data = await classApi.getStudentClasses()
      setClasses(data)
    } catch (err: any) {
      showToast({
        type: 'danger',
        title: 'Error',
        message: err?.message || 'Could not load enrolled classes.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClasses()
  }, [])

  return (
    <DashboardLayout navItems={studentNav} title="My Enrolled Classes">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Enrolled Classes</h2>
          <p className="text-xs text-slate-500 mt-0.5">Classes joined with Room Codes registered in MongoDB Atlas</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsJoinOpen(true)} leftIcon={<Icons.Plus size={16} />}>
          Join Class
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : classes.length === 0 ? (
        <Card variant="default" className="p-12 text-center bg-white border-slate-200">
          <Icons.Calendar size={36} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Enrolled Classes</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You are not enrolled in any classes yet. Click "Join Class" to enter your teacher's room code.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={() => setIsJoinOpen(true)} leftIcon={<Icons.Plus size={16} />}>
              Join With Room Code
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((c) => (
            <Card key={c.id} variant="default" className="p-5 flex flex-col justify-between bg-white border-slate-200 shadow-sm">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="purple" size="sm" className="font-mono">{c.class_code}</Badge>
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
                <h3 className="text-base font-bold text-slate-900">{c.class_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Subject: {c.subject}</p>
                <p className="text-xs text-slate-400 mt-0.5">Instructor: {c.teacher_name}</p>
                <div className="text-[11px] text-slate-400 mt-2">
                  Enrolled on: {new Date(c.enrolled_at).toLocaleDateString()}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                {c.is_live ? (
                  <Link to={`/classroom/${c.class_code.toLowerCase()}`} className="w-full">
                    <Button variant="primary" size="sm" className="w-full" leftIcon={<Icons.Video size={14} />}>
                      Enter Live Room
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Scheduled Session
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <JoinClassroomModal
        isOpen={isJoinOpen}
        onClose={() => setIsJoinOpen(false)}
        onClassJoined={() => loadClasses()}
      />
    </DashboardLayout>
  )
}
