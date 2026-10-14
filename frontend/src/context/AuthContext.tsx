import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { UserRole } from '@/config/constants'
import { env } from '@/config/env'

import { refreshAccessToken } from '@/services/authClient'

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
  login: (userData: AuthUser, accessToken?: string, refreshToken?: string) => void
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
    const verifySession = async () => {
      let token = localStorage.getItem('access_token')
      const refreshToken = localStorage.getItem('refresh_token')

      if (!token && !refreshToken) {
        setUser(null)
        setIsLoading(false)
        return
      }

      // If token exists, test validity
      if (token) {
        try {
          const res = await fetch(`${env.serverBaseUrl}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (res.ok) {
            const userData = await res.json()
            const authoritativeUser: AuthUser = {
              id: userData.id,
              name: userData.full_name,
              email: userData.email,
              role: userData.role as UserRole,
            }
            setUser(authoritativeUser)
            localStorage.setItem('mindmap_user', JSON.stringify(authoritativeUser))
            setIsLoading(false)
            return
          }
        } catch {
          // May be network glitch or 401; proceed to refresh
        }
      }

      // If access token invalid/expired, attempt refresh token exchange
      if (refreshToken) {
        const refreshedToken = await refreshAccessToken()
        if (refreshedToken) {
          try {
            const res = await fetch(`${env.serverBaseUrl}/auth/me`, {
              headers: { Authorization: `Bearer ${refreshedToken}` },
            })
            if (res.ok) {
              const userData = await res.json()
              const authoritativeUser: AuthUser = {
                id: userData.id,
                name: userData.full_name,
                email: userData.email,
                role: userData.role as UserRole,
              }
              setUser(authoritativeUser)
              localStorage.setItem('mindmap_user', JSON.stringify(authoritativeUser))
              setIsLoading(false)
              return
            }
          } catch {
            // Fallthrough to logout
          }
        }
      }

      // Both access & refresh token failed
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('mindmap_user')
      setUser(null)
      setIsLoading(false)
    }

    verifySession()
  }, [])

  const login = (userData: AuthUser, accessToken?: string, refreshToken?: string) => {
    setUser(userData)
    try {
      localStorage.setItem('mindmap_user', JSON.stringify(userData))
      if (accessToken) {
        localStorage.setItem('access_token', accessToken)
      }
      if (refreshToken) {
        localStorage.setItem('refresh_token', refreshToken)
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
      localStorage.removeItem('refresh_token')
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