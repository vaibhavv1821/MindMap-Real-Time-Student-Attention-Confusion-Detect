from pydantic import BaseModel, Field
from typing import Optional, Literal, List

GazeDirectionType = Literal["CENTER", "LEFT", "RIGHT", "UP", "DOWN", "AWAY"]

class Point3D(BaseModel):
    x: float
    y: float
    z: Optional[float] = 0.0

class BoundingBox(BaseModel):
    x: float
    y: float
    width: float
    height: float

class FacialFeatureVector(BaseModel):
    """
    Standardized Phase 1 Custom Facial Feature Vector.
    Calculated purely from facial landmarks using custom mathematical feature engineering.
    """
    # 1. Eye Aspect Ratio (EAR)
    ear_left: float = Field(..., description="Left Eye Aspect Ratio")
    ear_right: float = Field(..., description="Right Eye Aspect Ratio")
    ear_avg: float = Field(..., description="Bilateral average Eye Aspect Ratio")

    # 2. Blink Telemetry
    blink_detected: bool = Field(False, description="True on frame where a valid blink finishes")
    blink_count: int = Field(0, description="Cumulative count of validated blinks")
    blink_rate: float = Field(0.0, description="Rolling blinks per minute (last 60s)")
    eye_closure_duration_ms: float = Field(0.0, description="Duration in ms of active eye closure episode")

    # 3. Gaze Estimation
    gaze_direction: GazeDirectionType = Field("CENTER", description="Discretized gaze orientation")
    gaze_deviation: float = Field(0.0, description="Normalized deviation from central line of sight [0, 1]")
    gaze_h_ratio: float = Field(0.5, description="Horizontal pupil position [0=left, 1=right]")
    gaze_v_ratio: float = Field(0.5, description="Vertical pupil position [0=top, 1=bottom]")

    # 4. Head Pose Estimation (Degrees)
    head_yaw: float = Field(0.0, description="Horizontal head rotation in degrees (-90 to +90)")
    head_pitch: float = Field(0.0, description="Vertical head tilt in degrees (-90 to +90)")
    head_roll: float = Field(0.0, description="Lateral head tilt in degrees (-90 to +90)")

    # 5. Brow / Facial Behaviour
    brow_furrow: float = Field(0.0, description="Normalized distance between inner eyebrows")
    brow_furrow_score: float = Field(0.0, description="Eyebrow contraction index [0=relaxed, 1=frowning/confused]")
    brow_raise: float = Field(0.0, description="Normalized vertical brow elevation")

    # 6. Face Quality & Geometry
    eye_openness: float = Field(0.0, description="Normalized eye openness metric [0, 1]")
    face_detected: bool = Field(True, description="True if a valid face mesh is localized")
    face_count: int = Field(1, description="Number of detected faces in frame")
    landmark_count: int = Field(468, description="Number of landmark points provided")
    timestamp_ms: float = Field(..., description="Timestamp in milliseconds")
    bounding_box: BoundingBox = Field(default_factory=lambda: BoundingBox(x=0, y=0, width=0, height=0))

class FeatureExtractionRequest(BaseModel):
    landmarks: List[Point3D]
    timestamp_ms: Optional[float] = None

class TelemetryMessage(BaseModel):
    student_id: str
    student_name: str
    class_code: str
    features: FacialFeatureVector
    timestamp: Optional[str] = None