export interface SimulatedStudent {
  id: string
  name: string
  email: string
  attentionScore: number // 0-100
  confusionScore: number // 0-100
  status: 'FOCUSED' | 'MODERATE' | 'LOW_FOCUS' | 'CONFUSED'
  connectionStatus: 'ONLINE' | 'CAMERA_MUTED' | 'OFFLINE'
  isHandRaised: boolean
  lastUpdateTime: string
  history: number[] // Last 10 attention scores for detail inspector
  earAverage: number
  headYaw: number
}

export interface ClassroomSummaryStats {
  totalStudents: number
  avgAttention: number
  avgConfusion: number
  focusedCount: number
  moderateCount: number
  lowFocusCount: number
  confusedCount: number
  handRaisedCount: number
  onlineCount: number
}

export type ClassroomSimulatorCallback = (
  students: SimulatedStudent[],
  stats: ClassroomSummaryStats
) => void

export class ClassroomSimulatorService {
  private students: SimulatedStudent[] = [
    { id: 'std_01', name: 'Alex Johnson', email: 'alex.j@univ.edu', attentionScore: 92, confusionScore: 10, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [88, 90, 92, 94, 91, 93, 92], earAverage: 0.28, headYaw: 2 },
    { id: 'std_02', name: 'Sarah Miller', email: 'sarah.m@univ.edu', attentionScore: 88, confusionScore: 14, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [84, 86, 89, 88, 90, 88, 88], earAverage: 0.26, headYaw: -4 },
    { id: 'std_03', name: 'David Clark', email: 'david.c@univ.edu', attentionScore: 38, confusionScore: 68, status: 'CONFUSED', connectionStatus: 'ONLINE', isHandRaised: true, lastUpdateTime: 'Just now', history: [60, 52, 45, 40, 38, 36, 38], earAverage: 0.22, headYaw: 18 },
    { id: 'std_04', name: 'Emma Watson', email: 'emma.w@univ.edu', attentionScore: 96, confusionScore: 5, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [94, 95, 96, 96, 97, 96, 96], earAverage: 0.30, headYaw: 1 },
    { id: 'std_05', name: 'Liam Brown', email: 'liam.b@univ.edu', attentionScore: 78, confusionScore: 22, status: 'MODERATE', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [75, 78, 80, 76, 77, 78, 78], earAverage: 0.25, headYaw: 6 },
    { id: 'std_06', name: 'Sophia Martinez', email: 'sophia.m@univ.edu', attentionScore: 91, confusionScore: 8, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [89, 90, 92, 91, 92, 91, 91], earAverage: 0.29, headYaw: -2 },
    { id: 'std_07', name: 'Lucas Vance', email: 'lucas.v@univ.edu', attentionScore: 34, confusionScore: 42, status: 'LOW_FOCUS', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: '1m ago', history: [50, 44, 40, 36, 35, 34, 34], earAverage: 0.20, headYaw: 24 },
    { id: 'std_08', name: 'Oliver Taylor', email: 'oliver.t@univ.edu', attentionScore: 85, confusionScore: 16, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [82, 84, 85, 86, 85, 85, 85], earAverage: 0.27, headYaw: 3 },
    { id: 'std_09', name: 'Isabella Garcia', email: 'isabella.g@univ.edu', attentionScore: 89, confusionScore: 11, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [87, 88, 89, 90, 89, 89, 89], earAverage: 0.28, headYaw: -1 },
    { id: 'std_10', name: 'Ethan Hunt', email: 'ethan.h@univ.edu', attentionScore: 62, confusionScore: 55, status: 'CONFUSED', connectionStatus: 'ONLINE', isHandRaised: true, lastUpdateTime: 'Just now', history: [70, 68, 65, 62, 60, 62, 62], earAverage: 0.24, headYaw: 12 },
    { id: 'std_11', name: 'Mia Davis', email: 'mia.d@univ.edu', attentionScore: 94, confusionScore: 6, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [92, 93, 94, 95, 94, 94, 94], earAverage: 0.29, headYaw: 0 },
    { id: 'std_12', name: 'Noah Wilson', email: 'noah.w@univ.edu', attentionScore: 58, confusionScore: 28, status: 'MODERATE', connectionStatus: 'CAMERA_MUTED', isHandRaised: false, lastUpdateTime: '2m ago', history: [60, 59, 58, 58, 58, 58, 58], earAverage: 0.26, headYaw: 5 },
    { id: 'std_13', name: 'Ava Anderson', email: 'ava.a@univ.edu', attentionScore: 87, confusionScore: 13, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [85, 86, 87, 88, 87, 87, 87], earAverage: 0.28, headYaw: -3 },
    { id: 'std_14', name: 'James Thomas', email: 'james.t@univ.edu', attentionScore: 90, confusionScore: 9, status: 'FOCUSED', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [88, 89, 90, 91, 90, 90, 90], earAverage: 0.28, headYaw: 2 },
    { id: 'std_15', name: 'Charlotte White', email: 'charlotte.w@univ.edu', attentionScore: 82, confusionScore: 18, status: 'MODERATE', connectionStatus: 'ONLINE', isHandRaised: false, lastUpdateTime: 'Just now', history: [80, 81, 82, 83, 82, 82, 82], earAverage: 0.26, headYaw: -5 },
  ]

