import { ExtractedFacialFeatures } from './faceMeshExtractor'

export interface BaselineFeatures {
  baselineEAR: number
  baselineEyebrowFurrowRatio: number
  baselineHeadPitch: number
  baselineHeadYaw: number
  baselineHeadRoll: number
  sampleCount: number
  createdAt: number
}

export interface BaselineDeviation {
  deltaEAR: number // percentage change (e.g. -0.05 = -5%)
  deltaHeadYaw: number // degrees deviation
  deltaHeadPitch: number // degrees deviation
  deltaFurrow: number // percentage contraction
  personalizedAttentionScore: number // 0-100
  personalizedConfusionScore: number // 0-100
}

export type CalibrationStatus = 'UNCALIBRATED' | 'CALIBRATING' | 'CALIBRATED'

export class BaselineCalibrator {
  private status: CalibrationStatus = 'UNCALIBRATED'
  private samples: ExtractedFacialFeatures[] = []
  private calibrationStartTime: number = 0
  private readonly CALIBRATION_DURATION_MS = 8000 // 8 seconds calibration
  private baseline: BaselineFeatures | null = null

  constructor() {
    this.loadSavedBaseline()
  }

  public getStatus(): CalibrationStatus {
    return this.status
  }

  public getBaseline(): BaselineFeatures | null {
    return this.baseline
  }

  public startCalibration(): void {
    this.status = 'CALIBRATING'
    this.samples = []
    this.calibrationStartTime = Date.now()
  }

  public getCalibrationProgress(): number {
    if (this.status !== 'CALIBRATING') return this.status === 'CALIBRATED' ? 100 : 0
    const elapsed = Date.now() - this.calibrationStartTime
    return Math.min(100, Math.round((elapsed / this.CALIBRATION_DURATION_MS) * 100))
  }

  public addSample(features: ExtractedFacialFeatures): void {
    if (this.status !== 'CALIBRATING') return

    this.samples.push(features)

    const elapsed = Date.now() - this.calibrationStartTime
    if (elapsed >= this.CALIBRATION_DURATION_MS && this.samples.length >= 10) {
      this.finishCalibration()
    }
  }

  private finishCalibration(): void {
    let sumEAR = 0
    let sumFurrow = 0
    let sumPitch = 0
    let sumYaw = 0
    let sumRoll = 0

    const count = this.samples.length
    for (const s of this.samples) {
      sumEAR += s.earAverage
      sumFurrow += s.eyebrowFurrowRatio
      sumPitch += s.headPitch
      sumYaw += s.headYaw
      sumRoll += s.headRoll
    }

    this.baseline = {
      baselineEAR: Number((sumEAR / count).toFixed(3)),
      baselineEyebrowFurrowRatio: Number((sumFurrow / count).toFixed(3)),
      baselineHeadPitch: Math.round(sumPitch / count),
      baselineHeadYaw: Math.round(sumYaw / count),
      baselineHeadRoll: Math.round(sumRoll / count),
      sampleCount: count,
      createdAt: Date.now(),
    }

    this.status = 'CALIBRATED'
    this.saveBaseline()
  }

  public calculateDeviation(current: ExtractedFacialFeatures): BaselineDeviation {
    if (!this.baseline) {
      return {
        deltaEAR: 0,
        deltaHeadYaw: 0,
        deltaHeadPitch: 0,
        deltaFurrow: 0,
        personalizedAttentionScore: 85,
        personalizedConfusionScore: 15,
      }
    }

    // 1. Calculate relative EAR drop from personal resting baseline
    const earRef = this.baseline.baselineEAR || 0.28
    const deltaEAR = Number(((current.earAverage - earRef) / earRef).toFixed(3))

    // 2. Head orientation deviations from resting pose
    const deltaHeadYaw = Math.abs(current.headYaw - this.baseline.baselineHeadYaw)
    const deltaHeadPitch = Math.abs(current.headPitch - this.baseline.baselineHeadPitch)

    // 3. Eyebrow contraction deviation
    const furrowRef = this.baseline.baselineEyebrowFurrowRatio || 0.22
    const deltaFurrow = Number(((furrowRef - current.eyebrowFurrowRatio) / furrowRef).toFixed(3))

    // 4. Compute personalized attention score based on baseline offset
    let attentionDeduction = 0
    if (deltaEAR < -0.2) attentionDeduction += 25 // Eyes significantly more closed than resting
    if (deltaHeadYaw > 15) attentionDeduction += 30 // Head turned away from personal resting pose
    if (deltaHeadPitch > 15) attentionDeduction += 20
    if (current.gazeDirection === 'AWAY') attentionDeduction += 20

    const personalizedAttentionScore = Math.min(100, Math.max(10, 95 - attentionDeduction))

    // 5. Compute personalized confusion score
    let confusionBonus = 0
    if (deltaFurrow > 0.15) confusionBonus += 40 // Eyebrows contracted more than baseline
    if (deltaHeadPitch > 10 || Math.abs(current.headRoll - this.baseline.baselineHeadRoll) > 10) {
      confusionBonus += 25 // Head tilted in confusion
    }

    const personalizedConfusionScore = Math.min(100, Math.max(5, 10 + confusionBonus))

    return {
      deltaEAR,
      deltaHeadYaw,
      deltaHeadPitch,
      deltaFurrow,
      personalizedAttentionScore,
      personalizedConfusionScore,
    }
  }

  private saveBaseline(): void {
    if (!this.baseline) return
    try {
      localStorage.setItem('mindmap_baseline_features', JSON.stringify(this.baseline))
    } catch (e) {
      console.warn('[MindMap] Failed to save baseline to localStorage', e)
    }
  }

  private loadSavedBaseline(): void {
    try {
      const saved = localStorage.getItem('mindmap_baseline_features')
      if (saved) {
        this.baseline = JSON.parse(saved)
        this.status = 'CALIBRATED'
      }
    } catch (e) {
      // Ignore
    }
  }
}
