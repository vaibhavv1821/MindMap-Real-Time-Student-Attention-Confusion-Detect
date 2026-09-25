import {
  FaceMeshFeatureExtractor,
  ExtractedFacialFeatures,
  FacialFeatureVector,
  Point3D,
  GazeDirection,
} from './faceMeshExtractor'
import {
  RollingTemporalBuffer,
  TemporalFeatureAggregator,
  TemporalMLPredictor,
  TemporalFeatureVector,
  BehaviouralIndicators,
  MLPredictionResult,
} from './temporalAnalyzer'
import { BaselineCalibrator, BaselineDeviation, CalibrationStatus } from './baselineCalibrator'
import * as FaceMeshModule from '@mediapipe/face_mesh'
import * as CameraUtilsModule from '@mediapipe/camera_utils'

// Resilient bundler interop for MediaPipe FaceMesh & Camera
const FaceMeshConstructor =
  FaceMeshModule.FaceMesh ||
  (FaceMeshModule as any).default?.FaceMesh ||
  (window as any).FaceMesh
const CameraConstructor =
  CameraUtilsModule.Camera ||
  (CameraUtilsModule as any).default?.Camera ||
  (window as any).Camera

export type CameraStatus = 'ACTIVE' | 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'OFFLINE'
export type FaceTrackingStatus = 'TRACKED' | 'NO_FACE' | 'SEARCHING'

/**
 * High-Level Metric & Telemetry Payload.
 * Exposes the full Custom Facial Feature Vector alongside diagnostic metrics.
 */
export interface AIMetrics {
  // Phase 1 Custom Facial Feature Vector
  featureVector: FacialFeatureVector

  // Phase 2 Temporal Intelligence & ML Prediction Output
  temporalFeatures: TemporalFeatureVector
  behaviouralIndicators: BehaviouralIndicators
  mlPrediction: MLPredictionResult

  // ML-Derived Scores
  attentionScore: number // 0 - 100%
  confusionScore: number // 0 - 100%
  statusLevel: 'HIGH' | 'MEDIUM' | 'LOW'

  // Direct feature access properties
  earLeft: number
  earRight: number
  earAverage: number
  blinkDetected: boolean
  blinkCount: number
  blinkRatePerMin: number
  eyeClosureDurationMs: number
  gazeDirection: GazeDirection
  gazeDeviation: number
  gazeHRatio: number
  gazeVRatio: number
  eyebrowFurrowRatio: number
  eyebrowFurrowScore: number
  browRaise: number
  headPitch: number
  headYaw: number
  headRoll: number
  eyeOpenness: number

  // Baseline Calibration Telemetry
  calibrationStatus: CalibrationStatus
  calibrationProgress: number
  baselineDeviation: BaselineDeviation

  // System & Quality Diagnostics
  faceDetected: boolean
  faceCount: number
  landmarkCount: number
  faceTrackingStatus: FaceTrackingStatus
  cameraStatus: CameraStatus
  fps: number
  latencyMs: number
}

export type AIMetricsCallback = (metrics: AIMetrics) => void

export class AIDetectorService {
  private videoElement: HTMLVideoElement | null = null
  private canvasElement: HTMLCanvasElement | null = null
  private animationFrameId: number | null = null
  private isRunning: boolean = false
  private callback: AIMetricsCallback | null = null

  // MediaPipe Instances
  private faceMesh: any = null
  private camera: any = null
  private useMediaPipe: boolean = false

  // Baseline Calibrator Instance
  private calibrator: BaselineCalibrator = new BaselineCalibrator()

  // Phase 2 Temporal Buffer & ML Predictor
  private temporalBuffer: RollingTemporalBuffer = new RollingTemporalBuffer(2500, 120, 5)
  private mlPredictor: TemporalMLPredictor = new TemporalMLPredictor()

