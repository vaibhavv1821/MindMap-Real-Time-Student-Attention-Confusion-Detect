from enum import Enum
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr, Field


class Role(str, Enum):
    admin = "admin"
    teacher = "teacher"
    student = "student"


class UserInDB(BaseModel):
    """Shape of a document as stored in Mongo. password_hash NEVER leaves this layer."""
    full_name: str
    email: EmailStr
    password_hash: str
    role: Role
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
