import { createContext, useContext, useState, ReactNode } from 'react'

interface ClassroomState {
  classCode: string | null
  isSessionActive: boolean
}

interface ClassroomContextValue extends ClassroomState {
  setClassCode: (code: string | null) => void
  setSessionActive: (active: boolean) => void
}

const ClassroomContext = createContext<ClassroomContextValue | undefined>(undefined)

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [classCode, setClassCode] = useState<string | null>(null)
  const [isSessionActive, setSessionActive] = useState(false)

  return (
    <ClassroomContext.Provider
      value={{ classCode, setClassCode, isSessionActive, setSessionActive }}
    >
      {children}
    </ClassroomContext.Provider>
  )
}

export function useClassroomContext() {
  const ctx = useContext(ClassroomContext)
  if (!ctx) throw new Error('useClassroomContext must be used within ClassroomProvider')
  return ctx
}