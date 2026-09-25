import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { generateSessionPDFReport } from './PDFReportExporter'
import { useToast } from '@/components/ui/Toast'

const reportTrendData = [
  { time: '10:00 AM', attention: 95, confusion: 5 },
  { time: '10:15 AM', attention: 90, confusion: 10 },
  { time: '10:30 AM', attention: 64, confusion: 42 }, // Low attention & confusion spike
  { time: '10:45 AM', attention: 88, confusion: 14 },
  { time: '11:00 AM', attention: 92, confusion: 8 },
]

export default function TeacherReportsPage() {
  const { showToast } = useToast()

  const teacherNav = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Classrooms', path: '/teacher/classrooms', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Export Reports', path: '/teacher/reports', icon: <Icons.Download size={18} /> },
    { label: 'Settings', path: '/teacher/settings', icon: <Icons.Settings size={18} /> },
  ]

  const sessionSummary = {
    className: 'Quantum Physics 101 - Lecture 12',
    classCode: 'QUANTUM-101',
    instructor: 'Prof. Robert Vance',
    date: new Date().toLocaleDateString(),
    duration: '60 Minutes',
    totalStudents: 15,
    avgAttention: 84,
    avgConfusion: 16,
    students: [
      { name: 'Alex Johnson', email: 'alex@univ.edu', attention: 92, confusion: 10, status: 'Present' },
      { name: 'Sarah Miller', email: 'sarah@univ.edu', attention: 88, confusion: 14, status: 'Present' },
      { name: 'David Clark', email: 'david@univ.edu', attention: 38, confusion: 68, status: 'Present' },
      { name: 'Emma Watson', email: 'emma@univ.edu', attention: 96, confusion: 5, status: 'Present' },
      { name: 'Liam Brown', email: 'liam@univ.edu', attention: 78, confusion: 22, status: 'Present' },
    ],
  }

  const handleExportPDF = () => {
    generateSessionPDFReport(sessionSummary)
    showToast({ type: 'success', title: 'PDF Exported', message: 'Downloaded verified classroom PDF summary.' })
  }

  return (
    <DashboardLayout navItems={teacherNav} title="Classroom Performance & PDF Reports">
      <div className="space-y-6">
        {/* Top Report Header Card */}
        <Card variant="glass" glow className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="purple" size="sm">
                  PDF REPORT GENERATOR READY
                </Badge>
                <Badge variant="success" size="sm" dot font-mono>
                  100% PRIVACY VERIFIED
                </Badge>
              </div>
              <h2 className="text-2xl font-bold text-white">{sessionSummary.className}</h2>
              <p className="text-xs text-muted mt-0.5">
                Instructor: {sessionSummary.instructor} • Code: {sessionSummary.classCode} • Date: {sessionSummary.date}
              </p>
            </div>

            <Button
              variant="glow"
              size="md"
              leftIcon={<Icons.Download size={18} />}
              onClick={handleExportPDF}
            >
              Export PDF Summary
            </Button>
          </div>
        </Card>

        {/* Core Session Overview Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
          <Card variant="default" className="p-4">
            <span className="text-[10px] text-muted uppercase font-bold block">Session Duration</span>
            <span className="text-xl font-bold text-white mt-1 block">{sessionSummary.duration}</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-muted uppercase font-bold block">Total Enrolled</span>
            <span className="text-xl font-bold text-white mt-1 block">{sessionSummary.totalStudents} Students</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-muted uppercase font-bold block">Average Attention</span>
            <span className="text-xl font-bold text-success mt-1 block">{sessionSummary.avgAttention}%</span>
          </Card>

          <Card variant="default" className="p-4">
            <span className="text-[10px] text-muted uppercase font-bold block">Average Confusion</span>
            <span className="text-xl font-bold text-purple-400 mt-1 block">{sessionSummary.avgConfusion}%</span>
          </Card>
        </div>

        {/* Attention Trend Graph */}
        <Card variant="glass" className="p-6">
          <h3 className="text-base font-bold text-white mb-2">Classroom Session Attention Trend</h3>
          <p className="text-xs text-muted mb-4">Minute-by-minute aggregate attention score throughout lecture</p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2E" />
                <XAxis dataKey="time" stroke="#8A8A8E" fontSize={11} />
                <YAxis stroke="#8A8A8E" fontSize={11} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#121214', borderRadius: '8px', fontSize: '11px' }} />
                <Area type="monotone" dataKey="attention" stroke="#3ECF8E" fill="#3ECF8E" fillOpacity={0.2} name="Attention %" />
                <Area type="monotone" dataKey="confusion" stroke="#A855F7" fill="#A855F7" fillOpacity={0.2} name="Confusion %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Low Attention & Confusion Events Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="default" className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-danger">
              <Icons.AlertTriangle size={16} />
              <span>Low-Attention Period Breakdown</span>
            </div>
            <div className="p-3 rounded-xl bg-background-secondary border border-border/40 text-xs">
              <div className="font-bold text-white">10:30 AM - 10:45 AM (Min 30-45)</div>
              <div className="text-muted text-[11px] mt-0.5">
                Attention dropped to <strong className="text-danger">64%</strong> during mathematical differential proof section.
              </div>
            </div>
          </Card>

          <Card variant="default" className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
              <Icons.Sparkles size={16} />
              <span>Confusion Events Log</span>
            </div>
            <div className="p-3 rounded-xl bg-background-secondary border border-border/40 text-xs">
              <div className="font-bold text-white">10:32 AM • Confusion Spike (42%)</div>
              <div className="text-muted text-[11px] mt-0.5">
                Eyebrow furrowing and head tilt detected across 6 student telemetry streams.
              </div>
            </div>
          </Card>
        </div>

        {/* Individual Student Roster Summary Table */}
        <Card variant="glass" className="p-6">
          <h3 className="text-base font-bold text-white mb-4">Individual Student Summary Roster</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-muted">
              <thead className="bg-background-tertiary text-white uppercase text-[10px] font-bold border-b border-border/60">
                <tr>
                  <th className="p-3">Student Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Attention Score</th>
                  <th className="p-3">Confusion Score</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {sessionSummary.students.map((s, i) => (
                  <tr key={i} className="hover:bg-background-secondary/50">
                    <td className="p-3 font-semibold text-white">{s.name}</td>
                    <td className="p-3 font-mono">{s.email}</td>
                    <td className="p-3 font-mono font-bold">
                      <span className={s.attention >= 70 ? 'text-success' : 'text-danger'}>{s.attention}%</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-purple-400">{s.confusion}%</td>
                    <td className="p-3">
                      <Badge variant={s.attention >= 70 ? 'success' : 'danger'} size="sm">
                        {s.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
