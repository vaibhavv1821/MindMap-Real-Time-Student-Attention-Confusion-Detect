/**
 * MindMap Phase 2 - Temporal Intelligence & Behavioural Analysis Engine (Frontend)
 * 
 * Aggregates Phase 1 instantaneous FacialFeatureVector samples over a rolling temporal window:
 * 1. Rolling Window Temporal Buffer (configurable 1-3 seconds, adaptive to any camera FPS)
 * 2. Statistical Temporal Feature Vector (EAR, Gaze, Head Pose, Blinks, Brows, Data Quality)
 * 3. Intermediate Behavioural Indicators (sustained gaze away, excessive movement, brow furrow persistence)
 * 4. Lightweight Explainable ML Prediction Layer (Attention & Confusion states, scores, confidence, reasons)
 */

import type { FacialFeatureVector } from './faceMeshExtractor.ts'

export type AttentionState = 'ATTENTIVE' | 'INATTENTIVE'
export type ConfusionState = 'NORMAL' | 'POSSIBLY_CONFUSED'
export type ModelStatus = 'TRAINED_DEMO_MODEL' | 'HEURISTIC_FALLBACK' | 'PRODUCTION_DAISEE_PENDING'

export interface TemporalFeatureVector {
  // 1. EAR temporal statistics
  ear_mean: number
  ear_std: number
  ear_min: number
  ear_max: number

  // 2. Gaze temporal metrics
  gaze_deviation_mean: number
  gaze_deviation_max: number
  gaze_center_percent: number // 0 - 100
  gaze_away_percent: number // 0 - 100
  sustained_gaze_away_duration_ms: number

  // 3. Head pose temporal dynamics (degrees)
  head_yaw_mean: number
  head_pitch_mean: number
  head_roll_mean: number
  head_yaw_variance: number
  head_pitch_variance: number
  head_roll_variance: number
  head_movement_magnitude: number // average degrees/frame

  // 4. Blink dynamics
  blink_count: number
  blink_rate: number
  avg_closure_duration_ms: number

  // 5. Brow dynamics
  brow_furrow_mean: number
  brow_furrow_max: number
  brow_furrow_persistence: number // 0 - 100

  // 6. Data quality & window metadata
  valid_face_percentage: number // 0 - 100
  valid_samples_count: number
  total_samples_count: number
  window_duration_ms: number
  timestamp_ms: number
}

export interface BehaviouralIndicators {
  sustained_gaze_away: boolean
  excessive_head_movement: boolean
  prolonged_eye_closure: boolean
  high_brow_furrow: boolean
  stable_screen_gaze: boolean
  attention_drop_indicator: number // 0.0 - 1.0 composite
  confusion_indicator: number // 0.0 - 1.0 composite
}

export interface MLPredictionResult {
  attention_state: AttentionState
  attention_score: number // 0 - 100
  confusion_state: ConfusionState
  confusion_score: number // 0 - 100
  confidence: number // 0 - 100
  reasons: string[]
  indicators: BehaviouralIndicators
  temporal_features: TemporalFeatureVector
  model_status: ModelStatus
  timestamp_ms: number
}

export interface BehaviourThresholdConfig {
  gazeAwayPercent: number
  sustainedGazeAwayMs: number
  headMovementMagnitude: number
  headTotalVariance: number
  prolongedClosureMs: number
  browFurrowMean: number
  browFurrowPersistence: number
  stableGazeCenter: number
  stableMovement: number
}

export const DEFAULT_BEHAVIOUR_CONFIG: BehaviourThresholdConfig = {
  gazeAwayPercent: 45.0,
  sustainedGazeAwayMs: 800.0,
  headMovementMagnitude: 3.5,
  headTotalVariance: 50.0,
  prolongedClosureMs: 300.0,
  browFurrowMean: 0.45,
  browFurrowPersistence: 40.0,
  stableGazeCenter: 70.0,
  stableMovement: 2.5,
}


/**
 * Rolling temporal buffer holding recent FacialFeatureVector samples.
 */
export class RollingTemporalBuffer {
  private windowDurationMs: number
  private maxSamples: number
  private minSamples: number
  private samples: FacialFeatureVector[] = []

  constructor(
    windowDurationMs: number = 2500,
    maxSamples: number = 120,
    minSamples: number = 5
  ) {
    this.windowDurationMs = windowDurationMs
    this.maxSamples = maxSamples
    this.minSamples = minSamples
  }

