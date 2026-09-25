"""
MindMap Phase 3 - Classroom Telemetry Aggregator & Attention Drop Detector

Aggregates individual student telemetry streams into classroom-level analytics:
1. Multi-student session aggregation (active count, average attention/confusion, attentive vs inattentive distribution)
2. Temporal Class Attention Drop Detection: triggers alerts only when attention persists below threshold across multiple consecutive temporal windows.
"""

import time
from typing import Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class StudentTelemetrySnapshot(BaseModel):
    student_id: str
    student_name: str
    attention_score: float = Field(..., ge=0.0, le=100.0)
    confusion_score: float = Field(..., ge=0.0, le=100.0)
    attention_state: str = Field("ATTENTIVE")
    confusion_state: str = Field("NORMAL")
    confidence: float = Field(90.0, ge=0.0, le=100.0)
    timestamp_ms: float = Field(default_factory=lambda: time.time() * 1000.0)


class ClassroomSummary(BaseModel):
    total_students: int
    active_students: int
    avg_attention: float
    avg_confusion: float
    attentive_count: int
    inattentive_count: int
    confused_count: int
    attention_drop_alert: bool
    consecutive_low_windows: int
    previous_avg_attention: float
    alert_message: Optional[str] = None
    timestamp_ms: float = Field(default_factory=lambda: time.time() * 1000.0)


class ClassroomAggregator:
    """
    Classroom telemetry aggregator with temporal drop alert logic.
    """
    def __init__(
        self,
        attention_drop_threshold: float = 65.0,
        required_consecutive_windows: int = 3,
        stale_student_timeout_ms: float = 10000.0,
    ):
        self.drop_threshold = attention_drop_threshold
        self.required_consecutive_windows = required_consecutive_windows
        self.stale_timeout_ms = stale_student_timeout_ms

        self._students: Dict[str, StudentTelemetrySnapshot] = {}
        self._consecutive_low_count: int = 0
        self._previous_avg_attention: float = 85.0
        self._history_averages: List[float] = []

    def update_student(self, snapshot: StudentTelemetrySnapshot) -> None:
        self._students[snapshot.student_id] = snapshot

    def prune_stale_students(self, current_time_ms: Optional[float] = None) -> None:
        now = current_time_ms if current_time_ms is not None else time.time() * 1000.0
        cutoff = now - self.stale_timeout_ms
        self._students = {
            sid: s for sid, s in self._students.items() if s.timestamp_ms >= cutoff
        }

    def compute_summary(self, now_ms: Optional[float] = None) -> ClassroomSummary:
        now = now_ms if now_ms is not None else time.time() * 1000.0
        self.prune_stale_students(now)

        active = list(self._students.values())
        total = len(active)

        if total == 0:
            return ClassroomSummary(
                total_students=0,
                active_students=0,
                avg_attention=0.0,
                avg_confusion=0.0,
                attentive_count=0,
                inattentive_count=0,
                confused_count=0,
                attention_drop_alert=False,
                consecutive_low_windows=0,
                previous_avg_attention=self._previous_avg_attention,
                alert_message=None,
                timestamp_ms=now,
            )

        avg_att = round(sum(s.attention_score for s in active) / total, 1)
        avg_conf = round(sum(s.confusion_score for s in active) / total, 1)
        attentive_count = sum(1 for s in active if s.attention_state == "ATTENTIVE" or s.attention_score >= 50.0)
        inattentive_count = total - attentive_count
        confused_count = sum(1 for s in active if s.confusion_state == "POSSIBLY_CONFUSED" or s.confusion_score >= 50.0)

        # Temporal drop alert detection
        is_low = avg_att < self.drop_threshold
        if is_low:
            self._consecutive_low_count += 1
        else:
            self._consecutive_low_count = 0

        alert_active = self._consecutive_low_count >= self.required_consecutive_windows
        alert_msg = None
        if alert_active:
            alert_msg = (
                f"Class Attention Drop Detected: Classroom average dropped to {avg_att}% "
                f"(previous: {self._previous_avg_attention}%) across {self._consecutive_low_count} "
                f"consecutive analysis windows with {inattentive_count} inattentive student(s)."
            )

        summary = ClassroomSummary(
            total_students=total,
            active_students=total,
            avg_attention=avg_att,
            avg_confusion=avg_conf,
            attentive_count=attentive_count,
            inattentive_count=inattentive_count,
            confused_count=confused_count,
            attention_drop_alert=alert_active,
            consecutive_low_windows=self._consecutive_low_count,
            previous_avg_attention=self._previous_avg_attention,
            alert_message=alert_msg,
            timestamp_ms=now,
        )

        self._previous_avg_attention = avg_att
        self._history_averages.append(avg_att)
        if len(self._history_averages) > 100:
            self._history_averages = self._history_averages[-100:]

        return summary

    def reset(self) -> None:
        self._students.clear()
        self._consecutive_low_count = 0
        self._previous_avg_attention = 85.0
        self._history_averages.clear()
