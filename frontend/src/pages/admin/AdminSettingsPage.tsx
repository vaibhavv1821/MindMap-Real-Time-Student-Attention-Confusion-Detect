import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icons } from '@/components/ui/Icons'
import { useToast } from '@/components/ui/Toast'

export default function AdminSettingsPage() {
  const { showToast } = useToast()

  const adminNav = [
    { label: 'System Overview', path: '/admin/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Teachers Roster', path: '/admin/teachers', icon: <Icons.User size={18} /> },
    { label: 'Students Roster', path: '/admin/students', icon: <Icons.Users size={18} /> },
    { label: 'System Telemetry Logs', path: '/admin/logs', icon: <Icons.Activity size={18} /> },
    { label: 'Platform Config', path: '/admin/settings', icon: <Icons.Settings size={18} /> },
  ]

  const handleSave = () => {
    showToast({ type: 'success', title: 'System Config Saved', message: 'Global AI parameters updated.' })
  }

  return (
    <DashboardLayout navItems={adminNav} title="Global Platform Settings">
      <Card variant="glass" className="p-6 max-w-2xl space-y-4">
        <h3 className="text-base font-bold text-white mb-2">Global Computer Vision Defaults</h3>
        <Input label="Default AI FPS Rate" defaultValue="30" leftIcon={<Icons.Cpu size={18} />} />
        <Input label="Socket Connection Timeout (ms)" defaultValue="5000" leftIcon={<Icons.Activity size={18} />} />

        <div className="flex justify-end pt-4">
          <Button variant="glow" size="md" onClick={handleSave}>
            Save System Settings
          </Button>
        </div>
      </Card>
    </DashboardLayout>
  )
}
