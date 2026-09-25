import React from 'react'
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
    <DashboardLayout navItems={teacherNav} title="Teacher Settings & Thresholds">
      <div className="max-w-3xl space-y-6">
        <Card variant="glass" className="p-6 flex items-center gap-6">
          <Avatar name={user?.name || 'Prof. Robert Vance'} size="xl" status="online" />
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name || 'Prof. Robert Vance'}</h2>
            <p className="text-xs text-muted mt-0.5">{user?.email || 'vance@university.edu'}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="purple" size="sm">FACULTY INSTRUCTOR</Badge>
              <Badge variant="success" size="sm" dot font-mono>Pro Tier</Badge>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6 space-y-4">
          <h3 className="text-base font-bold text-white mb-2">Classroom Alert Thresholds</h3>
          
          <Input label="Confusion Alert Sensitivity Threshold (%)" defaultValue="45" leftIcon={<Icons.AlertTriangle size={18} />} />
          <Input label="Low Attention Warning Threshold (%)" defaultValue="40" leftIcon={<Icons.Brain size={18} />} />

          <div className="pt-4 border-t border-border/40">
            <h3 className="text-base font-bold text-white mb-2">Notification Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary border border-border/60 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-white">Live Audio Chime on Confusion Spike</div>
                  <div className="text-[10px] text-muted">Play a subtle audio notification when &gt; 25% of class is confused</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-accent h-4 w-4" />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="glow" size="md" onClick={handleSave}>
              Save Teacher Settings
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
