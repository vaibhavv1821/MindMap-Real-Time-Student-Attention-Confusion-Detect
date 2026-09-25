"""
MindMap Custom Facial Feature Extraction Engine (Python / FastAPI Backend)

Mathematical Feature Engineering Layer Built on Top of MediaPipe Face Mesh.
Takes raw 3D landmark points and independently calculates behavioral metrics:
1. Eye Aspect Ratio (EAR) - Left, Right, Average (Soukupova & Cech, 2016)
2. Blink Detection & State Machine (duration filtering, blink counting, rolling rate/min)
3. Gaze Estimation (Iris/pupil relative positioning, 5 directions + AWAY, deviation)
4. Head Pose Estimation (Yaw, Pitch, Roll in degrees from 3D geometry)
5. Brow / Facial Behaviour (Furrow contraction & eyebrow raise)
6. Face / Eye Quality & Openness metrics
"""

import math
import time
from typing import List, Dict, Any, Optional, Tuple
from app.schemas.features import FacialFeatureVector, Point3D, BoundingBox

# MediaPipe 468 Face Mesh Topological Indices
FACIAL_LANDMARKS = {
    # Left eye: [p1(outer), p2(upper1), p3(upper2), p4(inner), p5(lower2), p6(lower1)]
    "LEFT_EYE": [33, 160, 158, 133, 153, 144],
    # Right eye: [p1(inner), p2(upper1), p3(upper2), p4(outer), p5(lower2), p6(lower1)]
    "RIGHT_EYE": [362, 385, 387, 263, 373, 380],

    # Iris landmarks (available in 478-point mesh)
    "LEFT_IRIS_CENTER": 468,
    "RIGHT_IRIS_CENTER": 473,

    # Eyelids for vertical gaze
    "LEFT_EYE_TOP": 159,
    "LEFT_EYE_BOTTOM": 145,
    "RIGHT_EYE_TOP": 386,
    "RIGHT_EYE_BOTTOM": 374,

    # Eyebrow landmarks
    "LEFT_INNER_BROW": 55,
    "RIGHT_INNER_BROW": 285,
    "LEFT_BROW_ARCH": 105,
    "RIGHT_BROW_ARCH": 334,

    # Head pose anchor points
    "NOSE_TIP": 1,
    "CHIN": 152,
    "FOREHEAD": 10,
    "LEFT_CHEEK": 234,
    "RIGHT_CHEEK": 454,
}

EPSILON = 1e-6
DEFAULT_EAR_BLINK_THRESHOLD = 0.19
MIN_BLINK_DURATION_MS = 60
MAX_BLINK_DURATION_MS = 450


def distance_2d(p1: Any, p2: Any) -> float:
    """Euclidean distance in 2D plane (x, y)."""
    if not p1 or not p2:
        return 0.0
    x1, y1 = getattr(p1, "x", 0.0), getattr(p1, "y", 0.0)
    x2, y2 = getattr(p2, "x", 0.0), getattr(p2, "y", 0.0)
    dx = x1 - x2
    dy = y1 - y2
    return math.sqrt(dx * dx + dy * dy)


def clamp(val: float, min_val: float, max_val: float) -> float:
    """Clamps a floating point value and protects against NaN/Inf."""
    if math.isnan(val) or math.isinf(val):
        return min_val
    return max(min_val, min(max_val, val))


def calculate_ear(
    p1: Any, p2: Any, p3: Any, p4: Any, p5: Any, p6: Any
) -> float:
    """
    Eye Aspect Ratio (EAR) formulation by Soukupova & Cech (2016):
    EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
    """
    if not all([p1, p2, p3, p4, p5, p6]):
        return 0.0
    v1 = distance_2d(p2, p6)
    v2 = distance_2d(p3, p5)
    h = distance_2d(p1, p4)

    if h < EPSILON:
        return 0.0
    ear = (v1 + v2) / (2.0 * h)
    if math.isnan(ear) or math.isinf(ear):
        return 0.0
    return round(ear, 4)


class PyBlinkTracker:
    """
    Blink state machine tracking eye closure episodes, total count,
    and rolling blink frequency per minute.
    """

    def __init__(self, ear_threshold: float = DEFAULT_EAR_BLINK_THRESHOLD):
        self.ear_threshold = ear_threshold
        self.is_eye_closed = False
        self.closure_start_time = 0.0
        self.blink_count = 0
        self.recent_blinks: List[float] = []

    def update(
        self, ear_avg: float, current_time_ms: float
    ) -> Tuple[bool, int, float, float]:
        """
        Updates tracker with new EAR sample.
        Returns: (blink_detected, blink_count, blink_rate, closure_duration_ms)
        """
        blink_detected = False
        closure_duration_ms = 0.0
        closed = ear_avg < self.ear_threshold

        if closed:
            if not self.is_eye_closed:
                self.is_eye_closed = True
                self.closure_start_time = current_time_ms
            closure_duration_ms = max(0.0, current_time_ms - self.closure_start_time)
        else:
            if self.is_eye_closed:
                duration = current_time_ms - self.closure_start_time
                self.is_eye_closed = False
                closure_duration_ms = 0.0

                # Physiological blink filter: 60ms <= duration <= 450ms
                if MIN_BLINK_DURATION_MS <= duration <= MAX_BLINK_DURATION_MS:
                    self.blink_count += 1
                    blink_detected = True
                    self.recent_blinks.append(current_time_ms)

        # Purge blinks older than 60s
        cutoff = current_time_ms - 60000.0
        self.recent_blinks = [t for t in self.recent_blinks if t >= cutoff]
        blink_rate = float(len(self.recent_blinks))

        return blink_detected, self.blink_count, blink_rate, closure_duration_ms

    def reset(self):
        self.is_eye_closed = False
        self.closure_start_time = 0.0
        self.blink_count = 0
        self.recent_blinks = []


