import test from 'node:test'
import assert from 'node:assert/strict'
import {
  FaceMeshFeatureExtractor,
  BlinkTracker,
  calculateEAR,
  distance2D,
  clamp,
  FACIAL_LANDMARKS,
} from '../faceMeshExtractor.ts'
import type { Point3D } from '../faceMeshExtractor.ts'

function assertNonNull<T>(val: T | null | undefined): asserts val is T {
  assert.ok(val !== null && val !== undefined)
}

function createSyntheticMesh(options: {
  eyeOpen?: boolean
  gazeOffsetX?: number
  gazeOffsetY?: number
  yawOffset?: number
  pitchOffset?: number
  rollAngleDeg?: number
  browFurrowDist?: number
} = {}): Point3D[] {
  const {
    eyeOpen = true,
    gazeOffsetX = 0.0,
    gazeOffsetY = 0.0,
    yawOffset = 0.0,
    pitchOffset = 0.0,
    rollAngleDeg = 0.0,
    browFurrowDist = 0.14,
  } = options

  const landmarks: Point3D[] = []
  for (let i = 0; i < 468; i++) {
    landmarks.push({ x: 0.5, y: 0.5, z: 0.0 })
  }

  // Key topological points
  landmarks[FACIAL_LANDMARKS.NOSE_TIP] = { x: 0.50 + yawOffset, y: 0.50 + pitchOffset, z: 0.0 }
  landmarks[FACIAL_LANDMARKS.CHIN] = { x: 0.50, y: 0.75, z: 0.0 }
  landmarks[FACIAL_LANDMARKS.FOREHEAD] = { x: 0.50, y: 0.25, z: 0.0 }

  const rad = (rollAngleDeg * Math.PI) / 180
  const halfW = 0.20
  landmarks[FACIAL_LANDMARKS.LEFT_CHEEK] = {
    x: 0.50 - halfW * Math.cos(rad),
    y: 0.50 - halfW * Math.sin(rad),
    z: 0.0,
  }
  landmarks[FACIAL_LANDMARKS.RIGHT_CHEEK] = {
    x: 0.50 + halfW * Math.cos(rad),
    y: 0.50 + halfW * Math.sin(rad),
    z: 0.0,
  }

  const eyeH = eyeOpen ? 0.04 : 0.005

  // Left Eye
  landmarks[33] = { x: 0.38, y: 0.42, z: 0.0 }
  landmarks[160] = { x: 0.41, y: 0.42 - eyeH, z: 0.0 }
  landmarks[158] = { x: 0.43, y: 0.42 - eyeH, z: 0.0 }
  landmarks[133] = { x: 0.46, y: 0.42, z: 0.0 }
  landmarks[153] = { x: 0.43, y: 0.42 + eyeH, z: 0.0 }
  landmarks[144] = { x: 0.41, y: 0.42 + eyeH, z: 0.0 }
  landmarks[159] = { x: 0.42, y: 0.42 - eyeH, z: 0.0 }
  landmarks[145] = { x: 0.42, y: 0.42 + eyeH, z: 0.0 }

  // Right Eye
  landmarks[362] = { x: 0.54, y: 0.42, z: 0.0 }
  landmarks[385] = { x: 0.57, y: 0.42 - eyeH, z: 0.0 }
  landmarks[387] = { x: 0.59, y: 0.42 - eyeH, z: 0.0 }
  landmarks[263] = { x: 0.62, y: 0.42, z: 0.0 }
  landmarks[373] = { x: 0.59, y: 0.42 + eyeH, z: 0.0 }
  landmarks[380] = { x: 0.57, y: 0.42 + eyeH, z: 0.0 }
  landmarks[386] = { x: 0.58, y: 0.42 - eyeH, z: 0.0 }
  landmarks[374] = { x: 0.58, y: 0.42 + eyeH, z: 0.0 }

  // Eyebrows
  const centerX = 0.50
  landmarks[FACIAL_LANDMARKS.LEFT_INNER_BROW] = { x: centerX - browFurrowDist / 2, y: 0.36, z: 0.0 }
  landmarks[FACIAL_LANDMARKS.RIGHT_INNER_BROW] = { x: centerX + browFurrowDist / 2, y: 0.36, z: 0.0 }
  landmarks[FACIAL_LANDMARKS.LEFT_BROW_ARCH] = { x: 0.41, y: 0.34, z: 0.0 }
  landmarks[FACIAL_LANDMARKS.RIGHT_BROW_ARCH] = { x: 0.59, y: 0.34, z: 0.0 }

  if (gazeOffsetX !== 0.0 || gazeOffsetY !== 0.0) {
    while (landmarks.length < 478) {
      landmarks.push({ x: 0.5, y: 0.5, z: 0.0 })
    }
    landmarks[468] = { x: 0.42 + gazeOffsetX, y: 0.42 + gazeOffsetY, z: 0.0 }
    landmarks[473] = { x: 0.58 + gazeOffsetX, y: 0.42 + gazeOffsetY, z: 0.0 }
  }

  return landmarks
}

