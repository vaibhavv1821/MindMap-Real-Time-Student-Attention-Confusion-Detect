import React, { useState } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'
import { useAuthContext } from '@/context/AuthContext'
import { useToast } from '@/components/ui/Toast'

export default function TeacherProfilePage() {
  const { user } = useAuthContext()
  const { showToast } = useToast()
  const [confusionThreshold, setConfusionThreshold] = useState('45')
  const [attentionThreshold, setAttentionThreshold] = useState('40')

  const teacherNav = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Classrooms', path: '/teacher/classrooms', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Export Reports', path: '/teacher/reports', icon: <Icons.Download size={18} /> },
    { label: 'Settings', path: '/teacher/settings', icon: <Icons.Settings size={18} /> },
  ]

  const handleSave = () => {
    showToast({ type: 'success', title: 'Settings Saved', message: 'Teacher threshold preferences updated.' })
  }

  return (
    <DashboardLayout navItems={teacherNav} title="Teacher Profile & Settings">
      <div className="max-w-3xl space-y-6">
        <Card variant="default" className="p-6 flex items-center gap-6 bg-white border-slate-200 shadow-sm">
          <Avatar name={user?.name || 'Teacher'} size="xl" status="online" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name || 'Instructor Account'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'teacher@mindmap.edu'}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="purple" size="sm">
                {(user?.role || 'TEACHER').toUpperCase()}
              </Badge>
              <Badge variant="success" size="sm" dot>
                MongoDB Atlas Verified
              </Badge>
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-6 space-y-4 bg-white border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-2">Account Credentials</h3>
          <Input label="Full Name" value={user?.name || ''} readOnly leftIcon={<Icons.User size={18} />} />
          <Input label="Email Address" value={user?.email || ''} readOnly leftIcon={<Icons.Mail size={18} />} />

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-2">Classroom Alert Thresholds</h3>
            <div className="space-y-3">
              <Input
                label="Confusion Alert Sensitivity Threshold (%)"
                value={confusionThreshold}
                onChange={(e) => setConfusionThreshold(e.target.value)}
                leftIcon={<Icons.AlertTriangle size={18} />}
              />
              <Input
                label="Low Attention Warning Threshold (%)"
                value={attentionThreshold}
                onChange={(e) => setAttentionThreshold(e.target.value)}
                leftIcon={<Icons.Brain size={18} />}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="primary" size="md" onClick={handleSave}>
              Save Teacher Settings
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
