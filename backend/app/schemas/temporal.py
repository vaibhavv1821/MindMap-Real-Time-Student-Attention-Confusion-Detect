"""
MindMap Phase 2 - Temporal & Machine Learning Schemas

Defines standardized Pydantic data structures for:
1. TemporalFeatureVector - Aggregated behavioural metrics over a rolling window.
2. BehaviouralIndicators - Discrete & composite behavioural states.
3. MLPredictionResult - Random Forest attention/confusion states, scores, confidence, and reasons.
"""

from typing import List, Literal, Optional
from pydantic import BaseModel, Field


AttentionStateType = Literal["ATTENTIVE", "INATTENTIVE"]
ConfusionStateType = Literal["NORMAL", "POSSIBLY_CONFUSED"]
ModelStatusType = Literal[
    "TRAINED_DEMO_MODEL",
    "HEURISTIC_FALLBACK",
    "PRODUCTION_DAISEE_PENDING",
]


class TemporalFeatureVector(BaseModel):
    """
    Standardized aggregated feature vector computed over a rolling temporal window (e.g. 1-3 seconds).
    Consumes Phase 1 FacialFeatureVector samples and serves as input to the ML model.
    """
    # 1. EAR temporal statistics
    ear_mean: float = Field(..., description="Mean bilateral EAR across valid frames")
    ear_std: float = Field(0.0, description="Standard deviation of bilateral EAR")
    ear_min: float = Field(0.0, description="Minimum bilateral EAR in window")
    ear_max: float = Field(0.0, description="Maximum bilateral EAR in window")

    # 2. Gaze temporal metrics
    gaze_deviation_mean: float = Field(..., description="Average gaze deviation [0.0, 1.0]")
    gaze_deviation_max: float = Field(..., description="Peak gaze deviation in window [0.0, 1.0]")
    gaze_center_percent: float = Field(..., description="Percentage of window gaze is CENTER [0-100]")
    gaze_away_percent: float = Field(..., description="Percentage of window gaze is AWAY [0-100]")
    sustained_gaze_away_duration_ms: float = Field(0.0, description="Longest continuous gaze away duration in ms")

    # 3. Head pose temporal dynamics (degrees)
    head_yaw_mean: float = Field(..., description="Mean yaw angle (-90 to +90)")
    head_pitch_mean: float = Field(..., description="Mean pitch angle (-90 to +90)")
    head_roll_mean: float = Field(..., description="Mean roll angle (-90 to +90)")
    head_yaw_variance: float = Field(0.0, description="Sample variance of yaw across window")
    head_pitch_variance: float = Field(0.0, description="Sample variance of pitch across window")
    head_roll_variance: float = Field(0.0, description="Sample variance of roll across window")
    head_movement_magnitude: float = Field(0.0, description="Average angular step per frame (degrees/frame)")

    # 4. Blink dynamics
    blink_count: int = Field(0, description="Blinks completed during window")
    blink_rate: float = Field(0.0, description="Current rolling blinks per minute")
    avg_closure_duration_ms: float = Field(0.0, description="Average eye closure duration in ms")

    # 5. Brow dynamics
    brow_furrow_mean: float = Field(..., description="Mean brow furrow score [0.0, 1.0]")
    brow_furrow_max: float = Field(..., description="Peak brow furrow score [0.0, 1.0]")
    brow_furrow_persistence: float = Field(..., description="Percentage of window with contracted brows [0-100]")

    # 6. Data quality & window metadata
    valid_face_percentage: float = Field(..., description="Percentage of frames with localized face [0-100]")
    valid_samples_count: int = Field(..., description="Number of valid face samples in buffer")
    total_samples_count: int = Field(75, description="Total samples in buffer (valid + no-face)")
    window_duration_ms: float = Field(2500.0, description="Actual elapsed time represented by buffer (ms)")
    timestamp_ms: float = Field(0.0, description="Timestamp of the newest sample in window")



class BehaviouralIndicators(BaseModel):
    """
    Interpretable intermediate behavioural indicators derived from temporal features.
    Provides clear rule-based logic explaining physical student reactions.
    """
    sustained_gaze_away: bool = Field(False, description="True if gaze is persistently deflected or away")
    excessive_head_movement: bool = Field(False, description="True if angular movement exceeds stability threshold")
    prolonged_eye_closure: bool = Field(False, description="True if eye closure exceeds normal blink duration (drowsiness/blink)")
    high_brow_furrow: bool = Field(False, description="True if eyebrows are consistently contracted/furrowed")
    stable_screen_gaze: bool = Field(True, description="True if student is looking consistently at screen with stable posture")
    attention_drop_indicator: float = Field(0.0, description="Normalized composite risk score [0.0, 1.0] for inattention")
    confusion_indicator: float = Field(0.0, description="Normalized composite risk score [0.0, 1.0] for confusion")


class MLPredictionResult(BaseModel):
    """
    Standardized Phase 2 ML Attention and Confusion Prediction Output.
    Derived strictly from Random Forest classification probability and temporal feature analysis.
    """
    attention_state: AttentionStateType = Field(..., description="Predicted attention state (ATTENTIVE / INATTENTIVE)")
    attention_score: float = Field(..., description="Calculated attention score [0.0 to 100.0]")
    confusion_state: ConfusionStateType = Field(..., description="Predicted confusion state (NORMAL / POSSIBLY_CONFUSED)")
    confusion_score: float = Field(..., description="Calculated confusion score [0.0 to 100.0]")
    confidence: float = Field(..., description="Model classification confidence percentage [0.0 to 100.0]")
    reasons: List[str] = Field(default_factory=list, description="Top contributing behavioural indicators explaining the prediction")
    indicators: BehaviouralIndicators = Field(..., description="Underlying behavioural indicator states")
    temporal_features: Optional[TemporalFeatureVector] = Field(None, description="The aggregated temporal feature vector")
    model_status: ModelStatusType = Field("TRAINED_DEMO_MODEL", description="Current status of the underlying ML model")
    timestamp_ms: float = Field(..., description="Inference timestamp in milliseconds")
