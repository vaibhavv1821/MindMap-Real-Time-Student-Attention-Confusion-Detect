import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export default function StudentAttendancePage() {
  const studentNav = [
    { label: 'Overview', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Calendar size={18} /> },
    { label: 'Attendance', path: '/student/attendance', icon: <Icons.CheckCircle size={18} /> },
    { label: 'AI Reports', path: '/student/reports', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile & Settings', path: '/student/profile', icon: <Icons.Settings size={18} /> },
  ]

  const records = [
    { date: '2026-07-24', class: 'Quantum Mechanics', code: 'QUANTUM-101', status: 'Present', duration: '90 mins', score: '94%' },
    { date: '2026-07-22', class: 'Neural Networks', code: 'AI-402', status: 'Present', duration: '90 mins', score: '88%' },
    { date: '2026-07-20', class: 'Distributed Systems', code: 'CS-501', status: 'Present', duration: '90 mins', score: '92%' },
    { date: '2026-07-18', class: 'Linear Algebra', code: 'MATH-301', status: 'Present', duration: '90 mins', score: '85%' },
    { date: '2026-07-15', class: 'Quantum Mechanics', code: 'QUANTUM-101', status: 'Present', duration: '90 mins', score: '96%' },
  ]

  return (
    <DashboardLayout navItems={studentNav} title="Attendance Record">
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Attendance Summary</h3>
            <p className="text-xs text-muted">Verified by automated session camera check-in</p>
          </div>
          <Badge variant="success" size="md">96.8% Overall Attendance</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="border-b border-border/60 text-gray-300 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">AI Attention Score</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {records.map((r, idx) => (
                <tr key={idx} className="hover:bg-background-tertiary/40">
                  <td className="py-3 px-4 text-white font-mono">{r.date}</td>
                  <td className="py-3 px-4 text-white font-medium">{r.class} ({r.code})</td>
                  <td className="py-3 px-4">{r.duration}</td>
                  <td className="py-3 px-4 font-bold text-success">{r.score}</td>
                  <td className="py-3 px-4">
                    <Badge variant="success" size="sm" dot>{r.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  )
}
