import { createContext, useContext, useState, ReactNode } from 'react'
import { UserRole } from '@/config/constants'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (user: AuthUser) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('mindmap_user')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })

  const login = (userData: AuthUser) => {
    setUser(userData)
    try {
      localStorage.setItem('mindmap_user', JSON.stringify(userData))
    } catch (e) {
      console.warn('Could not persist user session', e)
    }
  }

  const logout = () => {
    setUser(null)
    try {
      localStorage.removeItem('mindmap_user')
      localStorage.removeItem('access_token')
    } catch (e) {
      console.warn('Could not clear user session', e)
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider')
  return ctx
}