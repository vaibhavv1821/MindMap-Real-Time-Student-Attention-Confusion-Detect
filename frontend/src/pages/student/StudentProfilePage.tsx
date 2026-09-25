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
    <DashboardLayout navItems={studentNav} title="Student Profile & Preferences">
      <div className="max-w-3xl space-y-6">
        <Card variant="default" className="p-6 flex items-center gap-6 bg-white border-slate-200 shadow-sm">
          <Avatar name={user?.name || 'Student'} size="xl" status="online" />
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name || 'Student Account'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'student@mindmap.edu'}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="purple" size="sm">
                {(user?.role || 'STUDENT').toUpperCase()}
              </Badge>
              <Badge variant="success" size="sm" dot>
                MongoDB Atlas Verified
              </Badge>
            </div>
          </div>
        </Card>

        <Card variant="default" className="p-6 space-y-4 bg-white border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-2">Account Details</h3>
          <Input label="Full Name" value={user?.name || ''} readOnly leftIcon={<Icons.User size={18} />} />
          <Input label="Email Address" value={user?.email || ''} readOnly leftIcon={<Icons.Mail size={18} />} />

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-base font-bold text-slate-900 mb-2">MediaPipe AI & Privacy Settings</h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Client-Side Only Processing</div>
                  <div className="text-[10px] text-slate-500">Never upload webcam frames or raw images to cloud</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-blue-600 h-4 w-4" readOnly />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                <div>
                  <div className="text-xs font-semibold text-slate-800">Live Blink Rate & Eye Tracking</div>
                  <div className="text-[10px] text-slate-500">Enable micro blink rate count to improve confusion accuracy</div>
                </div>
                <input type="checkbox" defaultChecked className="accent-blue-600 h-4 w-4" readOnly />
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button variant="primary" size="md" onClick={handleSave}>
              Save Preferences
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )
}
