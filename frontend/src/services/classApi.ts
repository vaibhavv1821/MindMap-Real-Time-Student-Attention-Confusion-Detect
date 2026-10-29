import { env } from '@/config/env'

export interface ClassItem {
  id: string
  class_code: string
  name: string
  subject: string
  description?: string
  teacher_id: string
  teacher_name: string
  scheduled_start?: string
  scheduled_end?: string
  status: 'SCHEDULED' | 'LIVE' | 'ENDED'
  enrolled_count: number
  active_students: number
  avg_attention: number
  avg_confusion: number
  created_at: string
}

export interface EnrollmentItem {
  id: string
  class_id: string
  class_code: string
  class_name: string
  subject: string
  teacher_name: string
  status: 'ACTIVE' | 'DROPPED'
  enrolled_at: string
  is_live: boolean
}

export interface StudentRoster {
  student_id: string
  name: string
  email: string
  enrolled_at: string
  status: string
  avg_attention: number
  avg_confusion: number
  connection_status: 'ONLINE' | 'OFFLINE' | 'CAMERA_MUTED'
  is_hand_raised: boolean
}

export interface StudentStats {
  total_classes_enrolled: number
  total_sessions_attended: number
  overall_avg_attention: number
  overall_avg_confusion: number
}

export interface AttendanceRecord {
  session_id: string
  class_id: string
  class_name: string
  class_code: string
  teacher_name: string
  joined_at: string
  left_at?: string
  duration_seconds: number
  avg_attention: number
  avg_confusion: number
  status: string
}

export interface ClassAnalytics {
  class_id: string
  class_code: string
  class_name: string
  total_enrolled: number
  total_sessions: number
  overall_avg_attention: number
  overall_avg_confusion: number
  recent_sessions: Array<{
    id: string
    class_id: string
    class_code: string
    status: string
    started_at: string
    ended_at?: string
    avg_attention: number
    avg_confusion: number
    peak_students: number
  }>
}

import { authenticatedFetch, getAuthHeaders } from './authClient'

export const classApi = {
  async getTeacherClasses(): Promise<ClassItem[]> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/teacher`)
    if (!res.ok) throw new Error('Failed to load classes')
    return res.json()
  },

  async createClass(data: {
    name: string
    subject: string
    description?: string
    scheduled_start?: string
    scheduled_end?: string
  }): Promise<ClassItem> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.detail || 'Failed to create classroom')
    }
    return res.json()
  },

  async startClass(classId: string): Promise<ClassItem> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/${classId}/start`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.detail || 'Failed to start class')
    }
    return res.json()
  },

  async endClass(classId: string): Promise<ClassItem> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/${classId}/end`, {
      method: 'POST',
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.detail || 'Failed to end class')
    }
    return res.json()
  },

  async getStudentClasses(): Promise<EnrollmentItem[]> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/student`)
    if (!res.ok) throw new Error('Failed to load student classes')
    return res.json()
  },

  async joinClass(classCode: string): Promise<EnrollmentItem> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/join`, {
      method: 'POST',
      body: JSON.stringify({ class_code: classCode }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.detail || 'Failed to join class')
    }
    return res.json()
  },

  async getClassDetails(idOrCode: string): Promise<ClassItem> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/${idOrCode}`)
    if (!res.ok) throw new Error('Classroom not found')
    return res.json()
  },

  async getClassStudents(idOrCode: string): Promise<StudentRoster[]> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/${idOrCode}/students`)
    if (!res.ok) throw new Error('Failed to load student roster')
    return res.json()
  },

  async getStudentStats(): Promise<StudentStats> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/student/stats`)
    if (!res.ok) throw new Error('Failed to load student statistics')
    return res.json()
  },

  async getStudentAttendance(): Promise<AttendanceRecord[]> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/student/attendance`)
    if (!res.ok) throw new Error('Failed to load attendance records')
    return res.json()
  },

  async getClassAnalytics(idOrCode: string): Promise<ClassAnalytics> {
    const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/${idOrCode}/analytics`)
    if (!res.ok) throw new Error('Failed to load class analytics')
    return res.json()
  },

  async sendStudentTelemetry(
    idOrCode: string,
    data: {
      attention_score: number
      confusion_score: number
      camera_active?: boolean
      connection_status?: string
      student_name?: string
      student_email?: string
      reasons?: string[]
    }
  ): Promise<{ status: string; session_id?: string }> {
    try {
      const res = await authenticatedFetch(`${env.apiBaseUrl}/classes/${encodeURIComponent(idOrCode)}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) return { status: 'FAILED' }
      return res.json()
    } catch {
      return { status: 'NETWORK_ERROR' }
    }
  },
}
