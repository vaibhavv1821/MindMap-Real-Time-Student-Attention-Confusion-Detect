import express from 'express'
import http from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import { config } from './config/env'
import authRoutes from './routes/authRoutes'
import classroomRoutes from './routes/classroomRoutes'
import analyticsRoutes from './routes/analyticsRoutes'
import reportRoutes from './routes/reportRoutes'
import { errorHandler } from './middleware/errorHandler'
import { setupSocketHandlers } from './socket/socketHandler'

const app = express()
const server = http.createServer(app)

// Initialize Socket.IO with CORS
const io = new SocketIOServer(server, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST'],
  },
})

// Express Middlewares
app.use(cors())
app.use(express.json())

// Healthcheck Endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    system: 'MindMap Real-Time AI SaaS Express Backend',
    version: '1.0.0 (50% Review Build)',
    privacyGuarantee: '100% Client-Side WebAssembly Processing (0 Camera Video Payload)',
    timestamp: new Date().toISOString(),
  })
})

// Mount API Routes
app.use('/api/auth', authRoutes)
app.use('/api/classrooms', classroomRoutes)
app.use('/api', analyticsRoutes)
app.use('/api', reportRoutes)

// Global Error Handler
app.use(errorHandler)

// Setup Socket.IO Event Handlers
setupSocketHandlers(io)

// Start Express Server
server.listen(config.port, () => {
  console.log(`=======================================================`)
  console.log(`🚀 MindMap Express + Socket.IO Backend Server Running!`)
  console.log(`📡 URL: http://localhost:${config.port}`)
  console.log(`🛡️ Privacy Contract: 0 raw webcam bytes accepted`)
  console.log(`=======================================================`)
})

export { app, server, io }
