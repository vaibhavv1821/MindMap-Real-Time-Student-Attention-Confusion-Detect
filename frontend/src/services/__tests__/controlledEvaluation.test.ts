import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CONTROLLED_SCENARIOS,
  runControlledEvaluationLocal,
} from '../controlledEvaluator.ts'
import type { ControlledEvaluationReport } from '../controlledEvaluator.ts'
import { ClassroomAggregatorClient } from '../classroomAggregator.ts'
import { SessionHistoryTracker } from '../sessionHistory.ts'

test('Controlled Scenarios: All 8 standardized scenarios defined', () => {
  assert.equal(CONTROLLED_SCENARIOS.length, 8)

  const scenarioIds = CONTROLLED_SCENARIOS.map((s) => s.id)
  assert.ok(scenarioIds.includes('SCENARIO_1_LOOKING_AT_SCREEN'))
  assert.ok(scenarioIds.includes('SCENARIO_2_LOOKING_AWAY'))
  assert.ok(scenarioIds.includes('SCENARIO_3_HEAD_TURNED'))
  assert.ok(scenarioIds.includes('SCENARIO_4_LOOKING_DOWN'))
  assert.ok(scenarioIds.includes('SCENARIO_5_FREQUENT_BLINKING'))
  assert.ok(scenarioIds.includes('SCENARIO_6_PROLONGED_GAZE_DEVIATION'))
  assert.ok(scenarioIds.includes('SCENARIO_7_BROW_FURROWING'))
  assert.ok(scenarioIds.includes('SCENARIO_8_SUSTAINED_HEAD_MOVEMENT'))
})

test('Controlled Evaluation: 100% pass rate across all 8 scenarios', () => {
  const report: ControlledEvaluationReport = runControlledEvaluationLocal()
  assert.equal(report.totalScenarios, 8)
  assert.equal(report.passedScenarios, 8)
  assert.equal(report.failedScenarios, 0)
  assert.equal(report.passRatePercent, 100)
  assert.equal(report.attentionAccuracyPercent, 100)
  assert.equal(report.confusionAccuracyPercent, 100)
  assert.equal(report.overallAccuracyPercent, 100)
})

test('Scenario 1: Looking Directly at Screen -> ATTENTIVE & NORMAL', () => {
  const report = runControlledEvaluationLocal()
  const s1 = report.scenarios.find((s) => s.id === 'SCENARIO_1_LOOKING_AT_SCREEN')
  assert.ok(s1)
  assert.equal(s1.passed, true)
  assert.equal(s1.predictedAttention, 'ATTENTIVE')
  assert.equal(s1.predictedConfusion, 'NORMAL')
  assert.ok(s1.attentionScore >= 70)
})

test('Scenario 2: Looking Away -> INATTENTIVE', () => {
  const report = runControlledEvaluationLocal()
  const s2 = report.scenarios.find((s) => s.id === 'SCENARIO_2_LOOKING_AWAY')
  assert.ok(s2)
  assert.equal(s2.passed, true)
  assert.equal(s2.predictedAttention, 'INATTENTIVE')
})

test('Scenario 7: Brow Furrowing -> ATTENTIVE & POSSIBLY_CONFUSED', () => {
  const report = runControlledEvaluationLocal()
  const s7 = report.scenarios.find((s) => s.id === 'SCENARIO_7_BROW_FURROWING')
  assert.ok(s7)
  assert.equal(s7.passed, true)
  assert.equal(s7.predictedAttention, 'ATTENTIVE')
  assert.equal(s7.predictedConfusion, 'POSSIBLY_CONFUSED')
  assert.ok(s7.confusionScore >= 50)
})

test('ClassroomAggregator: Aggregates multi-student averages', () => {
  const agg = new ClassroomAggregatorClient()
  const now = Date.now()

  agg.updateStudent({
    studentId: 's1',
    studentName: 'Student 1',
    attentionScore: 80,
    confusionScore: 10,
    attentionState: 'ATTENTIVE',
    confusionState: 'NORMAL',
    confidence: 95,
    timestampMs: now,
  })

  agg.updateStudent({
    studentId: 's2',
    studentName: 'Student 2',
    attentionScore: 60,
    confusionScore: 30,
    attentionState: 'ATTENTIVE',
    confusionState: 'NORMAL',
    confidence: 90,
    timestampMs: now,
  })

  const summary = agg.computeSummary(now)
  assert.equal(summary.totalStudents, 2)
  assert.equal(summary.activeStudents, 2)
  assert.equal(summary.avgAttention, 70)
  assert.equal(summary.avgConfusion, 20)
  assert.equal(summary.attentiveCount, 2)
  assert.equal(summary.attentionDropAlert, false)
})

test('ClassroomAggregator: Triggers alert ONLY after 3 consecutive low windows', () => {
  const agg = new ClassroomAggregatorClient({
    attentionDropThreshold: 65,
    requiredConsecutiveWindows: 3,
    staleStudentTimeoutMs: 10000,
  })
  const now = Date.now()

  agg.updateStudent({
    studentId: 's1',
    studentName: 'Distracted Student',
    attentionScore: 40,
    confusionScore: 20,
    attentionState: 'INATTENTIVE',
    confusionState: 'NORMAL',
    confidence: 90,
    timestampMs: now,
  })

  // Window 1: Drop detected, count = 1 -> Alert false
  const s1 = agg.computeSummary(now)
  assert.equal(s1.consecutiveLowWindows, 1)
  assert.equal(s1.attentionDropAlert, false)

  // Window 2: Drop detected, count = 2 -> Alert false
  const s2 = agg.computeSummary(now + 1000)
  assert.equal(s2.consecutiveLowWindows, 2)
  assert.equal(s2.attentionDropAlert, false)

  // Window 3: Drop detected, count = 3 -> Alert true!
  const s3 = agg.computeSummary(now + 2000)
  assert.equal(s3.consecutiveLowWindows, 3)
  assert.equal(s3.attentionDropAlert, true)
  assert.ok(s3.alertMessage?.includes('Class Attention Drop Detected'))

  // Recovery: Attention recovers to 85% -> Alert false
  agg.updateStudent({
    studentId: 's1',
    studentName: 'Distracted Student',
    attentionScore: 85,
    confusionScore: 10,
    attentionState: 'ATTENTIVE',
    confusionState: 'NORMAL',
    confidence: 95,
    timestampMs: now + 3000,
  })
  const s4 = agg.computeSummary(now + 3000)
  assert.equal(s4.consecutiveLowWindows, 0)
  assert.equal(s4.attentionDropAlert, false)
})

test('SessionHistoryTracker: Records timeline and computes KPIs', () => {
  const tracker = new SessionHistoryTracker(10)
  tracker.recordPoint(90, 10)
  tracker.recordPoint(80, 15)
  tracker.recordPoint(70, 20)

  const history = tracker.getHistory()
  assert.equal(history.length, 3)
  assert.equal(history[0].attention, 90)

  const stats = tracker.getPerformanceStats()
  assert.equal(stats.totalDataPoints, 3)
  assert.equal(stats.averageAttention, 80)
  assert.equal(stats.averageConfusion, 15)
  assert.equal(stats.attentiveTimePercentage, 100)
  assert.equal(stats.status, 'EXCELLENT')
})
