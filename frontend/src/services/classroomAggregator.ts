/**
 * MindMap Phase 3 - Classroom Telemetry Aggregator (Frontend)
 * 
 * Aggregates student telemetry in real-time to compute:
 * 1. Active participant count and overall engagement distributions
 * 2. Classroom-wide average attention and confusion scores
 * 3. Temporal Attention Drop Detection:
 *    Triggers an urgent alert ONLY when average class attention drops below
 *    the alert threshold (default 65%) for >= 3 consecutive analysis windows.
 */

export interface StudentTelemetry {
  studentId: string
  studentName: string
  attentionScore: number
  confusionScore: number
  attentionState: 'ATTENTIVE' | 'INATTENTIVE'
  confusionState: 'NORMAL' | 'POSSIBLY_CONFUSED'
  confidence: number
  timestampMs: number
}

export interface ClassroomSummary {
  totalStudents: number
  activeStudents: number
  avgAttention: number
  avgConfusion: number
  attentiveCount: number
  inattentiveCount: number
  confusedCount: number
  attentionDropAlert: boolean
  consecutiveLowWindows: number
  previousAvgAttention: number
  alertMessage: string | null
  timestampMs: number
}

export interface ClassroomAggregatorConfig {
  attentionDropThreshold: number
  requiredConsecutiveWindows: number
  staleStudentTimeoutMs: number
}

export const DEFAULT_CLASSROOM_CONFIG: ClassroomAggregatorConfig = {
  attentionDropThreshold: 65.0,
  requiredConsecutiveWindows: 3,
  staleStudentTimeoutMs: 12000.0,
}

export class ClassroomAggregatorClient {
  private config: ClassroomAggregatorConfig
  private students: Map<string, StudentTelemetry> = new Map()
  private consecutiveLowWindows = 0
  private previousAvgAttention = 85.0
  private historyAverages: number[] = []

  constructor(config: ClassroomAggregatorConfig = DEFAULT_CLASSROOM_CONFIG) {
    this.config = config
  }

  public updateStudent(telemetry: StudentTelemetry): void {
    this.students.set(telemetry.studentId, telemetry)
  }

  public pruneStale(nowMs: number = Date.now()): void {
    const cutoff = nowMs - this.config.staleStudentTimeoutMs
    for (const [id, s] of this.students.entries()) {
      if (s.timestampMs < cutoff) {
        this.students.delete(id)
      }
    }
  }

  public computeSummary(nowMs: number = Date.now()): ClassroomSummary {
    this.pruneStale(nowMs)
    const active = Array.from(this.students.values())
    const total = active.length

    if (total === 0) {
      return {
        totalStudents: 0,
        activeStudents: 0,
        avgAttention: 0,
        avgConfusion: 0,
        attentiveCount: 0,
        inattentiveCount: 0,
        confusedCount: 0,
        attentionDropAlert: false,
        consecutiveLowWindows: 0,
        previousAvgAttention: this.previousAvgAttention,
        alertMessage: null,
        timestampMs: nowMs,
      }
    }

    const avgAttention = Number(
      (active.reduce((acc, s) => acc + s.attentionScore, 0) / total).toFixed(1)
    )
    const avgConfusion = Number(
      (active.reduce((acc, s) => acc + s.confusionScore, 0) / total).toFixed(1)
    )
    const attentiveCount = active.filter(
      (s) => s.attentionState === 'ATTENTIVE' || s.attentionScore >= 50.0
    ).length
    const inattentiveCount = total - attentiveCount
    const confusedCount = active.filter(
      (s) => s.confusionState === 'POSSIBLY_CONFUSED' || s.confusionScore >= 50.0
    ).length

    // Temporal drop detection across consecutive windows
    const isLow = avgAttention < this.config.attentionDropThreshold
    if (isLow) {
      this.consecutiveLowWindows++
    } else {
      this.consecutiveLowWindows = 0
    }

    const attentionDropAlert =
      this.consecutiveLowWindows >= this.config.requiredConsecutiveWindows

    let alertMessage: string | null = null
    if (attentionDropAlert) {
      alertMessage = `Class Attention Drop Detected: Classroom average dropped to ${avgAttention}% (previous: ${this.previousAvgAttention}%) across ${this.consecutiveLowWindows} consecutive windows with ${inattentiveCount} inattentive student(s).`
    }

    const summary: ClassroomSummary = {
      totalStudents: total,
      activeStudents: total,
      avgAttention,
      avgConfusion,
      attentiveCount,
      inattentiveCount,
      confusedCount,
      attentionDropAlert,
      consecutiveLowWindows: this.consecutiveLowWindows,
      previousAvgAttention: this.previousAvgAttention,
      alertMessage,
      timestampMs: nowMs,
    }

    this.previousAvgAttention = avgAttention
    this.historyAverages.push(avgAttention)
    if (this.historyAverages.length > 100) {
      this.historyAverages.shift()
    }

    return summary
  }

  public getStudents(): StudentTelemetry[] {
    return Array.from(this.students.values())
  }

  public reset(): void {
    this.students.clear()
    this.consecutiveLowWindows = 0
    this.previousAvgAttention = 85.0
    this.historyAverages = []
  }
}
