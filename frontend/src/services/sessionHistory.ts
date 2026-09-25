/**
 * MindMap Phase 3 - Session History Buffer & Analytics Aggregator
 * 
 * Records time-series attention & confusion telemetry during a live session:
 * 1. Rolling history buffer optimized for real-time Recharts visualization
 * 2. Summary KPI calculation (average attention, average confusion, drop/spike counts)
 * 3. PDF report generation bridge for academic presentation and teacher review
 */

import { generateSessionPDFReport } from '../pages/teacher/PDFReportExporter.ts'
import type { SessionReportData } from '../pages/teacher/PDFReportExporter.ts'

export interface SessionTimelinePoint {
  time: string // HH:MM:SS format
  timestamp: number // epoch ms
  attention: number // 0 - 100
  confusion: number // 0 - 100
  isAttentive: boolean
  isConfused: boolean
}

export interface SessionPerformanceStats {
  sessionDurationSeconds: number
  totalDataPoints: number
  averageAttention: number
  averageConfusion: number
  peakAttention: number
  peakConfusion: number
  attentionDropsCount: number // count of dips < 50%
  confusionSpikesCount: number // count of spikes >= 50%
  attentiveTimePercentage: number // % of points with attention >= 50%
  status: 'EXCELLENT' | 'STABLE' | 'NEEDS_ATTENTION'
}

export class SessionHistoryTracker {
  private history: SessionTimelinePoint[] = []
  private maxPoints: number
  private startTime: number

  constructor(maxPoints = 40) {
    this.maxPoints = maxPoints
    this.startTime = Date.now()
  }

  public recordPoint(attention: number, confusion: number): SessionTimelinePoint {
    const now = new Date()
    const point: SessionTimelinePoint = {
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      timestamp: now.getTime(),
      attention: Math.round(attention),
      confusion: Math.round(confusion),
      isAttentive: attention >= 50,
      isConfused: confusion >= 50,
    }

    this.history.push(point)
    if (this.history.length > this.maxPoints) {
      this.history.shift()
    }

    return point
  }

  public getHistory(): SessionTimelinePoint[] {
    return [...this.history]
  }

  public getPerformanceStats(): SessionPerformanceStats {
    if (this.history.length === 0) {
      return {
        sessionDurationSeconds: 0,
        totalDataPoints: 0,
        averageAttention: 0,
        averageConfusion: 0,
        peakAttention: 0,
        peakConfusion: 0,
        attentionDropsCount: 0,
        confusionSpikesCount: 0,
        attentiveTimePercentage: 0,
        status: 'STABLE',
      }
    }

    const durationSec = Math.max(1, Math.round((Date.now() - this.startTime) / 1000))
    const total = this.history.length
    const avgAtt = Math.round(this.history.reduce((a, b) => a + b.attention, 0) / total)
    const avgConf = Math.round(this.history.reduce((a, b) => a + b.confusion, 0) / total)
    const peakAtt = Math.max(...this.history.map((p) => p.attention))
    const peakConf = Math.max(...this.history.map((p) => p.confusion))
    const attDrops = this.history.filter((p) => !p.isAttentive).length
    const confSpikes = this.history.filter((p) => p.isConfused).length
    const attentivePct = Math.round(((total - attDrops) / total) * 100)

    let status: 'EXCELLENT' | 'STABLE' | 'NEEDS_ATTENTION' = 'STABLE'
    if (avgAtt >= 80 && avgConf < 25) {
      status = 'EXCELLENT'
    } else if (avgAtt < 60 || avgConf >= 40) {
      status = 'NEEDS_ATTENTION'
    }

    return {
      sessionDurationSeconds: durationSec,
      totalDataPoints: total,
      averageAttention: avgAtt,
      averageConfusion: avgConf,
      peakAttention: peakAtt,
      peakConfusion: peakConf,
      attentionDropsCount: attDrops,
      confusionSpikesCount: confSpikes,
      attentiveTimePercentage: attentivePct,
      status,
    }
  }

  public exportPDF(
    className = 'CS401 - Machine Learning & Vision',
    classCode = 'CS-ML-2026',
    instructor = 'Faculty Examiner',
    currentStudentName = 'Demo Student'
  ): void {
    const stats = this.getPerformanceStats()
    const reportData: SessionReportData = {
      className,
      classCode,
      instructor,
      date: new Date().toLocaleString(),
      totalStudents: 1,
      avgAttention: stats.averageAttention,
      avgConfusion: stats.averageConfusion,
      students: [
        {
          name: currentStudentName,
          email: 'student@university.edu',
          attention: stats.averageAttention,
          confusion: stats.averageConfusion,
          status: stats.status === 'EXCELLENT' ? 'HIGH FOCUS' : stats.status === 'NEEDS_ATTENTION' ? 'INATTENTIVE' : 'NORMAL',
        },
      ],
    }

    generateSessionPDFReport(reportData)
  }

  public reset(): void {
    this.history = []
    this.startTime = Date.now()
  }
}
