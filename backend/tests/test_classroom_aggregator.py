"""
MindMap Phase 3 - Unit Tests for Classroom Telemetry Aggregator

Tests:
1. Multi-student aggregation and average computations
2. Stale student telemetry pruning
3. Temporal Attention Drop Alert State Machine:
   - Must NOT trigger on 1 or 2 low windows
   - Must trigger on >= 3 consecutive low windows
   - Must recover/reset when attention rises above threshold
4. Endpoint validation via FastAPI TestClient
"""

import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.features.classroom_aggregator import (
    ClassroomAggregator,
    StudentTelemetrySnapshot,
    ClassroomSummary,
)


def test_classroom_empty_aggregation():
    agg = ClassroomAggregator()
    summary = agg.computeSummary() if hasattr(agg, 'computeSummary') else agg.compute_summary()
    assert summary.total_students == 0
    assert summary.active_students == 0
    assert summary.avg_attention == 0.0
    assert summary.attention_drop_alert is False


def test_classroom_multi_student_averages():
    agg = ClassroomAggregator()
    now = time.time() * 1000.0

    agg.update_student(
        StudentTelemetrySnapshot(
            student_id="s1",
            student_name="Student 1",
            attention_score=80.0,
            confusion_score=10.0,
            attention_state="ATTENTIVE",
            confusion_state="NORMAL",
            confidence=95.0,
            timestamp_ms=now,
        )
    )
    agg.update_student(
        StudentTelemetrySnapshot(
            student_id="s2",
            student_name="Student 2",
            attention_score=60.0,
            confusion_score=30.0,
            attention_state="ATTENTIVE",
            confusion_state="NORMAL",
            confidence=90.0,
            timestamp_ms=now,
        )
    )

    summary = agg.compute_summary(now)
    assert summary.total_students == 2
    assert summary.active_students == 2
    assert summary.avg_attention == 70.0
    assert summary.avg_confusion == 20.0
    assert summary.attentive_count == 2
    assert summary.inattentive_count == 0
    assert summary.attention_drop_alert is False


def test_temporal_drop_alert_trigger_at_three_windows():
    """
    Critical behavioral test: alert triggers ONLY on >= 3 consecutive windows below threshold (65%).
    """
    agg = ClassroomAggregator(attention_drop_threshold=65.0, required_consecutive_windows=3)
    now = time.time() * 1000.0

    # Student with low attention (40%)
    agg.update_student(
        StudentTelemetrySnapshot(
            student_id="s1",
            student_name="Distracted Student",
            attention_score=40.0,
            confusion_score=10.0,
            attention_state="INATTENTIVE",
            confusion_state="NORMAL",
            confidence=92.0,
            timestamp_ms=now,
        )
    )

    # Window 1: Drop detected, but count = 1 -> Alert FALSE
    s1 = agg.compute_summary(now)
    assert s1.consecutive_low_windows == 1
    assert s1.attention_drop_alert is False

    # Window 2: Drop detected, count = 2 -> Alert FALSE
    s2 = agg.compute_summary(now + 1000.0)
    assert s2.consecutive_low_windows == 2
    assert s2.attention_drop_alert is False

    # Window 3: Drop detected, count = 3 -> Alert TRUE
    s3 = agg.compute_summary(now + 2000.0)
    assert s3.consecutive_low_windows == 3
    assert s3.attention_drop_alert is True
    assert s3.alert_message is not None
    assert "Class Attention Drop Detected" in s3.alert_message

    # Recovery: Attention recovers to 85% -> Alert resets immediately to FALSE
    agg.update_student(
        StudentTelemetrySnapshot(
            student_id="s1",
            student_name="Distracted Student",
            attention_score=85.0,
            confusion_score=5.0,
            attention_state="ATTENTIVE",
            confusion_state="NORMAL",
            confidence=95.0,
            timestamp_ms=now + 3000.0,
        )
    )
    s4 = agg.compute_summary(now + 3000.0)
    assert s4.consecutive_low_windows == 0
    assert s4.attention_drop_alert is False


def test_stale_student_pruning():
    agg = ClassroomAggregator(stale_student_timeout_ms=5000.0)
    t0 = 100000.0

    agg.update_student(
        StudentTelemetrySnapshot(
            student_id="stale_s",
            student_name="Stale Student",
            attention_score=90.0,
            confusion_score=10.0,
            timestamp_ms=t0,
        )
    )

    # Within 3 seconds -> still active
    s_active = agg.compute_summary(t0 + 3000.0)
    assert s_active.active_students == 1

    # After 6 seconds (> 5s cutoff) -> pruned
    s_pruned = agg.compute_summary(t0 + 6000.0)
    assert s_pruned.active_students == 0


def test_classroom_api_endpoints():
    client = TestClient(app)

    # 1. Reset
    reset_res = client.post("/api/ml/classroom/reset")
    assert reset_res.status_code == 200

    # 2. Post snapshot
    snap_data = {
        "student_id": "test_sid",
        "student_name": "API Student",
        "attention_score": 75.0,
        "confusion_score": 15.0,
        "attention_state": "ATTENTIVE",
        "confusion_state": "NORMAL",
        "confidence": 94.0,
    }
    post_res = client.post("/api/ml/classroom/snapshot", json=snap_data)
    assert post_res.status_code == 200
    data = post_res.json()
    assert data["active_students"] == 1
    assert data["avg_attention"] == 75.0

    # 3. Get summary
    get_res = client.get("/api/ml/classroom/summary")
    assert get_res.status_code == 200
    assert get_res.json()["active_students"] == 1
