import { env } from '@/config/env'

let isRefreshing = false
let refreshSubscribers: ((token: string | null) => void)[] = []

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

/**
 * Proactively or reactively refreshes the access token using the stored refresh_token.
 * Handles concurrent refresh calls seamlessly without duplicate network requests.
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    return null
  }

  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribeTokenRefresh((token) => resolve(token))
    })
  }

  isRefreshing = true
  try {
    const res = await fetch(`${env.serverBaseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) {
      console.warn('[MindMap Auth] Refresh token expired or rejected. Clearing auth.')
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('mindmap_user')
      onRefreshed(null)
      isRefreshing = false
      return null
    }

    const data = await res.json()
    if (data.access_token) {
      localStorage.setItem('access_token', data.access_token)
      if (data.refresh_token) {
        localStorage.setItem('refresh_token', data.refresh_token)
      }
      onRefreshed(data.access_token)
      isRefreshing = false
      return data.access_token
    }
  } catch (err) {
    console.warn('[MindMap Auth] Network error during token refresh:', err)
  }

  isRefreshing = false
  onRefreshed(null)
  return null
}

/**
 * Returns authorization headers with bearer token if available.
 */
export function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

/**
 * Authenticated fetch with automatic token refresh and single retry on 401.
 */
export async function authenticatedFetch(url: string, init?: RequestInit): Promise<Response> {
  const baseHeaders = getAuthHeaders() as Record<string, string>
  const customHeaders = (init?.headers || {}) as Record<string, string>

  let mergedHeaders: Record<string, string> = {
    ...baseHeaders,
    ...customHeaders,
  }

  let response = await fetch(url, { ...init, headers: mergedHeaders })

  if (response.status === 401) {
    console.info('[MindMap Auth] 401 received. Attempting transparent token refresh...')
    const newToken = await refreshAccessToken()
    if (newToken) {
      mergedHeaders = {
        ...mergedHeaders,
        Authorization: `Bearer ${newToken}`,
      }
      response = await fetch(url, { ...init, headers: mergedHeaders })
    }
  }

  return response
}
