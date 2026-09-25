export const USER_ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

export const ATTENTION_THRESHOLDS = {
  HIGH: 70,   // >= 70% attention
  MEDIUM: 40, // 40-69% attention
  // below 40% = low
} as const

export const AI_SAMPLE_RATE_FPS = 30

export const SOCKET_EVENTS = {
  JOIN_CLASSROOM: 'join_classroom',
  LEAVE_CLASSROOM: 'leave_classroom',
  ATTENTION_UPDATE: 'attention_update',
  CONFUSION_UPDATE: 'confusion_update',
  CHAT_MESSAGE: 'chat_message',
  RAISE_HAND: 'raise_hand',
} as const