/**
 * MindMap Custom Facial Feature Extraction Engine
 * 
 * Mathematical Feature Engineering Layer Built on Top of MediaPipe Face Mesh.
 * MediaPipe provides raw 3D landmark coordinates; our engine independently derives
 * behavioral measurements:
 * 1. Eye Aspect Ratio (EAR) - Left, Right, Average (Soukupova & Cech, 2016)
 * 2. Blink Detection & State Machine (duration filtering, blink counting, rolling rate/min)
 * 3. Gaze Estimation (Iris/pupil positioning, 5-way direction + AWAY, numerical gaze deviation)
 * 4. Head Pose Estimation (Yaw, Pitch, Roll in degrees using 3D landmark geometry)
 * 5. Brow / Facial Behaviour (Eyebrow furrow contraction index & eyebrow raise elevation)
 * 6. Face / Eye Quality & Openness metrics
 */

export interface Point3D {
  x: number
  y: number
  z?: number
}

export type GazeDirection = 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN' | 'AWAY'

/**
 * Standardized Behavioral Feature Vector conforming to Phase 1 Specification.
 */
export interface FacialFeatureVector {
  // 1. Eye Aspect Ratio (EAR)
  ear_left: number
  ear_right: number
  ear_avg: number

  // 2. Blink Detection & Rate
  blink_detected: boolean
  blink_count: number
  blink_rate: number // blinks per minute (rolling window)
  eye_closure_duration_ms: number

  // 3. Gaze Estimation
  gaze_direction: GazeDirection
  gaze_deviation: number // 0.0 (direct center) to 1.0 (extreme deflection)
  gaze_h_ratio: number // 0.0 (far left) to 1.0 (far right)
  gaze_v_ratio: number // 0.0 (far up) to 1.0 (far down)

  // 4. Head Pose Estimation (Degrees)
  head_yaw: number // degrees (-90 to +90, Left - / Right +)
  head_pitch: number // degrees (-90 to +90, Down - / Up +)
  head_roll: number // degrees (-90 to +90, Tilt Left - / Tilt Right +)

  // 5. Brow & Facial Behaviour
  brow_furrow: number // normalized distance between inner eyebrows
  brow_furrow_score: number // 0.0 (relaxed) to 1.0 (maximum furrow contraction)
  brow_raise: number // normalized eyebrow vertical elevation

  // 6. Face Quality & Geometry
  eye_openness: number // 0.0 (closed) to 1.0 (wide open)
  face_detected: boolean
  face_count: number
  landmark_count: number
  timestamp_ms: number
  bounding_box: {
    x: number
    y: number
    width: number
    height: number
  }
}

/**
 * Backward-compatibility interface for existing MindMap UI components.
 */
export interface ExtractedFacialFeatures {
  earLeft: number
  earRight: number
  earAverage: number
  isBlinking: boolean
  eyebrowFurrowRatio: number
  headPitch: number
  headYaw: number
  headRoll: number
  gazeDirection: GazeDirection
  gazeDeviation: number
  browRaise: number
  eyeOpenness: number
  faceBoundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  vector: FacialFeatureVector
}

// MediaPipe 468 Face Mesh Topological Indices
export const FACIAL_LANDMARKS = {
  // Left eye: [p1(outer), p2(upper1), p3(upper2), p4(inner), p5(lower2), p6(lower1)]
  LEFT_EYE: [33, 160, 158, 133, 153, 144] as const,
  // Right eye: [p1(inner), p2(upper1), p3(upper2), p4(outer), p5(lower2), p6(lower1)]
  RIGHT_EYE: [362, 385, 387, 263, 373, 380] as const,

  // Pupil / Iris landmarks
  LEFT_IRIS_CENTER: 468,
  RIGHT_IRIS_CENTER: 473,

  // Vertical eyelid landmarks for vertical gaze
  LEFT_EYE_TOP: 159,
  LEFT_EYE_BOTTOM: 145,
  RIGHT_EYE_TOP: 386,
  RIGHT_EYE_BOTTOM: 374,

  // Eyebrow landmarks
  LEFT_INNER_BROW: 55,
  RIGHT_INNER_BROW: 285,
  LEFT_BROW_ARCH: 105,
  RIGHT_BROW_ARCH: 334,

  // Head pose anchor points
  NOSE_TIP: 1,
  CHIN: 152,
  FOREHEAD: 10,
  LEFT_CHEEK: 234,
  RIGHT_CHEEK: 454,
  LEFT_MOUTH_CORNER: 61,
  RIGHT_MOUTH_CORNER: 291,
}

