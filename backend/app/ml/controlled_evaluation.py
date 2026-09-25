"""
MindMap Phase 3 - Controlled Behavioral Evaluation Module

Defines and evaluates 8 standardized behavioural test scenarios representing
physical student states in video-based e-learning environments:
1. Looking Directly at Screen (Attentive, Focused)
2. Looking Away (Gaze averted, Off-task)
3. Head Turned Sideways (Peer interaction / Distracted)
4. Looking Down (Mobile phone / Desk reading)
5. Frequent Blinking (Fatigue / Drowsiness)
6. Prolonged Gaze Deviation (Sustained Off-task Attention)
7. Brow Furrowing (Cognitive load / Topic Confusion)
8. Sustained Head Movement (Restlessness / Dynamic Distraction)

ACADEMIC TRANSPARENCY NOTICE:
This module performs controlled technical verification using standardized synthetic
behavioral vectors. Real-world benchmark dataset evaluation (e.g. DAiSEE) remains pending.
"""

from typing import List
from pydantic import BaseModel, Field
from app.schemas.temporal import TemporalFeatureVector, MLPredictionResult
from app.ml.predictor import ml_predictor


class ScenarioDefinition(BaseModel):
    id: str
    name: str
    description: str
    behavioral_cues: List[str]
    expected_attention: str = Field(..., description="Expected Attention State: ATTENTIVE or INATTENTIVE")
    expected_confusion: str = Field(..., description="Expected Confusion State: NORMAL or POSSIBLY_CONFUSED")
    vector: TemporalFeatureVector


class ScenarioEvaluationResult(BaseModel):
    id: str
    name: str
    description: str
    behavioral_cues: List[str]
    expected_attention: str
    predicted_attention: str
    attention_score: float
    attention_match: bool
    expected_confusion: str
    predicted_confusion: str
    confusion_score: float
    confusion_match: bool
    confidence: float
    passed: bool
    reasons: List[str]


class ControlledEvaluationSummary(BaseModel):
    evaluation_type: str = "CONTROLLED_BEHAVIORAL_TEST_SUITE"
    total_scenarios: int
    passed_scenarios: int
    failed_scenarios: int
    pass_rate_percent: float
    attention_accuracy_percent: float
    confusion_accuracy_percent: float
    overall_accuracy_percent: float
    disclaimer: str = (
        "Evaluation performed on 8 standardized behavioral scenarios for pipeline "
        "and classifier verification. Real-world benchmark evaluation pending DAiSEE dataset."
    )
    scenarios: List[ScenarioEvaluationResult]