  private intervalId: any = null
  private subscribers: ClassroomSimulatorCallback[] = []

  public startSimulation(): void {
    if (this.intervalId) return

    this.intervalId = setInterval(() => {
      this.tick()
    }, 2500)
  }

  public stopSimulation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  public subscribe(callback: ClassroomSimulatorCallback): () => void {
    this.subscribers.push(callback)
    // Immediately trigger first callback with current data
    callback(this.students, this.calculateStats())

    if (!this.intervalId) {
      this.startSimulation()
    }

    return () => {
      this.subscribers = this.subscribers.filter((cb) => cb !== callback)
      if (this.subscribers.length === 0) {
        this.stopSimulation()
      }
    }
  }

  private tick(): void {
    // Smooth real-time update: drift attention & confusion by micro-jitters (-2 to +2)
    this.students = this.students.map((student) => {
      if (student.connectionStatus === 'OFFLINE') return student

      const attJitter = (Math.random() - 0.5) * 4
      const confJitter = (Math.random() - 0.5) * 3

      const newAtt = Math.min(100, Math.max(15, Math.round(student.attentionScore + attJitter)))
      const newConf = Math.min(100, Math.max(2, Math.round(student.confusionScore + confJitter)))

      let newStatus = student.status
      if (newConf > 55) newStatus = 'CONFUSED'
      else if (newAtt >= 70) newStatus = 'FOCUSED'
      else if (newAtt >= 40) newStatus = 'MODERATE'
      else newStatus = 'LOW_FOCUS'

      // Update history array (keep last 10 points)
      const updatedHistory = [...student.history.slice(1), newAtt]

      return {
        ...student,
        attentionScore: newAtt,
        confusionScore: newConf,
        status: newStatus,
        history: updatedHistory,
        lastUpdateTime: 'Just now',
      }
    })

    const stats = this.calculateStats()
    this.subscribers.forEach((cb) => cb(this.students, stats))
  }

  public calculateStats(): ClassroomSummaryStats {
    let totalAtt = 0
    let totalConf = 0
    let focusedCount = 0
    let moderateCount = 0
    let lowFocusCount = 0
    let confusedCount = 0
    let handRaisedCount = 0
    let onlineCount = 0

    const total = this.students.length

    for (const s of this.students) {
      totalAtt += s.attentionScore
      totalConf += s.confusionScore

      if (s.connectionStatus === 'ONLINE') onlineCount++
      if (s.isHandRaised) handRaisedCount++

      if (s.status === 'CONFUSED' || s.confusionScore > 50) confusedCount++
      else if (s.status === 'FOCUSED') focusedCount++
      else if (s.status === 'MODERATE') moderateCount++
      else lowFocusCount++
    }

    return {
      totalStudents: total,
      avgAttention: Math.round(totalAtt / total),
      avgConfusion: Math.round(totalConf / total),
      focusedCount,
      moderateCount,
      lowFocusCount,
      confusedCount,
      handRaisedCount,
      onlineCount,
    }
  }
}

export const classroomSimulator = new ClassroomSimulatorService()