class CustomFacialFeatureExtractor:
    """
    Core Phase 1 Custom Facial Feature Extraction Engine.
    """

    def __init__(self):
        self.blink_tracker = PyBlinkTracker()

    def get_empty_vector(self, timestamp_ms: Optional[float] = None) -> FacialFeatureVector:
        """Returns safe default feature vector when no face is localized."""
        t = timestamp_ms if timestamp_ms is not None else time.time() * 1000.0
        return FacialFeatureVector(
            ear_left=0.0,
            ear_right=0.0,
            ear_avg=0.0,
            blink_detected=False,
            blink_count=self.blink_tracker.blink_count,
            blink_rate=0.0,
            eye_closure_duration_ms=0.0,
            gaze_direction="AWAY",
            gaze_deviation=1.0,
            gaze_h_ratio=0.5,
            gaze_v_ratio=0.5,
            head_yaw=0.0,
            head_pitch=0.0,
            head_roll=0.0,
            brow_furrow=0.0,
            brow_furrow_score=0.0,
            brow_raise=0.0,
            eye_openness=0.0,
            face_detected=False,
            face_count=0,
            landmark_count=0,
            timestamp_ms=t,
            bounding_box=BoundingBox(x=0.0, y=0.0, width=0.0, height=0.0),
        )

    def extract_features(
        self, landmarks: Optional[List[Any]], timestamp_ms: Optional[float] = None
    ) -> FacialFeatureVector:
        """
        Extracts numerical behavioral feature vector from MediaPipe landmarks.
        """
        now = timestamp_ms if timestamp_ms is not None else time.time() * 1000.0

        # Step 5: Safe handling for empty/corrupt/insufficient landmarks
        if not landmarks or len(landmarks) < 468:
            return self.get_empty_vector(now)

        # 1. Eye Aspect Ratio (EAR)
        left_eye_indices = FACIAL_LANDMARKS["LEFT_EYE"]
        right_eye_indices = FACIAL_LANDMARKS["RIGHT_EYE"]

        ear_left = calculate_ear(
            landmarks[left_eye_indices[0]],
            landmarks[left_eye_indices[1]],
            landmarks[left_eye_indices[2]],
            landmarks[left_eye_indices[3]],
            landmarks[left_eye_indices[4]],
            landmarks[left_eye_indices[5]],
        )

        ear_right = calculate_ear(
            landmarks[right_eye_indices[0]],
            landmarks[right_eye_indices[1]],
            landmarks[right_eye_indices[2]],
            landmarks[right_eye_indices[3]],
            landmarks[right_eye_indices[4]],
            landmarks[right_eye_indices[5]],
        )

        ear_avg = round((ear_left + ear_right) / 2.0, 4)

        # 2. Blink Detection & Openness
        blink_det, blink_cnt, blink_rate, closure_ms = self.blink_tracker.update(
            ear_avg, now
        )
        eye_openness = clamp((ear_avg - 0.15) / (0.32 - 0.15), 0.0, 1.0)

        # 3. Brow / Facial Behaviour
        left_inner_brow = landmarks[FACIAL_LANDMARKS["LEFT_INNER_BROW"]]
        right_inner_brow = landmarks[FACIAL_LANDMARKS["RIGHT_INNER_BROW"]]
        left_eye_outer = landmarks[33]
        right_eye_outer = landmarks[263]
        inter_ocular_dist = distance_2d(left_eye_outer, right_eye_outer) or 0.2

        brow_dist = distance_2d(left_inner_brow, right_inner_brow)
        brow_furrow = round(brow_dist / (inter_ocular_dist + EPSILON), 4)
        brow_furrow_score = round(clamp((0.48 - brow_furrow) / (0.48 - 0.28), 0.0, 1.0), 4)

        chin = landmarks[FACIAL_LANDMARKS["CHIN"]]
        forehead = landmarks[FACIAL_LANDMARKS["FOREHEAD"]]
        face_height = distance_2d(forehead, chin) or 0.4
        brow_mid_y = (landmarks[FACIAL_LANDMARKS["LEFT_BROW_ARCH"]].y + landmarks[FACIAL_LANDMARKS["RIGHT_BROW_ARCH"]].y) / 2.0
        eye_mid_y = (landmarks[33].y + landmarks[263].y) / 2.0
        brow_raise = round(clamp((eye_mid_y - brow_mid_y) / (face_height + EPSILON), 0.0, 1.0), 4)

        # 4. Head Pose Estimation (Yaw, Pitch, Roll in degrees)
        nose_tip = landmarks[FACIAL_LANDMARKS["NOSE_TIP"]]
        left_cheek = landmarks[FACIAL_LANDMARKS["LEFT_CHEEK"]]
        right_cheek = landmarks[FACIAL_LANDMARKS["RIGHT_CHEEK"]]
        face_width = distance_2d(left_cheek, right_cheek) or 0.3

        cheek_mid_x = (left_cheek.x + right_cheek.x) / 2.0
        raw_yaw = (nose_tip.x - cheek_mid_x) / (face_width * 0.5 + EPSILON)
        head_yaw = round(clamp(raw_yaw * 60.0, -90.0, 90.0), 1)

        face_mid_y = (forehead.y + chin.y) / 2.0
        raw_pitch = (nose_tip.y - face_mid_y) / (face_height * 0.5 + EPSILON)
        head_pitch = round(clamp(-raw_pitch * 60.0, -90.0, 90.0), 1)

        dy = right_cheek.y - left_cheek.y
        dx = right_cheek.x - left_cheek.x
        head_roll = round(math.atan2(dy, dx) * 180.0 / math.pi, 1)

        # 5. Gaze Estimation
        if len(landmarks) >= 478:
            left_pupil = landmarks[FACIAL_LANDMARKS["LEFT_IRIS_CENTER"]]
            right_pupil = landmarks[FACIAL_LANDMARKS["RIGHT_IRIS_CENTER"]]
        else:
            left_pupil = Point3D(
                x=(landmarks[33].x + landmarks[133].x) / 2.0,
                y=(landmarks[159].y + landmarks[145].y) / 2.0,
            )
            right_pupil = Point3D(
                x=(landmarks[362].x + landmarks[263].x) / 2.0,
                y=(landmarks[386].y + landmarks[374].y) / 2.0,
            )

        left_eye_w = abs(landmarks[133].x - landmarks[33].x) or EPSILON
        left_h_ratio = clamp((left_pupil.x - landmarks[33].x) / left_eye_w, 0.0, 1.0)

        right_eye_w = abs(landmarks[263].x - landmarks[362].x) or EPSILON
        right_h_ratio = clamp((right_pupil.x - landmarks[362].x) / right_eye_w, 0.0, 1.0)

        gaze_h_ratio = round((left_h_ratio + right_h_ratio) / 2.0, 4)

        left_eye_h = abs(landmarks[145].y - landmarks[159].y) or EPSILON
        right_eye_h = abs(landmarks[374].y - landmarks[386].y) or EPSILON
        left_v_ratio = clamp((left_pupil.y - landmarks[159].y) / left_eye_h, 0.0, 1.0)
        right_v_ratio = clamp((right_pupil.y - landmarks[386].y) / right_eye_h, 0.0, 1.0)

        gaze_v_ratio = round((left_v_ratio + right_v_ratio) / 2.0, 4)

        dh = gaze_h_ratio - 0.5
        dv = gaze_v_ratio - 0.5
        gaze_dev = round(clamp(math.sqrt(dh * dh + dv * dv) * 2.5, 0.0, 1.0), 4)

        if abs(head_yaw) > 28.0 or abs(head_pitch) > 25.0:
            gaze_dir = "AWAY"
        elif gaze_dev > 0.28:
            if abs(dh) >= abs(dv):
                gaze_dir = "RIGHT" if dh > 0 else "LEFT"
            else:
                gaze_dir = "DOWN" if dv > 0 else "UP"
        else:
            gaze_dir = "CENTER"

        # 6. Bounding Box
        min_x = min(getattr(p, "x", 0.0) for p in landmarks[::4])
        min_y = min(getattr(p, "y", 0.0) for p in landmarks[::4])
        max_x = max(getattr(p, "x", 0.0) for p in landmarks[::4])
        max_y = max(getattr(p, "y", 0.0) for p in landmarks[::4])

        bbox = BoundingBox(
            x=round(min_x, 4),
            y=round(min_y, 4),
            width=round(max_x - min_x, 4),
            height=round(max_y - min_y, 4),
        )

        return FacialFeatureVector(
            ear_left=ear_left,
            ear_right=ear_right,
            ear_avg=ear_avg,
            blink_detected=blink_det,
            blink_count=blink_cnt,
            blink_rate=blink_rate,
            eye_closure_duration_ms=closure_ms,
            gaze_direction=gaze_dir,
            gaze_deviation=gaze_dev,
            gaze_h_ratio=gaze_h_ratio,
            gaze_v_ratio=gaze_v_ratio,
            head_yaw=head_yaw,
            head_pitch=head_pitch,
            head_roll=head_roll,
            brow_furrow=brow_furrow,
            brow_furrow_score=brow_furrow_score,
            brow_raise=brow_raise,
            eye_openness=round(eye_openness, 4),
            face_detected=True,
            face_count=1,
            landmark_count=len(landmarks),
            timestamp_ms=now,
            bounding_box=bbox,
        )


# Global singleton instance for easy import
extractor_engine = CustomFacialFeatureExtractor()