const EPSILON = 1e-6
const DEFAULT_EAR_BLINK_THRESHOLD = 0.19
const MIN_BLINK_DURATION_MS = 60
const MAX_BLINK_DURATION_MS = 450

/**
 * 2D Euclidean distance with zero-division safeguard.
 */
export function distance2D(p1: Point3D, p2: Point3D): number {
  if (!p1 || !p2) return 0
  const dx = (p1.x || 0) - (p2.x || 0)
  const dy = (p1.y || 0) - (p2.y || 0)
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * 3D Euclidean distance.
 */
export function distance3D(p1: Point3D, p2: Point3D): number {
  if (!p1 || !p2) return 0
  const dx = (p1.x || 0) - (p2.x || 0)
  const dy = (p1.y || 0) - (p2.y || 0)
  const dz = (p1.z || 0) - (p2.z || 0)
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

/**
 * Clamps a number between min and max and guards against NaN.
 */
export function clamp(val: number, min: number, max: number): number {
  if (isNaN(val) || !isFinite(val)) return min
  return Math.max(min, Math.min(max, val))
}

/**
 * Eye Aspect Ratio (EAR) based on Soukupova & Cech (2016):
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
export function calculateEAR(
  p1: Point3D,
  p2: Point3D,
  p3: Point3D,
  p4: Point3D,
  p5: Point3D,
  p6: Point3D
): number {
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0
  const v1 = distance2D(p2, p6)
  const v2 = distance2D(p3, p5)
  const h = distance2D(p1, p4)

  if (h < EPSILON) return 0
  const ear = (v1 + v2) / (2.0 * h)
  return isNaN(ear) || !isFinite(ear) ? 0 : Number(ear.toFixed(4))
}

/**
 * Stateful Blink Tracker maintaining blink state machine, blink duration filtering,
 * total count, and rolling blink rate per minute.
 */
export class BlinkTracker {
  private isEyeClosed: boolean = false
  private closureStartTime: number = 0
  private blinkCount: number = 0
  private recentBlinks: number[] = [] // timestamps in ms
  private earThreshold: number = DEFAULT_EAR_BLINK_THRESHOLD

  constructor(earThreshold: number = DEFAULT_EAR_BLINK_THRESHOLD) {
    this.earThreshold = earThreshold
  }

  public setThreshold(threshold: number): void {
    if (threshold > 0.1 && threshold < 0.4) {
      this.earThreshold = threshold
    }
  }

  /**
   * Processes a frame average EAR and updates blink state.
   */
  public update(
    earAverage: number,
    currentTimeMs: number = Date.now()
  ): {
    blinkDetected: boolean
    blinkCount: number
    blinkRate: number
    closureDurationMs: number
  } {
    let blinkDetected = false
    let closureDurationMs = 0
    const closed = earAverage < this.earThreshold

    if (closed) {
      if (!this.isEyeClosed) {
        // Transition: OPEN -> CLOSED
        this.isEyeClosed = true
        this.closureStartTime = currentTimeMs
      }
      closureDurationMs = Math.max(0, currentTimeMs - this.closureStartTime)
    } else {
      if (this.isEyeClosed) {
        // Transition: CLOSED -> OPEN
        const duration = currentTimeMs - this.closureStartTime
        this.isEyeClosed = false
        closureDurationMs = 0

        // Normal physiological blink filter: 60ms <= duration <= 450ms
        if (duration >= MIN_BLINK_DURATION_MS && duration <= MAX_BLINK_DURATION_MS) {
          this.blinkCount++
          blinkDetected = true
          this.recentBlinks.push(currentTimeMs)
        }
      }
    }

    // Purge blinks older than 60 seconds for rolling frequency
    const oneMinuteAgo = currentTimeMs - 60000
    this.recentBlinks = this.recentBlinks.filter((t) => t >= oneMinuteAgo)
    const blinkRate = this.recentBlinks.length // blinks in the last 60 seconds

    return {
      blinkDetected,
      blinkCount: this.blinkCount,
      blinkRate,
      closureDurationMs,
    }
  }

  public getBlinkCount(): number {
    return this.blinkCount
  }

  public reset(): void {
    this.isEyeClosed = false
    this.closureStartTime = 0
    this.blinkCount = 0
    this.recentBlinks = []
  }
}

/**
 * Custom Facial Feature Extraction Engine.
 */
export class FaceMeshFeatureExtractor {
  private static blinkTracker: BlinkTracker = new BlinkTracker()

  /**
   * Generates a safe default feature vector when no face is detected or landmarks are invalid.
   */
  public static getEmptyFeatureVector(timestampMs: number = Date.now()): FacialFeatureVector {
    return {
      ear_left: 0,
      ear_right: 0,
      ear_avg: 0,
      blink_detected: false,
      blink_count: FaceMeshFeatureExtractor.blinkTracker.getBlinkCount(),
      blink_rate: 0,
      eye_closure_duration_ms: 0,
      gaze_direction: 'AWAY',
      gaze_deviation: 1.0,
      gaze_h_ratio: 0.5,
      gaze_v_ratio: 0.5,
      head_yaw: 0,
      head_pitch: 0,
      head_roll: 0,
      brow_furrow: 0,
      brow_furrow_score: 0,
      brow_raise: 0,
      eye_openness: 0,
      face_detected: false,
      face_count: 0,
      landmark_count: 0,
      timestamp_ms: timestampMs,
      bounding_box: { x: 0, y: 0, width: 0, height: 0 },
    }
  }

  /**
   * Primary entry point: Extracts physical behavioral features from raw MediaPipe facial landmarks.
   */
  public static extractFeatures(
    landmarks: Point3D[] | null | undefined,
    currentTimeMs: number = Date.now()
  ): ExtractedFacialFeatures | null {
    // Step 5: Safe handling for no face or incomplete landmarks
    if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 468) {
      return null
    }

    // 1. Eye Aspect Ratio (EAR)
    const leftEyePts = FACIAL_LANDMARKS.LEFT_EYE.map((idx) => landmarks[idx])
    const rightEyePts = FACIAL_LANDMARKS.RIGHT_EYE.map((idx) => landmarks[idx])

    const earLeft = calculateEAR(
      leftEyePts[0],
      leftEyePts[1],
      leftEyePts[2],
      leftEyePts[3],
      leftEyePts[4],
      leftEyePts[5]
    )

    const earRight = calculateEAR(
      rightEyePts[0],
      rightEyePts[1],
      rightEyePts[2],
      rightEyePts[3],
      rightEyePts[4],
      rightEyePts[5]
    )

    const earAverage = Number(((earLeft + earRight) / 2.0).toFixed(4))

    // 2. Blink Detection using stateful tracker
    const blinkState = this.blinkTracker.update(earAverage, currentTimeMs)
    const eyeOpenness = clamp((earAverage - 0.15) / (0.32 - 0.15), 0.0, 1.0)

    // 3. Eyebrow Behaviour (Furrow & Raise)
    // Inter-eyebrow distance (contraction) normalized by inter-ocular distance (outer eye corners)
    const leftInnerBrow = landmarks[FACIAL_LANDMARKS.LEFT_INNER_BROW]
    const rightInnerBrow = landmarks[FACIAL_LANDMARKS.RIGHT_INNER_BROW]
    const leftEyeOuter = landmarks[33]
    const rightEyeOuter = landmarks[263]
    const interOcularDist = distance2D(leftEyeOuter, rightEyeOuter) || 0.2

    const browDist = distance2D(leftInnerBrow, rightInnerBrow)
    // Normalized furrow ratio: smaller = more furrowed/contracted
    const browFurrow = Number((browDist / interOcularDist).toFixed(4))
    // Score from 0.0 (relaxed) to 1.0 (heavily furrowed/confused)
    // Baseline relaxed distance is approx 0.45-0.55 of inter-ocular distance. Frowning drops to 0.30 or lower.
    const browFurrowScore = Number(clamp((0.48 - browFurrow) / (0.48 - 0.28), 0.0, 1.0).toFixed(4))

    // Brow Raise: vertical distance between brow midpoint and eye line normalized by face height
    const chin = landmarks[FACIAL_LANDMARKS.CHIN]
    const forehead = landmarks[FACIAL_LANDMARKS.FOREHEAD]
    const faceHeight = distance2D(forehead, chin) || 0.4
    const browMidY = (landmarks[FACIAL_LANDMARKS.LEFT_BROW_ARCH].y + landmarks[FACIAL_LANDMARKS.RIGHT_BROW_ARCH].y) / 2
    const eyeMidY = (leftEyePts[0].y + rightEyePts[3].y) / 2
    const browRaise = Number(clamp((eyeMidY - browMidY) / faceHeight, 0.0, 1.0).toFixed(4))

    // 4. Head Pose Estimation (Yaw, Pitch, Roll in degrees)
    const noseTip = landmarks[FACIAL_LANDMARKS.NOSE_TIP]
    const leftCheek = landmarks[FACIAL_LANDMARKS.LEFT_CHEEK]
    const rightCheek = landmarks[FACIAL_LANDMARKS.RIGHT_CHEEK]
    const faceWidth = distance2D(leftCheek, rightCheek) || 0.3

    // Yaw (Left/Right turn): horizontal offset of nose tip relative to cheek midpoint
    const cheekMidX = (leftCheek.x + rightCheek.x) / 2
    const rawYaw = (noseTip.x - cheekMidX) / (faceWidth * 0.5 + EPSILON)
    const headYaw = Math.round(clamp(rawYaw * 60, -90, 90))

    // Pitch (Up/Down tilt): vertical offset of nose tip relative to forehead-chin midpoint
    const faceMidY = (forehead.y + chin.y) / 2
    const rawPitch = (noseTip.y - faceMidY) / (faceHeight * 0.5 + EPSILON)
    const headPitch = Math.round(clamp(-rawPitch * 60, -90, 90)) // Looking up positive, down negative

    // Roll (Lateral head tilt): Angle of cheek axis
    const dy = rightCheek.y - leftCheek.y
    const dx = rightCheek.x - leftCheek.x
    const headRoll = Math.round((Math.atan2(dy, dx) * 180) / Math.PI)

    // 5. Gaze Estimation
    // Uses iris landmarks (468, 473) if available (478-point mesh), else estimates pupil center from eyelids
    let leftPupil: Point3D
    let rightPupil: Point3D

    if (landmarks.length >= 478) {
      leftPupil = landmarks[FACIAL_LANDMARKS.LEFT_IRIS_CENTER]
      rightPupil = landmarks[FACIAL_LANDMARKS.RIGHT_IRIS_CENTER]
    } else {
      // Approximate eye center from bounding corners and eyelids
      leftPupil = {
        x: (landmarks[33].x + landmarks[133].x) / 2,
        y: (landmarks[159].y + landmarks[145].y) / 2,
      }
      rightPupil = {
        x: (landmarks[362].x + landmarks[263].x) / 2,
        y: (landmarks[386].y + landmarks[374].y) / 2,
      }
    }

    // Left eye horizontal ratio: 0.0 (lateral/left) to 1.0 (medial/right)
    const leftEyeWidth = Math.abs(landmarks[133].x - landmarks[33].x) || EPSILON
    const leftHRatio = clamp((leftPupil.x - landmarks[33].x) / leftEyeWidth, 0.0, 1.0)

    // Right eye horizontal ratio: 0.0 (medial/left) to 1.0 (lateral/right)
    const rightEyeWidth = Math.abs(landmarks[263].x - landmarks[362].x) || EPSILON
    const rightHRatio = clamp((rightPupil.x - landmarks[362].x) / rightEyeWidth, 0.0, 1.0)

    // Average horizontal ratio (0.5 is direct center)
    const gazeHRatio = Number(((leftHRatio + rightHRatio) / 2).toFixed(4))

    // Vertical ratio: 0.0 (top) to 1.0 (bottom)
    const leftEyeHeight = Math.abs(landmarks[145].y - landmarks[159].y) || EPSILON
    const rightEyeHeight = Math.abs(landmarks[374].y - landmarks[386].y) || EPSILON
    const leftVRatio = clamp((leftPupil.y - landmarks[159].y) / leftEyeHeight, 0.0, 1.0)
    const rightVRatio = clamp((rightPupil.y - landmarks[386].y) / rightEyeHeight, 0.0, 1.0)
    const gazeVRatio = Number(((leftVRatio + rightVRatio) / 2).toFixed(4))

    // Numerical Gaze Deviation: Euclidean distance from (0.5, 0.5) scaled to [0, 1]
    const deltaH = gazeHRatio - 0.5
    const deltaV = gazeVRatio - 0.5
    const gazeDeviation = Number(clamp(Math.sqrt(deltaH * deltaH + deltaV * deltaV) * 2.5, 0.0, 1.0).toFixed(4))

    // Gaze Direction Classification: CENTER | LEFT | RIGHT | UP | DOWN | AWAY
    let gazeDirection: GazeDirection = 'CENTER'

    // If head is turned away significantly, classify as AWAY
    if (Math.abs(headYaw) > 28 || Math.abs(headPitch) > 25) {
      gazeDirection = 'AWAY'
    } else if (gazeDeviation > 0.28) {
      if (Math.abs(deltaH) >= Math.abs(deltaV)) {
        // Horizontal dominance
        gazeDirection = deltaH > 0 ? 'RIGHT' : 'LEFT'
      } else {
        // Vertical dominance
        gazeDirection = deltaV > 0 ? 'DOWN' : 'UP'
      }
    } else {
      gazeDirection = 'CENTER'
    }

    // 6. Bounding Box Computation
    let minX = 1,
      minY = 1,
      maxX = 0,
      maxY = 0
    for (let i = 0; i < landmarks.length; i += 4) {
      const pt = landmarks[i]
      if (pt.x < minX) minX = pt.x
      if (pt.y < minY) minY = pt.y
      if (pt.x > maxX) maxX = pt.x
      if (pt.y > maxY) maxY = pt.y
    }

    const boundingBox = {
      x: Number(minX.toFixed(4)),
      y: Number(minY.toFixed(4)),
      width: Number((maxX - minX).toFixed(4)),
      height: Number((maxY - minY).toFixed(4)),
    }

    // 7. Standardized Feature Vector
    const vector: FacialFeatureVector = {
      ear_left: earLeft,
      ear_right: earRight,
      ear_avg: earAverage,
      blink_detected: blinkState.blinkDetected,
      blink_count: blinkState.blinkCount,
      blink_rate: blinkState.blinkRate,
      eye_closure_duration_ms: blinkState.closureDurationMs,
      gaze_direction: gazeDirection,
      gaze_deviation: gazeDeviation,
      gaze_h_ratio: gazeHRatio,
      gaze_v_ratio: gazeVRatio,
      head_yaw: headYaw,
      head_pitch: headPitch,
      head_roll: headRoll,
      brow_furrow: browFurrow,
      brow_furrow_score: browFurrowScore,
      brow_raise: browRaise,
      eye_openness: Number(eyeOpenness.toFixed(4)),
      face_detected: true,
      face_count: 1,
      landmark_count: landmarks.length,
      timestamp_ms: currentTimeMs,
      bounding_box: boundingBox,
    }

    return {
      earLeft,
      earRight,
      earAverage,
      isBlinking: blinkState.closureDurationMs > 0 || earAverage < DEFAULT_EAR_BLINK_THRESHOLD,
      eyebrowFurrowRatio: browFurrow,
      headPitch,
      headYaw,
      headRoll,
      gazeDirection,
      gazeDeviation,
      browRaise,
      eyeOpenness: Number(eyeOpenness.toFixed(4)),
      faceBoundingBox: boundingBox,
      vector,
    }
  }

  public static getBlinkTracker(): BlinkTracker {
    return this.blinkTracker
  }
}
