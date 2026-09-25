import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthContext } from '@/context/AuthContext'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icons } from '@/components/ui/Icons'

export interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

export interface DashboardLayoutProps {
  children: React.ReactNode
  navItems?: NavItem[]
  title: string
}

export const DashboardLayout = ({ children, navItems, title }: DashboardLayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthContext()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin'

  const defaultTeacherNav: NavItem[] = [
    { label: 'Dashboard', path: '/teacher/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'Classes', path: '/teacher/classes', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile', path: '/teacher/profile', icon: <Icons.User size={18} /> },
  ]

  const defaultStudentNav: NavItem[] = [
    { label: 'Dashboard', path: '/student/dashboard', icon: <Icons.Grid size={18} /> },
    { label: 'My Classes', path: '/student/classes', icon: <Icons.Video size={18} /> },
    { label: 'Analytics', path: '/student/analytics', icon: <Icons.BarChart size={18} /> },
    { label: 'Profile', path: '/student/profile', icon: <Icons.User size={18} /> },
  ]

  // Use role-specific navigation to ensure strict separation
  const activeNav = navItems && navItems.length > 0
    ? navItems.filter((item) => isTeacher ? !item.path.startsWith('/student') : !item.path.startsWith('/teacher'))
    : (isTeacher ? defaultTeacherNav : defaultStudentNav)

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Bar */}
          <div className="h-14 flex items-center px-5 border-b border-slate-200">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
                <Icons.Brain size={18} />
              </div>
              <span className="text-base font-bold text-slate-900">MindMap</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {activeNav.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100 border border-slate-200 text-xs">
            <div className="flex items-center gap-2 overflow-hidden">
              <Avatar name={user?.name || 'User'} size="sm" />
              <div className="truncate">
                <div className="font-semibold text-slate-900 truncate">{user?.name || 'User'}</div>
                <div className="text-[11px] text-slate-500 capitalize">{user?.role || 'User'}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-600 p-1.5 rounded hover:bg-slate-200"
              title="Sign Out"
            >
              <Icons.LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-slate-900">{title}</h1>
            <Badge variant={isTeacher ? 'purple' : 'success'} size="sm">
              {user?.role?.toUpperCase() || 'STUDENT'}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {isTeacher ? (
              <Link to="/teacher/classes">
                <Button variant="primary" size="sm" leftIcon={<Icons.Video size={15} />}>
                  My Classes
                </Button>
              </Link>
            ) : (
              <Link to="/student/classes">
                <Button variant="primary" size="sm" leftIcon={<Icons.Video size={15} />}>
                  My Classes
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Page Children Container */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">{children}</main>
      </div>
    </div>
  )
}
