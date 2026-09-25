import React from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export default function SystemLogsPage() {
  const adminNav = [
    { label: 'System Overview', path: '/admin/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Teachers Roster', path: '/admin/teachers', icon: <Icons.User size={18} /> },
    { label: 'Students Roster', path: '/admin/students', icon: <Icons.Users size={18} /> },
    { label: 'System Telemetry Logs', path: '/admin/logs', icon: <Icons.Activity size={18} /> },
    { label: 'Platform Config', path: '/admin/settings', icon: <Icons.Settings size={18} /> },
  ]

  const logs = [
    { time: '10:04:12', event: 'WEBSOCKET_CONNECT', room: 'QUANTUM-101', user: 'Alex Johnson', status: 'OK' },
    { time: '10:03:55', event: 'MEDIAPIPE_INIT', room: 'QUANTUM-101', user: 'Sarah Miller', status: 'OK' },
    { time: '10:02:10', event: 'ROOM_CREATED', room: 'QUANTUM-101', user: 'Prof. Vance', status: 'OK' },
  ]

  return (
    <DashboardLayout navItems={adminNav} title="Real-Time System Event Logs">
      <Card variant="glass" className="p-6">
        <h3 className="text-base font-bold text-white mb-4">WebSocket & AI Pipeline Audit Logs</h3>
        <div className="space-y-2 font-mono text-xs">
          {logs.map((l, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background-tertiary border border-border/40">
              <div className="flex items-center gap-3">
                <span className="text-muted">{l.time}</span>
                <span className="text-accent font-semibold">{l.event}</span>
                <span className="text-white">{l.room}</span>
                <span className="text-muted">({l.user})</span>
              </div>
              <Badge variant="success" size="sm" className="font-mono">{l.status}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  )
}