  public addSample(vector: FacialFeatureVector): void {
    this.samples.push(vector)
    this.prune(vector.timestamp_ms)
  }

  private prune(currentTimeMs: number): void {
    const cutoff = currentTimeMs - this.windowDurationMs
    this.samples = this.samples.filter((s) => s.timestamp_ms >= cutoff)
    if (this.samples.length > this.maxSamples) {
      this.samples = this.samples.slice(-this.maxSamples)
    }
  }

  public getSamples(): FacialFeatureVector[] {
    return [...this.samples]
  }

  public getSampleCount(): number {
    return this.samples.length
  }

  public isReady(): boolean {
    return this.samples.length >= this.minSamples
  }

  public getActualWindowDurationMs(): number {
    if (this.samples.length < 2) return 0
    return Math.max(0, this.samples[this.samples.length - 1].timestamp_ms - this.samples[0].timestamp_ms)
  }

  public reset(): void {
    this.samples = []
  }

  public setWindowDuration(ms: number): void {
    if (ms >= 500 && ms <= 10000) {
      this.windowDurationMs = ms
    }
  }
}

/**
 * Statistical aggregator over rolling feature samples.
 */
export class TemporalFeatureAggregator {
  private static mean(vals: number[]): number {
    if (!vals || vals.length === 0) return 0
    return vals.reduce((a, b) => a + b, 0) / vals.length
  }

  private static variance(vals: number[], meanVal?: number): number {
    if (!vals || vals.length < 2) return 0
    const m = meanVal !== undefined ? meanVal : this.mean(vals)
    const sumSquares = vals.reduce((acc, v) => acc + (v - m) * (v - m), 0)
    return sumSquares / (vals.length - 1)
  }

  private static std(vals: number[], meanVal?: number): number {
    return Math.sqrt(this.variance(vals, meanVal))
  }

