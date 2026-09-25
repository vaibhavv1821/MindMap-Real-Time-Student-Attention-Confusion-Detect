"""
MindMap Phase 2 - Training Data Preparation & Demonstration Dataset Generator

================================================================================
CRITICAL HONESTY NOTICE:
This module generates a DEMONSTRATION DATASET used strictly for technical
pipeline validation and automated unit testing of the Random Forest classifiers.
NO REAL-WORLD ACCURACY IS CLAIMED FROM THIS SYNTHETIC DATA.
The system architecture defines the exact feature schema required to plug in
features extracted from real datasets such as DAiSEE (Dataset for Affective
States in E-Environments) when available.
================================================================================
"""

import numpy as np
from typing import Tuple, List, Dict, Any
from app.schemas.temporal import TemporalFeatureVector


FEATURE_NAMES: List[str] = [
    "ear_mean",
    "ear_std",
    "gaze_deviation_mean",
    "gaze_center_percent",
    "gaze_away_percent",
    "sustained_gaze_away_duration_ms",
    "head_yaw_variance",
    "head_pitch_variance",
    "head_roll_variance",
    "head_movement_magnitude",
    "blink_rate",
    "avg_closure_duration_ms",
    "brow_furrow_mean",
    "brow_furrow_persistence",
    "valid_face_percentage",
]


def temporal_vector_to_features(tf: TemporalFeatureVector) -> np.ndarray:
    """
    Converts a TemporalFeatureVector into a 1D NumPy array matching FEATURE_NAMES.
    Standardized interface consumed by Random Forest classifiers.
    """
    return np.array([
        tf.ear_mean,
        tf.ear_std,
        tf.gaze_deviation_mean,
        tf.gaze_center_percent,
        tf.gaze_away_percent,
        tf.sustained_gaze_away_duration_ms,
        tf.head_yaw_variance,
        tf.head_pitch_variance,
        tf.head_roll_variance,
        tf.head_movement_magnitude,
        tf.blink_rate,
        tf.avg_closure_duration_ms,
        tf.brow_furrow_mean,
        tf.brow_furrow_persistence,
        tf.valid_face_percentage,
    ], dtype=np.float32)


