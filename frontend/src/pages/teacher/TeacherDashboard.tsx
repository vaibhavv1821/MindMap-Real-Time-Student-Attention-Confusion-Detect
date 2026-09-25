import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
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
import { Input } from '@/components/ui/Input'
import { Avatar } from '@/components/ui/Avatar'
import { Modal } from '@/components/ui/Modal'
import { Icons } from '@/components/ui/Icons'
import { CreateClassroomModal } from './CreateClassroomModal'
import { generateSessionPDFReport } from './PDFReportExporter'
import {
  classroomSimulator,
  SimulatedStudent,
  ClassroomSummaryStats,
} from '@/services/classroomSimulator'
import { useToast } from '@/components/ui/Toast'

export default function TeacherDashboard() {
  const { showToast } = useToast()
  const [isCreateModalOpen, setCreateModalOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<SimulatedStudent | null>(null)

  // Simulation State
  const [students, setStudents] = useState<SimulatedStudent[]>([])
  const [stats, setStats] = useState<ClassroomSummaryStats>({
    totalStudents: 15,
    avgAttention: 84,
    avgConfusion: 14,
    focusedCount: 10,
    moderateCount: 3,
    lowFocusCount: 2,
    confusedCount: 3,
    handRaisedCount: 2,
    onlineCount: 14,
  })

  // Filtering & Sorting State
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTab, setFilterTab] = useState<'ALL' | 'FOCUSED' | 'MODERATE' | 'LOW' | 'CONFUSED' | 'HAND'>('ALL')
  const [sortBy, setSortBy] = useState<'ATTENTION_ASC' | 'ATTENTION_DESC' | 'CONFUSION_DESC' | 'NAME'>('ATTENTION_ASC')

  useEffect(() => {
    const unsubscribe = classroomSimulator.subscribe((newStudents, newStats) => {
      setStudents(newStudents)
      setStats(newStats)

      if (selectedStudent) {
        const updated = newStudents.find((s) => s.id === selectedStudent.id)
        if (updated) setSelectedStudent(updated)
      }
    })

    return () => unsubscribe()
  }, [selectedStudent])

  const teacherNav = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Classrooms', path: '/teacher/classrooms', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Export Reports', path: '/teacher/reports', icon: <Icons.Download size={18} /> },
    { label: 'Settings', path: '/teacher/settings', icon: <Icons.Settings size={18} /> },
  ]

  const handleExportPDF = () => {
    generateSessionPDFReport({
      className: 'Quantum Physics 101',
      classCode: 'QUANTUM-101',
      instructor: 'Prof. Robert Vance',
      date: new Date().toLocaleDateString(),
      totalStudents: stats.totalStudents,
      avgAttention: stats.avgAttention,
      avgConfusion: stats.avgConfusion,
      students: students.map((s) => ({
        name: s.name,
        email: s.email,
        attention: s.attentionScore,
        confusion: s.confusionScore,
        status: s.connectionStatus === 'ONLINE' ? 'Present' : 'Absent',
      })),
    })
    showToast({ type: 'success', title: 'Report Downloaded', message: 'Session PDF report exported successfully.' })
  }

  // Filter & Sort Logic
  const filteredStudents = students
    .filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false

      if (filterTab === 'FOCUSED') return s.status === 'FOCUSED'
      if (filterTab === 'MODERATE') return s.status === 'MODERATE'
      if (filterTab === 'LOW') return s.status === 'LOW_FOCUS'
      if (filterTab === 'CONFUSED') return s.status === 'CONFUSED' || s.confusionScore > 50
      if (filterTab === 'HAND') return s.isHandRaised
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'ATTENTION_ASC') return a.attentionScore - b.attentionScore
      if (sortBy === 'ATTENTION_DESC') return b.attentionScore - a.attentionScore
      if (sortBy === 'CONFUSION_DESC') return b.confusionScore - a.confusionScore
      return a.name.localeCompare(b.name)
    })

  return (
    <DashboardLayout navItems={teacherNav} title="Classroom Dashboard">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Live Classroom</span>
            <Badge variant="success" size="sm" dot>
              QUANTUM-101
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-slate-900">Quantum Physics 101</h2>
          <p className="text-xs text-slate-500 mt-0.5">Instructor: Prof. Robert Vance • 15 Enrolled Students</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCreateModalOpen(true)} leftIcon={<Icons.Plus size={16} />}>
            New Class
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportPDF} leftIcon={<Icons.Download size={16} />}>
            Export PDF
          </Button>
        </div>
      </div>

      {/* 2. Simple 4-Metric Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="default" className="p-4">
          <div className="text-xs font-medium text-slate-500">Class Average Attention</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.avgAttention}%</div>
          <span className="text-[11px] text-slate-500">Target $\ge 75\%$</span>
        </Card>

        <Card variant="default" className="p-4">
          <div className="text-xs font-medium text-slate-500">Connected Students</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.onlineCount} / {stats.totalStudents}</div>
          <span className="text-[11px] text-emerald-600 font-medium">14 Active</span>
        </Card>

        <Card variant="default" className="p-4">
          <div className="text-xs font-medium text-slate-500">Low Attention (&lt; 40%)</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.lowFocusCount}</div>
          <span className="text-[11px] text-red-600 font-medium">Requires Attention</span>
        </Card>

        <Card variant="default" className="p-4">
          <div className="text-xs font-medium text-slate-500">Confusion Spikes</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.confusedCount}</div>
          <span className="text-[11px] text-amber-700 font-medium">Section Clarification</span>
        </Card>
      </div>

      {/* 3. Live Classroom Student Roster Table */}
      <Card variant="default" className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Live Classroom Students</h3>
            <p className="text-xs text-slate-500">Real-time student focus levels derived in-browser</p>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Filter by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-44 text-xs"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-blue-500"
            >
              <option value="ATTENTION_ASC">Sort: Low Attention First</option>
              <option value="ATTENTION_DESC">Sort: High Attention First</option>
              <option value="CONFUSION_DESC">Sort: High Confusion First</option>
              <option value="NAME">Sort: Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-medium text-slate-600">
          {[
            { id: 'ALL', label: `All (${students.length})` },
            { id: 'FOCUSED', label: `Focused (${stats.focusedCount})` },
            { id: 'MODERATE', label: `Moderate (${stats.moderateCount})` },
            { id: 'LOW', label: `Low Focus (${stats.lowFocusCount})` },
            { id: 'CONFUSED', label: `Confused (${stats.confusedCount})` },
            { id: 'HAND', label: `Hand Raised (${stats.handRaisedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterTab === tab.id
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Minimal Clean Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Student</th>
                <th className="py-2.5 px-3">Attention Score</th>
                <th className="py-2.5 px-3">Confusion Score</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredStudents.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={s.name} size="sm" />
                      <div>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{s.name}</span>
                          {s.isHandRaised && <Icons.Hand size={14} className="text-amber-600" />}
                        </div>
                        <div className="text-[11px] text-slate-400">{s.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold font-mono text-xs ${
                          s.attentionScore >= 70
                            ? 'text-emerald-700'
                            : s.attentionScore >= 40
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {s.attentionScore}%
                      </span>
                      <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            s.attentionScore >= 70
                              ? 'bg-emerald-600'
                              : s.attentionScore >= 40
                              ? 'bg-amber-500'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${s.attentionScore}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-3 font-mono font-medium text-slate-700">{s.confusionScore}%</td>

                  <td className="py-3 px-3">
                    <Badge
                      variant={
                        s.status === 'FOCUSED'
                          ? 'success'
                          : s.status === 'MODERATE'
                          ? 'warning'
                          : 'danger'
                      }
                      size="sm"
                    >
                      {s.status}
                    </Badge>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button className="text-blue-600 hover:text-blue-800 font-medium">Inspect</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Student Inspector Modal */}
      {selectedStudent && (
        <Modal
          isOpen={!!selectedStudent}
          onClose={() => setSelectedStudent(null)}
          title={`Student Telemetry: ${selectedStudent.name}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3">
                <Avatar name={selectedStudent.name} size="md" />
                <div>
                  <div className="font-bold text-slate-900 text-sm">{selectedStudent.name}</div>
                  <div className="text-xs text-slate-500">{selectedStudent.email}</div>
                </div>
              </div>
              <Badge
                variant={selectedStudent.attentionScore >= 70 ? 'success' : 'danger'}
                size="md"
              >
                {selectedStudent.attentionScore}% Attention
              </Badge>
            </div>

            <Card variant="bordered" className="p-3">
              <h5 className="text-xs font-semibold text-slate-700 mb-2">Attention History</h5>
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedStudent.history.map((score, i) => ({ step: `t-${7 - i}`, score }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="step" stroke="#64748B" fontSize={10} />
                    <YAxis stroke="#64748B" fontSize={10} domain={[0, 100]} />
                    <Tooltip />
                    <Area type="monotone" dataKey="score" stroke="#2563EB" fill="#2563EB" fillOpacity={0.1} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <CreateClassroomModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />
    </DashboardLayout>
  )
}
