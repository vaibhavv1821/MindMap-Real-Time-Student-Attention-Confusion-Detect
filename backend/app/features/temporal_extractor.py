"""
MindMap Custom Temporal Intelligence Engine (Python Backend)

Converts instantaneous Phase 1 FacialFeatureVector frames into rolling
temporal behavioural intelligence:
1. Rolling Temporal Window (configurable time & frame count, no FPS hardcoding)
2. Statistical Aggregations (EAR mean/std/min/max, Gaze deviation & persistence, Head movement magnitude & variances)
3. Explainable Behavioural Indicators (sustained gaze away, excessive movement, prolonged closure, brow furrow persistence)
"""

import math
import time
from typing import List, Optional, Tuple
from app.schemas.features import FacialFeatureVector
from app.schemas.temporal import TemporalFeatureVector, BehaviouralIndicators


EPSILON = 1e-6


class BehaviourThresholdConfig:
    """Configurable thresholds for interpretable behavioural indicators."""
    def __init__(
        self,
        gaze_away_percent_threshold: float = 45.0,
        sustained_gaze_away_ms_threshold: float = 800.0,
        head_movement_magnitude_threshold: float = 3.5,
        head_total_variance_threshold: float = 50.0,
        prolonged_closure_ms_threshold: float = 300.0,
        brow_furrow_mean_threshold: float = 0.45,

        brow_furrow_persistence_threshold: float = 40.0,
        stable_gaze_center_threshold: float = 70.0,
        stable_movement_threshold: float = 2.5,
    ):
        self.gaze_away_percent = gaze_away_percent_threshold
        self.sustained_gaze_away_ms = sustained_gaze_away_ms_threshold
        self.head_movement_magnitude = head_movement_magnitude_threshold
        self.head_total_variance = head_total_variance_threshold
        self.prolonged_closure_ms = prolonged_closure_ms_threshold
        self.brow_furrow_mean = brow_furrow_mean_threshold
        self.brow_furrow_persistence = brow_furrow_persistence_threshold
        self.stable_gaze_center = stable_gaze_center_threshold
        self.stable_movement = stable_movement_threshold


class TemporalBuffer:
    """
    Rolling temporal buffer holding recent FacialFeatureVector samples.
    Configurable by both elapsed duration (ms) and max capacity.
    Dynamically adapts to any webcam FPS without hardcoded framerate assumptions.
    """
    def __init__(
        self,
        window_duration_ms: float = 2500.0,
        max_samples: int = 120,
        min_samples: int = 5,
    ):
        self.window_duration_ms = window_duration_ms
        self.max_samples = max_samples
        self.min_samples = min_samples
        self._samples: List[FacialFeatureVector] = []

    def add_sample(self, vector: FacialFeatureVector) -> None:
        """Adds a feature vector to the rolling buffer and trims expired samples."""
        self._samples.append(vector)
        self._prune(vector.timestamp_ms)

    def _prune(self, current_time_ms: float) -> None:
        """Removes samples outside the rolling time window or exceeding max capacity."""
        cutoff = current_time_ms - self.window_duration_ms
        self._samples = [s for s in self._samples if s.timestamp_ms >= cutoff]
        if len(self._samples) > self.max_samples:
            self._samples = self._samples[-self.max_samples:]

    def get_samples(self) -> List[FacialFeatureVector]:
        """Returns shallow copy of samples currently in buffer."""
        return list(self._samples)

    def is_ready(self) -> bool:
        """True when buffer has accumulated enough samples for statistical inference."""
        return len(self._samples) >= self.min_samples

    def get_sample_count(self) -> int:
        return len(self._samples)

    def get_actual_window_duration_ms(self) -> float:
        if len(self._samples) < 2:
            return 0.0
        return max(0.0, self._samples[-1].timestamp_ms - self._samples[0].timestamp_ms)

    def reset(self) -> None:
        """Resets the buffer when a new student joins or session restarts."""
        self._samples.clear()


