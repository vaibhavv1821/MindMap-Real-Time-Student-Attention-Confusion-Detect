"""
MindMap Phase 2 - Temporal Intelligence & ML Prediction Unit Tests

Validates:
1. Temporal buffer sizing and reset
2. Window expiration of stale frames
3. Temporal mean, std, min, max calculations
4. Gaze persistence and away percentage
5. Head movement variance and magnitude
6. Blink aggregation
7. Temporal feature vector structure
8. Random Forest model input shape & serialization
9. Prediction output range ([0, 100]) and valid states
10. Score conversion from probabilities
11. Behavioural explanation generation
12. No-face / insufficient-data handling
"""

import os
import math
import pytest
import numpy as np
from app.schemas.features import FacialFeatureVector, BoundingBox
from app.schemas.temporal import TemporalFeatureVector, MLPredictionResult
from app.features.temporal_extractor import (
    TemporalBuffer,
    TemporalFeatureExtractor,
    TemporalBehaviourEvaluator,
    BehaviourThresholdConfig,
)
from app.ml.demo_dataset import (
    generate_demonstration_dataset,
    temporal_vector_to_features,
    FEATURE_NAMES,
)
from app.ml.train_model import (
    train_and_save_models,
    ATTENTION_MODEL_PATH,
    CONFUSION_MODEL_PATH,
)
from app.ml.predictor import MLPredictor


def create_sample_frame(
    timestamp_ms: float,
    ear: float = 0.28,
    gaze_dir: str = "CENTER",
    gaze_dev: float = 0.08,
    head_yaw: float = 0.0,
    head_pitch: float = 0.0,
    head_roll: float = 0.0,
    brow_furrow_score: float = 0.15,
    blink_count: int = 2,
    blink_detected: bool = False,
    closure_ms: float = 0.0,
    face_detected: bool = True,
) -> FacialFeatureVector:
    """Creates a synthetic single-frame FacialFeatureVector."""
    return FacialFeatureVector(
        ear_left=ear,
        ear_right=ear,
        ear_avg=ear,
        blink_detected=blink_detected,
        blink_count=blink_count,
        blink_rate=15.0,
        eye_closure_duration_ms=closure_ms,
        gaze_direction=gaze_dir,
        gaze_deviation=gaze_dev,
        gaze_h_ratio=0.5,
        gaze_v_ratio=0.5,
        head_yaw=head_yaw,
        head_pitch=head_pitch,
        head_roll=head_roll,
        brow_furrow=0.42,
        brow_furrow_score=brow_furrow_score,
        brow_raise=0.18,
        eye_openness=0.85 if face_detected else 0.0,
        face_detected=face_detected,
        face_count=1 if face_detected else 0,
        landmark_count=468 if face_detected else 0,
        timestamp_ms=timestamp_ms,
        bounding_box=BoundingBox(x=0.3, y=0.2, width=0.4, height=0.5),
    )


# ==============================================================================
# 1. Temporal Buffer Sizing and Reset Test
# ==============================================================================
def test_temporal_buffer_sizing_and_reset():
    buffer = TemporalBuffer(window_duration_ms=2000.0, max_samples=30)
    assert buffer.get_sample_count() == 0
    assert not buffer.is_ready()

    for i in range(15):
        buffer.add_sample(create_sample_frame(timestamp_ms=1000.0 + i * 50))

    assert buffer.get_sample_count() == 15
    assert buffer.is_ready()

    buffer.reset()
    assert buffer.get_sample_count() == 0
    assert not buffer.is_ready()


# ==============================================================================
# 2. Window Expiration Test
# ==============================================================================
def test_temporal_buffer_window_expiration():
    buffer = TemporalBuffer(window_duration_ms=1000.0, max_samples=50)

    # Add frames spanning 2500ms (t=1000 to t=3500)
    for i in range(26):
        buffer.add_sample(create_sample_frame(timestamp_ms=1000.0 + i * 100))

    samples = buffer.get_samples()
    # Oldest sample must be >= 3500 - 1000 = 2500ms
    assert samples[0].timestamp_ms >= 2500.0
    assert samples[-1].timestamp_ms == 3500.0
    assert buffer.get_actual_window_duration_ms() <= 1000.0


