import { Routes, Route } from 'react-router-dom'
import Layout from '@/app/Layout'

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

        {/* Student Portal */}
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/classes" element={<StudentClassesPage />} />
        <Route path="/student/attendance" element={<StudentAttendancePage />} />
        <Route path="/student/reports" element={<StudentReportsPage />} />
        <Route path="/student/profile" element={<StudentProfilePage />} />

        {/* Teacher Portal */}
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
        <Route path="/teacher/classrooms" element={<ManageClassroomsPage />} />
        <Route path="/teacher/analytics" element={<TeacherAnalyticsPage />} />
        <Route path="/teacher/reports" element={<TeacherReportsPage />} />
        <Route path="/teacher/settings" element={<TeacherProfilePage />} />

        {/* Live AI Classroom Room */}
        <Route path="/classroom/:code" element={<ClassroomMeetingPage />} />
        <Route path="/classroom/demo" element={<ClassroomMeetingPage />} />

        {/* Admin Panel */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/teachers" element={<TeacherManagementPage />} />
        <Route path="/admin/students" element={<StudentManagementPage />} />
        <Route path="/admin/logs" element={<SystemLogsPage />} />
        <Route path="/admin/settings" element={<AdminSettingsPage />} />

        {/* Fallback 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}