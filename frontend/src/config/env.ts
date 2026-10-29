// Read environment variables or determine appropriate runtime defaults
const envApi = (import.meta.env.VITE_API_BASE_URL || '').trim()
const envWs = (import.meta.env.VITE_WS_BASE_URL || '').trim()

// Default production backend on Render (fallback when deployed on remote HTTPS domains)
const PROD_BACKEND_ORIGIN = 'mindmap-backend-w2y1.onrender.com'
const PROD_API_URL = `https://${PROD_BACKEND_ORIGIN}/api`
const PROD_WS_URL = `wss://${PROD_BACKEND_ORIGIN}/ws`

function getApiBaseUrl(): string {
  const isBrowser = typeof window !== 'undefined'
  const isHttps = isBrowser && window.location.protocol === 'https:'
  const isLocalHost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  // When deployed to production/remote domains (such as mindmap.devanshupatil.tech or Vercel),
  // strictly use the production API URL to prevent any misconfigured localhost or relative paths.
  if (isBrowser && !isLocalHost) {
    return PROD_API_URL
  }

  let api = envApi || 'http://localhost:8000/api'
  if (isHttps && api.startsWith('http://')) {
    api = api.replace(/^http:\/\//i, 'https://')
  }

  return api.replace(/\/+$/, '')
}

function getWsBaseUrl(): string {
  const isBrowser = typeof window !== 'undefined'
  const isHttps = isBrowser && window.location.protocol === 'https:'
  const isLocalHost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  // When deployed to production/remote domains (such as mindmap.devanshupatil.tech or Vercel),
  // strictly enforce the production secure WebSocket endpoint wss://.../ws.
  if (isBrowser && !isLocalHost) {
    return PROD_WS_URL
  }

  let ws = envWs || 'ws://localhost:8000/ws'

  // Normalize protocol: replace http(s):// with ws(s)://
  ws = ws.replace(/^http:\/\//i, 'ws://').replace(/^https:\/\//i, 'wss://')

  // CRITICAL: On HTTPS pages, WebSockets MUST be wss:// (insecure ws:// is strictly blocked by browsers)
  if (isHttps && ws.startsWith('ws://')) {
    ws = ws.replace(/^ws:\/\//i, 'wss://')
  }

  // Ensure the base URL ends with /ws
  ws = ws.replace(/\/+$/, '')
  if (!ws.endsWith('/ws')) {
    ws = ws.replace(/\/api$/, '') + '/ws'
  }

  return ws
}

export const env = {
  get apiBaseUrl() {
    return getApiBaseUrl()
  },
  get serverBaseUrl() {
    const api = getApiBaseUrl()
    return api.endsWith('/api') ? api.slice(0, -4) : api
  },
  get wsBaseUrl() {
    return getWsBaseUrl()
  },
  appName: import.meta.env.VITE_APP_NAME || 'MindMap',
} as const