class TemporalFeatureExtractor:
    """
    Extracts statistical aggregations across the rolling window.
    """
    @staticmethod
    def _mean(values: List[float]) -> float:
        if not values:
            return 0.0
        return sum(values) / len(values)

    @staticmethod
    def _variance(values: List[float], mean_val: Optional[float] = None) -> float:
        if len(values) < 2:
            return 0.0
        m = mean_val if mean_val is not None else sum(values) / len(values)
        return sum((x - m) ** 2 for x in values) / (len(values) - 1)

    @staticmethod
    def _std(values: List[float], mean_val: Optional[float] = None) -> float:
        var = TemporalFeatureExtractor._variance(values, mean_val)
        return math.sqrt(var)

    def extract_temporal_features(
        self,
        samples: List[FacialFeatureVector],
        now_ms: Optional[float] = None,
    ) -> TemporalFeatureVector:
        """Computes TemporalFeatureVector from provided list of frame samples."""
        t_now = now_ms if now_ms is not None else (samples[-1].timestamp_ms if samples else time.time() * 1000.0)

        total_samples = len(samples)
        if total_samples == 0:
            return self._empty_temporal_vector(t_now)

        # Separate valid face frames from dropped/occluded frames
        valid_samples = [s for s in samples if s.face_detected]
        valid_count = len(valid_samples)
        valid_face_pct = round((valid_count / total_samples) * 100.0, 1)

        window_duration_ms = round(
            max(0.0, samples[-1].timestamp_ms - samples[0].timestamp_ms), 1
        ) if total_samples >= 2 else 0.0

        if valid_count == 0:
            v = self._empty_temporal_vector(t_now)
            v.total_samples_count = total_samples
            v.window_duration_ms = window_duration_ms
            v.valid_face_percentage = 0.0
            return v

        # 1. EAR temporal statistics
        ears = [s.ear_avg for s in valid_samples]
        ear_mean = round(self._mean(ears), 4)
        ear_std = round(self._std(ears, ear_mean), 4)
        ear_min = round(min(ears), 4)
        ear_max = round(max(ears), 4)

        # 2. Gaze temporal metrics
        gaze_devs = [s.gaze_deviation for s in valid_samples]
        gaze_dev_mean = round(self._mean(gaze_devs), 4)
        gaze_dev_max = round(max(gaze_devs), 4)

        center_frames = sum(1 for s in valid_samples if s.gaze_direction == "CENTER")
        away_frames = sum(1 for s in valid_samples if s.gaze_direction == "AWAY")
        gaze_center_pct = round((center_frames / valid_count) * 100.0, 1)
        gaze_away_pct = round((away_frames / valid_count) * 100.0, 1)

        # Calculate longest continuous streak of gaze AWAY (in milliseconds)
        sustained_away_ms = 0.0
        current_streak_start: Optional[float] = None
        for s in valid_samples:
            if s.gaze_direction == "AWAY":
                if current_streak_start is None:
                    current_streak_start = s.timestamp_ms
                streak = s.timestamp_ms - current_streak_start
                if streak > sustained_away_ms:
                    sustained_away_ms = streak
            else:
                current_streak_start = None
        sustained_away_ms = round(sustained_away_ms, 1)

        # 3. Head Pose dynamics
        yaws = [s.head_yaw for s in valid_samples]
        pitches = [s.head_pitch for s in valid_samples]
        rolls = [s.head_roll for s in valid_samples]

        head_yaw_mean = round(self._mean(yaws), 2)
        head_pitch_mean = round(self._mean(pitches), 2)
        head_roll_mean = round(self._mean(rolls), 2)

        head_yaw_var = round(self._variance(yaws, head_yaw_mean), 2)
        head_pitch_var = round(self._variance(pitches, head_pitch_mean), 2)
        head_roll_var = round(self._variance(rolls, head_roll_mean), 2)

        # Frame-to-frame angular velocity (degrees/frame)
        movements: List[float] = []
        for i in range(1, len(valid_samples)):
            dyaw = valid_samples[i].head_yaw - valid_samples[i - 1].head_yaw
            dpitch = valid_samples[i].head_pitch - valid_samples[i - 1].head_pitch
            droll = valid_samples[i].head_roll - valid_samples[i - 1].head_roll
            step = math.sqrt(dyaw * dyaw + dpitch * dpitch + droll * droll)
            movements.append(step)
        head_movement_magnitude = round(self._mean(movements), 2)

        # 4. Blink metrics
        total_blinks = valid_samples[-1].blink_count - valid_samples[0].blink_count if valid_count >= 2 else (1 if valid_samples[-1].blink_detected else 0)
        total_blinks = max(0, total_blinks)
        blink_rate = round(valid_samples[-1].blink_rate, 1)

        closure_durations = [s.eye_closure_duration_ms for s in valid_samples if s.eye_closure_duration_ms > 0]
        avg_closure_ms = round(self._mean(closure_durations), 1)

        # 5. Brow metrics
        brow_scores = [s.brow_furrow_score for s in valid_samples]
        brow_mean = round(self._mean(brow_scores), 4)
        brow_max = round(max(brow_scores), 4)
        persisted_frames = sum(1 for b in brow_scores if b >= 0.40)
        brow_persistence = round((persisted_frames / valid_count) * 100.0, 1)

        return TemporalFeatureVector(
            ear_mean=ear_mean,
            ear_std=ear_std,
            ear_min=ear_min,
            ear_max=ear_max,
            gaze_deviation_mean=gaze_dev_mean,
            gaze_deviation_max=gaze_dev_max,
            gaze_center_percent=gaze_center_pct,
            gaze_away_percent=gaze_away_pct,
            sustained_gaze_away_duration_ms=sustained_away_ms,
            head_yaw_mean=head_yaw_mean,
            head_pitch_mean=head_pitch_mean,
            head_roll_mean=head_roll_mean,
            head_yaw_variance=head_yaw_var,
            head_pitch_variance=head_pitch_var,
            head_roll_variance=head_roll_var,
            head_movement_magnitude=head_movement_magnitude,
            blink_count=total_blinks,
            blink_rate=blink_rate,
            avg_closure_duration_ms=avg_closure_ms,
            brow_furrow_mean=brow_mean,
            brow_furrow_max=brow_max,
            brow_furrow_persistence=brow_persistence,
            valid_face_percentage=valid_face_pct,
            valid_samples_count=valid_count,
            total_samples_count=total_samples,
            window_duration_ms=window_duration_ms,
            timestamp_ms=t_now,
        )

    def _empty_temporal_vector(self, timestamp_ms: float) -> TemporalFeatureVector:
        return TemporalFeatureVector(
            ear_mean=0.0,
            ear_std=0.0,
            ear_min=0.0,
            ear_max=0.0,
            gaze_deviation_mean=1.0,
            gaze_deviation_max=1.0,
            gaze_center_percent=0.0,
            gaze_away_percent=100.0,
            sustained_gaze_away_duration_ms=0.0,
            head_yaw_mean=0.0,
            head_pitch_mean=0.0,
            head_roll_mean=0.0,
            head_yaw_variance=0.0,
            head_pitch_variance=0.0,
            head_roll_variance=0.0,
            head_movement_magnitude=0.0,
            blink_count=0,
            blink_rate=0.0,
            avg_closure_duration_ms=0.0,
            brow_furrow_mean=0.0,
            brow_furrow_max=0.0,
            brow_furrow_persistence=0.0,
            valid_face_percentage=0.0,
            valid_samples_count=0,
            total_samples_count=0,
            window_duration_ms=0.0,
            timestamp_ms=timestamp_ms,
        )


