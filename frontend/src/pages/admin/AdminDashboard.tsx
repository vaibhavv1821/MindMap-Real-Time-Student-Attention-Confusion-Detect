import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export default function AdminDashboard() {
  const adminNav = [
    { label: 'System Overview', path: '/admin/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Teachers Roster', path: '/admin/teachers', icon: <Icons.User size={18} /> },
    { label: 'Students Roster', path: '/admin/students', icon: <Icons.Users size={18} /> },
    { label: 'System Telemetry Logs', path: '/admin/logs', icon: <Icons.Activity size={18} /> },
    { label: 'Platform Config', path: '/admin/settings', icon: <Icons.Settings size={18} /> },
  ]

  return (
    <DashboardLayout navItems={adminNav} title="System Administrator Panel">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass" className="p-5">
          <div className="text-xs text-muted font-medium">Total Registered Users</div>
          <div className="text-3xl font-bold text-white mt-2">1,420</div>
          <Badge variant="success" size="sm" className="mt-2">+12% this month</Badge>
        </Card>

        <Card variant="glass" className="p-5">
          <div className="text-xs text-muted font-medium">Active Classrooms Now</div>
          <div className="text-3xl font-bold text-accent mt-2">18</div>
          <Badge variant="live" size="sm" className="mt-2" dot>Live Telemetry</Badge>
        </Card>

        <Card variant="glass" className="p-5">
          <div className="text-xs text-muted font-medium">WebSocket Event Throughput</div>
          <div className="text-3xl font-bold text-purple-400 mt-2">4.2k req/s</div>
          <span className="text-[10px] text-muted block mt-2">100% Privacy Encrypted</span>
        </Card>

        <Card variant="glass" className="p-5">
          <div className="text-xs text-muted font-medium">Server CPU/GPU Load</div>
          <div className="text-3xl font-bold text-success mt-2">4.2%</div>
          <span className="text-[10px] text-muted block mt-2">Client-Side Offload Active</span>
        </Card>
      </div>

      <Card variant="glass" className="p-6">
        <h3 className="text-base font-bold text-white mb-4">Platform Health Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-background-secondary border border-border/60">
            <span className="text-muted">MediaPipe WASM Engine</span>
            <div className="text-base font-bold text-success mt-1">v0.4.16 Operational</div>
          </div>
          <div className="p-4 rounded-xl bg-background-secondary border border-border/60">
            <span className="text-muted">Socket.io Gateway</span>
            <div className="text-base font-bold text-success mt-1">Cluster Connected (0ms drop)</div>
          </div>
          <div className="p-4 rounded-xl bg-background-secondary border border-border/60">
            <span className="text-muted">PDF Generation Pipeline</span>
            <div className="text-base font-bold text-success mt-1">jsPDF Ready</div>
          </div>
        </div>
      </Card>
    </DashboardLayout>
  )
}
