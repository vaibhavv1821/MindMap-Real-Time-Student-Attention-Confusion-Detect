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
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { generateSessionPDFReport } from '../teacher/PDFReportExporter'
import { useToast } from '@/components/ui/Toast'

const attentionData = [
  { time: '00m', attention: 95, confusion: 5 },
  { time: '15m', attention: 90, confusion: 10 },
  { time: '30m', attention: 75, confusion: 25 },
  { time: '45m', attention: 88, confusion: 12 },
  { time: '60m', attention: 94, confusion: 6 },
  { time: '75m', attention: 82, confusion: 18 },
  { time: '90m', attention: 91, confusion: 9 },
]

const subjectData = [
  { subject: 'Quantum Physics', score: 94 },
  { subject: 'Deep Learning', score: 88 },
  { subject: 'Microservices', score: 91 },
  { subject: 'Linear Algebra', score: 85 },
]

export default function StudentReportsPage() {
  const { showToast } = useToast()

  const studentNav = [
    { label: 'Overview', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Calendar size={18} /> },
    { label: 'Attendance', path: '/student/attendance', icon: <Icons.CheckCircle size={18} /> },
    { label: 'AI Reports', path: '/student/reports', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile & Settings', path: '/student/profile', icon: <Icons.Settings size={18} /> },
  ]

  const handleExportPDF = () => {
    generateSessionPDFReport({
      className: 'Quantum Physics 101 - Personal Student Report',
      classCode: 'QUANTUM-101',
      instructor: 'Prof. Robert Vance',
      date: new Date().toLocaleDateString(),
      totalStudents: 1,
      avgAttention: 88,
      avgConfusion: 12,
      students: [
        { name: 'Alex Johnson (You)', email: 'alex@univ.edu', attention: 88, confusion: 12, status: 'Present' },
      ],
    })
    showToast({ type: 'success', title: 'Report Exported', message: 'Downloaded your personal focus report.' })
  }

  return (
    <DashboardLayout navItems={studentNav} title="Personal AI Analytics & Session Reports">
      <div className="space-y-6">
        {/* Top Personal Summary Header */}
        <Card variant="glass" glow className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="success" size="sm" dot font-mono>
                  PERSONAL FOCUS REPORT
                </Badge>
                <Badge variant="purple" size="sm">
                  100% PRIVACY PRESERVED
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white">Quantum Physics 101 Performance</h2>
              <p className="text-xs text-muted mt-0.5">
                Session Duration: 60 Minutes • Average Focus: 88% • Confusion Spikes: 2
              </p>
            </div>

            <Button
              variant="glow"
              size="md"
              leftIcon={<Icons.Download size={18} />}
              onClick={handleExportPDF}
            >
              Export My PDF Report
            </Button>
          </div>
        </Card>

        {/* Core Personal Stat Counters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
          <Card variant="default" className="p-4">
            <span className="text-[10px] text-muted uppercase font-bold block">Session Duration</span>
            <span className="text-xl font-bold text-white mt-1 block">60 Minutes</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-muted uppercase font-bold block">My Avg Attention</span>
            <span className="text-xl font-bold text-success mt-1 block">88%</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-muted uppercase font-bold block">Confusion Events</span>
            <span className="text-xl font-bold text-purple-400 mt-1 block">2 Events</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-muted uppercase font-bold block">Classroom Rank</span>
            <span className="text-xl font-bold text-accent mt-1 block">Top 15%</span>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timeline Chart */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Personal Attention vs Confusion Timeline</h3>
                <p className="text-xs text-muted">Session focus dynamics calculated in-browser</p>
              </div>
              <Badge variant="purple" size="sm">Personal Stream</Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attentionData}>
                  <defs>
                    <linearGradient id="colorAtt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3ECF8E" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3ECF8E" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorConf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#A855F7" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#A855F7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                  <XAxis dataKey="time" stroke="#8A8A8E" fontSize={11} />
                  <YAxis stroke="#8A8A8E" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121214', borderColor: '#2A2A2E', borderRadius: '12px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="attention" stroke="#3ECF8E" fillOpacity={1} fill="url(#colorAtt)" name="Attention %" />
                  <Area type="monotone" dataKey="confusion" stroke="#A855F7" fillOpacity={1} fill="url(#colorConf)" name="Confusion %" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Subject Breakdown Bar Chart */}
          <Card variant="glass" className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Attention Score by Subject</h3>
                <p className="text-xs text-muted">Semester subject focus performance</p>
              </div>
              <Badge variant="success" size="sm">High Focus</Badge>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                  <XAxis dataKey="subject" stroke="#8A8A8E" fontSize={11} />
                  <YAxis stroke="#8A8A8E" fontSize={11} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121214', borderColor: '#2A2A2E', borderRadius: '12px', color: '#fff' }}
                  />
                  <Bar dataKey="score" fill="#4F8CFF" radius={[8, 8, 0, 0]} name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