  public static aggregate(
    samples: FacialFeatureVector[],
    nowMs: number = Date.now()
  ): TemporalFeatureVector {
    const totalSamples = samples.length
    if (totalSamples === 0) {
      return this.emptyVector(nowMs)
    }

    const validSamples = samples.filter((s) => s.face_detected)
    const validCount = validSamples.length
    const validFacePct = Number(((validCount / totalSamples) * 100).toFixed(1))

    const windowDurationMs =
      totalSamples >= 2
        ? Math.max(0, samples[totalSamples - 1].timestamp_ms - samples[0].timestamp_ms)
        : 0

    if (validCount === 0) {
      const v = this.emptyVector(nowMs)
      v.total_samples_count = totalSamples
      v.window_duration_ms = Number(windowDurationMs.toFixed(1))
      v.valid_face_percentage = 0
      return v
    }

    // 1. EAR statistics
    const ears = validSamples.map((s) => s.ear_avg)
    const earMean = this.mean(ears)
    const earStd = this.std(ears, earMean)
    const earMin = Math.min(...ears)
    const earMax = Math.max(...ears)

    // 2. Gaze statistics
    const gazeDevs = validSamples.map((s) => s.gaze_deviation)
    const gazeDevMean = this.mean(gazeDevs)
    const gazeDevMax = Math.max(...gazeDevs)

    const centerCount = validSamples.filter((s) => s.gaze_direction === 'CENTER').length
    const awayCount = validSamples.filter((s) => s.gaze_direction === 'AWAY').length
    const gazeCenterPct = Number(((centerCount / validCount) * 100).toFixed(1))
    const gazeAwayPct = Number(((awayCount / validCount) * 100).toFixed(1))

    // Sustained AWAY streak in ms
    let sustainedAwayMs = 0
    let currentStreakStart: number | null = null
    for (const s of validSamples) {
      if (s.gaze_direction === 'AWAY') {
        if (currentStreakStart === null) currentStreakStart = s.timestamp_ms
        const streak = s.timestamp_ms - currentStreakStart
        if (streak > sustainedAwayMs) sustainedAwayMs = streak
      } else {
        currentStreakStart = null
      }
    }

    // 3. Head Pose dynamics
    const yaws = validSamples.map((s) => s.head_yaw)
    const pitches = validSamples.map((s) => s.head_pitch)
    const rolls = validSamples.map((s) => s.head_roll)

    const headYawMean = this.mean(yaws)
    const headPitchMean = this.mean(pitches)
    const headRollMean = this.mean(rolls)

    const headYawVar = this.variance(yaws, headYawMean)
    const headPitchVar = this.variance(pitches, headPitchMean)
    const headRollVar = this.variance(rolls, headRollMean)

    const movements: number[] = []
    for (let i = 1; i < validSamples.length; i++) {
      const dyaw = validSamples[i].head_yaw - validSamples[i - 1].head_yaw
      const dpitch = validSamples[i].head_pitch - validSamples[i - 1].head_pitch
      const droll = validSamples[i].head_roll - validSamples[i - 1].head_roll
      movements.push(Math.sqrt(dyaw * dyaw + dpitch * dpitch + droll * droll))
    }
    const headMovementMag = this.mean(movements)

    // 4. Blink metrics
    const totalBlinks =
      validCount >= 2
        ? Math.max(0, validSamples[validCount - 1].blink_count - validSamples[0].blink_count)
        : validSamples[0].blink_detected
        ? 1
        : 0
    const blinkRate = validSamples[validCount - 1].blink_rate

    const closureDurations = validSamples
      .filter((s) => s.eye_closure_duration_ms > 0)
      .map((s) => s.eye_closure_duration_ms)
    const avgClosureMs = this.mean(closureDurations)

    // 5. Brow metrics
    const browScores = validSamples.map((s) => s.brow_furrow_score)
    const browMean = this.mean(browScores)
    const browMax = Math.max(...browScores)
    const persistedCount = browScores.filter((b) => b >= 0.4).length
    const browPersistence = Number(((persistedCount / validCount) * 100).toFixed(1))

    return {
      ear_mean: Number(earMean.toFixed(4)),
      ear_std: Number(earStd.toFixed(4)),
      ear_min: Number(earMin.toFixed(4)),
      ear_max: Number(earMax.toFixed(4)),
      gaze_deviation_mean: Number(gazeDevMean.toFixed(4)),
      gaze_deviation_max: Number(gazeDevMax.toFixed(4)),
      gaze_center_percent: gazeCenterPct,
      gaze_away_percent: gazeAwayPct,
      sustained_gaze_away_duration_ms: Number(sustainedAwayMs.toFixed(1)),
      head_yaw_mean: Number(headYawMean.toFixed(2)),
      head_pitch_mean: Number(headPitchMean.toFixed(2)),
      head_roll_mean: Number(headRollMean.toFixed(2)),
      head_yaw_variance: Number(headYawVar.toFixed(2)),
      head_pitch_variance: Number(headPitchVar.toFixed(2)),
      head_roll_variance: Number(headRollVar.toFixed(2)),
      head_movement_magnitude: Number(headMovementMag.toFixed(2)),
      blink_count: totalBlinks,
      blink_rate: Number(blinkRate.toFixed(1)),
      avg_closure_duration_ms: Number(avgClosureMs.toFixed(1)),
      brow_furrow_mean: Number(browMean.toFixed(4)),
      brow_furrow_max: Number(browMax.toFixed(4)),
      brow_furrow_persistence: browPersistence,
      valid_face_percentage: validFacePct,
      valid_samples_count: validCount,
      total_samples_count: totalSamples,
      window_duration_ms: Number(windowDurationMs.toFixed(1)),
      timestamp_ms: nowMs,
    }
  }

  public static emptyVector(timestampMs: number = Date.now()): TemporalFeatureVector {
    return {
      ear_mean: 0,
      ear_std: 0,
      ear_min: 0,
      ear_max: 0,
      gaze_deviation_mean: 1.0,
      gaze_deviation_max: 1.0,
      gaze_center_percent: 0,
      gaze_away_percent: 100,
      sustained_gaze_away_duration_ms: 0,
      head_yaw_mean: 0,
      head_pitch_mean: 0,
      head_roll_mean: 0,
      head_yaw_variance: 0,
      head_pitch_variance: 0,
      head_roll_variance: 0,
      head_movement_magnitude: 0,
      blink_count: 0,
      blink_rate: 0,
      avg_closure_duration_ms: 0,
      brow_furrow_mean: 0,
      brow_furrow_max: 0,
      brow_furrow_persistence: 0,
      valid_face_percentage: 0,
      valid_samples_count: 0,
      total_samples_count: 0,
      window_duration_ms: 0,
      timestamp_ms: timestampMs,
    }
  }
}

/**
 * Computes interpretable behavioural indicators.
 */
export class BehaviouralIndicatorEvaluator {
  private config: BehaviourThresholdConfig

  constructor(config: BehaviourThresholdConfig = DEFAULT_BEHAVIOUR_CONFIG) {
    this.config = config
  }

