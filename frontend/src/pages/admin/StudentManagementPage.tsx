import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export default function StudentManagementPage() {
  const adminNav = [
    { label: 'System Overview', path: '/admin/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Teachers Roster', path: '/admin/teachers', icon: <Icons.User size={18} /> },
    { label: 'Students Roster', path: '/admin/students', icon: <Icons.Users size={18} /> },
    { label: 'System Telemetry Logs', path: '/admin/logs', icon: <Icons.Activity size={18} /> },
    { label: 'Platform Config', path: '/admin/settings', icon: <Icons.Settings size={18} /> },
  ]

  const students = [
    { name: 'Alex Johnson', email: 'alex@univ.edu', enrolled: 4, avgAtt: '92%' },
    { name: 'Sarah Miller', email: 'sarah@univ.edu', enrolled: 3, avgAtt: '88%' },
    { name: 'David Clark', email: 'david@univ.edu', enrolled: 4, avgAtt: '74%' },
  ]

  return (
    <DashboardLayout navItems={adminNav} title="Student Accounts Directory">
      <Card variant="glass" className="p-6">
        <h3 className="text-base font-bold text-white mb-6">Registered Students</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="border-b border-border/60 text-gray-300 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Courses Enrolled</th>
                <th className="py-3 px-4">Overall Avg Attention</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {students.map((s, i) => (
                <tr key={i} className="hover:bg-background-tertiary/40">
                  <td className="py-3 px-4 text-white font-medium">{s.name}</td>
                  <td className="py-3 px-4">{s.email}</td>
                  <td className="py-3 px-4">{s.enrolled} Courses</td>
                  <td className="py-3 px-4 font-bold text-success">{s.avgAtt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardLayout>
  )
}
