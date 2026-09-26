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
    has_openai_key: bool = False
    masked_openai_key: Optional[str] = None
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
    has_openai_key: bool = False
    masked_openai_key: Optional[str] = None
    has_gemini_key: bool = False
    masked_gemini_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OpenAIKeyUpdate(BaseModel):
    api_key: str

    @field_validator("api_key")
    @classmethod
    def validate_api_key(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("OpenAI API key cannot be empty.")
        if len(cleaned) < 15:
            raise ValueError("Invalid OpenAI API key format (length too short).")
        return cleaned


# Alias for backward compatibility
GeminiKeyUpdate = OpenAIKeyUpdate


class OpenAIKeyStatusResponse(BaseModel):
    status: str  # verified | invalid | missing | removed
    has_key: bool
    masked_key: Optional[str] = None
    message: Optional[str] = None


# Alias for backward compatibility
GeminiKeyStatusResponse = OpenAIKeyStatusResponse
