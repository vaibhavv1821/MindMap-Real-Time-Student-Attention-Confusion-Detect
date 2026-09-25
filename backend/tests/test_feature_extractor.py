"""
Automated Unit Tests for MindMap Custom Facial Feature Extraction Engine.
Validates:
1. Valid landmark input
2. No-face condition
3. EAR calculation (left, right, average, open vs closed)
4. Blink detection state machine & duration filtering
5. Gaze classification (CENTER, LEFT, RIGHT, UP, DOWN, AWAY) & deviation
6. Head pose output (Yaw, Pitch, Roll)
7. Standardized feature vector structure & constraints
8. Safe handling of invalid / missing / corrupt landmarks & NaN prevention
"""

import math
import pytest
from app.features.feature_extractor import (
    CustomFacialFeatureExtractor,
    PyBlinkTracker,
    calculate_ear,
    distance_2d,
    clamp,
    FACIAL_LANDMARKS,
)
from app.schemas.features import Point3D, FacialFeatureVector


def create_synthetic_mesh(
    eye_open: bool = True,
    gaze_offset_x: float = 0.0,
    gaze_offset_y: float = 0.0,
    yaw_offset: float = 0.0,
    pitch_offset: float = 0.0,
    roll_angle_deg: float = 0.0,
    brow_furrow_dist: float = 0.14,
) -> list[Point3D]:
    """Generates a complete 468-point topological face mesh with configurable geometry."""
    landmarks = [Point3D(x=0.5, y=0.5, z=0.0) for _ in range(468)]

    # Head boundaries
    landmarks[FACIAL_LANDMARKS["NOSE_TIP"]] = Point3D(x=0.50 + yaw_offset, y=0.50 + pitch_offset, z=0.0)
    landmarks[FACIAL_LANDMARKS["CHIN"]] = Point3D(x=0.50, y=0.75, z=0.0)
    landmarks[FACIAL_LANDMARKS["FOREHEAD"]] = Point3D(x=0.50, y=0.25, z=0.0)

    # Cheeks (with optional roll angle)
    rad = math.radians(roll_angle_deg)
    half_w = 0.20
    landmarks[FACIAL_LANDMARKS["LEFT_CHEEK"]] = Point3D(
        x=0.50 - half_w * math.cos(rad),
        y=0.50 - half_w * math.sin(rad),
        z=0.0
    )
    landmarks[FACIAL_LANDMARKS["RIGHT_CHEEK"]] = Point3D(
        x=0.50 + half_w * math.cos(rad),
        y=0.50 + half_w * math.sin(rad),
        z=0.0
    )

    # Eye height based on open/closed state
    eye_h = 0.04 if eye_open else 0.005

    # Left eye
    landmarks[33] = Point3D(x=0.38, y=0.42, z=0.0)   # outer
    landmarks[160] = Point3D(x=0.41, y=0.42 - eye_h, z=0.0)
    landmarks[158] = Point3D(x=0.43, y=0.42 - eye_h, z=0.0)
    landmarks[133] = Point3D(x=0.46, y=0.42, z=0.0)  # inner
    landmarks[153] = Point3D(x=0.43, y=0.42 + eye_h, z=0.0)
    landmarks[144] = Point3D(x=0.41, y=0.42 + eye_h, z=0.0)
    landmarks[159] = Point3D(x=0.42, y=0.42 - eye_h, z=0.0)  # top
    landmarks[145] = Point3D(x=0.42, y=0.42 + eye_h, z=0.0)  # bottom

    # Right eye
    landmarks[362] = Point3D(x=0.54, y=0.42, z=0.0)  # inner
    landmarks[385] = Point3D(x=0.57, y=0.42 - eye_h, z=0.0)
    landmarks[387] = Point3D(x=0.59, y=0.42 - eye_h, z=0.0)
    landmarks[263] = Point3D(x=0.62, y=0.42, z=0.0)  # outer
    landmarks[373] = Point3D(x=0.59, y=0.42 + eye_h, z=0.0)
    landmarks[380] = Point3D(x=0.57, y=0.42 + eye_h, z=0.0)
    landmarks[386] = Point3D(x=0.58, y=0.42 - eye_h, z=0.0)  # top
    landmarks[374] = Point3D(x=0.58, y=0.42 + eye_h, z=0.0)  # bottom

    # Eyebrows
    center_x = 0.50
    landmarks[FACIAL_LANDMARKS["LEFT_INNER_BROW"]] = Point3D(x=center_x - brow_furrow_dist / 2.0, y=0.36, z=0.0)
    landmarks[FACIAL_LANDMARKS["RIGHT_INNER_BROW"]] = Point3D(x=center_x + brow_furrow_dist / 2.0, y=0.36, z=0.0)
    landmarks[FACIAL_LANDMARKS["LEFT_BROW_ARCH"]] = Point3D(x=0.41, y=0.34, z=0.0)
    landmarks[FACIAL_LANDMARKS["RIGHT_BROW_ARCH"]] = Point3D(x=0.59, y=0.34, z=0.0)

    # Optional 478-point mesh with iris landmarks
    if gaze_offset_x != 0.0 or gaze_offset_y != 0.0:
        landmarks.extend([Point3D(x=0.0, y=0.0, z=0.0) for _ in range(10)])
        landmarks[468] = Point3D(x=0.42 + gaze_offset_x, y=0.42 + gaze_offset_y, z=0.0)
        landmarks[473] = Point3D(x=0.58 + gaze_offset_x, y=0.42 + gaze_offset_y, z=0.0)

    return landmarks


