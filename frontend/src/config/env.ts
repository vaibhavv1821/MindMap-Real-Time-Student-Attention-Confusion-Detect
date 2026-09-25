const rawApi = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
const cleanApi = rawApi.replace(/\/+$/, '')
const serverRoot = cleanApi.endsWith('/api') ? cleanApi.slice(0, -4) : cleanApi

// Derive WebSocket URL if not explicitly provided: converts http(s) to ws(s)
const defaultWs = serverRoot.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:') + '/ws'
const rawWs = import.meta.env.VITE_WS_BASE_URL || defaultWs

export const env = {
  apiBaseUrl: cleanApi,          // e.g. "https://your-backend.onrender.com/api" or "http://localhost:8000/api"
  serverBaseUrl: serverRoot,     // e.g. "https://your-backend.onrender.com" or "http://localhost:8000"
  wsBaseUrl: rawWs,              // e.g. "wss://your-backend.onrender.com/ws" or "ws://localhost:8000/ws"
  appName: import.meta.env.VITE_APP_NAME || 'MindMap',
} as const