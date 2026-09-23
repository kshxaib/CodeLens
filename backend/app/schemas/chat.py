from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, ConfigDict, field_validator


class Citation(BaseModel):
    """Represents a verifiable code citation attached to an assistant answer."""
    file_path: str
    start_line: int
    end_line: int
    symbol: Optional[str] = None
    snippet: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MessageBase(BaseModel):
    role: str  # user | assistant | system
    content: str
    sources: Optional[List[Citation]] = None


class MessageCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Message content cannot be empty.")
        return cleaned


class MessageRead(MessageBase):
    id: int
    conversation_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationBase(BaseModel):
    title: str = "New Chat"


class ConversationCreate(BaseModel):
    title: Optional[str] = "New Chat"


class ConversationRead(ConversationBase):
    id: int
    repository_id: int
    user_id: int
    message_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationDetailResponse(ConversationRead):
    messages: List[MessageRead] = []


class ConversationListResponse(BaseModel):
    conversations: List[ConversationRead]
    total: int


class ChatStreamRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None
