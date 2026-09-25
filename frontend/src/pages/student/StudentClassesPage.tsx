import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export default function StudentClassesPage() {
  const studentNav = [
    { label: 'Overview', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Calendar size={18} /> },
    { label: 'Attendance', path: '/student/attendance', icon: <Icons.CheckCircle size={18} /> },
    { label: 'AI Reports', path: '/student/reports', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile & Settings', path: '/student/profile', icon: <Icons.Settings size={18} /> },
  ]

  const classes = [
    { code: 'QUANTUM-101', title: 'Quantum Mechanics & Wave Functions', instructor: 'Prof. Vance', score: '94%', sessions: '12/12' },
    { code: 'AI-402', title: 'Neural Networks & Deep Learning', instructor: 'Dr. Sarah Connor', score: '88%', sessions: '10/10' },
    { code: 'CS-501', title: 'Distributed Systems & Microservices', instructor: 'Dr. Alan Turing', score: '91%', sessions: '14/15' },
    { code: 'MATH-301', title: 'Linear Algebra & Vector Calculus', instructor: 'Prof. Euler', score: '85%', sessions: '8/8' },
  ]

  return (
    <DashboardLayout navItems={studentNav} title="My Enrolled Classes">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {classes.map((item, idx) => (
          <Card key={idx} variant="glass" className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant="purple" size="sm" className="font-mono">{item.code}</Badge>
                <Badge variant="success" size="sm">Active Semester</Badge>
              </div>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-xs text-muted mt-1">Instructor: {item.instructor}</p>

              <div className="mt-4 grid grid-cols-2 gap-3 pt-3 border-t border-border/40 text-xs">
                <div>
                  <span className="text-muted">Avg Attention:</span>
                  <div className="font-bold text-success text-sm">{item.score}</div>
                </div>
                <div>
                  <span className="text-muted">Sessions Attended:</span>
                  <div className="font-bold text-white text-sm">{item.sessions}</div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Button variant="outline" size="sm" className="w-full">
                View Class Syllabus & History
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
