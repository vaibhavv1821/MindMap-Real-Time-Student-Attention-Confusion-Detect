import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export default function ManageClassroomsPage() {
  const teacherNav = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Classrooms', path: '/teacher/classrooms', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Export Reports', path: '/teacher/reports', icon: <Icons.Download size={18} /> },
    { label: 'Settings', path: '/teacher/settings', icon: <Icons.Settings size={18} /> },
  ]

  const classrooms = [
    { name: 'Quantum Physics 101', code: 'QUANTUM-101', students: 34, schedule: 'Mon, Wed 10:00 AM' },
    { name: 'Neural Networks & AI', code: 'CS-402', students: 28, schedule: 'Tue, Thu 02:00 PM' },
    { name: 'Distributed Systems', code: 'CS-501', students: 42, schedule: 'Fri 09:00 AM' },
  ]

  return (
    <DashboardLayout navItems={teacherNav} title="Manage Classrooms">
      <div className="space-y-4">
        {classrooms.map((c, i) => (
          <Card key={i} variant="glass" className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-accent/10 text-accent">
                <Icons.Video size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{c.name}</h3>
                  <Badge variant="purple" size="sm" className="font-mono">{c.code}</Badge>
                </div>
                <div className="text-xs text-muted mt-1 flex items-center gap-3">
                  <span>{c.students} Students Enrolled</span>
                  <span>•</span>
                  <span>{c.schedule}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" leftIcon={<Icons.Copy size={16} />}>
                Copy Code
              </Button>
              <Button variant="secondary" size="sm" leftIcon={<Icons.Settings size={16} />}>
                Edit Settings
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
