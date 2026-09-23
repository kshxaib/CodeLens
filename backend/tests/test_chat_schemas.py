from datetime import datetime, timezone
import pytest
from pydantic import ValidationError
from app.schemas.chat import (
    Citation,
    MessageCreate,
    MessageRead,
    ConversationRead,
    ConversationDetailResponse,
)


def test_citation_schema():
    cite = Citation(
        file_path="src/auth.py",
        start_line=12,
        end_line=45,
        symbol="loginUser",
        snippet="def loginUser():",
    )
    assert cite.file_path == "src/auth.py"
    assert cite.start_line == 12
    assert cite.symbol == "loginUser"


def test_message_create_validation():
    msg = MessageCreate(content="How does authentication work?")
    assert msg.content == "How does authentication work?"

    with pytest.raises(ValidationError):
        MessageCreate(content="   ")


def test_conversation_detail_schema():
    now = datetime.now(timezone.utc)
    cite = Citation(file_path="app/main.py", start_line=1, end_line=10, symbol="main")
    msg = MessageRead(
        id=1,
        conversation_id=5,
        role="assistant",
        content="The main entrypoint starts FastAPI.",
        sources=[cite],
        created_at=now,
    )
    convo = ConversationDetailResponse(
        id=5,
        repository_id=1,
        user_id=10,
        title="Setup Questions",
        message_count=1,
        created_at=now,
        updated_at=now,
        messages=[msg],
    )
    assert convo.id == 5
    assert len(convo.messages) == 1
    assert convo.messages[0].sources[0].symbol == "main"
