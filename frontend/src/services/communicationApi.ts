import axios from 'axios'
import { env } from '@/config/env'

export interface ChatMessage {
  id: string
  class_code: string
  sender_id: string
  sender_name: string
  sender_role: string
  text: string
  timestamp: string
}

export interface ICEServerConfig {
  urls: string[]
  username?: string
  credential?: string
}

export interface WebRTCConfig {
  ice_servers: ICEServerConfig[]
}

export interface ScreenSharePermission {
  class_code: string
  is_open_to_all: boolean
  allowed_students: string[]
  can_share: boolean
}

export interface SessionSummaryItem {
  session_id: string
  started_at: string
  ended_at?: string
  avg_attention: number
  avg_confusion: number
  peak_students: number
}

export interface StudentReportSummary {
  student_id: string
  student_name: string
  student_email: string
  attendance_status: string
  sessions_attended: number
  avg_attention: number
  avg_confusion: number
}

export interface ClassReportData {
  class_id: string
  class_code: string
  class_name: string
  instructor_name: string
  date_range: string
  generated_at: string
  has_data: boolean
  total_students_enrolled: number
  total_sessions_conducted: number
  overall_avg_attention: number
  overall_avg_confusion: number
  sessions: SessionSummaryItem[]
  student_roster: StudentReportSummary[]
  data_limitations_notice: string
}

export interface StudentPersonalReportData {
  student_id: string
  student_name: string
  student_email: string
  class_id: string
  class_code: string
  class_name: string
  date_range: string
  generated_at: string
  has_data: boolean
  sessions_attended: number
  personal_avg_attention: number
  personal_avg_confusion: number
  sessions: SessionSummaryItem[]
  metric_explanations: Record<string, string>
  data_limitations_notice: string
}

import { refreshAccessToken } from './authClient'

function getAuthHeaders() {
  const token = localStorage.getItem('token') || localStorage.getItem('access_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// Transparent 401 retry interceptor for communication endpoints
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return axios(originalRequest)
      }
    }
    return Promise.reject(error)
  }
)

export const communicationApi = {
  async getWebRTCConfig(): Promise<WebRTCConfig> {
    try {
      const resp = await axios.get(`${env.apiBaseUrl}/classes/webrtc-config`, {
        headers: getAuthHeaders(),
      })
      return resp.data
    } catch {
      // Safe fallback to Google STUN
      return {
        ice_servers: [{ urls: ['stun:stun.l.google.com:19302'] }],
      }
    }
  },

  async getMessages(classCodeOrId: string, limit = 50, before?: string): Promise<ChatMessage[]> {
    const params: Record<string, any> = { limit }
    if (before) params.before = before
    const resp = await axios.get(`${env.apiBaseUrl}/classes/${classCodeOrId}/messages`, {
      headers: getAuthHeaders(),
      params,
    })
    return resp.data
  },

  async sendMessage(classCodeOrId: string, text: string): Promise<ChatMessage> {
    const resp = await axios.post(
      `${env.apiBaseUrl}/classes/${classCodeOrId}/messages`,
      { text },
      { headers: getAuthHeaders() }
    )
    return resp.data
  },

  async getScreenSharePermission(classCodeOrId: string): Promise<ScreenSharePermission> {
    const resp = await axios.get(
      `${env.apiBaseUrl}/classes/${classCodeOrId}/screen-share-permission`,
      { headers: getAuthHeaders() }
    )
    return resp.data
  },

  async updateScreenSharePermission(
    classCodeOrId: string,
    payload: { is_open_to_all?: boolean; allowed_student_id?: string; action?: 'grant' | 'revoke' }
  ): Promise<ScreenSharePermission> {
    const resp = await axios.post(
      `${env.apiBaseUrl}/classes/${classCodeOrId}/screen-share-permission`,
      payload,
      { headers: getAuthHeaders() }
    )
    return resp.data
  },

  async getReportData(
    classCodeOrId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ClassReportData | StudentPersonalReportData> {
    const params: Record<string, string> = {}
    if (startDate) params.start_date = startDate
    if (endDate) params.end_date = endDate
    const resp = await axios.get(`${env.apiBaseUrl}/classes/${classCodeOrId}/report-data`, {
      headers: getAuthHeaders(),
      params,
    })
    return resp.data
  },
}