# ==============================================================================
# 3. Temporal Mean, Std, Min, Max Calculations Test
# ==============================================================================
def test_temporal_ear_statistics():
    extractor = TemporalFeatureExtractor()
    frames = [
        create_sample_frame(timestamp_ms=1000.0, ear=0.20),
        create_sample_frame(timestamp_ms=1100.0, ear=0.30),
        create_sample_frame(timestamp_ms=1200.0, ear=0.40),
    ]
    tf = extractor.extract_temporal_features(frames)

    assert pytest.approx(tf.ear_mean, 0.001) == 0.30
    assert tf.ear_min == 0.20
    assert tf.ear_max == 0.40
    # Sample std of [0.20, 0.30, 0.40] is 0.10
    assert pytest.approx(tf.ear_std, 0.001) == 0.10


# ==============================================================================
# 4. Gaze Persistence and Away Percentage Test
# ==============================================================================
def test_gaze_persistence_and_away():
    extractor = TemporalFeatureExtractor()
    frames = [
        create_sample_frame(timestamp_ms=1000.0, gaze_dir="CENTER"),
        create_sample_frame(timestamp_ms=1100.0, gaze_dir="AWAY"),
        create_sample_frame(timestamp_ms=1200.0, gaze_dir="AWAY"),
        create_sample_frame(timestamp_ms=1300.0, gaze_dir="AWAY"),
        create_sample_frame(timestamp_ms=1400.0, gaze_dir="CENTER"),
    ]
    tf = extractor.extract_temporal_features(frames)

    assert tf.gaze_center_percent == 40.0
    assert tf.gaze_away_percent == 60.0
    # Sustained away streak from t=1100 to t=1300 is 200ms
    assert tf.sustained_gaze_away_duration_ms == 200.0


# ==============================================================================
# 5. Head Movement Variance and Magnitude Test
# ==============================================================================
def test_head_movement_and_variance():
    extractor = TemporalFeatureExtractor()

    # Steady head
    steady_frames = [
        create_sample_frame(timestamp_ms=1000.0 + i * 100, head_yaw=2.0, head_pitch=1.0)
        for i in range(5)
    ]
    tf_steady = extractor.extract_temporal_features(steady_frames)
    assert tf_steady.head_yaw_variance == 0.0
    assert tf_steady.head_movement_magnitude == 0.0

    # Moving head
    moving_frames = [
        create_sample_frame(timestamp_ms=1000.0, head_yaw=-10.0),
        create_sample_frame(timestamp_ms=1100.0, head_yaw=0.0),
        create_sample_frame(timestamp_ms=1200.0, head_yaw=10.0),
        create_sample_frame(timestamp_ms=1300.0, head_yaw=20.0),
    ]
    tf_moving = extractor.extract_temporal_features(moving_frames)
    assert tf_moving.head_yaw_variance > 50.0
    assert tf_moving.head_movement_magnitude == 10.0


# ==============================================================================
# 6. Blink Aggregation Test
# ==============================================================================
def test_blink_aggregation():
    extractor = TemporalFeatureExtractor()
    frames = [
        create_sample_frame(timestamp_ms=1000.0, blink_count=5, closure_ms=120.0),
        create_sample_frame(timestamp_ms=1100.0, blink_count=5, closure_ms=180.0),
        create_sample_frame(timestamp_ms=1200.0, blink_count=7, closure_ms=0.0),
    ]
    tf = extractor.extract_temporal_features(frames)

    assert tf.blink_count == 2  # 7 - 5
    assert tf.avg_closure_duration_ms == 150.0  # (120 + 180) / 2


# ==============================================================================
# 7. Temporal Feature Vector Structure Test
# ==============================================================================
def test_temporal_feature_vector_structure():
    extractor = TemporalFeatureExtractor()
    frames = [create_sample_frame(timestamp_ms=1000.0 + i * 50) for i in range(10)]
    tf = extractor.extract_temporal_features(frames)

    assert isinstance(tf, TemporalFeatureVector)
    assert tf.valid_samples_count == 10
    assert tf.total_samples_count == 10
    assert tf.valid_face_percentage == 100.0
    assert tf.window_duration_ms == 450.0


# ==============================================================================
# 8. Model Input Shape & Serialization Test
# ==============================================================================
def test_model_input_shape_and_serialization():
    extractor = TemporalFeatureExtractor()
    frames = [create_sample_frame(timestamp_ms=1000.0 + i * 50) for i in range(10)]
    tf = extractor.extract_temporal_features(frames)

    feature_array = temporal_vector_to_features(tf)
    assert isinstance(feature_array, np.ndarray)
    assert feature_array.shape == (len(FEATURE_NAMES),)
    assert feature_array.shape == (15,)
    assert not np.isnan(feature_array).any()

    # Ensure model files exist on disk
    assert os.path.exists(ATTENTION_MODEL_PATH)
    assert os.path.exists(CONFUSION_MODEL_PATH)


