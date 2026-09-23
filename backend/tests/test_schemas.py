from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from app.schemas.user import UserRead, UserProfileResponse, GeminiKeyUpdate, GeminiKeyStatusResponse
from app.schemas.repository import (
    RepositoryRead,
    RepositorySummary,
    RepositoryListResponse,
    AddRepositoryRequest,
)
from app.schemas.auth import GitHubOAuthURLResponse, TokenResponse


def test_gemini_key_update_validation():
    # Valid key
    valid = GeminiKeyUpdate(api_key="AIzaSyA1B2C3D4E5F6G7H8I9J0")
    assert valid.api_key == "AIzaSyA1B2C3D4E5F6G7H8I9J0"

    # Too short key raises ValueError
    with pytest.raises(ValidationError):
        GeminiKeyUpdate(api_key="too_short")

    # Empty key raises ValueError
    with pytest.raises(ValidationError):
        GeminiKeyUpdate(api_key="   ")


def test_add_repository_url_validation():
    # Valid URLs
    req1 = AddRepositoryRequest(url="https://github.com/kshxaib/CodeLens")
    assert req1.url == "https://github.com/kshxaib/CodeLens"

    req2 = AddRepositoryRequest(url="https://github.com/facebook/react.git")
    assert req2.url == "https://github.com/facebook/react.git"

    # Invalid URLs
    with pytest.raises(ValidationError):
        AddRepositoryRequest(url="https://gitlab.com/owner/repo")

    with pytest.raises(ValidationError):
        AddRepositoryRequest(url="not_a_url")


def test_user_read_schema():
    now = datetime.now(timezone.utc)
    user = UserRead(
        id=1,
        github_id=123456,
        username="shoaib",
        email="shoaib@example.com",
        avatar_url="https://github.com/shoaib.png",
        has_gemini_key=True,
        masked_gemini_key="AIzaSy••••••••AbCd",
        created_at=now,
        updated_at=now,
    )
    assert user.username == "shoaib"
    assert user.has_gemini_key is True
    assert user.masked_gemini_key == "AIzaSy••••••••AbCd"


def test_repository_read_schema():
    now = datetime.now(timezone.utc)
    repo = RepositoryRead(
        id=10,
        github_id=987654,
        owner="kshxaib",
        name="CodeLens",
        full_name="kshxaib/CodeLens",
        html_url="https://github.com/kshxaib/CodeLens",
        clone_url="https://github.com/kshxaib/CodeLens.git",
        private=False,
        default_branch="main",
        index_status="indexed",
        file_count=25,
        symbol_count=120,
        created_at=now,
        updated_at=now,
    )
    assert repo.full_name == "kshxaib/CodeLens"
    assert repo.index_status == "indexed"
    assert repo.file_count == 25
