from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserRead


class GitHubOAuthURLResponse(BaseModel):
    url: str
    state: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead


class SessionUser(BaseModel):
    user_id: int
    github_id: int
    username: str
    has_gemini_key: bool = False
