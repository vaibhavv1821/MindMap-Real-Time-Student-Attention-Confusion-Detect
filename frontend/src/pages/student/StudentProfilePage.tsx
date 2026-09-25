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

export default function StudentProfilePage() {
  const { user } = useAuthContext()
  const { showToast } = useToast()

  const studentNav = [
    { label: 'Overview', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Calendar size={18} /> },
    { label: 'Attendance', path: '/student/attendance', icon: <Icons.CheckCircle size={18} /> },
    { label: 'AI Reports', path: '/student/reports', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile & Settings', path: '/student/profile', icon: <Icons.Settings size={18} /> },
  ]

  const handleSave = () => {
    showToast({ type: 'success', title: 'Settings Saved', message: 'Profile & privacy updated.' })
  }

  return (
    <DashboardLayout navItems={studentNav} title="Profile & Preferences">
      <div className="max-w-3xl space-y-6">
        <Card variant="glass" className="p-6 flex items-center gap-6">
          <Avatar name={user?.name || 'Alex Johnson'} size="xl" status="online" />
          <div>
            <h2 className="text-xl font-bold text-white">{user?.name || 'Alex Johnson'}</h2>
            <p className="text-xs text-muted mt-0.5">{user?.email || 'alex.j@university.edu'}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="purple" size="sm">STUDENT</Badge>
              <Badge variant="success" size="sm" dot>Privacy Mode On</Badge>
            </div>
          </div>
        </Card>

        <Card variant="glass" className="p-6 space-y-4">
          <h3 className="text-base font-bold text-white mb-2">Account Details</h3>
          <Input label="Full Name" defaultValue={user?.name || 'Alex Johnson'} leftIcon={<Icons.User size={18} />} />
          <Input label="Email Address" defaultValue={user?.email || 'alex.j@university.edu'} leftIcon={<Icons.Mail size={18} />} readOnly />

          <div className="pt-4 border-t border-border/40">
            <h3 className="text-base font-bold text-white mb-2">MediaPipe AI & Privacy Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary border border-border/60 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-white">Client-Side Only Processing</div>
                  <div className="text-[10px] text-muted">Never upload webcam frames or raw images to cloud</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-accent h-4 w-4" />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary border border-border/60 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-white">Live Blink Rate & Eye Tracking</div>
                  <div className="text-[10px] text-muted">Enable micro blink rate count to improve confusion accuracy</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-accent h-4 w-4" />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="glow" size="md" onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
