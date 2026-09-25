/**
 * MindMap Phase 3 - Controlled Behavioral Evaluation Module (Frontend)
 * 
 * Defines 8 standardized physical behavioral scenarios for student state verification:
 * 1. Looking Directly at Screen (Attentive, Focused)
 * 2. Looking Away from Screen (Gaze averted, Off-task)
 * 3. Head Turned Sideways (Peer interaction, Large Yaw)
 * 4. Looking Down (Mobile phone / Desk reading)
 * 5. Frequent Blinking / Drowsiness (Fatigue / Microsleep)
 * 6. Prolonged Gaze Deviation (Sustained Off-task Attention)
 * 7. Brow Furrowing / Topic Confusion (Cognitive Load, Brow Contraction)
 * 8. Sustained Head Movement / High Motion (Restlessness, Dynamic Motion)
 * 
 * Enables professors and examiners to execute a live controlled verification suite
 * directly in the browser or via the FastAPI backend.
 */

import type { TemporalFeatureVector, MLPredictionResult } from './temporalAnalyzer.ts'
import { TemporalMLPredictor } from './temporalAnalyzer.ts'

export interface ControlledScenario {
  id: string
  name: string
  description: string
  behavioralCues: string[]
  expectedAttention: 'ATTENTIVE' | 'INATTENTIVE'
  expectedConfusion: 'NORMAL' | 'POSSIBLY_CONFUSED'
  vector: TemporalFeatureVector
}

export interface ScenarioTestResult {
  id: string
  name: string
  description: string
  behavioralCues: string[]
  expectedAttention: 'ATTENTIVE' | 'INATTENTIVE'
  predictedAttention: string
  attentionScore: number
  attentionMatch: boolean
  expectedConfusion: 'NORMAL' | 'POSSIBLY_CONFUSED'
  predictedConfusion: string
  confusionScore: number
  confusionMatch: boolean
  confidence: number
  passed: boolean
  reasons: string[]
}

export interface ControlledEvaluationReport {
  evaluationType: string
  totalScenarios: number
  passedScenarios: number
  failedScenarios: number
  passRatePercent: number
  attentionAccuracyPercent: number
  confusionAccuracyPercent: number
  overallAccuracyPercent: number
  disclaimer: string
  scenarios: ScenarioTestResult[]
  timestamp: string
}

