import test from 'node:test'
import assert from 'node:assert/strict'
import {
  RollingTemporalBuffer,
  TemporalFeatureAggregator,
  BehaviouralIndicatorEvaluator,
  TemporalMLPredictor,
} from '../temporalAnalyzer.ts'
import type { TemporalFeatureVector, MLPredictionResult } from '../temporalAnalyzer.ts'
import type { FacialFeatureVector } from '../faceMeshExtractor.ts'

function createSampleFrame(options: {
  timestampMs: number
  ear?: number
  gazeDir?: 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'AWAY'
  gazeDev?: number
  headYaw?: number
  headPitch?: number
  headRoll?: number
  browFurrowScore?: number
  blinkCount?: number
  closureMs?: number
  faceDetected?: boolean
}): FacialFeatureVector {
  const {
    timestampMs,
    ear = 0.28,
    gazeDir = 'CENTER',
    gazeDev = 0.08,
    headYaw = 0,
    headPitch = 0,
    headRoll = 0,
    browFurrowScore = 0.15,
    blinkCount = 2,
    closureMs = 0,
    faceDetected = true,
  } = options

  return {
    ear_left: ear,
    ear_right: ear,
    ear_avg: ear,
    blink_detected: false,
    blink_count: blinkCount,
    blink_rate: 15.0,
    eye_closure_duration_ms: closureMs,
    gaze_direction: gazeDir,
    gaze_deviation: gazeDev,
    gaze_h_ratio: 0.5,
    gaze_v_ratio: 0.5,
    head_yaw: headYaw,
    head_pitch: headPitch,
    head_roll: headRoll,
    brow_furrow: 0.42,
    brow_furrow_score: browFurrowScore,
    brow_raise: 0.18,
    eye_openness: faceDetected ? 0.85 : 0.0,
    face_detected: faceDetected,
    face_count: faceDetected ? 1 : 0,
    landmark_count: faceDetected ? 468 : 0,
    timestamp_ms: timestampMs,
    bounding_box: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 },
  }
}

test('1. Temporal buffer accumulates samples and resets cleanly', () => {
  const buffer = new RollingTemporalBuffer(2000, 30, 5)
  assert.equal(buffer.getSampleCount(), 0)
  assert.equal(buffer.isReady(), false)

  for (let i = 0; i < 15; i++) {
    buffer.addSample(createSampleFrame({ timestampMs: 1000 + i * 50 }))
  }

  assert.equal(buffer.getSampleCount(), 15)
  assert.equal(buffer.isReady(), true)

  buffer.reset()
  assert.equal(buffer.getSampleCount(), 0)
  assert.equal(buffer.isReady(), false)
})

test('2. Window expiration purges frames older than duration', () => {
  const buffer = new RollingTemporalBuffer(1000, 50)

  // Add frames spanning 2500ms (t=1000 to t=3500)
  for (let i = 0; i < 26; i++) {
    buffer.addSample(createSampleFrame({ timestampMs: 1000 + i * 100 }))
  }

  const samples = buffer.getSamples()
  assert.ok(samples[0].timestamp_ms >= 2500)
  assert.equal(samples[samples.length - 1].timestamp_ms, 3500)
  assert.ok(buffer.getActualWindowDurationMs() <= 1000)
})

test('3. Temporal mean, std, min, and max calculations', () => {
  const frames = [
    createSampleFrame({ timestampMs: 1000, ear: 0.20 }),
    createSampleFrame({ timestampMs: 1100, ear: 0.30 }),
    createSampleFrame({ timestampMs: 1200, ear: 0.40 }),
  ]
  const tf = TemporalFeatureAggregator.aggregate(frames)

  assert.equal(tf.ear_mean, 0.30)
  assert.equal(tf.ear_min, 0.20)
  assert.equal(tf.ear_max, 0.40)
  assert.ok(Math.abs(tf.ear_std - 0.10) < 0.001)
})

test('4. Gaze persistence and away percentage', () => {
  const frames = [
    createSampleFrame({ timestampMs: 1000, gazeDir: 'CENTER' }),
    createSampleFrame({ timestampMs: 1100, gazeDir: 'AWAY' }),
    createSampleFrame({ timestampMs: 1200, gazeDir: 'AWAY' }),
    createSampleFrame({ timestampMs: 1300, gazeDir: 'AWAY' }),
    createSampleFrame({ timestampMs: 1400, gazeDir: 'CENTER' }),
  ]
  const tf = TemporalFeatureAggregator.aggregate(frames)

  assert.equal(tf.gaze_center_percent, 40.0)
  assert.equal(tf.gaze_away_percent, 60.0)
  assert.equal(tf.sustained_gaze_away_duration_ms, 200.0)
})

test('5. Head movement variance and magnitude calculation', () => {
  // Steady sequence
  const steadyFrames = [
    createSampleFrame({ timestampMs: 1000, headYaw: 2 }),
    createSampleFrame({ timestampMs: 1100, headYaw: 2 }),
    createSampleFrame({ timestampMs: 1200, headYaw: 2 }),
  ]
  const tfSteady = TemporalFeatureAggregator.aggregate(steadyFrames)
  assert.equal(tfSteady.head_yaw_variance, 0)
  assert.equal(tfSteady.head_movement_magnitude, 0)

  // Moving sequence
  const movingFrames = [
    createSampleFrame({ timestampMs: 1000, headYaw: -10 }),
    createSampleFrame({ timestampMs: 1100, headYaw: 0 }),
    createSampleFrame({ timestampMs: 1200, headYaw: 10 }),
  ]
  const tfMoving = TemporalFeatureAggregator.aggregate(movingFrames)
  assert.ok(tfMoving.head_yaw_variance > 50)
  assert.equal(tfMoving.head_movement_magnitude, 10)
})

