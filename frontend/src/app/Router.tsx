import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/app/Layout'
import { useAuthContext } from '@/context/AuthContext'

// Landing & Auth Pages
import LandingPage from '@/pages/landing/LandingPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import VerifyEmailPage from '@/pages/auth/VerifyEmailPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

// Student Portal Pages
import StudentDashboard from '@/pages/student/StudentDashboard'
import StudentClassesPage from '@/pages/student/StudentClassesPage'
import StudentAttendancePage from '@/pages/student/StudentAttendancePage'
import StudentReportsPage from '@/pages/student/StudentReportsPage'
import StudentProfilePage from '@/pages/student/StudentProfilePage'

// Teacher Portal Pages
import TeacherDashboard from '@/pages/teacher/TeacherDashboard'
import ManageClassroomsPage from '@/pages/teacher/ManageClassroomsPage'
import TeacherClassDetailPage from '@/pages/teacher/TeacherClassDetailPage'
import TeacherLiveMonitoringPage from '@/pages/teacher/TeacherLiveMonitoringPage'
import TeacherClassAnalyticsPage from '@/pages/teacher/TeacherClassAnalyticsPage'
import TeacherAnalyticsPage from '@/pages/teacher/TeacherAnalyticsPage'
import TeacherReportsPage from '@/pages/teacher/TeacherReportsPage'
import TeacherProfilePage from '@/pages/teacher/TeacherProfilePage'

// Live Classroom Meeting Room
import ClassroomMeetingPage from '@/pages/classroom/ClassroomMeetingPage'

// Admin Panel Pages
import AdminDashboard from '@/pages/admin/AdminDashboard'
import TeacherManagementPage from '@/pages/admin/TeacherManagementPage'
import StudentManagementPage from '@/pages/admin/StudentManagementPage'
import SystemLogsPage from '@/pages/admin/SystemLogsPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'

// Error Pages
import NotFoundPage from '@/pages/errors/NotFoundPage'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: ('teacher' | 'student' | 'admin')[]
}

function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuthContext()

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <p className="text-xs text-slate-400">Verifying session...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role as any)) {
    if (user.role === 'teacher') return <Navigate to="/teacher/dashboard" replace />
    if (user.role === 'student') return <Navigate to="/student/dashboard" replace />
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export default function Router() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Landing Page */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication Flow */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* ========================================== */}
        {/* STUDENT PORTAL (Protected for Students) */}
        {/* ========================================== */}
        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/classes"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentClassesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/class/:classCode"
          element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <ClassroomMeetingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/analytics"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/reports"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/attendance"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentAttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={['student', 'admin']}>
              <StudentProfilePage />
            </ProtectedRoute>
          }
        />

        {/* ========================================== */}
        {/* TEACHER PORTAL (Protected for Teachers) */}
        {/* ========================================== */}
        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classes"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <ManageClassroomsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classrooms"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <ManageClassroomsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classes/:classId"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherClassDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classes/:classId/live"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherLiveMonitoringPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/classes/:classId/analytics"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherClassAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/analytics"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/reports"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/profile"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/settings"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <TeacherProfilePage />
            </ProtectedRoute>
          }
        />

        {/* Live Classroom Meeting Room (Shared / Dynamic) */}
        <Route
          path="/classroom/:code"
          element={
            <ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}>
              <ClassroomMeetingPage />
            </ProtectedRoute>
          }
        />

        {/* Admin Panel */}
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}