# ==============================================================================
# 1. Valid Landmark Input Test
# ==============================================================================
def test_valid_landmark_input():
    extractor = CustomFacialFeatureExtractor()
    mesh = create_synthetic_mesh(eye_open=True)
    vector = extractor.extract_features(mesh, timestamp_ms=1000.0)

    assert isinstance(vector, FacialFeatureVector)
    assert vector.face_detected is True
    assert vector.face_count == 1
    assert vector.landmark_count == 468
    assert vector.timestamp_ms == 1000.0
    assert not math.isnan(vector.ear_avg)
    assert not math.isnan(vector.gaze_deviation)
    assert not math.isnan(vector.head_yaw)


# ==============================================================================
# 2. No-Face Condition Test
# ==============================================================================
def test_no_face_condition():
    extractor = CustomFacialFeatureExtractor()

    # None input
    v_none = extractor.extract_features(None, timestamp_ms=2000.0)
    assert v_none.face_detected is False
    assert v_none.face_count == 0
    assert v_none.landmark_count == 0
    assert v_none.ear_avg == 0.0
    assert v_none.gaze_direction == "AWAY"

    # Empty list input
    v_empty = extractor.extract_features([], timestamp_ms=2000.0)
    assert v_empty.face_detected is False
    assert v_empty.face_count == 0

    # Incomplete landmark list (<468 points)
    v_short = extractor.extract_features([Point3D(x=0, y=0, z=0) for _ in range(200)])
    assert v_short.face_detected is False


# ==============================================================================
# 3. EAR Calculation Test
# ==============================================================================
def test_ear_calculation():
    extractor = CustomFacialFeatureExtractor()

    # Open eyes
    mesh_open = create_synthetic_mesh(eye_open=True)
    v_open = extractor.extract_features(mesh_open)
    assert v_open.ear_left > 0.20
    assert v_open.ear_right > 0.20
    assert v_open.ear_avg > 0.20
    assert v_open.eye_openness > 0.50

    # Closed eyes
    mesh_closed = create_synthetic_mesh(eye_open=False)
    v_closed = extractor.extract_features(mesh_closed)
    assert v_closed.ear_left < 0.15
    assert v_closed.ear_right < 0.15
    assert v_closed.ear_avg < 0.15
    assert v_closed.eye_openness < 0.20


# ==============================================================================
# 4. Blink Detection State Machine Test
# ==============================================================================
def test_blink_detection():
    tracker = PyBlinkTracker(ear_threshold=0.19)

    # Frame 1: Eyes open at t=1000ms
    det, cnt, rate, closure = tracker.update(ear_avg=0.28, current_time_ms=1000.0)
    assert det is False
    assert cnt == 0
    assert closure == 0.0

    # Frame 2: Eyes close at t=1100ms
    det, cnt, rate, closure = tracker.update(ear_avg=0.12, current_time_ms=1100.0)
    assert det is False
    assert cnt == 0
    assert closure == 0.0  # Just started closure

    # Frame 3: Eyes still closed at t=1250ms (closure duration 150ms)
    det, cnt, rate, closure = tracker.update(ear_avg=0.10, current_time_ms=1250.0)
    assert det is False
    assert cnt == 0
    assert closure == 150.0

    # Frame 4: Eyes reopen at t=1300ms (total duration 200ms -> valid physiological blink)
    det, cnt, rate, closure = tracker.update(ear_avg=0.29, current_time_ms=1300.0)
    assert det is True  # Blink successfully detected!
    assert cnt == 1     # Count incremented
    assert rate == 1.0  # 1 blink in the last 60s
    assert closure == 0.0

    # Frame 5: Prolonged closure (>500ms, drowsiness/inattention, not a normal blink)
    tracker.update(ear_avg=0.10, current_time_ms=2000.0)
    tracker.update(ear_avg=0.10, current_time_ms=2600.0)
    det, cnt, rate, closure = tracker.update(ear_avg=0.28, current_time_ms=2700.0)
    assert det is False  # Rejected because 700ms > MAX_BLINK_DURATION_MS
    assert cnt == 1      # Count remains 1


