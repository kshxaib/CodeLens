import json
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import engine
from app.db.models import User, Repository, RepositoryAccess, Conversation, Message
from app.core.security import create_access_token, encrypt_api_key

client = TestClient(app)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def chat_context():
    session = TestSession()
    encrypted_key = encrypt_api_key("AIzaSy_MOCK_TEST_KEY_SecretChat123")
    user = User(
        github_id=666601,
        username="chat_tester",
        email="chat_test@codelens.dev",
        gemini_api_key=encrypted_key,
    )
    session.add(user)
    session.flush()

    repo = Repository(
        github_id=666602,
        name="CodeLens-Chat-Demo",
        full_name="kshxaib/CodeLens-Chat-Demo",
        owner="kshxaib",
        html_url="https://github.com/kshxaib/CodeLens-Chat-Demo",
        clone_url="https://github.com/kshxaib/CodeLens-Chat-Demo.git",
        default_branch="main",
        index_status="indexed",
    )
    session.add(repo)
    session.flush()

    access = RepositoryAccess(user_id=user.id, repository_id=repo.id, permission="admin")
    session.add(access)
    session.commit()
    session.refresh(user)
    session.refresh(repo)

    token = create_access_token({"sub": str(user.id), "username": user.username})
    client.cookies.set("session_token", token)

    yield {"user": user, "repo": repo, "token": token, "session": session}

    # Cleanup
    session.query(Message).filter(Message.conversation_id.in_(
        session.query(Conversation.id).filter(Conversation.repository_id == repo.id)
    )).delete(synchronize_session=False)
    session.query(Conversation).filter_by(repository_id=repo.id).delete()
    session.query(RepositoryAccess).filter_by(repository_id=repo.id).delete()
    session.query(Repository).filter_by(id=repo.id).delete()
    session.query(User).filter_by(id=user.id).delete()
    session.commit()
    session.close()


def test_create_and_list_conversations(chat_context):
    repo = chat_context["repo"]

    # 1. Create conversation
    res = client.post(f"/api/repositories/{repo.id}/chats", json={"title": "Auth Architecture Discussion"})
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "Auth Architecture Discussion"
    assert data["repository_id"] == repo.id
    conv_id = data["id"]

    # 2. List conversations
    res = client.get(f"/api/repositories/{repo.id}/chats")
    assert res.status_code == 200
    list_data = res.json()
    assert list_data["total"] == 1
    assert list_data["conversations"][0]["id"] == conv_id


def test_get_conversation_detail(chat_context):
    repo = chat_context["repo"]
    user = chat_context["user"]
    session = chat_context["session"]

    conv = Conversation(repository_id=repo.id, user_id=user.id, title="Detail Thread")
    session.add(conv)
    session.flush()

    msg1 = Message(conversation_id=conv.id, role="user", content="Where is the JWT logic?")
    msg2 = Message(
        conversation_id=conv.id,
        role="assistant",
        content="It is in security.py [cite:backend/app/core/security.py:10-30]",
        sources=[{"file_path": "backend/app/core/security.py", "start_line": 10, "end_line": 30}],
    )
    session.add_all([msg1, msg2])
    session.commit()

    res = client.get(f"/api/repositories/{repo.id}/chats/{conv.id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["title"] == "Detail Thread"
    assert len(detail["messages"]) == 2
    assert detail["messages"][0]["role"] == "user"
    assert detail["messages"][1]["role"] == "assistant"
    assert len(detail["messages"][1]["sources"]) == 1


def test_delete_conversation(chat_context):
    repo = chat_context["repo"]
    user = chat_context["user"]
    session = chat_context["session"]

    conv = Conversation(repository_id=repo.id, user_id=user.id, title="To Delete")
    session.add(conv)
    session.commit()

    res = client.delete(f"/api/repositories/{repo.id}/chats/{conv.id}")
    assert res.status_code == 200
    assert res.json()["detail"] == "Conversation deleted successfully."

    # Verify 404 after deletion
    res_get = client.get(f"/api/repositories/{repo.id}/chats/{conv.id}")
    assert res_get.status_code == 404


@patch("app.rag.service.retrieve_context")
def test_stream_chat_endpoint(mock_retrieve, chat_context):
    repo = chat_context["repo"]
    mock_retrieve.return_value = [
        {
            "file_path": "backend/app/api/auth.py",
            "start_line": 25,
            "end_line": 50,
            "symbols": [{"name": "login", "kind": "function"}],
            "content": "def login(): pass",
        }
    ]

    # Create conversation first
    res = client.post(f"/api/repositories/{repo.id}/chats", json={"title": "New Chat"})
    conv_id = res.json()["id"]

    # Stream message
    res = client.post(
        f"/api/repositories/{repo.id}/chats/{conv_id}/stream",
        json={"content": "How does login work?"},
    )
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]
    text = res.text
    assert "event: status" in text
    assert "event: token" in text
    assert "event: done" in text


def test_stream_chat_missing_gemini_key(chat_context):
    repo = chat_context["repo"]
    session = chat_context["session"]

    # Create user without key
    user_no_key = User(
        github_id=666603,
        username="nokeyuser",
        email="nokey@codelens.dev",
        gemini_api_key=None,
    )
    session.add(user_no_key)
    session.flush()

    access = RepositoryAccess(user_id=user_no_key.id, repository_id=repo.id, permission="read")
    conv = Conversation(repository_id=repo.id, user_id=user_no_key.id, title="Thread No Key")
    session.add_all([access, conv])
    session.commit()

    token_no_key = create_access_token({"sub": str(user_no_key.id), "username": user_no_key.username})
    client.cookies.set("session_token", token_no_key)

    res = client.post(
        f"/api/repositories/{repo.id}/chats/{conv.id}/stream",
        json={"content": "Hello without key"},
    )
    assert res.status_code == 400
    assert "Gemini API key is required" in res.json()["detail"]

    # Cleanup user_no_key
    session.query(Conversation).filter_by(id=conv.id).delete()
    session.query(RepositoryAccess).filter_by(user_id=user_no_key.id).delete()
    session.query(User).filter_by(id=user_no_key.id).delete()
    session.commit()
