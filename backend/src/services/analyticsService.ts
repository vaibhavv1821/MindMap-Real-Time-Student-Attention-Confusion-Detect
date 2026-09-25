export interface AttentionTelemetryPoint {
  timestamp: string
  avgAttention: number
  avgConfusion: number
  activeCount: number
}

export interface StudentTelemetrySummary {
  studentId: string
  studentName: string
  avgAttention: number
  avgConfusion: number
  baselineDeviationEAR: number
  baselineDeviationYaw: number
  history: number[]
}

export class AnalyticsService {
  private timelinePoints: AttentionTelemetryPoint[] = [
    { timestamp: '10:00 AM', avgAttention: 94, avgConfusion: 6, activeCount: 15 },
    { timestamp: '10:15 AM', avgAttention: 90, avgConfusion: 10, activeCount: 15 },
    { timestamp: '10:30 AM', avgAttention: 64, avgConfusion: 42, activeCount: 15 }, // Spike
    { timestamp: '10:45 AM', avgAttention: 88, avgConfusion: 14, activeCount: 15 },
    { timestamp: '11:00 AM', avgAttention: 92, avgConfusion: 8, activeCount: 15 },
  ]

  public async getClassroomAnalytics(roomId: string) {
    return {
      roomId,
      sessionDurationMinutes: 60,
      avgClassroomAttention: 84,
      avgClassroomConfusion: 16,
      confusionSpikesCount: 1,
      timeline: this.timelinePoints,
    }
  }

  public async getStudentAttentionTelemetry(studentId: string): Promise<StudentTelemetrySummary> {
    return {
      studentId,
      studentName: 'Alex Johnson',
      avgAttention: 88,
      avgConfusion: 12,
      baselineDeviationEAR: -0.04,
      baselineDeviationYaw: 2,
      history: [85, 88, 90, 92, 88, 91, 88],
    }
  }

  public async getSessionReport(sessionId: string) {
    return {
      sessionId,
      className: 'Quantum Physics 101',
      instructor: 'Prof. Robert Vance',
      date: new Date().toLocaleDateString(),
      totalStudents: 15,
      avgAttention: 84,
      avgConfusion: 16,
      confusionSpikes: [
        { time: '10:30 AM', topic: 'Schrödinger Differential Proof', confusionPercentage: 42 },
      ],
      students: [
        { name: 'Alex Johnson', attention: 92, confusion: 10, status: 'Present' },
        { name: 'Sarah Miller', attention: 88, confusion: 14, status: 'Present' },
        { name: 'David Clark', attention: 38, confusion: 68, status: 'Present' },
        { name: 'Emma Watson', attention: 96, confusion: 5, status: 'Present' },
      ],
    }
  }
}

export const analyticsService = new AnalyticsService()