# ==============================================================================
# 5. Gaze Classification & Deviation Test
# ==============================================================================
def test_gaze_classification():
    extractor = CustomFacialFeatureExtractor()

    # Center gaze
    mesh_center = create_synthetic_mesh(eye_open=True, gaze_offset_x=0.0, gaze_offset_y=0.0)
    v_center = extractor.extract_features(mesh_center)
    assert v_center.gaze_direction == "CENTER"
    assert v_center.gaze_deviation < 0.28

    # Right gaze
    mesh_right = create_synthetic_mesh(eye_open=True, gaze_offset_x=0.03, gaze_offset_y=0.0)
    v_right = extractor.extract_features(mesh_right)
    assert v_right.gaze_direction == "RIGHT"
    assert v_right.gaze_deviation > 0.28

    # Left gaze
    mesh_left = create_synthetic_mesh(eye_open=True, gaze_offset_x=-0.03, gaze_offset_y=0.0)
    v_left = extractor.extract_features(mesh_left)
    assert v_left.gaze_direction == "LEFT"
    assert v_left.gaze_deviation > 0.28

    # Down gaze
    mesh_down = create_synthetic_mesh(eye_open=True, gaze_offset_x=0.0, gaze_offset_y=0.03)
    v_down = extractor.extract_features(mesh_down)
    assert v_down.gaze_direction == "DOWN"

    # Up gaze
    mesh_up = create_synthetic_mesh(eye_open=True, gaze_offset_x=0.0, gaze_offset_y=-0.03)
    v_up = extractor.extract_features(mesh_up)
    assert v_up.gaze_direction == "UP"


# ==============================================================================
# 6. Head Pose Estimation Test (Yaw, Pitch, Roll)
# ==============================================================================
def test_head_pose_output():
    extractor = CustomFacialFeatureExtractor()

    # Neutral frontal face
    mesh_front = create_synthetic_mesh(yaw_offset=0.0, pitch_offset=0.0, roll_angle_deg=0.0)
    v_front = extractor.extract_features(mesh_front)
    assert abs(v_front.head_yaw) < 5.0
    assert abs(v_front.head_pitch) < 5.0
    assert abs(v_front.head_roll) < 5.0

    # Head turned right (yaw > 0)
    mesh_yaw_right = create_synthetic_mesh(yaw_offset=0.06)
    v_yaw_right = extractor.extract_features(mesh_yaw_right)
    assert v_yaw_right.head_yaw > 12.0

    # Head turned left (yaw < 0)
    mesh_yaw_left = create_synthetic_mesh(yaw_offset=-0.06)
    v_yaw_left = extractor.extract_features(mesh_yaw_left)
    assert v_yaw_left.head_yaw < -12.0

    # Head tilted laterally (roll)
    mesh_roll = create_synthetic_mesh(roll_angle_deg=18.0)
    v_roll = extractor.extract_features(mesh_roll)
    assert v_roll.head_roll >= 15.0


# ==============================================================================
# 7. Brow / Facial Behaviour Test
# ==============================================================================
def test_brow_features():
    extractor = CustomFacialFeatureExtractor()

    # Relaxed eyebrows (wide spacing)
    mesh_relaxed = create_synthetic_mesh(brow_furrow_dist=0.14)
    v_relaxed = extractor.extract_features(mesh_relaxed)
    assert v_relaxed.brow_furrow_score < 0.35

    # Contracted eyebrows (frowning / confused)
    mesh_frown = create_synthetic_mesh(brow_furrow_dist=0.07)
    v_frown = extractor.extract_features(mesh_frown)
    assert v_frown.brow_furrow_score > 0.60
    assert v_frown.brow_furrow < v_relaxed.brow_furrow


# ==============================================================================
# 8. Invalid / Missing Landmark Handling & Zero-Division Safety
# ==============================================================================
def test_invalid_and_corrupt_landmarks():
    extractor = CustomFacialFeatureExtractor()

    # Degenerate eye points with 0 distance (zero division guard)
    p = Point3D(x=0.5, y=0.5, z=0.0)
    ear_zero = calculate_ear(p, p, p, p, p, p)
    assert ear_zero == 0.0

    # NaN coordinates
    nan_mesh = [Point3D(x=float("nan"), y=float("nan"), z=0.0) for _ in range(468)]
    v_nan = extractor.extract_features(nan_mesh)
    # Output must have finite, clamped numbers without propagating NaN
    assert not math.isnan(v_nan.ear_avg)
    assert not math.isnan(v_nan.head_yaw)
    assert not math.isnan(v_nan.gaze_deviation)