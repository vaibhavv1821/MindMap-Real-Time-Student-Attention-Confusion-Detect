"""
MindMap Phase 3 - Unit Tests for Controlled Behavioral Evaluation Suite

Tests:
1. Scenario definitions: all 8 scenarios present with valid temporal feature vectors
2. Controlled evaluation execution: 100% pass rate on standardized scenarios
3. Individual scenario behavioral validation:
   - Looking directly at screen -> ATTENTIVE, NORMAL
   - Looking away -> INATTENTIVE
   - Head turned -> INATTENTIVE
   - Looking down -> INATTENTIVE
   - Frequent blinking -> INATTENTIVE
   - Prolonged gaze deviation -> INATTENTIVE
   - Brow furrowing -> ATTENTIVE, POSSIBLY_CONFUSED
   - Sustained head movement -> INATTENTIVE
4. REST API Endpoint: GET /api/ml/controlled-evaluation returns valid 200 payload
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.controlled_evaluation import (
    get_controlled_scenarios,
    run_controlled_evaluation,
    ControlledEvaluationSummary,
)


def test_controlled_scenarios_count_and_structure():
    scenarios = get_controlled_scenarios()
    assert len(scenarios) == 8

    expected_ids = [
        "SCENARIO_1_LOOKING_AT_SCREEN",
        "SCENARIO_2_LOOKING_AWAY",
        "SCENARIO_3_HEAD_TURNED",
        "SCENARIO_4_LOOKING_DOWN",
        "SCENARIO_5_FREQUENT_BLINKING",
        "SCENARIO_6_PROLONGED_GAZE_DEVIATION",
        "SCENARIO_7_BROW_FURROWING",
        "SCENARIO_8_SUSTAINED_HEAD_MOVEMENT",
    ]

    actual_ids = [s.id for s in scenarios]
    assert actual_ids == expected_ids

    for sc in scenarios:
        assert sc.expected_attention in ["ATTENTIVE", "INATTENTIVE"]
        assert sc.expected_confusion in ["NORMAL", "POSSIBLY_CONFUSED"]
        assert len(sc.behavioral_cues) > 0
        assert sc.vector is not None


def test_controlled_evaluation_execution():
    summary: ControlledEvaluationSummary = run_controlled_evaluation()
    assert summary.total_scenarios == 8
    assert summary.passed_scenarios == 8
    assert summary.failed_scenarios == 0
    assert summary.pass_rate_percent == 100.0
    assert summary.attention_accuracy_percent == 100.0
    assert summary.confusion_accuracy_percent == 100.0
    assert summary.overall_accuracy_percent == 100.0
    assert "Real-world benchmark evaluation pending DAiSEE" in summary.disclaimer


def test_scenario_looking_at_screen():
    summary = run_controlled_evaluation()
    s1 = next(s for s in summary.scenarios if s.id == "SCENARIO_1_LOOKING_AT_SCREEN")
    assert s1.passed is True
    assert s1.predicted_attention == "ATTENTIVE"
    assert s1.predicted_confusion == "NORMAL"
    assert s1.attention_score >= 70.0


def test_scenario_brow_furrowing_confusion():
    summary = run_controlled_evaluation()
    s7 = next(s for s in summary.scenarios if s.id == "SCENARIO_7_BROW_FURROWING")
    assert s7.passed is True
    assert s7.predicted_attention == "ATTENTIVE"
    assert s7.predicted_confusion == "POSSIBLY_CONFUSED"
    assert s7.confusion_score >= 50.0


def test_controlled_evaluation_api_endpoint():
    client = TestClient(app)
    response = client.get("/api/ml/controlled-evaluation")
    assert response.status_code == 200
    data = response.json()
    assert data["total_scenarios"] == 8
    assert data["passed_scenarios"] == 8
    assert data["pass_rate_percent"] == 100.0
    assert len(data["scenarios"]) == 8
