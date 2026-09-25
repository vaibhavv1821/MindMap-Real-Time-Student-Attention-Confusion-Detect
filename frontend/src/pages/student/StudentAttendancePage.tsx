import React, { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { classApi, AttendanceRecord } from '@/services/classApi'

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const studentNav = [
    { label: 'Overview', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Calendar size={18} /> },
    { label: 'Attendance', path: '/student/attendance', icon: <Icons.CheckCircle size={18} /> },
    { label: 'AI Reports', path: '/student/reports', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile & Settings', path: '/student/profile', icon: <Icons.Settings size={18} /> },
  ]

  useEffect(() => {
    classApi
      .getStudentAttendance()
      .then((data) => setRecords(data))
      .catch(() => setRecords([]))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <DashboardLayout navItems={studentNav} title="Attendance Record">
      <Card variant="default" className="p-6 bg-white border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Attendance & Session Participation</h3>
            <p className="text-xs text-slate-500">Verified by real classroom WebSocket telemetry and session records in MongoDB</p>
          </div>
          <Badge variant="purple" size="md">
            {records.length} Sessions Logged
          </Badge>
        </div>

        {isLoading ? (
          <div className="flex h-36 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Icons.CheckCircle size={36} className="mx-auto text-slate-300 mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No Attendance Records Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              When you join and participate in a live classroom, your attendance and focus telemetry will be automatically recorded here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider bg-slate-50">
                <tr>
                  <th className="py-3 px-4">Joined At</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Instructor</th>
                  <th className="py-3 px-4">Avg Attention</th>
                  <th className="py-3 px-4">Avg Confusion</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {new Date(r.joined_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {r.class_name} <span className="font-mono text-blue-600">({r.class_code})</span>
                    </td>
                    <td className="py-3 px-4">{r.teacher_name}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      {r.avg_attention > 0 ? `${r.avg_attention}%` : '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-purple-600">
                      {r.avg_confusion > 0 ? `${r.avg_confusion}%` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={r.status === 'PRESENT' ? 'success' : 'default'} size="sm" dot>
                        {r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </DashboardLayout>
  )
}
