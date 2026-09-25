import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { LectureTimeline } from './components/LectureTimeline'

const classroomMetrics = [
  { time: '10:00', attention: 92, confusion: 8 },
  { time: '10:15', attention: 88, confusion: 12 },
  { time: '10:30', attention: 68, confusion: 32 }, // Confusion spike
  { time: '10:45', attention: 85, confusion: 15 },
  { time: '11:00', attention: 94, confusion: 6 },
  { time: '11:15', attention: 90, confusion: 10 },
]

export default function TeacherAnalyticsPage() {
  const teacherNav = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Classrooms', path: '/teacher/classrooms', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Export Reports', path: '/teacher/reports', icon: <Icons.Download size={18} /> },
    { label: 'Settings', path: '/teacher/settings', icon: <Icons.Settings size={18} /> },
  ]

  return (
    <DashboardLayout navItems={teacherNav} title="Classroom Attention & Confusion Analytics">
      <div className="space-y-6">
        {/* PART D: Lecture Engagement Diagnostic Timeline */}
        <LectureTimeline />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Classroom Engagement Heatmap</h3>
                <p className="text-xs text-muted">Spike at 10:30 AM indicates topic confusion</p>
              </div>
              <Badge variant="danger" size="sm">1 Spike Detected</Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={classroomMetrics}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                  <XAxis dataKey="time" stroke="#8A8A8E" fontSize={11} />
                  <YAxis stroke="#8A8A8E" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121214', borderColor: '#2A2A2E', borderRadius: '12px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="attention" stroke="#3ECF8E" fill="#3ECF8E" fillOpacity={0.2} name="Avg Attention %" />
                  <Area type="monotone" dataKey="confusion" stroke="#F5484D" fill="#F5484D" fillOpacity={0.3} name="Confusion Spike %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Student Attention Distribution</h3>
                <p className="text-xs text-muted">15 active students grouped by focus level</p>
              </div>
              <Badge variant="success" size="sm">88% Highly Engaged</Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { category: 'High (70-100%)', count: 10 },
                    { category: 'Medium (40-69%)', count: 3 },
                    { category: 'Low (< 40%)', count: 2 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                  <XAxis dataKey="category" stroke="#8A8A8E" fontSize={11} />
                  <YAxis stroke="#8A8A8E" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121214', borderColor: '#2A2A2E', borderRadius: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="count" fill="#4F8CFF" radius={[8, 8, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
