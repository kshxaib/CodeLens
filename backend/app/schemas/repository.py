import re
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator


class RepositoryBase(BaseModel):
    name: str
    owner: str
    full_name: str
    html_url: str
    clone_url: str
    private: bool = False
    default_branch: str = "main"
    description: Optional[str] = None


class RepositoryCreate(RepositoryBase):
    github_id: int


class RepositoryRead(RepositoryBase):
    id: int
    github_id: int
    index_status: str = "not_indexed"  # not_indexed | indexing | indexed | failed
    last_indexed_commit: Optional[str] = None
    last_indexed_at: Optional[datetime] = None
    file_count: int = 0
    symbol_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RepositorySummary(BaseModel):
    id: int
    full_name: str
    owner: str
    name: str
    index_status: str
    file_count: int
    symbol_count: int
    last_indexed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RepositoryListResponse(BaseModel):
    repositories: List[RepositoryRead]
    total: int


class AddRepositoryRequest(BaseModel):
    url: str

    @field_validator("url")
    @classmethod
    def validate_github_url(cls, v: str) -> str:
        cleaned = v.strip()
        pattern = r"^https?://github\.com/([a-zA-Z0-9_.-]+)/([a-zA-Z0-9_.-]+)(?:\.git)?/?$"
        match = re.match(pattern, cleaned)
        if not match:
            raise ValueError("Invalid GitHub repository URL. Must be in format https://github.com/owner/repo")
        return cleaned


class ExplainComponentRequest(BaseModel):
    node_id: str
    view: str = "architecture"

