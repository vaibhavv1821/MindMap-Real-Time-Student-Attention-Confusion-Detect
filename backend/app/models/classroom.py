from enum import Enum
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class ClassStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    ENDED = "ENDED"


class EnrollmentStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DROPPED = "DROPPED"


class ParticipantStatus(str, Enum):
    PRESENT = "PRESENT"
    LEFT = "LEFT"


class ClassInDB(BaseModel):
    name: str
    subject: str
    description: Optional[str] = ""
    class_code: str
    teacher_id: str
    teacher_name: str
    scheduled_start: Optional[str] = None
    scheduled_end: Optional[str] = None
    status: ClassStatus = ClassStatus.SCHEDULED
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EnrollmentInDB(BaseModel):
    class_id: str
    class_code: str
    student_id: str
    student_name: str
    student_email: str
    enrolled_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    status: EnrollmentStatus = EnrollmentStatus.ACTIVE


class SessionInDB(BaseModel):
    class_id: str
    class_code: str
    teacher_id: str
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ended_at: Optional[datetime] = None
    status: ClassStatus = ClassStatus.LIVE
    avg_attention: float = 0.0
    avg_confusion: float = 0.0
    peak_students: int = 0


class SessionParticipantInDB(BaseModel):
    session_id: str
    class_id: str
    student_id: str
    student_name: str
    student_email: str
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    left_at: Optional[datetime] = None
    duration_seconds: int = 0
    avg_attention: float = 0.0
    avg_confusion: float = 0.0
    status: ParticipantStatus = ParticipantStatus.PRESENT