def generate_demonstration_dataset(
    n_samples: int = 600,
    random_seed: int = 42,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Generates synthetic demonstration data for technical pipeline validation.
    
    Returns:
        X: Feature matrix of shape (n_samples, len(FEATURE_NAMES))
        y_attention: Binary labels (1 = ATTENTIVE, 0 = INATTENTIVE)
        y_confusion: Binary labels (1 = POSSIBLY_CONFUSED, 0 = NORMAL)
        metadata: Documentation dictionary detailing demo data characteristics
    """
    rng = np.random.default_rng(random_seed)
    half = n_samples // 2

    # --- ATTENTION FEATURES ---
    # Class 1: ATTENTIVE (High center gaze, low head variance, normal blinks)
    att_ear_mean = rng.normal(0.28, 0.03, half).clip(0.18, 0.38)
    att_ear_std = rng.normal(0.02, 0.01, half).clip(0.005, 0.06)
    att_gaze_dev = rng.normal(0.12, 0.05, half).clip(0.0, 0.35)
    att_gaze_center = rng.normal(86.0, 8.0, half).clip(65.0, 100.0)
    att_gaze_away = rng.normal(8.0, 5.0, half).clip(0.0, 25.0)
    att_away_ms = rng.normal(120.0, 80.0, half).clip(0.0, 450.0)
    att_yaw_var = rng.exponential(6.0, half).clip(0.5, 25.0)
    att_pitch_var = rng.exponential(5.0, half).clip(0.5, 20.0)
    att_roll_var = rng.exponential(4.0, half).clip(0.5, 18.0)
    att_movement = rng.normal(1.2, 0.4, half).clip(0.2, 2.5)
    att_blink_rate = rng.normal(16.0, 4.0, half).clip(8.0, 28.0)
    att_closure_ms = rng.normal(140.0, 30.0, half).clip(80.0, 240.0)
    att_face_pct = rng.normal(98.0, 2.0, half).clip(90.0, 100.0)

    # Class 0: INATTENTIVE (High gaze away, large head movement, prolonged closure, or face loss)
    inatt_ear_mean = rng.normal(0.22, 0.06, half).clip(0.10, 0.35)
    inatt_ear_std = rng.normal(0.05, 0.02, half).clip(0.01, 0.12)
    inatt_gaze_dev = rng.normal(0.55, 0.18, half).clip(0.25, 1.0)
    inatt_gaze_center = rng.normal(30.0, 15.0, half).clip(0.0, 55.0)
    inatt_gaze_away = rng.normal(58.0, 18.0, half).clip(35.0, 100.0)
    inatt_away_ms = rng.normal(1200.0, 400.0, half).clip(500.0, 2500.0)
    inatt_yaw_var = rng.normal(55.0, 20.0, half).clip(25.0, 140.0)
    inatt_pitch_var = rng.normal(45.0, 18.0, half).clip(20.0, 120.0)
    inatt_roll_var = rng.normal(30.0, 12.0, half).clip(12.0, 90.0)
    inatt_movement = rng.normal(5.5, 1.8, half).clip(3.0, 12.0)
    inatt_blink_rate = rng.normal(26.0, 9.0, half).clip(4.0, 45.0)
    inatt_closure_ms = rng.normal(360.0, 120.0, half).clip(180.0, 700.0)
    inatt_face_pct = rng.normal(78.0, 16.0, half).clip(30.0, 98.0)

    ear_mean = np.concatenate([att_ear_mean, inatt_ear_mean])
    ear_std = np.concatenate([att_ear_std, inatt_ear_std])
    gaze_dev = np.concatenate([att_gaze_dev, inatt_gaze_dev])
    gaze_center = np.concatenate([att_gaze_center, inatt_gaze_center])
    gaze_away = np.concatenate([att_gaze_away, inatt_gaze_away])
    away_ms = np.concatenate([att_away_ms, inatt_away_ms])
    yaw_var = np.concatenate([att_yaw_var, inatt_yaw_var])
    pitch_var = np.concatenate([att_pitch_var, inatt_pitch_var])
    roll_var = np.concatenate([att_roll_var, inatt_roll_var])
    movement = np.concatenate([att_movement, inatt_movement])
    blink_rate = np.concatenate([att_blink_rate, inatt_blink_rate])
    closure_ms = np.concatenate([att_closure_ms, inatt_closure_ms])
    face_pct = np.concatenate([att_face_pct, inatt_face_pct])

    # --- CONFUSION FEATURES ---
    # Assign confusion states orthogonally to test independent multi-task prediction
    # Class 1: POSSIBLY_CONFUSED (persistent furrow, elevated roll variance / head tilt)
    # Class 0: NORMAL (relaxed brow, stable head posture)
    y_confusion = np.zeros(n_samples, dtype=np.int32)
    conf_indices = rng.choice(n_samples, size=half, replace=False)
    y_confusion[conf_indices] = 1

    brow_furrow_mean = np.zeros(n_samples)
    brow_persistence = np.zeros(n_samples)

    for i in range(n_samples):
        if y_confusion[i] == 1:
            brow_furrow_mean[i] = float(np.clip(rng.normal(0.62, 0.12), 0.42, 0.95))
            brow_persistence[i] = float(np.clip(rng.normal(68.0, 14.0), 38.0, 100.0))
            roll_var[i] = max(roll_var[i], float(np.clip(rng.normal(24.0, 8.0), 12.0, 60.0)))
        else:
            brow_furrow_mean[i] = float(np.clip(rng.normal(0.20, 0.08), 0.02, 0.38))
            brow_persistence[i] = float(np.clip(rng.normal(12.0, 8.0), 0.0, 32.0))

    y_attention = np.concatenate([np.ones(half, dtype=np.int32), np.zeros(half, dtype=np.int32)])

    # Assemble X matrix
    X = np.column_stack([
        ear_mean,
        ear_std,
        gaze_dev,
        gaze_center,
        gaze_away,
        away_ms,
        yaw_var,
        pitch_var,
        roll_var,
        movement,
        blink_rate,
        closure_ms,
        brow_furrow_mean,
        brow_persistence,
        face_pct,
    ]).astype(np.float32)

    # Shuffle dataset
    perm = rng.permutation(n_samples)
    X = X[perm]
    y_attention = y_attention[perm]
    y_confusion = y_confusion[perm]

    metadata = {
        "dataset_type": "DEMONSTRATION_SYNTHETIC_DATASET",
        "purpose": "Technical pipeline and automated test validation",
        "sample_count": n_samples,
        "feature_count": len(FEATURE_NAMES),
        "feature_names": FEATURE_NAMES,
        "classes": {
            "attention": ["0: INATTENTIVE", "1: ATTENTIVE"],
            "confusion": ["0: NORMAL", "1: POSSIBLY_CONFUSED"],
        },
        "disclaimer": "Real-world dataset evaluation (e.g. DAiSEE) remains pending.",
    }

    return X, y_attention, y_confusion, metadata