test('6. Blink aggregation over temporal window', () => {
  const frames = [
    createSampleFrame({ timestampMs: 1000, blinkCount: 3, closureMs: 100 }),
    createSampleFrame({ timestampMs: 1100, blinkCount: 3, closureMs: 200 }),
    createSampleFrame({ timestampMs: 1200, blinkCount: 5, closureMs: 0 }),
  ]
  const tf = TemporalFeatureAggregator.aggregate(frames)

  assert.equal(tf.blink_count, 2)
  assert.equal(tf.avg_closure_duration_ms, 150)
})

test('7. Temporal feature vector structure and metadata integrity', () => {
  const frames = [
    createSampleFrame({ timestampMs: 1000 }),
    createSampleFrame({ timestampMs: 1050 }),
    createSampleFrame({ timestampMs: 1100 }),
  ]
  const tf = TemporalFeatureAggregator.aggregate(frames, 1100)

  assert.equal(tf.valid_samples_count, 3)
  assert.equal(tf.total_samples_count, 3)
  assert.equal(tf.valid_face_percentage, 100)
  assert.equal(tf.window_duration_ms, 100)
  assert.equal(tf.timestamp_ms, 1100)
})

test('8. Behavioural indicators evaluation', () => {
  const evaluator = new BehaviouralIndicatorEvaluator()

  // Distracted indicators
  const distFrames = [
    createSampleFrame({ timestampMs: 1000, gazeDir: 'AWAY', headYaw: 30 }),
    createSampleFrame({ timestampMs: 1500, gazeDir: 'AWAY', headYaw: 35 }),
  ]
  const tfDist = TemporalFeatureAggregator.aggregate(distFrames)
  const indDist = evaluator.evaluate(tfDist)

  assert.equal(indDist.sustained_gaze_away, true)
  assert.ok(indDist.attention_drop_indicator > 0.3)
})

test('9. Prediction output range and valid categorical states', () => {
  const predictor = new TemporalMLPredictor()
  const frames = [createSampleFrame({ timestampMs: 1000 }), createSampleFrame({ timestampMs: 1100 })]
  const tf = TemporalFeatureAggregator.aggregate(frames)
  const pred = predictor.predict(tf)

  assert.ok(pred.attention_state === 'ATTENTIVE' || pred.attention_state === 'INATTENTIVE')
  assert.ok(pred.confusion_state === 'NORMAL' || pred.confusion_state === 'POSSIBLY_CONFUSED')
  assert.ok(pred.attention_score >= 0 && pred.attention_score <= 100)
  assert.ok(pred.confusion_score >= 0 && pred.confusion_score <= 100)
  assert.ok(pred.confidence >= 0 && pred.confidence <= 100)
})

test('10. Score conversion from attentive vs inattentive patterns', () => {
  const predictor = new TemporalMLPredictor()

  // Attentive sequence
  const attFrames = Array.from({ length: 15 }, (_, i) =>
    createSampleFrame({
      timestampMs: 1000 + i * 50,
      gazeDir: 'CENTER',
      gazeDev: 0.05,
      headYaw: 0,
      browFurrowScore: 0.10,
    })
  )
  const tfAtt = TemporalFeatureAggregator.aggregate(attFrames)
  const predAtt = predictor.predict(tfAtt)
  assert.ok(predAtt.attention_score >= 50)
  assert.equal(predAtt.attention_state, 'ATTENTIVE')

  // Inattentive sequence
  const inattFrames = Array.from({ length: 15 }, (_, i) =>
    createSampleFrame({
      timestampMs: 1000 + i * 50,
      gazeDir: 'AWAY',
      gazeDev: 0.8,
      headYaw: 35,
    })
  )
  const tfInatt = TemporalFeatureAggregator.aggregate(inattFrames)
  const predInatt = predictor.predict(tfInatt)
  assert.ok(predInatt.attention_score < 50)
  assert.equal(predInatt.attention_state, 'INATTENTIVE')
})

test('11. Explanation generation contains relevant behavioural indicators', () => {
  const predictor = new TemporalMLPredictor()
  const confFrames = Array.from({ length: 10 }, (_, i) =>
    createSampleFrame({
      timestampMs: 1000 + i * 50,
      browFurrowScore: 0.80,
      headRoll: i % 2 === 0 ? 18 : -18,
    })
  )
  const tfConf = TemporalFeatureAggregator.aggregate(confFrames)
  const predConf = predictor.predict(tfConf)

  assert.ok(predConf.reasons.length > 0)
  const allReasons = predConf.reasons.join(' ').toLowerCase()
  assert.ok(allReasons.includes('brow') || allReasons.includes('tilt') || allReasons.includes('head'))
})

test('12. No-face and insufficient data safe handling', () => {
  const predictor = new TemporalMLPredictor()

  // Empty frames
  const tfEmpty = TemporalFeatureAggregator.aggregate([])
  const predEmpty = predictor.predict(tfEmpty)
  assert.equal(predEmpty.attention_state, 'INATTENTIVE')
  assert.equal(predEmpty.attention_score, 0)
  assert.ok(predEmpty.reasons[0].includes('No student face'))

  // All no-face frames
  const noFaceFrames = Array.from({ length: 10 }, (_, i) =>
    createSampleFrame({ timestampMs: 1000 + i * 50, faceDetected: false })
  )
  const tfNoFace = TemporalFeatureAggregator.aggregate(noFaceFrames)
  const predNoFace = predictor.predict(tfNoFace)
  assert.equal(predNoFace.attention_state, 'INATTENTIVE')
  assert.equal(predNoFace.attention_score, 0)
})
