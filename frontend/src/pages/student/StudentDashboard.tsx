import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { JoinClassroomModal } from './JoinClassroomModal'

export default function StudentDashboard() {
  const [isJoinModalOpen, setJoinModalOpen] = useState(false)

  const studentNav = [
    { label: 'Overview', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Calendar size={18} /> },
    { label: 'Attendance', path: '/student/attendance', icon: <Icons.CheckCircle size={18} /> },
    { label: 'Reports', path: '/student/reports', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile', path: '/student/profile', icon: <Icons.Settings size={18} /> },
  ]

  const upcomingClasses = [
    {
      id: '1',
      title: 'Quantum Physics 101',
      code: 'QUANTUM-101',
      teacher: 'Prof. Vance',
      time: '10:00 AM - 11:30 AM',
      isLive: true,
    },
    {
      id: '2',
      title: 'Neural Networks & Deep Learning',
      code: 'AI-402',
      teacher: 'Dr. Sarah Connor',
      time: '02:00 PM - 03:30 PM',
      isLive: false,
    },
    {
      id: '3',
      title: 'Distributed Systems & Microservices',
      code: 'CS-501',
      teacher: 'Dr. Alan Turing',
      time: 'Tomorrow, 09:00 AM',
      isLive: false,
    },
  ]

  return (
    <DashboardLayout navItems={studentNav} title="Student Dashboard">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Student Portal</span>
            <Badge variant="success" size="sm" dot>
              1 Live Session
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Welcome back, Alex!</h2>
          <p className="text-xs text-slate-500 mt-0.5">Quantum Physics 101 is live. Click to enter the virtual room.</p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setJoinModalOpen(true)} leftIcon={<Icons.Video size={16} />}>
          Join with Room Code
        </Button>
      </div>

      {/* Simple 4-Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="default" className="p-4">
          <div className="text-xs font-medium text-slate-500">Current Session</div>
          <div className="text-sm font-bold text-slate-900 mt-1 truncate">Quantum Physics 101</div>
          <span className="text-[11px] text-emerald-600 font-medium">In Progress</span>
        </Card>

        <Card variant="default" className="p-4">
          <div className="text-xs font-medium text-slate-500">Camera Status</div>
          <div className="text-sm font-bold text-emerald-600 mt-1">Active (Local)</div>
          <span className="text-[11px] text-slate-500">Private Processing</span>
        </Card>

        <Card variant="default" className="p-4">
          <div className="text-xs font-medium text-slate-500">Attention Score</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">92%</div>
          <span className="text-[11px] text-emerald-600 font-medium">High Focus</span>
        </Card>

        <Card variant="default" className="p-4">
          <div className="text-xs font-medium text-slate-500">Confusion Indicator</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">14%</div>
          <span className="text-[11px] text-slate-500">Normal Understanding</span>
        </Card>
      </div>

      {/* Today's Classes List */}
      <Card variant="default" className="p-5 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Today's Class Schedule</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {upcomingClasses.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-lg bg-white border border-slate-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-semibold text-blue-600">{c.code}</span>
                  {c.isLive ? (
                    <Badge variant="live" size="sm" dot>
                      LIVE NOW
                    </Badge>
                  ) : (
                    <Badge variant="default" size="sm">
                      Upcoming
                    </Badge>
                  )}
                </div>
                <h4 className="text-sm font-semibold text-slate-900">{c.title}</h4>
                <p className="text-xs text-slate-500 mt-1">{c.teacher}</p>
                <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                  <Icons.Clock size={13} />
                  <span>{c.time}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                {c.isLive ? (
                  <Link to={`/classroom/${c.code.toLowerCase()}`}>
                    <Button variant="primary" size="sm" className="w-full">
                      Enter Class
                    </Button>
                  </Link>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" disabled>
                    Not Started
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <JoinClassroomModal isOpen={isJoinModalOpen} onClose={() => setJoinModalOpen(false)} />
    </DashboardLayout>
  )
}