test('1. Valid landmark input produces structured feature vector', () => {
  const mesh = createSyntheticMesh({ eyeOpen: true })
  const result = FaceMeshFeatureExtractor.extractFeatures(mesh, 1000)

  assertNonNull(result)
  assert.equal(result.vector.face_detected, true)
  assert.equal(result.vector.face_count, 1)
  assert.equal(result.vector.landmark_count, 468)
  assert.equal(result.vector.timestamp_ms, 1000)
  assert.ok(!isNaN(result.vector.ear_avg))
  assert.ok(!isNaN(result.vector.head_yaw))
  assert.ok(!isNaN(result.vector.gaze_deviation))
})

test('2. No-face condition returns null or safe empty vector', () => {
  assert.equal(FaceMeshFeatureExtractor.extractFeatures(null), null)
  assert.equal(FaceMeshFeatureExtractor.extractFeatures([]), null)

  const emptyVector = FaceMeshFeatureExtractor.getEmptyFeatureVector(2000)
  assert.equal(emptyVector.face_detected, false)
  assert.equal(emptyVector.face_count, 0)
  assert.equal(emptyVector.landmark_count, 0)
  assert.equal(emptyVector.ear_avg, 0)
  assert.equal(emptyVector.gaze_direction, 'AWAY')
  assert.equal(emptyVector.timestamp_ms, 2000)
})

test('3. EAR calculation differentiates open vs closed eyes', () => {
  const meshOpen = createSyntheticMesh({ eyeOpen: true })
  const resOpen = FaceMeshFeatureExtractor.extractFeatures(meshOpen)
  assertNonNull(resOpen)
  assert.ok(resOpen.earAverage > 0.20)
  assert.ok(resOpen.vector.eye_openness > 0.50)

  const meshClosed = createSyntheticMesh({ eyeOpen: false })
  const resClosed = FaceMeshFeatureExtractor.extractFeatures(meshClosed)
  assertNonNull(resClosed)
  assert.ok(resClosed.earAverage < 0.15)
  assert.ok(resClosed.vector.eye_openness < 0.20)
})

test('4. Blink tracker state machine detects valid blink duration', () => {
  const tracker = new BlinkTracker(0.19)

  // Eyes open
  let res = tracker.update(0.28, 1000)
  assert.equal(res.blinkDetected, false)
  assert.equal(res.blinkCount, 0)

  // Eyes close
  res = tracker.update(0.12, 1100)
  assert.equal(res.blinkDetected, false)

  // Eyes closed for 150ms
  res = tracker.update(0.10, 1250)
  assert.equal(res.closureDurationMs, 150)

  // Eyes reopen after 200ms duration -> normal blink
  res = tracker.update(0.29, 1300)
  assert.equal(res.blinkDetected, true)
  assert.equal(res.blinkCount, 1)
  assert.equal(res.blinkRate, 1)

  // Prolonged closure (>500ms)
  tracker.update(0.10, 2000)
  tracker.update(0.10, 2600)
  res = tracker.update(0.28, 2700)
  assert.equal(res.blinkDetected, false) // Exceeds physiological threshold
  assert.equal(res.blinkCount, 1) // Count unchanged
})