export const CONTROLLED_SCENARIOS: ControlledScenario[] = [
  {
    id: 'SCENARIO_1_LOOKING_AT_SCREEN',
    name: 'Looking Directly at Screen',
    description: 'Student maintains focused center gaze on monitor with steady posture, relaxed brow, and natural blink rate.',
    behavioralCues: ['Stable center gaze (>90%)', 'Low head motion variance', 'Regular blink rate (~15 bpm)', 'Relaxed brow musculature'],
    expectedAttention: 'ATTENTIVE',
    expectedConfusion: 'NORMAL',
    vector: {
      ear_mean: 0.29,
      ear_std: 0.015,
      ear_min: 0.25,
      ear_max: 0.32,
      gaze_deviation_mean: 0.08,
      gaze_deviation_max: 0.15,
      gaze_center_percent: 92.0,
      gaze_away_percent: 6.0,
      sustained_gaze_away_duration_ms: 100.0,
      head_yaw_mean: 1.5,
      head_pitch_mean: -2.0,
      head_roll_mean: 0.5,
      head_yaw_variance: 4.0,
      head_pitch_variance: 3.5,
      head_roll_variance: 2.0,
      head_movement_magnitude: 1.0,
      blink_count: 1,
      blink_rate: 15.0,
      avg_closure_duration_ms: 130.0,
      brow_furrow_mean: 0.10,
      brow_furrow_max: 0.18,
      brow_furrow_persistence: 5.0,
      valid_face_percentage: 100.0,
      valid_samples_count: 75,
      total_samples_count: 75,
      window_duration_ms: 2500.0,
      timestamp_ms: 0,
    },
  },
  {
    id: 'SCENARIO_2_LOOKING_AWAY',
    name: 'Looking Away from Screen',
    description: 'Student looks away towards room periphery; sustained gaze deviation with minimal head rotation.',
    behavioralCues: ['High gaze away percentage (85%)', 'Gaze deviation > 0.70', 'Prolonged sustained gaze deviation (>1800ms)'],
    expectedAttention: 'INATTENTIVE',
    expectedConfusion: 'NORMAL',
    vector: {
      ear_mean: 0.27,
      ear_std: 0.02,
      ear_min: 0.22,
      ear_max: 0.30,
      gaze_deviation_mean: 0.72,
      gaze_deviation_max: 0.88,
      gaze_center_percent: 12.0,
      gaze_away_percent: 85.0,
      sustained_gaze_away_duration_ms: 1900.0,
      head_yaw_mean: 3.0,
      head_pitch_mean: -1.0,
      head_roll_mean: 1.0,
      head_yaw_variance: 12.0,
      head_pitch_variance: 10.0,
      head_roll_variance: 6.0,
      head_movement_magnitude: 2.2,
      blink_count: 1,
      blink_rate: 16.0,
      avg_closure_duration_ms: 140.0,
      brow_furrow_mean: 0.15,
      brow_furrow_max: 0.22,
      brow_furrow_persistence: 10.0,
      valid_face_percentage: 100.0,
      valid_samples_count: 75,
      total_samples_count: 75,
      window_duration_ms: 2500.0,
      timestamp_ms: 0,
    },
  },
  {
    id: 'SCENARIO_3_HEAD_TURNED',
    name: 'Head Turned Sideways',
    description: 'Student turns head sideways towards peer or doorway; large yaw offset and variance.',
    behavioralCues: ['Large head yaw mean (38°)', 'High yaw variance (68.0)', 'Gaze averted from camera', 'Elevated movement velocity'],
    expectedAttention: 'INATTENTIVE',
    expectedConfusion: 'NORMAL',
    vector: {
      ear_mean: 0.23,
      ear_std: 0.03,
      ear_min: 0.18,
      ear_max: 0.28,
      gaze_deviation_mean: 0.68,
      gaze_deviation_max: 0.85,
      gaze_center_percent: 15.0,
      gaze_away_percent: 78.0,
      sustained_gaze_away_duration_ms: 1600.0,
      head_yaw_mean: 38.0,
      head_pitch_mean: -3.0,
      head_roll_mean: 5.0,
      head_yaw_variance: 68.0,
      head_pitch_variance: 25.0,
      head_roll_variance: 18.0,
      head_movement_magnitude: 5.8,
      blink_count: 1,
      blink_rate: 18.0,
      avg_closure_duration_ms: 150.0,
      brow_furrow_mean: 0.18,
      brow_furrow_max: 0.25,
      brow_furrow_persistence: 12.0,
      valid_face_percentage: 92.0,
      valid_samples_count: 70,
      total_samples_count: 75,
      window_duration_ms: 2500.0,
      timestamp_ms: 0,
    },
  },
  {
    id: 'SCENARIO_4_LOOKING_DOWN',
    name: 'Looking Down (Desk / Phone)',
    description: 'Student tilts head downward towards notebook, phone, or keyboard; high pitch depression.',
    behavioralCues: ['Head pitch depressed (-29°)', 'High pitch variance', 'Gaze directed downward away from screen'],
    expectedAttention: 'INATTENTIVE',
    expectedConfusion: 'NORMAL',
    vector: {
      ear_mean: 0.24,
      ear_std: 0.03,
      ear_min: 0.19,
      ear_max: 0.29,
      gaze_deviation_mean: 0.62,
      gaze_deviation_max: 0.79,
      gaze_center_percent: 20.0,
      gaze_away_percent: 72.0,
      sustained_gaze_away_duration_ms: 1500.0,
      head_yaw_mean: 2.0,
      head_pitch_mean: -29.0,
      head_roll_mean: 2.0,
      head_yaw_variance: 22.0,
      head_pitch_variance: 55.0,
      head_roll_variance: 14.0,
      head_movement_magnitude: 4.5,
      blink_count: 1,
      blink_rate: 14.0,
      avg_closure_duration_ms: 160.0,
      brow_furrow_mean: 0.20,
      brow_furrow_max: 0.28,
      brow_furrow_persistence: 15.0,
      valid_face_percentage: 94.0,
      valid_samples_count: 70,
      total_samples_count: 75,
      window_duration_ms: 2500.0,
      timestamp_ms: 0,
    },
  },
  {
    id: 'SCENARIO_5_FREQUENT_BLINKING',
    name: 'Frequent Blinking / Drowsiness',
    description: 'Student exhibits signs of ocular fatigue: rapid blink spikes (>35 bpm) and prolonged closure duration (>300ms).',
    behavioralCues: ['Elevated blink frequency (38 bpm)', 'Prolonged average eye closure (340ms)', 'EAR variance elevated', 'Microsleep pattern'],
    expectedAttention: 'INATTENTIVE',
    expectedConfusion: 'NORMAL',
    vector: {
      ear_mean: 0.20,
      ear_std: 0.06,
      ear_min: 0.12,
      ear_max: 0.28,
      gaze_deviation_mean: 0.38,
      gaze_deviation_max: 0.55,
      gaze_center_percent: 45.0,
      gaze_away_percent: 42.0,
      sustained_gaze_away_duration_ms: 600.0,
      head_yaw_mean: 2.0,
      head_pitch_mean: -8.0,
      head_roll_mean: 1.0,
      head_yaw_variance: 18.0,
      head_pitch_variance: 22.0,
      head_roll_variance: 12.0,
      head_movement_magnitude: 3.2,
      blink_count: 3,
      blink_rate: 38.0,
      avg_closure_duration_ms: 340.0,
      brow_furrow_mean: 0.22,
      brow_furrow_max: 0.30,
      brow_furrow_persistence: 14.0,
      valid_face_percentage: 95.0,
      valid_samples_count: 72,
      total_samples_count: 75,
      window_duration_ms: 2500.0,
      timestamp_ms: 0,
    },
  },
  {
    id: 'SCENARIO_6_PROLONGED_GAZE_DEVIATION',
    name: 'Prolonged Gaze Deviation',
    description: 'Continuous off-screen focus lasting greater than 2000ms, indicating disengagement.',
    behavioralCues: ['Continuous gaze off-screen (>2200ms)', 'Gaze away > 90%', 'Gaze deviation > 0.80'],
    expectedAttention: 'INATTENTIVE',
    expectedConfusion: 'NORMAL',
    vector: {
      ear_mean: 0.26,
      ear_std: 0.02,
      ear_min: 0.21,
      ear_max: 0.30,
      gaze_deviation_mean: 0.82,
      gaze_deviation_max: 0.95,
      gaze_center_percent: 5.0,
      gaze_away_percent: 92.0,
      sustained_gaze_away_duration_ms: 2300.0,
      head_yaw_mean: 12.0,
      head_pitch_mean: -4.0,
      head_roll_mean: 2.0,
      head_yaw_variance: 28.0,
      head_pitch_variance: 16.0,
      head_roll_variance: 10.0,
      head_movement_magnitude: 3.4,
      blink_count: 1,
      blink_rate: 15.0,
      avg_closure_duration_ms: 135.0,
      brow_furrow_mean: 0.16,
      brow_furrow_max: 0.24,
      brow_furrow_persistence: 8.0,
      valid_face_percentage: 98.0,
      valid_samples_count: 74,
      total_samples_count: 75,
      window_duration_ms: 2500.0,
      timestamp_ms: 0,
    },
  },
  {
    id: 'SCENARIO_7_BROW_FURROWING',
    name: 'Brow Furrowing / Topic Confusion',
    description: 'Student concentrates with contracted brow muscles and lateral head tilt, indicating high cognitive load/confusion.',
    behavioralCues: ['Corrugator supercilii contraction (furrow score 0.76)', 'Brow furrow persistence (85%)', 'Moderate lateral head roll tilt (14°)', 'Maintains screen gaze'],
    expectedAttention: 'ATTENTIVE',
    expectedConfusion: 'POSSIBLY_CONFUSED',
    vector: {
      ear_mean: 0.27,
      ear_std: 0.018,
      ear_min: 0.23,
      ear_max: 0.31,
      gaze_deviation_mean: 0.15,
      gaze_deviation_max: 0.26,
      gaze_center_percent: 82.0,
      gaze_away_percent: 14.0,
      sustained_gaze_away_duration_ms: 200.0,
      head_yaw_mean: 3.0,
      head_pitch_mean: -3.0,
      head_roll_mean: 14.0,
      head_yaw_variance: 12.0,
      head_pitch_variance: 10.0,
      head_roll_variance: 28.0,
      head_movement_magnitude: 2.1,
      blink_count: 1,
      blink_rate: 17.0,
      avg_closure_duration_ms: 140.0,
      brow_furrow_mean: 0.76,
      brow_furrow_max: 0.90,
      brow_furrow_persistence: 85.0,
      valid_face_percentage: 100.0,
      valid_samples_count: 75,
      total_samples_count: 75,
      window_duration_ms: 2500.0,
      timestamp_ms: 0,
    },
  },
  {
    id: 'SCENARIO_8_SUSTAINED_HEAD_MOVEMENT',
    name: 'Sustained Head Movement / High Motion',
    description: 'Restless or fidgeting movement across yaw, pitch, and roll axes with high angular velocity.',
    behavioralCues: ['High angular step (7.5°/frame)', 'High 3D pose variance (yaw: 72, pitch: 60)', 'Intermittent screen gaze'],
    expectedAttention: 'INATTENTIVE',
    expectedConfusion: 'NORMAL',
    vector: {
      ear_mean: 0.23,
      ear_std: 0.04,
      ear_min: 0.16,
      ear_max: 0.30,
      gaze_deviation_mean: 0.52,
      gaze_deviation_max: 0.75,
      gaze_center_percent: 32.0,
      gaze_away_percent: 60.0,
      sustained_gaze_away_duration_ms: 1200.0,
      head_yaw_mean: 5.0,
      head_pitch_mean: 4.0,
      head_roll_mean: 6.0,
      head_yaw_variance: 72.0,
      head_pitch_variance: 60.0,
      head_roll_variance: 42.0,
      head_movement_magnitude: 7.5,
      blink_count: 2,
      blink_rate: 22.0,
      avg_closure_duration_ms: 180.0,
      brow_furrow_mean: 0.25,
      brow_furrow_max: 0.35,
      brow_furrow_persistence: 20.0,
      valid_face_percentage: 85.0,
      valid_samples_count: 65,
      total_samples_count: 75,
      window_duration_ms: 2500.0,
      timestamp_ms: 0,
    },
  },
]

