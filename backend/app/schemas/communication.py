from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessageIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=1000)


class ChatMessageOut(BaseModel):
    id: str
    class_code: str
    sender_id: str
    sender_name: str
    sender_role: str
    text: str
    timestamp: str


class ICEServerConfig(BaseModel):
    urls: List[str]
    username: Optional[str] = None
    credential: Optional[str] = None


class WebRTCConfigOut(BaseModel):
    ice_servers: List[ICEServerConfig]


class ScreenSharePermissionUpdate(BaseModel):
    is_open_to_all: Optional[bool] = None
    allowed_student_id: Optional[str] = None
    action: Optional[str] = "grant"  # "grant" or "revoke"


class StudentReportSummary(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    attendance_status: str
    sessions_attended: int
    avg_attention: float
    avg_confusion: float


class SessionSummaryItem(BaseModel):
    session_id: str
    started_at: str
    ended_at: Optional[str] = None
    avg_attention: float
    avg_confusion: float
    peak_students: int


class ClassReportDataOut(BaseModel):
    class_id: str
    class_code: str
    class_name: str
    instructor_name: str
    date_range: str
    generated_at: str
    has_data: bool
    total_students_enrolled: int
    total_sessions_conducted: int
    overall_avg_attention: float
    overall_avg_confusion: float
    sessions: List[SessionSummaryItem] = Field(default_factory=list)
    student_roster: List[StudentReportSummary] = Field(default_factory=list)
    data_limitations_notice: str


class StudentPersonalReportOut(BaseModel):
    student_id: str
    student_name: str
    student_email: str
    class_id: str
    class_code: str
    class_name: str
    date_range: str
    generated_at: str
    has_data: bool
    sessions_attended: int
    personal_avg_attention: float
    personal_avg_confusion: float
    sessions: List[SessionSummaryItem] = Field(default_factory=list)
    metric_explanations: dict
    data_limitations_notice: str