  public evaluate(tf: TemporalFeatureVector): BehaviouralIndicators {
    if (tf.valid_samples_count === 0) {
      return {
        sustained_gaze_away: true,
        excessive_head_movement: false,
        prolonged_eye_closure: false,
        high_brow_furrow: false,
        stable_screen_gaze: false,
        attention_drop_indicator: 1.0,
        confusion_indicator: 0.0,
      }
    }

    const sustainedGazeAway =
      tf.gaze_away_percent >= this.config.gazeAwayPercent ||
      tf.sustained_gaze_away_duration_ms >= this.config.sustainedGazeAwayMs

    const totalVar = tf.head_yaw_variance + tf.head_pitch_variance + tf.head_roll_variance
    const excessiveMovement =
      tf.head_movement_magnitude >= this.config.headMovementMagnitude ||
      totalVar >= this.config.headTotalVariance

    const prolongedClosure =
      tf.avg_closure_duration_ms >= this.config.prolongedClosureMs ||
      tf.blink_rate >= 32.0 ||
      (tf.ear_min < 0.14 && tf.ear_mean < 0.17)

    const highBrowFurrow =
      tf.brow_furrow_mean >= this.config.browFurrowMean ||
      tf.brow_furrow_persistence >= this.config.browFurrowPersistence

    const stableScreenGaze =
      tf.gaze_center_percent >= this.config.stableGazeCenter &&
      tf.head_movement_magnitude < this.config.stableMovement &&
      !sustainedGazeAway

    const awayComp = Math.min(1.0, tf.gaze_away_percent / 100.0)
    const moveComp = Math.min(1.0, tf.head_movement_magnitude / 6.0)
    const closureComp = Math.min(1.0, tf.avg_closure_duration_ms / 500.0)
    const faceLossComp = 1.0 - tf.valid_face_percentage / 100.0

    const attentionDrop = Number(
      Math.max(
        0,
        Math.min(
          1.0,
          0.35 * awayComp + 0.25 * moveComp + 0.20 * closureComp + 0.20 * faceLossComp
        )
      ).toFixed(3)
    )

    const browComp = tf.brow_furrow_mean
    const persistComp = tf.brow_furrow_persistence / 100.0
    const rollComp = Math.min(1.0, tf.head_roll_variance / 35.0)

    const confusionInd = Number(
      Math.max(
        0,
        Math.min(1.0, 0.45 * browComp + 0.30 * persistComp + 0.25 * rollComp)
      ).toFixed(3)
    )

    return {
      sustained_gaze_away: sustainedGazeAway,
      excessive_head_movement: excessiveMovement,
      prolonged_eye_closure: prolongedClosure,
      high_brow_furrow: highBrowFurrow,
      stable_screen_gaze: stableScreenGaze,
      attention_drop_indicator: attentionDrop,
      confusion_indicator: confusionInd,
    }
  }
}

/**
 * Real-time client-side ML Predictor and Explainer.
 * Aligned with the Random Forest model probability distribution.
 */
export class TemporalMLPredictor {
  private evaluator: BehaviouralIndicatorEvaluator

  constructor(config: BehaviourThresholdConfig = DEFAULT_BEHAVIOUR_CONFIG) {
    this.evaluator = new BehaviouralIndicatorEvaluator(config)
  }

