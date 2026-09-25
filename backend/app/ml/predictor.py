"""
MindMap Phase 2 - Random Forest Inference & Explainability Engine

Consumes temporal feature vectors and generates:
1. Attention State (ATTENTIVE vs INATTENTIVE) and Score (0-100)
2. Confusion State (NORMAL vs POSSIBLY_CONFUSED) and Score (0-100)
3. Confidence Rating (0-100)
4. Behavioural Explanation Reasons derived from underlying indicator states
"""

import os
import joblib
import numpy as np
from typing import Optional, List
from app.schemas.temporal import (
    TemporalFeatureVector,
    BehaviouralIndicators,
    MLPredictionResult,
    AttentionStateType,
    ConfusionStateType,
)
from app.features.temporal_extractor import TemporalBehaviourEvaluator
from app.ml.demo_dataset import temporal_vector_to_features
from app.ml.train_model import (
    ATTENTION_MODEL_PATH,
    CONFUSION_MODEL_PATH,
    train_and_save_models,
)


class MLPredictor:
    """
    Random Forest inference engine for student attention and confusion classification.
    """
    def __init__(self):
        self.attention_model = None
        self.confusion_model = None
        self.evaluator = TemporalBehaviourEvaluator()
        self._load_or_train_models()

    def _load_or_train_models(self) -> None:
        """Loads serialized models, or trains baseline demo models if not yet present."""
        if not os.path.exists(ATTENTION_MODEL_PATH) or not os.path.exists(CONFUSION_MODEL_PATH):
            train_and_save_models()

        try:
            self.attention_model = joblib.load(ATTENTION_MODEL_PATH)
            self.confusion_model = joblib.load(CONFUSION_MODEL_PATH)
        except Exception:
            # Fallback re-training
            train_and_save_models()
            self.attention_model = joblib.load(ATTENTION_MODEL_PATH)
            self.confusion_model = joblib.load(CONFUSION_MODEL_PATH)

    def predict(
        self,
        tf: TemporalFeatureVector,
        indicators: Optional[BehaviouralIndicators] = None,
    ) -> MLPredictionResult:
        """
        Executes ML prediction on the aggregated temporal feature vector.
        """
        # Step 12: Safe handling for zero valid faces or insufficient frames
        if tf.valid_samples_count == 0 or tf.valid_face_percentage < 10.0:
            empty_indicators = indicators or self.evaluator.evaluate(tf)
            return MLPredictionResult(
                attention_state="INATTENTIVE",
                attention_score=0.0,
                confusion_state="NORMAL",
                confusion_score=0.0,
                confidence=100.0,
                reasons=["No student face localized in camera feed"],
                indicators=empty_indicators,
                temporal_features=tf,
                model_status="TRAINED_DEMO_MODEL",
                timestamp_ms=tf.timestamp_ms,
            )

        if indicators is None:
            indicators = self.evaluator.evaluate(tf)

        # 1. Prepare feature vector for Random Forest
        X = temporal_vector_to_features(tf).reshape(1, -1)

        # 2. Attention Prediction
        if self.attention_model is not None and hasattr(self.attention_model, "predict_proba"):
            att_probs = self.attention_model.predict_proba(X)[0]
            # Class 1 is ATTENTIVE
            prob_attentive = float(att_probs[1]) if len(att_probs) > 1 else float(att_probs[0])
        else:
            # Fallback calculation if model unavailable
            prob_attentive = 1.0 - indicators.attention_drop_indicator

        attention_score = round(prob_attentive * 100.0, 1)
        attention_state: AttentionStateType = (
            "ATTENTIVE" if attention_score >= 50.0 else "INATTENTIVE"
        )

        # 3. Confusion Prediction
        if self.confusion_model is not None and hasattr(self.confusion_model, "predict_proba"):
            conf_probs = self.confusion_model.predict_proba(X)[0]
            # Class 1 is POSSIBLY_CONFUSED
            prob_confused = float(conf_probs[1]) if len(conf_probs) > 1 else float(conf_probs[0])
        else:
            # Fallback calculation if model unavailable
            prob_confused = indicators.confusion_indicator

        confusion_score = round(prob_confused * 100.0, 1)
        confusion_state: ConfusionStateType = (
            "POSSIBLY_CONFUSED" if confusion_score >= 50.0 else "NORMAL"
        )

        # 4. Confidence
        att_conf = max(prob_attentive, 1.0 - prob_attentive)
        conf_conf = max(prob_confused, 1.0 - prob_confused)
        overall_confidence = round(((att_conf + conf_conf) / 2.0) * 100.0, 1)

        # 5. Step 7: Explainability Layer (Behavioural Indicators)
        reasons = self._generate_explanations(tf, indicators, attention_state, confusion_state)

        return MLPredictionResult(
            attention_state=attention_state,
            attention_score=attention_score,
            confusion_state=confusion_state,
            confusion_score=confusion_score,
            confidence=overall_confidence,
            reasons=reasons,
            indicators=indicators,
            temporal_features=tf,
            model_status="TRAINED_DEMO_MODEL",
            timestamp_ms=tf.timestamp_ms,
        )

    def _generate_explanations(
        self,
        tf: TemporalFeatureVector,
        ind: BehaviouralIndicators,
        att_state: AttentionStateType,
        conf_state: ConfusionStateType,
    ) -> List[str]:
        """
        Derives strong, human-readable contributing behavioural reasons
        from the underlying temporal indicators.
        """
        reasons: List[str] = []

        # Attention reasons
        if att_state == "ATTENTIVE":
            if ind.stable_screen_gaze:
                reasons.append(f"Stable screen gaze ({tf.gaze_center_percent:.0f}% center focus)")
            if not ind.excessive_head_movement:
                reasons.append("Low head movement (steady posture)")
            if not ind.prolonged_eye_closure:
                reasons.append("Normal blink behaviour")
        else:
            if ind.sustained_gaze_away:
                reasons.append(
                    f"Sustained gaze away ({tf.sustained_gaze_away_duration_ms/1000.0:.1f}s deflection)"
                    if tf.sustained_gaze_away_duration_ms >= 500
                    else f"Gaze directed away ({tf.gaze_away_percent:.0f}% of window)"
                )
            if ind.excessive_head_movement:
                reasons.append(f"Elevated head movement ({tf.head_movement_magnitude:.1f}°/frame)")
            if ind.prolonged_eye_closure:
                reasons.append("Prolonged eye closure episode")
            if tf.valid_face_percentage < 80.0:
                reasons.append(f"Face partially occluded/lost ({100 - tf.valid_face_percentage:.0f}% dropped)")

        # Confusion reasons
        if conf_state == "POSSIBLY_CONFUSED":
            if ind.high_brow_furrow:
                reasons.append(f"Persistent brow furrowing ({tf.brow_furrow_persistence:.0f}% persistence)")
            if tf.head_roll_variance > 16.0:
                reasons.append("Head tilt detected during comprehension")
            if tf.gaze_deviation_mean > 0.35 and not ind.sustained_gaze_away:
                reasons.append("Focal visual search pattern")
        else:
            if not ind.high_brow_furrow:
                reasons.append("Relaxed facial musculature")

        if not reasons:
            reasons.append("Standard classroom engagement profile")

        return reasons[:4]


# Global singleton instance for efficient inference
ml_predictor = MLPredictor()
