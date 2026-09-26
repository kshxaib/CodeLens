import json
import pytest
from unittest.mock import MagicMock, patch
from app.rag.service import format_sse_event, stream_chat_response


def test_format_sse_event():
    evt = format_sse_event("token", {"token": "hello"})
    assert evt == 'event: token\ndata: {"token": "hello"}\n\n'


@pytest.mark.asyncio
@patch("app.rag.service.retrieve_context")
async def test_stream_chat_response_mock_mode(mock_retrieve):
    mock_retrieve.return_value = [
        {
            "file_path": "backend/app/api/auth.py",
            "start_line": 25,
            "end_line": 50,
            "symbols": [{"name": "login", "kind": "function"}],
            "content": "def login(): pass",
        }
    ]

    events = []
    async for item in stream_chat_response(
        repository_id=1,
        repo_full_name="kshxaib/CodeLens",
        question="How does auth work?",
        user_gemini_key="AIzaSy_MOCK_TEST_KEY_test",
    ):
        events.append(item)

    assert len(events) >= 5
    assert any("event: status" in e and "retrieving" in e for e in events)
    assert any("event: status" in e and "generating" in e for e in events)
    assert any("event: token" in e for e in events)
    assert any("event: done" in e for e in events)

    # Check done event payload
    done_events = [e for e in events if "event: done" in e]
    assert len(done_events) == 1
    data = json.loads(done_events[0].split("data: ")[1].strip())
    assert "citations" in data
    assert len(data["citations"]) >= 1
    assert data["citations"][0]["file_path"] == "backend/app/api/auth.py"
    assert data["context_chunks_count"] == 1


@pytest.mark.asyncio
@patch("app.rag.service.retrieve_context")
@patch("app.rag.service.OpenAI")
async def test_stream_chat_response_live_client(mock_client_cls, mock_retrieve):
    mock_retrieve.return_value = []

    # Mock OpenAI streaming client
    chunk1 = MagicMock()
    chunk1.choices = [MagicMock()]
    chunk1.choices[0].delta.content = "Here is the "
    chunk2 = MagicMock()
    chunk2.choices = [MagicMock()]
    chunk2.choices[0].delta.content = "answer to your question."
    mock_instance = MagicMock()
    mock_instance.chat.completions.create.return_value = [chunk1, chunk2]
    mock_client_cls.return_value = mock_instance

    events = []
    async for item in stream_chat_response(
        repository_id=1,
        repo_full_name="kshxaib/CodeLens",
        question="What is this repository?",
        user_openai_key="sk-real-live-key-12345",
    ):
        events.append(item)

    assert any("event: token" in e and "Here is the " in e for e in events)
    assert any("event: done" in e for e in events)


@pytest.mark.asyncio
@patch("app.rag.service.retrieve_context")
async def test_stream_chat_response_error_handling(mock_retrieve):
    mock_retrieve.side_effect = Exception("Qdrant connection timeout")

    events = []
    async for item in stream_chat_response(
        repository_id=1,
        repo_full_name="kshxaib/CodeLens",
        question="Test error",
        user_gemini_key="AIzaSy_MOCK_TEST_KEY_test",
    ):
        events.append(item)

    error_events = [e for e in events if "event: error" in e]
    assert len(error_events) == 1
    data = json.loads(error_events[0].split("data: ")[1].strip())
    assert "Qdrant connection timeout" in data["error"]