def get_controlled_scenarios() -> List[ScenarioDefinition]:
    """
    Returns the 8 standardized physical behavioral scenarios for technical validation.
    """
    return [
        ScenarioDefinition(
            id="SCENARIO_1_LOOKING_AT_SCREEN",
            name="Looking Directly at Screen",
            description="Student maintains focused center gaze on monitor with steady posture, relaxed brow, and natural blink rate.",
            behavioral_cues=["Stable center gaze (>90%)", "Low head motion variance", "Regular blink rate (~15 bpm)", "Relaxed brow musculature"],
            expected_attention="ATTENTIVE",
            expected_confusion="NORMAL",
            vector=TemporalFeatureVector(
                ear_mean=0.29,
                ear_std=0.015,
                gaze_deviation_mean=0.08,
                gaze_deviation_max=0.15,
                gaze_center_percent=92.0,
                gaze_away_percent=6.0,
                sustained_gaze_away_duration_ms=100.0,
                head_yaw_mean=1.5,
                head_pitch_mean=-2.0,
                head_roll_mean=0.5,
                head_yaw_variance=4.0,
                head_pitch_variance=3.5,
                head_roll_variance=2.0,
                head_movement_magnitude=1.0,
                blink_count=1,
                blink_rate=15.0,
                avg_closure_duration_ms=130.0,
                brow_furrow_mean=0.10,
                brow_furrow_max=0.18,
                brow_furrow_persistence=5.0,
                valid_face_percentage=100.0,
                valid_samples_count=75,
                window_duration_ms=2500.0,
            ),
        ),
        ScenarioDefinition(
            id="SCENARIO_2_LOOKING_AWAY",
            name="Looking Away from Screen",
            description="Student looks away towards room periphery; sustained gaze deviation with minimal head rotation.",
            behavioral_cues=["High gaze away percentage (85%)", "Gaze deviation > 0.70", "Prolonged sustained gaze deviation (>1800ms)"],
            expected_attention="INATTENTIVE",
            expected_confusion="NORMAL",
            vector=TemporalFeatureVector(
                ear_mean=0.27,
                ear_std=0.02,
                gaze_deviation_mean=0.72,
                gaze_deviation_max=0.88,
                gaze_center_percent=12.0,
                gaze_away_percent=85.0,
                sustained_gaze_away_duration_ms=1900.0,
                head_yaw_mean=3.0,
                head_pitch_mean=-1.0,
                head_roll_mean=1.0,
                head_yaw_variance=12.0,
                head_pitch_variance=10.0,
                head_roll_variance=6.0,
                head_movement_magnitude=2.2,
                blink_count=1,
                blink_rate=16.0,
                avg_closure_duration_ms=140.0,
                brow_furrow_mean=0.15,
                brow_furrow_max=0.22,
                brow_furrow_persistence=10.0,
                valid_face_percentage=100.0,
                valid_samples_count=75,
                window_duration_ms=2500.0,
            ),
        ),
        ScenarioDefinition(
            id="SCENARIO_3_HEAD_TURNED",
            name="Head Turned Sideways",
            description="Student turns head sideways towards peer or doorway; large yaw offset and variance.",
            behavioral_cues=["Large head yaw mean (38°)", "High yaw variance (68.0)", "Gaze averted from camera", "Elevated movement velocity"],
            expected_attention="INATTENTIVE",
            expected_confusion="NORMAL",
            vector=TemporalFeatureVector(
                ear_mean=0.23,
                ear_std=0.03,
                gaze_deviation_mean=0.68,
                gaze_deviation_max=0.85,
                gaze_center_percent=15.0,
                gaze_away_percent=78.0,
                sustained_gaze_away_duration_ms=1600.0,
                head_yaw_mean=38.0,
                head_pitch_mean=-3.0,
                head_roll_mean=5.0,
                head_yaw_variance=68.0,
                head_pitch_variance=25.0,
                head_roll_variance=18.0,
                head_movement_magnitude=5.8,
                blink_count=1,
                blink_rate=18.0,
                avg_closure_duration_ms=150.0,
                brow_furrow_mean=0.18,
                brow_furrow_max=0.25,
                brow_furrow_persistence=12.0,
                valid_face_percentage=92.0,
                valid_samples_count=70,
                window_duration_ms=2500.0,
            ),
        ),
        ScenarioDefinition(
            id="SCENARIO_4_LOOKING_DOWN",
            name="Looking Down (Desk / Phone)",
            description="Student tilts head downward towards notebook, phone, or keyboard; high pitch depression.",
            behavioral_cues=["Head pitch depressed (-29°)", "High pitch variance", "Gaze directed downward away from screen"],
            expected_attention="INATTENTIVE",
            expected_confusion="NORMAL",
            vector=TemporalFeatureVector(
                ear_mean=0.24,
                ear_std=0.03,
                gaze_deviation_mean=0.62,
                gaze_deviation_max=0.79,
                gaze_center_percent=20.0,
                gaze_away_percent=72.0,
                sustained_gaze_away_duration_ms=1500.0,
                head_yaw_mean=2.0,
                head_pitch_mean=-29.0,
                head_roll_mean=2.0,
                head_yaw_variance=22.0,
                head_pitch_variance=55.0,
                head_roll_variance=14.0,
                head_movement_magnitude=4.5,
                blink_count=1,
                blink_rate=14.0,
                avg_closure_duration_ms=160.0,
                brow_furrow_mean=0.20,
                brow_furrow_max=0.28,
                brow_furrow_persistence=15.0,
                valid_face_percentage=94.0,
                valid_samples_count=70,
                window_duration_ms=2500.0,
            ),
        ),
        ScenarioDefinition(
            id="SCENARIO_5_FREQUENT_BLINKING",
            name="Frequent Blinking / Drowsiness",
            description="Student exhibits signs of ocular fatigue: rapid blink spikes (>35 bpm) and prolonged closure duration (>300ms).",
            behavioral_cues=["Elevated blink frequency (38 bpm)", "Prolonged average eye closure (340ms)", "EAR variance elevated", "Microsleep pattern"],
            expected_attention="INATTENTIVE",
            expected_confusion="NORMAL",
            vector=TemporalFeatureVector(
                ear_mean=0.20,
                ear_std=0.06,
                gaze_deviation_mean=0.38,
                gaze_deviation_max=0.55,
                gaze_center_percent=45.0,
                gaze_away_percent=42.0,
                sustained_gaze_away_duration_ms=600.0,
                head_yaw_mean=2.0,
                head_pitch_mean=-8.0,
                head_roll_mean=1.0,
                head_yaw_variance=18.0,
                head_pitch_variance=22.0,
                head_roll_variance=12.0,
                head_movement_magnitude=3.2,
                blink_count=3,
                blink_rate=38.0,
                avg_closure_duration_ms=340.0,
                brow_furrow_mean=0.22,
                brow_furrow_max=0.30,
                brow_furrow_persistence=14.0,
                valid_face_percentage=95.0,
                valid_samples_count=72,
                window_duration_ms=2500.0,
            ),
        ),
        ScenarioDefinition(
            id="SCENARIO_6_PROLONGED_GAZE_DEVIATION",
            name="Prolonged Gaze Deviation",
            description="Continuous off-screen focus lasting greater than 2000ms, indicating disengagement.",
            behavioral_cues=["Continuous gaze off-screen (>2200ms)", "Gaze away > 90%", "Gaze deviation > 0.80"],
            expected_attention="INATTENTIVE",
            expected_confusion="NORMAL",
            vector=TemporalFeatureVector(
                ear_mean=0.26,
                ear_std=0.02,
                gaze_deviation_mean=0.82,
                gaze_deviation_max=0.95,
                gaze_center_percent=5.0,
                gaze_away_percent=92.0,
                sustained_gaze_away_duration_ms=2300.0,
                head_yaw_mean=12.0,
                head_pitch_mean=-4.0,
                head_roll_mean=2.0,
                head_yaw_variance=28.0,
                head_pitch_variance=16.0,
                head_roll_variance=10.0,
                head_movement_magnitude=3.4,
                blink_count=1,
                blink_rate=15.0,
                avg_closure_duration_ms=135.0,
                brow_furrow_mean=0.16,
                brow_furrow_max=0.24,
                brow_furrow_persistence=8.0,
                valid_face_percentage=98.0,
                valid_samples_count=74,
                window_duration_ms=2500.0,
            ),
        ),
        ScenarioDefinition(
            id="SCENARIO_7_BROW_FURROWING",
            name="Brow Furrowing / Topic Confusion",
            description="Student concentrates with contracted brow muscles and lateral head tilt, indicating high cognitive load/confusion.",
            behavioral_cues=["Corrugator supercilii contraction (furrow score 0.76)", "Brow furrow persistence (85%)", "Moderate lateral head roll tilt (14°)", "Maintains screen gaze"],
            expected_attention="ATTENTIVE",
            expected_confusion="POSSIBLY_CONFUSED",
            vector=TemporalFeatureVector(
                ear_mean=0.27,
                ear_std=0.018,
                gaze_deviation_mean=0.15,
                gaze_deviation_max=0.26,
                gaze_center_percent=82.0,
                gaze_away_percent=14.0,
                sustained_gaze_away_duration_ms=200.0,
                head_yaw_mean=3.0,
                head_pitch_mean=-3.0,
                head_roll_mean=14.0,
                head_yaw_variance=12.0,
                head_pitch_variance=10.0,
                head_roll_variance=28.0,
                head_movement_magnitude=2.1,
                blink_count=1,
                blink_rate=17.0,
                avg_closure_duration_ms=140.0,
                brow_furrow_mean=0.76,
                brow_furrow_max=0.90,
                brow_furrow_persistence=85.0,
                valid_face_percentage=100.0,
                valid_samples_count=75,
                window_duration_ms=2500.0,
            ),
        ),
        ScenarioDefinition(
            id="SCENARIO_8_SUSTAINED_HEAD_MOVEMENT",
            name="Sustained Head Movement / High Motion",
            description="Restless or fidgeting movement across yaw, pitch, and roll axes with high angular velocity.",
            behavioral_cues=["High angular step (7.5°/frame)", "High 3D pose variance (yaw: 72, pitch: 60)", "Intermittent screen gaze"],
            expected_attention="INATTENTIVE",
            expected_confusion="NORMAL",
            vector=TemporalFeatureVector(
                ear_mean=0.23,
                ear_std=0.04,
                gaze_deviation_mean=0.52,
                gaze_deviation_max=0.75,
                gaze_center_percent=32.0,
                gaze_away_percent=60.0,
                sustained_gaze_away_duration_ms=1200.0,
                head_yaw_mean=5.0,
                head_pitch_mean=4.0,
                head_roll_mean=6.0,
                head_yaw_variance=72.0,
                head_pitch_variance=60.0,
                head_roll_variance=42.0,
                head_movement_magnitude=7.5,
                blink_count=2,
                blink_rate=22.0,
                avg_closure_duration_ms=180.0,
                brow_furrow_mean=0.25,
                brow_furrow_max=0.35,
                brow_furrow_persistence=20.0,
                valid_face_percentage=85.0,
                valid_samples_count=65,
                window_duration_ms=2500.0,
            ),
        ),
    ]


