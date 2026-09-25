import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'

export default function TeacherManagementPage() {
  const adminNav = [
    { label: 'System Overview', path: '/admin/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Teachers Roster', path: '/admin/teachers', icon: <Icons.User size={18} /> },
    { label: 'Students Roster', path: '/admin/students', icon: <Icons.Users size={18} /> },
    { label: 'System Telemetry Logs', path: '/admin/logs', icon: <Icons.Activity size={18} /> },
    { label: 'Platform Config', path: '/admin/settings', icon: <Icons.Settings size={18} /> },
  ]

  const teachers = [
    { name: 'Dr. Robert Vance', email: 'vance@univ.edu', department: 'Physics', classes: 3, status: 'Active' },
    { name: 'Dr. Sarah Connor', email: 'sarah@univ.edu', department: 'Computer Science', classes: 4, status: 'Active' },
    { name: 'Prof. Alan Turing', email: 'turing@univ.edu', department: 'Software Engineering', classes: 2, status: 'Active' },
  ]

  return (
    <DashboardLayout navItems={adminNav} title="Teacher User Management">
      <Card variant="glass" className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-bold text-white">Faculty Members Roster</h3>
          <Button variant="glow" size="sm" leftIcon={<Icons.Plus size={16} />}>
            Add Faculty Member
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-muted">
            <thead className="border-b border-border/60 text-gray-300 font-semibold uppercase">
              <tr>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Active Classes</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {teachers.map((t, i) => (
                <tr key={i} className="hover:bg-background-tertiary/40">
                  <td className="py-3 px-4 text-white font-medium">{t.name}</td>
                  <td className="py-3 px-4">{t.email}</td>
                  <td className="py-3 px-4">{t.department}</td>
                  <td className="py-3 px-4 font-bold text-accent">{t.classes} Rooms</td>
                  <td className="py-3 px-4">
                    <Badge variant="success" size="sm" dot>{t.status}</Badge>
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