# ==============================================================================
# 9. Prediction Output Range and Valid States Test
# ==============================================================================
def test_prediction_output_range_and_states():
    predictor = MLPredictor()
    extractor = TemporalFeatureExtractor()
    frames = [create_sample_frame(timestamp_ms=1000.0 + i * 50) for i in range(15)]
    tf = extractor.extract_temporal_features(frames)

    pred = predictor.predict(tf)
    assert isinstance(pred, MLPredictionResult)
    assert pred.attention_state in ("ATTENTIVE", "INATTENTIVE")
    assert pred.confusion_state in ("NORMAL", "POSSIBLY_CONFUSED")
    assert 0.0 <= pred.attention_score <= 100.0
    assert 0.0 <= pred.confusion_score <= 100.0
    assert 0.0 <= pred.confidence <= 100.0
    assert isinstance(pred.reasons, list)


# ==============================================================================
# 10. Score Conversion Test
# ==============================================================================
def test_score_conversion():
    predictor = MLPredictor()
    extractor = TemporalFeatureExtractor()

    # Attentive frame sequence (center gaze, low variance)
    attentive_frames = [
        create_sample_frame(
            timestamp_ms=1000.0 + i * 50,
            gaze_dir="CENTER",
            gaze_dev=0.04,
            head_yaw=0.5,
            head_pitch=-0.5,
            head_roll=0.0,
            brow_furrow_score=0.10,
        )
        for i in range(20)
    ]
    tf_att = extractor.extract_temporal_features(attentive_frames)
    pred_att = predictor.predict(tf_att)

    assert pred_att.attention_score >= 50.0
    assert pred_att.attention_state == "ATTENTIVE"

    # Distracted frame sequence (away gaze, large head movement)
    distracted_frames = [
        create_sample_frame(
            timestamp_ms=1000.0 + i * 50,
            gaze_dir="AWAY",
            gaze_dev=0.75,
            head_yaw=35.0,
            head_pitch=20.0,
            closure_ms=450.0,
        )
        for i in range(20)
    ]
    tf_dist = extractor.extract_temporal_features(distracted_frames)
    pred_dist = predictor.predict(tf_dist)

    assert pred_dist.attention_score < 50.0
    assert pred_dist.attention_state == "INATTENTIVE"


# ==============================================================================
# 11. Explanation Generation Test
# ==============================================================================
def test_explanation_generation():
    predictor = MLPredictor()
    extractor = TemporalFeatureExtractor()

    # Confused student frames (furrowed brow)
    confused_frames = [
        create_sample_frame(
            timestamp_ms=1000.0 + i * 50,
            brow_furrow_score=0.75,
            head_roll=18.0 if i % 2 == 0 else -18.0,
        )
        for i in range(20)
    ]
    tf_conf = extractor.extract_temporal_features(confused_frames)
    pred_conf = predictor.predict(tf_conf)

    assert len(pred_conf.reasons) > 0
    # At least one reason mentions brow furrowing or head tilt
    combined_reasons = " ".join(pred_conf.reasons).lower()
    assert "brow" in combined_reasons or "tilt" in combined_reasons or "head" in combined_reasons


# ==============================================================================
# 12. No-Face / Insufficient-Data Handling Test
# ==============================================================================
def test_no_face_and_insufficient_data():
    predictor = MLPredictor()
    extractor = TemporalFeatureExtractor()

    # Empty frame list
    tf_empty = extractor.extract_temporal_features([])
    pred_empty = predictor.predict(tf_empty)
    assert pred_empty.attention_state == "INATTENTIVE"
    assert pred_empty.attention_score == 0.0
    assert "No student face" in pred_empty.reasons[0]

    # All frames with no face detected
    no_face_frames = [
        create_sample_frame(timestamp_ms=1000.0 + i * 50, face_detected=False)
        for i in range(15)
    ]
    tf_no_face = extractor.extract_temporal_features(no_face_frames)
    assert tf_no_face.valid_samples_count == 0
    assert tf_no_face.valid_face_percentage == 0.0

    pred_no_face = predictor.predict(tf_no_face)
    assert pred_no_face.attention_state == "INATTENTIVE"
    assert pred_no_face.attention_score == 0.0