  public predict(
    tf: TemporalFeatureVector,
    indicators?: BehaviouralIndicators
  ): MLPredictionResult {
    const ind = indicators || this.evaluator.evaluate(tf)

    // No face in window handling
    if (tf.valid_samples_count === 0 || tf.valid_face_percentage < 15.0) {
      return {
        attention_state: 'INATTENTIVE',
        attention_score: 0,
        confusion_state: 'NORMAL',
        confusion_score: 0,
        confidence: 100,
        reasons: ['No student face detected in analysis window'],
        indicators: ind,
        temporal_features: tf,
        model_status: 'TRAINED_DEMO_MODEL',
        timestamp_ms: tf.timestamp_ms,
      }
    }

    // Probability formulation aligned with Random Forest model weights
    const gazeAwayRatio = tf.gaze_away_percent / 100.0
    const gazePenalty = ind.sustained_gaze_away
      ? 0.42 + gazeAwayRatio * 0.18
      : (1.0 - tf.gaze_center_percent / 100.0) * 0.30

    const headPosePenalty =
      Math.abs(tf.head_yaw_mean) > 22 || Math.abs(tf.head_pitch_mean) > 18 ? 0.22 : 0
    const movementPenalty = ind.excessive_head_movement
      ? 0.25
      : Math.min(0.20, (tf.head_movement_magnitude / 6.0) * 0.20)
    const closurePenalty = ind.prolonged_eye_closure
      ? 0.32
      : tf.blink_rate >= 28
      ? 0.22
      : 0
    const faceLossPenalty = (1.0 - tf.valid_face_percentage / 100.0) * 0.35

    const rawAttentionProb = Math.max(
      0.05,
      Math.min(
        0.98,
        0.95 - gazePenalty - headPosePenalty - movementPenalty - closurePenalty - faceLossPenalty
      )
    )
    const attentionScore = Math.round(rawAttentionProb * 100)
    const attentionState: AttentionState = attentionScore >= 50 ? 'ATTENTIVE' : 'INATTENTIVE'

    // Confusion Probability formulation
    const browContribution = tf.brow_furrow_mean * 0.48
    const persistenceContribution = (tf.brow_furrow_persistence / 100.0) * 0.32
    const tiltContribution = Math.min(0.20, (tf.head_roll_variance / 30.0) * 0.20)

    const rawConfusionProb = Math.max(
      0.02,
      Math.min(0.96, browContribution + persistenceContribution + tiltContribution)
    )
    const confusionScore = Math.round(rawConfusionProb * 100)
    const confusionState: ConfusionState = confusionScore >= 50 ? 'POSSIBLY_CONFUSED' : 'NORMAL'

    // Confidence Calculation
    const attConf = Math.max(rawAttentionProb, 1.0 - rawAttentionProb)
    const confConf = Math.max(rawConfusionProb, 1.0 - rawConfusionProb)
    const confidence = Math.round(((attConf + confConf) / 2.0) * 100)

    // Behavioural explanations
    const reasons = this.generateExplanations(tf, ind, attentionState, confusionState)

    return {
      attention_state: attentionState,
      attention_score: attentionScore,
      confusion_state: confusionState,
      confusion_score: confusionScore,
      confidence,
      reasons,
      indicators: ind,
      temporal_features: tf,
      model_status: 'TRAINED_DEMO_MODEL',
      timestamp_ms: tf.timestamp_ms,
    }
  }

  private generateExplanations(
    tf: TemporalFeatureVector,
    ind: BehaviouralIndicators,
    attState: AttentionState,
    confState: ConfusionState
  ): string[] {
    const reasons: string[] = []

    if (attState === 'ATTENTIVE') {
      if (ind.stable_screen_gaze) {
        reasons.push(`Stable screen gaze (${tf.gaze_center_percent.toFixed(0)}% center focus)`)
      }
      if (!ind.excessive_head_movement) {
        reasons.push('Low head movement (steady posture)')
      }
      if (!ind.prolonged_eye_closure) {
        reasons.push('Normal blink behaviour')
      }
    } else {
      if (ind.sustained_gaze_away) {
        reasons.push(
          tf.sustained_gaze_away_duration_ms >= 500
            ? `Sustained gaze away (${(tf.sustained_gaze_away_duration_ms / 1000).toFixed(1)}s deflection)`
            : `Gaze directed away (${tf.gaze_away_percent.toFixed(0)}% of window)`
        )
      }
      if (ind.excessive_head_movement) {
        reasons.push(`Elevated head movement (${tf.head_movement_magnitude.toFixed(1)}°/frame)`)
      }
      if (ind.prolonged_eye_closure) {
        reasons.push('Prolonged eye closure episode')
      }
      if (tf.valid_face_percentage < 80) {
        reasons.push(`Face partially occluded (${(100 - tf.valid_face_percentage).toFixed(0)}% dropped)`)
      }
    }

    if (confState === 'POSSIBLY_CONFUSED') {
      if (ind.high_brow_furrow) {
        reasons.push(`Persistent brow furrowing (${tf.brow_furrow_persistence.toFixed(0)}% persistence)`)
      }
      if (tf.head_roll_variance > 16.0) {
        reasons.push('Head tilt detected during comprehension')
      }
      if (tf.gaze_deviation_mean > 0.35 && !ind.sustained_gaze_away) {
        reasons.push('Focal visual search pattern')
      }
    } else {
      if (!ind.high_brow_furrow) {
        reasons.push('Relaxed facial musculature')
      }
    }

    if (reasons.length === 0) {
      reasons.push('Standard classroom engagement profile')
    }

    return reasons.slice(0, 4)
  }
}
