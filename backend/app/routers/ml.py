"""
MindMap Phase 2 - Machine Learning API Router

Exposes endpoints for:
1. POST /api/ml/predict-temporal: Classifies a pre-aggregated TemporalFeatureVector.
2. POST /api/ml/predict-window: Receives a list of FacialFeatureVector frames, aggregates, and classifies.
3. GET /api/ml/info: Returns architecture, model parameters, and training status.
"""

from fastapi import APIRouter
from typing import List, Optional
from app.schemas.features import FacialFeatureVector
from app.schemas.temporal import TemporalFeatureVector, MLPredictionResult
from app.features.temporal_extractor import TemporalFeatureExtractor
from app.features.classroom_aggregator import (
    ClassroomAggregator,
    StudentTelemetrySnapshot,
    ClassroomSummary,
)
from app.ml.predictor import ml_predictor
from app.ml.demo_dataset import FEATURE_NAMES
from app.ml.controlled_evaluation import (
    ControlledEvaluationSummary,
    run_controlled_evaluation,
)

router = APIRouter(prefix="/api/ml", tags=["Machine Learning Intelligence"])
temporal_extractor = TemporalFeatureExtractor()
classroom_aggregator = ClassroomAggregator()


@router.post("/predict-temporal", response_model=MLPredictionResult)
async def predict_from_temporal_vector(vector: TemporalFeatureVector):
    """
    Primary Phase 2 ML Endpoint:
    Consumes pre-aggregated TemporalFeatureVector and generates Random Forest predictions
    with human-interpretable behavioural reasons.
    """
    return ml_predictor.predict(vector)


@router.post("/predict-window", response_model=MLPredictionResult)
async def predict_from_window_frames(frames: List[FacialFeatureVector]):
    """
    Aggregates a rolling list of Phase 1 FacialFeatureVector frames into a
    TemporalFeatureVector and returns ML prediction results.
    """
    tf = temporal_extractor.extract_temporal_features(frames)
    return ml_predictor.predict(tf)


@router.get("/controlled-evaluation", response_model=ControlledEvaluationSummary)
async def get_controlled_evaluation():
    """
    Phase 3: Controlled Behavioral Evaluation Endpoint.
    Executes the 8 standardized behavioral scenarios through the ML pipeline
    and reports classification metrics with explicit transparency disclosure.
    """
    return run_controlled_evaluation()


@router.post("/classroom/snapshot", response_model=ClassroomSummary)
async def update_classroom_telemetry(snapshot: StudentTelemetrySnapshot):
    """
    Phase 3: Receives student telemetry snapshot and updates classroom aggregate.
    Returns live classroom summary including temporal drop alert status.
    """
    classroom_aggregator.update_student(snapshot)
    return classroom_aggregator.compute_summary()


@router.get("/classroom/summary", response_model=ClassroomSummary)
async def get_classroom_summary():
    """
    Phase 3: Retrieves current classroom aggregate summary and temporal attention drop alerts.
    """
    return classroom_aggregator.compute_summary()


@router.post("/classroom/reset")
async def reset_classroom_summary():
    """Phase 3: Resets classroom aggregate buffer."""
    classroom_aggregator.reset()
    return {"status": "RESET_SUCCESSFUL"}


@router.get("/info")
async def get_ml_pipeline_info():
    """Returns architectural documentation for the Random Forest pipeline."""
    return {
        "pipeline": "MindMap Temporal Intelligence + Random Forest Classifier",
        "phase": "Phase 3 - Final Evaluation + Teacher Analytics + Presentation Readiness",
        "classifiers": {
            "attention": {
                "algorithm": "RandomForestClassifier(n_estimators=40, max_depth=5)",
                "classes": ["INATTENTIVE", "ATTENTIVE"],
                "score_metric": "Probability P(ATTENTIVE) * 100",
            },
            "confusion": {
                "algorithm": "RandomForestClassifier(n_estimators=40, max_depth=5)",
                "classes": ["NORMAL", "POSSIBLY_CONFUSED"],
                "score_metric": "Probability P(POSSIBLY_CONFUSED) * 100",
            },
        },
        "features": {
            "count": len(FEATURE_NAMES),
            "feature_names": FEATURE_NAMES,
            "window_duration_seconds": "1.0 to 3.0 seconds (30 to 90 frames dynamic)",
        },
        "explainability": "Behavioural indicators (gaze, head movement, blinks, brow furrow)",
        "dataset_notice": "Pipeline validated with demonstration synthetic distribution. DAiSEE dataset drop-in ready.",
        "phase3_capabilities": [
            "8-Scenario Controlled Behavioral Evaluation Suite",
            "Multi-Student Classroom Aggregator with Temporal Drop Alerts",
            "Teacher Analytics & Trend Visualizations",
            "Automated PDF Session Report Exporter",
        ],
    }

