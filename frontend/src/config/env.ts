// Read environment variables or determine appropriate runtime defaults
const envApi = (import.meta.env.VITE_API_BASE_URL || '').trim()
const envWs = (import.meta.env.VITE_WS_BASE_URL || '').trim()

// Default production backend on Render (fallback when deployed on remote HTTPS domains)
const PROD_BACKEND_ORIGIN = 'mindmap-backend-w2y1.onrender.com'
const PROD_API_URL = `https://${PROD_BACKEND_ORIGIN}/api`
const PROD_WS_URL = `wss://${PROD_BACKEND_ORIGIN}/ws`

function getApiBaseUrl(): string {
  let api = envApi
  const isBrowser = typeof window !== 'undefined'
  const isHttps = isBrowser && window.location.protocol === 'https:'
  const isLocalHost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  if (!api) {
    if (isBrowser && !isLocalHost) {
      api = PROD_API_URL
    } else {
      api = 'http://localhost:8000/api'
    }
  }

  // If running on a public remote domain but configured with localhost, fallback to production backend
  if (isBrowser && !isLocalHost && (api.includes('localhost') || api.includes('127.0.0.1'))) {
    api = PROD_API_URL
  }

  // Prevent mixed-content HTTP requests on HTTPS
  if (isHttps && api.startsWith('http://')) {
    api = api.replace(/^http:\/\//i, 'https://')
  }

  return api.replace(/\/+$/, '')
}

function getWsBaseUrl(): string {
  let ws = envWs
  const isBrowser = typeof window !== 'undefined'
  const isHttps = isBrowser && window.location.protocol === 'https:'
  const isLocalHost = isBrowser && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

  if (!ws) {
    if (isBrowser && !isLocalHost) {
      ws = PROD_WS_URL
    } else {
      const api = getApiBaseUrl()
      ws = api.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:').replace(/\/api$/, '') + '/ws'
    }
  }

  // If running on a public remote domain but configured with localhost, fallback to production backend
  if (isBrowser && !isLocalHost && (ws.includes('localhost') || ws.includes('127.0.0.1'))) {
    ws = PROD_WS_URL
  }

  // CRITICAL: On HTTPS pages, WebSockets MUST be wss:// (insecure ws:// is strictly blocked by browsers)
  if (isHttps && ws.startsWith('ws://')) {
    ws = ws.replace(/^ws:\/\//i, 'wss://')
  }

  return ws.replace(/\/+$/, '')
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