  // Operational State
  private cameraStatus: CameraStatus = 'OFFLINE'
  private faceTrackingStatus: FaceTrackingStatus = 'SEARCHING'
  private fps: number = 30
  private frameCount: number = 0
  private lastFpsCalcTime: number = Date.now()

  // Base state tracking
  private currentAttention: number = 88
  private currentConfusion: number = 12

  public async start(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    onMetrics: AIMetricsCallback
  ): Promise<boolean> {
    this.videoElement = video
    this.canvasElement = canvas
    this.callback = onMetrics
    this.isRunning = true

    // 1. Request Webcam Stream
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: 'user',
          },
          audio: false,
        })
        this.videoElement.srcObject = stream
        await this.videoElement.play()
        this.cameraStatus = 'ACTIVE'
      } else {
        this.cameraStatus = 'UNAVAILABLE'
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.cameraStatus = 'PERMISSION_DENIED'
      } else {
        this.cameraStatus = 'UNAVAILABLE'
      }
      console.warn(
        '[MindMap AI] Camera stream unavailable or permission pending. Falling back to diagnostic simulator mode.',
        err
      )
    }

    // 2. Initialize MediaPipe Face Mesh
    if (this.cameraStatus === 'ACTIVE' && typeof FaceMeshConstructor === 'function') {
      try {
        this.faceMesh = new FaceMeshConstructor({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        })

        this.faceMesh.setOptions({
          maxNumFaces: 1, // Single student per workstation
          refineLandmarks: true, // Enables 478 landmarks including iris for gaze estimation
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        this.faceMesh.onResults(this.onMediaPipeResults)

        if (typeof CameraConstructor === 'function' && this.videoElement) {
          this.camera = new CameraConstructor(this.videoElement, {
            onFrame: async () => {
              if (this.isRunning && this.faceMesh && this.videoElement) {
                await this.faceMesh.send({ image: this.videoElement })
              }
            },
            width: 640,
            height: 480,
          })
          await this.camera.start()
          this.useMediaPipe = true
          console.log('[MindMap AI] Real-time MediaPipe Face Mesh initialized successfully.')
        }
      } catch (err) {
        console.warn('[MindMap AI] MediaPipe initialization error. Using local fallback loop:', err)
        this.useMediaPipe = false
      }
    }

    // If MediaPipe camera pump not active, run internal diagnostic processing loop
    if (!this.useMediaPipe) {
      this.processDiagnosticLoop()
    }

    return true
  }

  public startCalibration(): void {
    this.calibrator.startCalibration()
  }

  public stop(): void {
    this.isRunning = false
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    if (this.camera) {
      try {
        this.camera.stop()
      } catch (e) {
        // ignore
      }
      this.camera = null
    }

    if (this.faceMesh) {
      try {
        this.faceMesh.close()
      } catch (e) {
        // ignore
      }
      this.faceMesh = null
    }

    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      this.videoElement.srcObject = null
    }
    this.temporalBuffer.reset()
    this.cameraStatus = 'OFFLINE'
  }

  /**
   * MediaPipe callback invoked on every processed webcam frame.
   * Frame stays 100% in browser WebAssembly; zero video is transmitted.
   */
  private onMediaPipeResults = (results: any) => {
    if (!this.isRunning) return
    const startTime = performance.now()
    const now = Date.now()

    this.calculateFPS(now)

    let features: ExtractedFacialFeatures | null = null
    let isFaceFound = false

    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
      // Step 5: Safe handling for multiple faces (use first detected face)
      const rawLandmarks: Point3D[] = results.multiFaceLandmarks[0]
      features = FaceMeshFeatureExtractor.extractFeatures(rawLandmarks, now)
      isFaceFound = features !== null
    }

    this.handleFeatureProcessing(features, isFaceFound, startTime, now)
  }

  /**
   * Fallback / Diagnostic processing loop when webcam is unavailable or in mock testing.
   */
  private processDiagnosticLoop = () => {
    if (!this.isRunning) return
    const startTime = performance.now()
    const now = Date.now()

    this.calculateFPS(now)

    const isFaceFound = this.cameraStatus === 'ACTIVE' || Math.random() > 0.03
    let features: ExtractedFacialFeatures | null = null

    if (isFaceFound) {
      const syntheticLandmarks = this.generateSyntheticLandmarks()
      features = FaceMeshFeatureExtractor.extractFeatures(syntheticLandmarks, now)
    }

    this.handleFeatureProcessing(features, isFaceFound, startTime, now)

    this.animationFrameId = requestAnimationFrame(this.processDiagnosticLoop)
  }

  /**
   * Common feature processing and dispatch logic.
   */
  private handleFeatureProcessing(
    features: ExtractedFacialFeatures | null,
    isFaceFound: boolean,
    startTime: number,
    now: number
  ) {
    this.faceTrackingStatus = isFaceFound && features ? 'TRACKED' : 'NO_FACE'

    // Step 5: Safe fallback feature vector if no face detected
    const vector: FacialFeatureVector = features
      ? features.vector
      : FaceMeshFeatureExtractor.getEmptyFeatureVector(now)

    // Calibration update
    if (isFaceFound && features) {
      this.calibrator.addSample(features)
    }

    const calibrationStatus = this.calibrator.getStatus()
    const calibrationProgress = this.calibrator.getCalibrationProgress()
    const baselineDeviation = features
      ? this.calibrator.calculateDeviation(features)
      : {
          deltaEAR: 0,
          deltaHeadYaw: 0,
          deltaHeadPitch: 0,
          deltaFurrow: 0,
          personalizedAttentionScore: 85,
          personalizedConfusionScore: 15,
        }

    // Phase 2 Step 1: Push sample into Rolling Temporal Buffer
    this.temporalBuffer.addSample(vector)

    // Phase 2 Step 2: Compute statistical temporal features over rolling window
    const temporalFeatures = TemporalFeatureAggregator.aggregate(
      this.temporalBuffer.getSamples(),
      now
    )

    // Phase 2 Step 4 & 5: Execute ML Predictor
    const mlPrediction = this.mlPredictor.predict(temporalFeatures)

    const attentionScore = mlPrediction.attention_score
    const confusionScore = mlPrediction.confusion_score
    const statusLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
      attentionScore >= 70 ? 'HIGH' : attentionScore >= 40 ? 'MEDIUM' : 'LOW'

    const latencyMs = Math.round(performance.now() - startTime)

    const metrics: AIMetrics = {
      featureVector: vector,
      temporalFeatures,
      behaviouralIndicators: mlPrediction.indicators,
      mlPrediction,
      attentionScore,
      confusionScore,
      statusLevel,
      earLeft: vector.ear_left,
      earRight: vector.ear_right,
      earAverage: vector.ear_avg,
      blinkDetected: vector.blink_detected,
      blinkCount: vector.blink_count,
      blinkRatePerMin: vector.blink_rate,
      eyeClosureDurationMs: vector.eye_closure_duration_ms,
      gazeDirection: vector.gaze_direction,
      gazeDeviation: vector.gaze_deviation,
      gazeHRatio: vector.gaze_h_ratio,
      gazeVRatio: vector.gaze_v_ratio,
      eyebrowFurrowRatio: vector.brow_furrow,
      eyebrowFurrowScore: Math.round(vector.brow_furrow_score * 100),
      browRaise: vector.brow_raise,
      headPitch: vector.head_pitch,
      headYaw: vector.head_yaw,
      headRoll: vector.head_roll,
      eyeOpenness: vector.eye_openness,
      calibrationStatus,
      calibrationProgress,
      baselineDeviation,
      faceDetected: isFaceFound,
      faceCount: vector.face_count,
      landmarkCount: vector.landmark_count,
      faceTrackingStatus: this.faceTrackingStatus,
      cameraStatus: this.cameraStatus,
      fps: this.fps || 30,
      latencyMs,
    }

    if (this.callback) {
      this.callback(metrics)
    }

    // Step 4: Expose features to Canvas Overlay for Live Faculty Demonstration
    this.drawMeshOverlay(metrics, features)
  }

  private calculateFPS(now: number) {
    this.frameCount++
    if (now - this.lastFpsCalcTime >= 1000) {
      this.fps = this.frameCount
      this.frameCount = 0
      this.lastFpsCalcTime = now
    }
  }

  /**
   * Generates synthetic 468-point face mesh with realistic eye and brow geometry for diagnostic tests.
   */
  private generateSyntheticLandmarks(): Point3D[] {
    const landmarks: Point3D[] = []
    const jitterX = (Math.random() - 0.5) * 0.005
    const jitterY = (Math.random() - 0.5) * 0.005

    for (let i = 0; i < 468; i++) {
      const angle = (i / 468) * 2 * Math.PI
      landmarks.push({
        x: 0.5 + 0.18 * Math.cos(angle) + jitterX,
        y: 0.5 + 0.22 * Math.sin(angle) + jitterY,
        z: 0,
      })
    }

    // Assign realistic coordinates for key topological landmarks
    landmarks[1] = { x: 0.50 + jitterX, y: 0.50 + jitterY, z: 0 } // Nose tip
    landmarks[152] = { x: 0.50, y: 0.75, z: 0 } // Chin
    landmarks[10] = { x: 0.50, y: 0.25, z: 0 } // Forehead
    landmarks[234] = { x: 0.30, y: 0.50, z: 0 } // Left cheek
    landmarks[454] = { x: 0.70, y: 0.50, z: 0 } // Right cheek

    // Left eye (open)
    landmarks[33] = { x: 0.38, y: 0.42, z: 0 }
    landmarks[160] = { x: 0.41, y: 0.40, z: 0 }
    landmarks[158] = { x: 0.43, y: 0.40, z: 0 }
    landmarks[133] = { x: 0.46, y: 0.42, z: 0 }
    landmarks[153] = { x: 0.43, y: 0.44, z: 0 }
    landmarks[144] = { x: 0.41, y: 0.44, z: 0 }
    landmarks[159] = { x: 0.42, y: 0.40, z: 0 }
    landmarks[145] = { x: 0.42, y: 0.44, z: 0 }

    // Right eye (open)
    landmarks[362] = { x: 0.54, y: 0.42, z: 0 }
    landmarks[385] = { x: 0.57, y: 0.40, z: 0 }
    landmarks[387] = { x: 0.59, y: 0.40, z: 0 }
    landmarks[263] = { x: 0.62, y: 0.42, z: 0 }
    landmarks[373] = { x: 0.59, y: 0.44, z: 0 }
    landmarks[380] = { x: 0.57, y: 0.44, z: 0 }
    landmarks[386] = { x: 0.58, y: 0.40, z: 0 }
    landmarks[374] = { x: 0.58, y: 0.44, z: 0 }

    // Eyebrows
    landmarks[55] = { x: 0.43, y: 0.36, z: 0 }
    landmarks[285] = { x: 0.57, y: 0.36, z: 0 }
    landmarks[105] = { x: 0.41, y: 0.35, z: 0 }
    landmarks[334] = { x: 0.59, y: 0.35, z: 0 }

    return landmarks
  }

  /**
   * Draws custom real-time facial feature extraction HUD on top of webcam feed.
   */
  private drawMeshOverlay(metrics: AIMetrics, features: ExtractedFacialFeatures | null) {
    if (!this.canvasElement) return
    const ctx = this.canvasElement.getContext('2d')
    if (!ctx) return

    const width = this.canvasElement.width || 320
    const height = this.canvasElement.height || 240
    ctx.clearRect(0, 0, width, height)

    if (!metrics.faceDetected) {
      ctx.strokeStyle = '#EF4444'
      ctx.lineWidth = 2
      ctx.setLineDash([6, 6])
      ctx.strokeRect(10, 10, width - 20, height - 20)
      ctx.setLineDash([])
      ctx.fillStyle = '#EF4444'
      ctx.font = '11px monospace'
      ctx.fillText('NO FACE DETECTED', 16, 26)
      return
    }

    const v = metrics.featureVector

    // 1. Draw Face Oval HUD
    const centerX = width / 2 + v.head_yaw * 1.4
    const centerY = height / 2 - v.head_pitch * 1.4
    const radiusX = 52
    const radiusY = 68

    ctx.strokeStyle =
      metrics.statusLevel === 'HIGH'
        ? 'rgba(16, 185, 129, 0.8)' // emerald
        : metrics.statusLevel === 'MEDIUM'
        ? 'rgba(245, 158, 11, 0.8)' // amber
        : 'rgba(239, 68, 68, 0.8)' // red
    ctx.lineWidth = 1.8
    ctx.beginPath()
    ctx.ellipse(
      centerX,
      centerY,
      radiusX,
      radiusY,
      (v.head_roll * Math.PI) / 180,
      0,
      2 * Math.PI
    )
    ctx.stroke()

    // 2. Eyes & Gaze Direction Indicator
    const eyeOffsetX = 20
    const eyeOffsetY = -14
    const leftEyeX = centerX - eyeOffsetX
    const rightEyeX = centerX + eyeOffsetX
    const eyeY = centerY + eyeOffsetY

    // Eye contour
    ctx.fillStyle = v.eye_closure_duration_ms > 0 ? '#EF4444' : '#3B82F6'
    ctx.beginPath()
    ctx.arc(leftEyeX, eyeY, 4, 0, 2 * Math.PI)
    ctx.arc(rightEyeX, eyeY, 4, 0, 2 * Math.PI)
    ctx.fill()

    // Gaze pointer vector
    const gazeDx = (v.gaze_h_ratio - 0.5) * 24
    const gazeDy = (v.gaze_v_ratio - 0.5) * 24
    ctx.strokeStyle = '#FBBF24' // Yellow pointer
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(leftEyeX, eyeY)
    ctx.lineTo(leftEyeX + gazeDx, eyeY + gazeDy)
    ctx.moveTo(rightEyeX, eyeY)
    ctx.lineTo(rightEyeX + gazeDx, eyeY + gazeDy)
    ctx.stroke()

    // 3. Eyebrows (Furrow indicator)
    const browY = eyeY - 12
    const furrowCompression = (1.0 - v.brow_furrow_score) * 6
    ctx.strokeStyle = v.brow_furrow_score > 0.4 ? '#A855F7' : '#94A3B8'
    ctx.lineWidth = 2.2
    ctx.beginPath()
    // Left brow
    ctx.moveTo(leftEyeX - 10, browY - 2)
    ctx.lineTo(leftEyeX + furrowCompression, browY)
    // Right brow
    ctx.moveTo(rightEyeX - furrowCompression, browY)
    ctx.lineTo(rightEyeX + 10, browY - 2)
    ctx.stroke()

    // 4. Live Telemetry HUD Watermark
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.fillRect(6, height - 44, width - 12, 38)
    ctx.fillStyle = '#38BDF8'
    ctx.font = '10px monospace'
    ctx.fillText(`Att: ${metrics.attentionScore}% [${metrics.mlPrediction.attention_state}] | Conf: ${metrics.confusionScore}% [${metrics.mlPrediction.confusion_state}]`, 10, height - 28)
    ctx.fillStyle = '#CBD5E1'
    ctx.fillText(`Win: ${metrics.temporalFeatures.valid_samples_count} frames (${(metrics.temporalFeatures.window_duration_ms / 1000).toFixed(1)}s) | Ear: ${v.ear_avg.toFixed(2)} | Pose: ${v.head_yaw}°`, 10, height - 12)
  }
}