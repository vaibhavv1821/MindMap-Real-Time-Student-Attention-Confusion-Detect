from typing import Optional, List
from pydantic import BaseModel, Field
from app.models.classroom import ClassStatus, EnrollmentStatus, ParticipantStatus


class CreateClassIn(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Class name e.g. Quantum Physics 101")
    subject: str = Field(..., min_length=2, max_length=100, description="Subject e.g. Physics")
    description: Optional[str] = Field("", max_length=500, description="Class description")
    scheduled_start: Optional[str] = Field(None, description="Scheduled start time ISO string or format")
    scheduled_end: Optional[str] = Field(None, description="Scheduled end time ISO string or format")


class ClassOut(BaseModel):
    id: str
    class_code: str
    name: str
    subject: str
    description: Optional[str] = ""
    teacher_id: str
    teacher_name: str
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    status: ClassStatus
    enrolled_count: int = 0
    active_students: int = 0
    avg_attention: float = 0.0
    avg_confusion: float = 0.0
    created_at: str


class JoinClassIn(BaseModel):
    class_code: str = Field(..., min_length=4, max_length=20, description="Unique classroom code to join")


class EnrollmentOut(BaseModel):
    id: str
    class_id: str
    class_code: str
    class_name: str
    subject: str
    teacher_name: str
    status: EnrollmentStatus
    enrolled_at: str
    is_live: bool = False


class StudentRosterItem(BaseModel):
    student_id: str
    name: str
    email: str
    enrolled_at: str
    status: str
    avg_attention: float = 0.0
    avg_confusion: float = 0.0
    connection_status: str = "OFFLINE"
    is_hand_raised: bool = False
    last_seen: Optional[str] = None


class SessionOut(BaseModel):
    id: str
    class_id: str
    class_code: str
    status: ClassStatus
    started_at: str
    ended_at: Optional[str] = None
    avg_attention: float = 0.0
    avg_confusion: float = 0.0
    peak_students: int = 0


class AttendanceRecordOut(BaseModel):
    session_id: str
    class_id: str
    class_name: str
    class_code: str
    teacher_name: str
    joined_at: str
    left_at: Optional[str] = None
    duration_seconds: int = 0
    avg_attention: float = 0.0
    avg_confusion: float = 0.0
    status: str


class StudentStatsOut(BaseModel):
    total_classes_enrolled: int = 0
    total_sessions_attended: int = 0
    overall_avg_attention: float = 0.0
    overall_avg_confusion: float = 0.0


class ClassAnalyticsOut(BaseModel):
    class_id: str
    class_code: str
    class_name: str
    total_enrolled: int = 0
    total_sessions: int = 0
    overall_avg_attention: float = 0.0
    overall_avg_confusion: float = 0.0
    recent_sessions: List[SessionOut] = []