class TemporalBehaviourEvaluator:
    """
    Computes interpretable intermediate behavioural indicators with configurable thresholds.
    """
    def __init__(self, config: Optional[BehaviourThresholdConfig] = None):
        self.config = config or BehaviourThresholdConfig()

    def evaluate(self, tf: TemporalFeatureVector) -> BehaviouralIndicators:
        if tf.valid_samples_count == 0:
            return BehaviouralIndicators(
                sustained_gaze_away=True,
                excessive_head_movement=False,
                prolonged_eye_closure=False,
                high_brow_furrow=False,
                stable_screen_gaze=False,
                attention_drop_indicator=1.0,
                confusion_indicator=0.0,
            )

        # 1. Sustained Gaze Away
        sustained_gaze_away = (
            tf.gaze_away_percent >= self.config.gaze_away_percent
            or tf.sustained_gaze_away_duration_ms >= self.config.sustained_gaze_away_ms
        )

        # 2. Excessive Head Movement
        total_var = tf.head_yaw_variance + tf.head_pitch_variance + tf.head_roll_variance
        excessive_movement = (
            tf.head_movement_magnitude >= self.config.head_movement_magnitude
            or total_var >= self.config.head_total_variance
        )

        # 3. Prolonged Eye Closure (drowsiness or micro-sleep)
        prolonged_closure = (
            tf.avg_closure_duration_ms >= self.config.prolonged_closure_ms
            or tf.blink_rate >= 32.0
            or (tf.ear_min < 0.14 and tf.ear_mean < 0.17)
        )


        # 4. High Brow Furrow
        high_brow = (
            tf.brow_furrow_mean >= self.config.brow_furrow_mean
            or tf.brow_furrow_persistence >= self.config.brow_furrow_persistence
        )

        # 5. Stable Screen Gaze
        stable_gaze = (
            tf.gaze_center_percent >= self.config.stable_gaze_center
            and tf.head_movement_magnitude < self.config.stable_movement
            and not sustained_gaze_away
        )

        # Composite Attention Drop Indicator [0.0, 1.0]
        away_component = min(1.0, tf.gaze_away_percent / 100.0)
        movement_component = min(1.0, tf.head_movement_magnitude / 6.0)
        closure_component = min(1.0, tf.avg_closure_duration_ms / 500.0)
        face_loss_component = 1.0 - (tf.valid_face_percentage / 100.0)

        attention_drop = (
            0.35 * away_component
            + 0.25 * movement_component
            + 0.20 * closure_component
            + 0.20 * face_loss_component
        )
        attention_drop = round(max(0.0, min(1.0, attention_drop)), 3)

        # Composite Confusion Indicator [0.0, 1.0]
        brow_component = tf.brow_furrow_mean
        persistence_component = tf.brow_furrow_persistence / 100.0
        roll_component = min(1.0, tf.head_roll_variance / 35.0)

        confusion_ind = (
            0.45 * brow_component
            + 0.30 * persistence_component
            + 0.25 * roll_component
        )
        confusion_ind = round(max(0.0, min(1.0, confusion_ind)), 3)

        return BehaviouralIndicators(
            sustained_gaze_away=sustained_gaze_away,
            excessive_head_movement=excessive_movement,
            prolonged_eye_closure=prolonged_closure,
            high_brow_furrow=high_brow,
            stable_screen_gaze=stable_gaze,
            attention_drop_indicator=attention_drop,
            confusion_indicator=confusion_ind,
        )