/**
 * Runs the controlled evaluation suite client-side using TemporalMLPredictor.
 */
export function runControlledEvaluationLocal(): ControlledEvaluationReport {
  const predictor = new TemporalMLPredictor()
  const results: ScenarioTestResult[] = []
  let attMatches = 0
  let confMatches = 0

  for (const sc of CONTROLLED_SCENARIOS) {
    const pred: MLPredictionResult = predictor.predict(sc.vector)
    const attMatch = pred.attention_state === sc.expectedAttention
    const confMatch = pred.confusion_state === sc.expectedConfusion
    const passed = attMatch && confMatch

    if (attMatch) attMatches++
    if (confMatch) confMatches++

    results.push({
      id: sc.id,
      name: sc.name,
      description: sc.description,
      behavioralCues: sc.behavioralCues,
      expectedAttention: sc.expectedAttention,
      predictedAttention: pred.attention_state,
      attentionScore: pred.attention_score,
      attentionMatch: attMatch,
      expectedConfusion: sc.expectedConfusion,
      predictedConfusion: pred.confusion_state,
      confusionScore: pred.confusion_score,
      confusionMatch: confMatch,
      confidence: pred.confidence,
      passed,
      reasons: pred.reasons,
    })
  }

  const total = CONTROLLED_SCENARIOS.length
  const passedCount = results.filter((r) => r.passed).length

  return {
    evaluationType: 'CONTROLLED_BEHAVIORAL_TEST_SUITE_CLIENT',
    totalScenarios: total,
    passedScenarios: passedCount,
    failedScenarios: total - passedCount,
    passRatePercent: Number(((passedCount / total) * 100).toFixed(1)),
    attentionAccuracyPercent: Number(((attMatches / total) * 100).toFixed(1)),
    confusionAccuracyPercent: Number(((confMatches / total) * 100).toFixed(1)),
    overallAccuracyPercent: Number((((attMatches + confMatches) / (total * 2)) * 100).toFixed(1)),
    disclaimer:
      'Evaluation performed on 8 standardized behavioral scenarios for pipeline verification. Real-world benchmark evaluation pending DAiSEE dataset.',
    scenarios: results,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Fetches the controlled evaluation results from the FastAPI backend.
 */
export async function fetchControlledEvaluationBackend(
  backendUrl?: string
): Promise<ControlledEvaluationReport> {
  const defaultUrl =
    typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL
      ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/?$/, '')
      : 'http://localhost:8000'
  const resolvedUrl = (backendUrl || defaultUrl).replace(/\/+$/, '')
  const resp = await fetch(`${resolvedUrl}/api/ml/controlled-evaluation`)
  if (!resp.ok) {
    throw new Error(`Failed to fetch backend evaluation: ${resp.statusText}`)
  }
  const data = await resp.json()
  return {
    evaluationType: data.evaluation_type,
    totalScenarios: data.total_scenarios,
    passedScenarios: data.passed_scenarios,
    failedScenarios: data.failed_scenarios,
    passRatePercent: data.pass_rate_percent,
    attentionAccuracyPercent: data.attention_accuracy_percent,
    confusionAccuracyPercent: data.confusion_accuracy_percent,
    overallAccuracyPercent: data.overall_accuracy_percent,
    disclaimer: data.disclaimer,
    scenarios: data.scenarios.map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      behavioralCues: s.behavioral_cues || [],
      expectedAttention: s.expected_attention,
      predictedAttention: s.predicted_attention,
      attentionScore: s.attention_score,
      attentionMatch: s.attention_match,
      expectedConfusion: s.expected_confusion,
      predictedConfusion: s.predicted_confusion,
      confusionScore: s.confusion_score,
      confusionMatch: s.confusion_match,
      confidence: s.confidence,
      passed: s.passed,
      reasons: s.reasons || [],
    })),
    timestamp: new Date().toISOString(),
  }
}
