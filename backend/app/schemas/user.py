from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator


class UserBase(BaseModel):
    github_id: int
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class UserRead(UserBase):
    id: int
    has_gemini_key: bool = False
    masked_gemini_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserProfileResponse(BaseModel):
    id: int
    github_id: int
    username: str
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    has_gemini_key: bool = False
    masked_gemini_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class GeminiKeyUpdate(BaseModel):
    api_key: str

    @field_validator("api_key")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Gemini API key cannot be empty.")
        if len(cleaned) < 15:
            raise ValueError("Invalid Gemini API key format (length too short).")
        return cleaned


class GeminiKeyStatusResponse(BaseModel):
    status: str  # verified | invalid | missing | removed
    has_key: bool
    masked_key: Optional[str] = None
    message: Optional[str] = None
