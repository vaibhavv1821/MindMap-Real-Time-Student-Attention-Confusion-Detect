import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { classApi, ClassItem, StudentRoster } from '@/services/classApi'
import { useToast } from '@/components/ui/Toast'

export default function TeacherClassDetailPage() {
  const { classId } = useParams<{ classId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [classData, setClassData] = useState<ClassItem | null>(null)
  const [students, setStudents] = useState<StudentRoster[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (classId) {
      loadClassInfo(classId)
    }
  }, [classId])

  const loadClassInfo = async (id: string) => {
    try {
      setIsLoading(true)
      const [details, roster] = await Promise.all([
        classApi.getClassDetails(id),
        classApi.getClassStudents(id),
      ])
      setClassData(details)
      setStudents(roster)
    } catch (err: any) {
      showToast({ type: 'danger', title: 'Error', message: err.message || 'Failed to load classroom details' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartClass = async () => {
    if (!classData) return
    try {
      setIsStarting(true)
      const updated = await classApi.startClass(classData.id)
      setClassData(updated)
      showToast({ type: 'success', title: 'Class Started', message: `${updated.name} is now LIVE.` })
      navigate(`/teacher/classes/${classData.id}/live`)
    } catch (err: any) {
      showToast({ type: 'danger', title: 'Start Failed', message: err.message || 'Could not start session' })
    } finally {
      setIsStarting(false)
    }
  }

  const handleCopyCode = () => {
    if (!classData?.class_code) return
    navigator.clipboard.writeText(classData.class_code)
    showToast({ type: 'success', title: 'Room Code Copied', message: classData.class_code })
  }

  return (
    <DashboardLayout title={classData ? classData.name : 'Classroom Details'}>
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/teacher/classes" className="hover:text-slate-900 transition-colors">
            Classes
          </Link>
          <Icons.ChevronRight size={14} />
          <span className="font-semibold text-slate-900">{classData?.name || 'Classroom'}</span>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : !classData ? (
          <Card variant="glass" className="p-8 text-center space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Classroom Not Found</h3>
            <p className="text-sm text-slate-500">The requested classroom does not exist or has been removed.</p>
            <Button variant="primary" onClick={() => navigate('/teacher/classes')}>
              Back to Classes
            </Button>
          </Card>
        ) : (
          <>
            {/* Header Card */}
            <Card variant="glass" className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant={classData.status === 'LIVE' ? 'success' : classData.status === 'ENDED' ? 'default' : 'purple'} size="sm">
                      {classData.status}
                    </Badge>
                    <span className="text-xs text-slate-500 font-medium">Subject: {classData.subject}</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">{classData.name}</h2>
                  {classData.description && (
                    <p className="text-xs text-slate-600 mt-1 max-w-xl">{classData.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-slate-500 font-semibold uppercase">Room Code:</span>
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 font-mono text-xs font-bold text-slate-800 transition-colors"
                      title="Click to copy room code"
                    >
                      <span>{classData.class_code}</span>
                      <Icons.Copy size={13} className="text-slate-500" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {classData.status === 'LIVE' ? (
                    <Button
                      variant="glow"
                      size="md"
                      leftIcon={<Icons.Video size={16} />}
                      onClick={() => navigate(`/teacher/classes/${classData.id}/live`)}
                    >
                      Enter Live Monitoring
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="md"
                      leftIcon={<Icons.Play size={16} />}
                      isLoading={isStarting}
                      onClick={handleStartClass}
                    >
                      Start Class
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="md"
                    leftIcon={<Icons.BarChart size={16} />}
                    onClick={() => navigate(`/teacher/classes/${classData.id}/analytics`)}
                  >
                    View Analytics
                  </Button>
                </div>
              </div>
            </Card>

            {/* KPI Counters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
              <Card variant="default" className="p-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Enrolled Students</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{students.length}</span>
              </Card>

              <Card variant="default" className="p-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Active In Session</span>
                <span className="text-2xl font-bold text-blue-600 mt-1 block">
                  {students.filter((s) => s.connection_status === 'ONLINE').length}
                </span>
              </Card>

              <Card variant="default" className="p-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Avg Attention</span>
                <span className="text-2xl font-bold text-emerald-600 mt-1 block">
                  {classData.avg_attention ? `${Math.round(classData.avg_attention)}%` : '85%'}
                </span>
              </Card>

              <Card variant="default" className="p-4">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Avg Confusion</span>
                <span className="text-2xl font-bold text-purple-600 mt-1 block">
                  {classData.avg_confusion ? `${Math.round(classData.avg_confusion)}%` : '15%'}
                </span>
              </Card>
            </div>

            {/* Enrolled Students Roster */}
            <Card variant="glass" className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Enrolled Students</h3>
                  <p className="text-xs text-slate-500">Students registered in this classroom via room code</p>
                </div>
                <Badge variant="default" size="sm">
                  {students.length} Total
                </Badge>
              </div>

              {students.length === 0 ? (
                <div className="py-8 text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <Icons.Users size={20} />
                  </div>
                  <p className="text-xs text-slate-500">No students enrolled yet.</p>
                  <p className="text-[11px] text-slate-400">
                    Share room code <strong className="font-mono text-slate-800">{classData.class_code}</strong> with your students to let them join.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Student Name</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Attention Score</th>
                        <th className="p-3">Confusion Score</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {students.map((s, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-semibold text-slate-900">{s.name}</td>
                          <td className="p-3 font-mono text-slate-600">{s.email}</td>
                          <td className="p-3 font-mono font-bold">
                            <span className={(s.avg_attention ?? 85) >= 70 ? 'text-emerald-600' : 'text-red-600'}>
                              {s.avg_attention ?? 85}%
                            </span>
                          </td>
                          <td className="p-3 font-mono font-bold text-purple-600">
                            {s.avg_confusion ?? 15}%
                          </td>
                          <td className="p-3">
                            <Badge variant={s.connection_status === 'ONLINE' ? 'success' : 'default'} size="sm">
                              {s.connection_status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