test('5. Gaze estimation correctly identifies directions & deviation', () => {
  // Center
  const meshCenter = createSyntheticMesh({ eyeOpen: true, gazeOffsetX: 0.0, gazeOffsetY: 0.0 })
  const resCenter = FaceMeshFeatureExtractor.extractFeatures(meshCenter)
  assertNonNull(resCenter)
  assert.equal(resCenter.gazeDirection, 'CENTER')
  assert.ok(resCenter.gazeDeviation < 0.28)

  // Right
  const meshRight = createSyntheticMesh({ eyeOpen: true, gazeOffsetX: 0.03, gazeOffsetY: 0.0 })
  const resRight = FaceMeshFeatureExtractor.extractFeatures(meshRight)
  assertNonNull(resRight)
  assert.equal(resRight.gazeDirection, 'RIGHT')
  assert.ok(resRight.gazeDeviation > 0.28)

  // Left
  const meshLeft = createSyntheticMesh({ eyeOpen: true, gazeOffsetX: -0.03, gazeOffsetY: 0.0 })
  const resLeft = FaceMeshFeatureExtractor.extractFeatures(meshLeft)
  assertNonNull(resLeft)
  assert.equal(resLeft.gazeDirection, 'LEFT')

  // Down
  const meshDown = createSyntheticMesh({ eyeOpen: true, gazeOffsetX: 0.0, gazeOffsetY: 0.03 })
  const resDown = FaceMeshFeatureExtractor.extractFeatures(meshDown)
  assertNonNull(resDown)
  assert.equal(resDown.gazeDirection, 'DOWN')

  // Up
  const meshUp = createSyntheticMesh({ eyeOpen: true, gazeOffsetX: 0.0, gazeOffsetY: -0.03 })
  const resUp = FaceMeshFeatureExtractor.extractFeatures(meshUp)
  assertNonNull(resUp)
  assert.equal(resUp.gazeDirection, 'UP')
})

test('6. Head pose estimation outputs yaw, pitch, roll accurately', () => {
  // Frontal
  const meshFront = createSyntheticMesh({ yawOffset: 0.0, pitchOffset: 0.0, rollAngleDeg: 0.0 })
  const resFront = FaceMeshFeatureExtractor.extractFeatures(meshFront)
  assertNonNull(resFront)
  assert.ok(Math.abs(resFront.headYaw) < 5)
  assert.ok(Math.abs(resFront.headPitch) < 5)
  assert.ok(Math.abs(resFront.headRoll) < 5)

  // Yaw Right
  const meshYawRight = createSyntheticMesh({ yawOffset: 0.06 })
  const resYawRight = FaceMeshFeatureExtractor.extractFeatures(meshYawRight)
  assertNonNull(resYawRight)
  assert.ok(resYawRight.headYaw > 12)

  // Yaw Left
  const meshYawLeft = createSyntheticMesh({ yawOffset: -0.06 })
  const resYawLeft = FaceMeshFeatureExtractor.extractFeatures(meshYawLeft)
  assertNonNull(resYawLeft)
  assert.ok(resYawLeft.headYaw < -12)

  // Roll Tilt
  const meshRoll = createSyntheticMesh({ rollAngleDeg: 18 })
  const resRoll = FaceMeshFeatureExtractor.extractFeatures(meshRoll)
  assertNonNull(resRoll)
  assert.ok(resRoll.headRoll >= 15)
})

test('7. Brow features extract furrow contraction and raise', () => {
  const meshRelaxed = createSyntheticMesh({ browFurrowDist: 0.14 })
  const resRelaxed = FaceMeshFeatureExtractor.extractFeatures(meshRelaxed)
  assertNonNull(resRelaxed)
  assert.ok(resRelaxed.vector.brow_furrow_score < 0.35)

  const meshFrown = createSyntheticMesh({ browFurrowDist: 0.07 })
  const resFrown = FaceMeshFeatureExtractor.extractFeatures(meshFrown)
  assertNonNull(resFrown)
  assert.ok(resFrown.vector.brow_furrow_score > 0.60)
  assert.ok(resFrown.vector.brow_furrow < resRelaxed.vector.brow_furrow)
})

test('8. Safe handling protects against NaN, zero-division, and corrupt inputs', () => {
  const p: Point3D = { x: 0.5, y: 0.5, z: 0.0 }
  const earZero = calculateEAR(p, p, p, p, p, p)
  assert.equal(earZero, 0)

  const nanMesh: Point3D[] = []
  for (let i = 0; i < 468; i++) {
    nanMesh.push({ x: NaN, y: NaN, z: 0.0 })
  }
  const resNan = FaceMeshFeatureExtractor.extractFeatures(nanMesh)
  assertNonNull(resNan)
  assert.ok(!isNaN(resNan.vector.ear_avg))
  assert.ok(!isNaN(resNan.vector.head_yaw))
  assert.ok(!isNaN(resNan.vector.gaze_deviation))
})