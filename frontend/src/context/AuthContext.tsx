import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserRole } from '@/config/constants'
import { env } from '@/config/env'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (userData: AuthUser, accessToken?: string) => void
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
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    // Authoritative verification against MongoDB /auth/me
    fetch(`${env.serverBaseUrl}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error('Session expired or invalid')
        }
        return res.json()
      })
      .then((userData) => {
        const authoritativeUser: AuthUser = {
          id: userData.id,
          name: userData.full_name,
          email: userData.email,
          role: userData.role as UserRole,
        }
        setUser(authoritativeUser)
        localStorage.setItem('mindmap_user', JSON.stringify(authoritativeUser))
      })
      .catch(() => {
        localStorage.removeItem('access_token')
        localStorage.removeItem('mindmap_user')
        setUser(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  const login = (userData: AuthUser, accessToken?: string) => {
    setUser(userData)
    try {
      localStorage.setItem('mindmap_user', JSON.stringify(userData))
      if (accessToken) {
        localStorage.setItem('access_token', accessToken)
      }
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
      value={{ user, isAuthenticated: !!user, isLoading, login, logout }}
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