def run_controlled_evaluation() -> ControlledEvaluationSummary:
    """
    Executes all 8 controlled behavioral scenarios through the Random Forest inference engine.
    Calculates scenario-level and aggregate classification performance metrics.
    """
    scenarios = get_controlled_scenarios()
    results: List[ScenarioEvaluationResult] = []
    att_matches = 0
    conf_matches = 0

    for sc in scenarios:
        pred: MLPredictionResult = ml_predictor.predict(sc.vector)
        att_match = (pred.attention_state == sc.expected_attention)
        conf_match = (pred.confusion_state == sc.expected_confusion)
        passed = att_match and conf_match

        if att_match:
            att_matches += 1
        if conf_match:
            conf_matches += 1

        results.append(
            ScenarioEvaluationResult(
                id=sc.id,
                name=sc.name,
                description=sc.description,
                behavioral_cues=sc.behavioral_cues,
                expected_attention=sc.expected_attention,
                predicted_attention=pred.attention_state,
                attention_score=pred.attention_score,
                attention_match=att_match,
                expected_confusion=sc.expected_confusion,
                predicted_confusion=pred.confusion_state,
                confusion_score=pred.confusion_score,
                confusion_match=conf_match,
                confidence=pred.confidence,
                passed=passed,
                reasons=pred.reasons,
            )
        )

    total = len(scenarios)
    passed_count = sum(1 for r in results if r.passed)
    pass_rate = round((passed_count / total) * 100.0, 1)
    att_acc = round((att_matches / total) * 100.0, 1)
    conf_acc = round((conf_matches / total) * 100.0, 1)
    overall_acc = round(((att_matches + conf_matches) / (total * 2)) * 100.0, 1)

    return ControlledEvaluationSummary(
        total_scenarios=total,
        passed_scenarios=passed_count,
        failed_scenarios=total - passed_count,
        pass_rate_percent=pass_rate,
        attention_accuracy_percent=att_acc,
        confusion_accuracy_percent=conf_acc,
        overall_accuracy_percent=overall_acc,
        scenarios=results,
    )
