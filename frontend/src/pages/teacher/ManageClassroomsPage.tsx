import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'
import { classApi, ClassItem } from '@/services/classApi'
import { CreateClassroomModal } from './CreateClassroomModal'

export default function ManageClassroomsPage() {
  const { showToast } = useToast()
  const [classrooms, setClassrooms] = useState<ClassItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const teacherNav = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Classes', path: '/teacher/classes', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile', path: '/teacher/profile', icon: <Icons.User size={18} /> },
  ]

  const loadClasses = async () => {
    setIsLoading(true)
    try {
      const data = await classApi.getTeacherClasses()
      setClassrooms(data)
    } catch (err: any) {
      showToast({
        type: 'danger',
        title: 'Error',
        message: err?.message || 'Could not load your classrooms.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadClasses()
  }, [])

  const handleStartClass = async (classId: string) => {
    setActionLoadingId(classId)
    try {
      await classApi.startClass(classId)
      showToast({
        type: 'success',
        title: 'Class Started',
        message: 'Class is now LIVE. Students can enter the room.',
      })
      await loadClasses()
    } catch (err: any) {
      showToast({
        type: 'danger',
        title: 'Failed to Start',
        message: err?.message || 'Could not start class session.',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleEndClass = async (classId: string) => {
    setActionLoadingId(classId)
    try {
      await classApi.endClass(classId)
      showToast({
        type: 'info',
        title: 'Class Ended',
        message: 'Live session finalized and attendance recorded in MongoDB.',
      })
      await loadClasses()
    } catch (err: any) {
      showToast({
        type: 'danger',
        title: 'Failed to End',
        message: err?.message || 'Could not end class.',
      })
    } finally {
      setActionLoadingId(null)
    }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    showToast({
      type: 'info',
      title: 'Code Copied',
      message: `Room code ${code} copied to clipboard!`,
    })
  }

  return (
    <DashboardLayout navItems={teacherNav} title="Classes & Sessions">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Your Classes</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage classes, monitor live AI telemetry, and review session analytics</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Icons.Plus size={16} />}>
          Create Class
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        </div>
      ) : classrooms.length === 0 ? (
        <Card variant="default" className="p-12 text-center bg-white border-slate-200">
          <div className="flex justify-center mb-3 text-slate-400">
            <Icons.Video size={36} />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Classes Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't created any classes yet. Click "Create Class" above to set up your first live classroom and room code.
          </p>
          <div className="mt-4">
            <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)} leftIcon={<Icons.Plus size={16} />}>
              Create My First Class
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {classrooms.map((c) => (
            <Card key={c.id} variant="default" className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border-slate-200 shadow-sm">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${c.status === 'LIVE' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                  <Icons.Video size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/teacher/classes/${c.id}`} className="hover:underline">
                      <h3 className="text-base font-bold text-slate-900">{c.name}</h3>
                    </Link>
                    <Badge variant={c.status === 'LIVE' ? 'live' : c.status === 'ENDED' ? 'default' : 'purple'} size="sm" className="font-mono">
                      {c.class_code}
                    </Badge>
                    <Badge variant={c.status === 'LIVE' ? 'live' : c.status === 'ENDED' ? 'default' : 'info'} size="sm">
                      {c.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-3 flex-wrap">
                    <span>Subject: <strong>{c.subject}</strong></span>
                    <span>•</span>
                    <span>{c.enrolled_count} Students Enrolled</span>
                    {c.description && (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-xs">{c.description}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-end md:self-center">
                <Button variant="outline" size="sm" onClick={() => copyCode(c.class_code)} leftIcon={<Icons.Copy size={14} />}>
                  {c.class_code}
                </Button>

                <Link to={`/teacher/classes/${c.id}`}>
                  <Button variant="outline" size="sm" leftIcon={<Icons.Eye size={14} />}>
                    View
                  </Button>
                </Link>

                {c.status === 'SCHEDULED' && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleStartClass(c.id)}
                    isLoading={actionLoadingId === c.id}
                    leftIcon={<Icons.Play size={14} />}
                  >
                    Start Class
                  </Button>
                )}

                {c.status === 'LIVE' && (
                  <>
                    <Link to={`/teacher/classes/${c.id}/live`}>
                      <Button variant="primary" size="sm" leftIcon={<Icons.Video size={14} />}>
                        Live Monitor
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleEndClass(c.id)}
                      isLoading={actionLoadingId === c.id}
                      leftIcon={<Icons.Square size={14} />}
                    >
                      End Class
                    </Button>
                  </>
                )}

                <Link to={`/teacher/classes/${c.id}/analytics`}>
                  <Button variant="outline" size="sm" leftIcon={<Icons.BarChart size={14} />}>
                    Analytics
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CreateClassroomModal
        isOpen={isCreateOpen}
        onClose={() => setCreateOpen(false)}
        onClassCreated={() => loadClasses()}
      />
    </DashboardLayout>
  )
}
