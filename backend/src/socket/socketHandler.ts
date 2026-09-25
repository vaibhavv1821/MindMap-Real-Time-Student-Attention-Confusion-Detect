import { Server as SocketIOServer, Socket } from 'socket.io'

export interface AttentionPayload {
  studentId: string
  studentName: string
  classCode: string
  attentionScore: number // 0-100
  statusLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  gazeDirection: string
  timestamp: string
}

export interface ConfusionPayload {
  studentId: string
  studentName: string
  classCode: string
  confusionScore: number // 0-100
  eyebrowFurrowScore: number
  timestamp: string
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`[MindMap Socket] Client connected: ${socket.id}`)

    // 1. Student Joins Classroom Room
    socket.on('student_joined', (data: { studentId: string; studentName: string; classCode: string }) => {
      const roomKey = `room_${data.classCode.toLowerCase()}`
      socket.join(roomKey)
      console.log(`[MindMap Socket] ${data.studentName} joined room: ${roomKey}`)

      // Notify Teacher Room
      socket.to(roomKey).emit('classroom_update', {
        type: 'STUDENT_JOINED',
        studentId: data.studentId,
        studentName: data.studentName,
        timestamp: new Date().toISOString(),
      })
    })

    // 2. Numerical Attention Metrics Update
    socket.on('attention_update', (payload: AttentionPayload) => {
      const roomKey = `room_${payload.classCode.toLowerCase()}`
      
      // Privacy Guard Guarantee: Zero video frames processed over sockets
      socket.to(roomKey).emit('attention_update', {
        studentId: payload.studentId,
        studentName: payload.studentName,
        attentionScore: payload.attentionScore,
        statusLevel: payload.statusLevel,
        gazeDirection: payload.gazeDirection,
        timestamp: payload.timestamp || new Date().toISOString(),
      })
    })

    // 3. Numerical Confusion Metrics Update & Teacher Alerts
    socket.on('confusion_update', (payload: ConfusionPayload) => {
      const roomKey = `room_${payload.classCode.toLowerCase()}`

      socket.to(roomKey).emit('confusion_update', {
        studentId: payload.studentId,
        studentName: payload.studentName,
        confusionScore: payload.confusionScore,
        timestamp: payload.timestamp || new Date().toISOString(),
      })

      // Trigger Teacher Alert if confusion spike exceeds threshold (>50%)
      if (payload.confusionScore > 50) {
        io.to(roomKey).emit('teacher_alert', {
          type: 'CONFUSION_SPIKE',
          studentId: payload.studentId,
          studentName: payload.studentName,
          message: `${payload.studentName} is experiencing high confusion (${payload.confusionScore}%)`,
          timestamp: new Date().toISOString(),
        })
      }
    })

    // 4. Student Leaves Room
    socket.on('student_left', (data: { studentId: string; classCode: string }) => {
      const roomKey = `room_${data.classCode.toLowerCase()}`
      socket.leave(roomKey)
      console.log(`[MindMap Socket] Student ${data.studentId} left room: ${roomKey}`)

      socket.to(roomKey).emit('classroom_update', {
        type: 'STUDENT_LEFT',
        studentId: data.studentId,
        timestamp: new Date().toISOString(),
      })
    })

    socket.on('disconnect', () => {
      console.log(`[MindMap Socket] Client disconnected: ${socket.id}`)
    })
  })
}
