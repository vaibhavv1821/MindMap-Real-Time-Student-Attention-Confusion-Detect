from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class ChatMessageInDB(BaseModel):
    class_id: str
    class_code: str
    sender_id: str
    sender_name: str
    sender_role: str  # "student", "teacher", "admin"
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ScreenSharePermission(BaseModel):
    class_id: str
    class_code: str
    allowed_students: list[str] = Field(default_factory=list)
    is_open_to_all: bool = False
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
