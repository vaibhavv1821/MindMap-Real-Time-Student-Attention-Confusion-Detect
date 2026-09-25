from pydantic import BaseModel, EmailStr, Field, model_validator
from typing import Optional
from app.models.user import Role


class RegisterIn(BaseModel):
    full_name: str = Field(..., min_length=1, description="User's full name")
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password with minimum 6 characters")
    confirm_password: Optional[str] = Field(None, description="Password confirmation")
    confirmPassword: Optional[str] = Field(None, description="CamelCase password confirmation")
    role: Role = Role.student

    @model_validator(mode="after")
    def verify_password_match(self):
        confirm = self.confirm_password if self.confirm_password is not None else self.confirmPassword
        if confirm is not None and self.password != confirm:
            raise ValueError("Passwords do not match")
        return self


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, description="User password")


class RefreshIn(BaseModel):
    refresh_token: str


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    """What we send back to the client — password_hash is deliberately absent."""
    id: str
    full_name: str
    email: EmailStr
    role: Role
