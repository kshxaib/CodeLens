import pytest
from unittest.mock import MagicMock, patch
from app.rag.prompts import (
    build_system_prompt,
    build_user_prompt,
    parse_citations_from_response,
)
from app.rag.retriever import retrieve_context


def test_build_system_prompt():
    prompt = build_system_prompt("kshxaib/CodeLens")
    assert "kshxaib/CodeLens" in prompt
    assert "[cite:file_path:start_line-end_line]" in prompt
    assert "CRITICAL GROUNDING" in prompt


def test_build_user_prompt_with_history_and_chunks():
    history = [
        {"role": "user", "content": "How does auth work?"},
        {"role": "assistant", "content": "Auth uses JWT tokens."},
    ]
    chunks = [
        {
            "file_path": "backend/app/core/security.py",
            "start_line": 10,
            "end_line": 35,
            "language": "python",
            "content": "def create_access_token(data: dict): ...",
            "symbols": [{"name": "create_access_token", "kind": "function"}],
        }
    ]
    question = "Where is token expiration defined?"
    prompt = build_user_prompt(question, chunks, history)

    assert "### PREVIOUS CONVERSATION HISTORY:" in prompt
    assert "**User:** How does auth work?" in prompt
    assert "**Assistant:** Auth uses JWT tokens." in prompt
    assert "backend/app/core/security.py" in prompt
    assert "Lines 10-35" in prompt
    assert "create_access_token" in prompt
    assert "### DEVELOPER QUESTION:" in prompt
    assert "Where is token expiration defined?" in prompt


def test_build_user_prompt_empty_chunks():
    prompt = build_user_prompt("What is this repo?", [], None)
    assert "_No directly matching code chunks found" in prompt
    assert "What is this repo?" in prompt


def test_parse_citations_explicit_tags():
    response = (
        "The JWT token is created in [cite:backend/app/core/security.py:10-35] and verified in "
        "[cite:backend/app/api/auth.py:42]."
    )
    chunks = [
        {
            "file_path": "backend/app/core/security.py",
            "symbols": [{"name": "create_access_token", "kind": "function"}],
            "content": "def create_access_token(data: dict): pass",
        },
        {
            "file_path": "backend/app/api/auth.py",
            "symbols": [{"name": "login", "kind": "function"}],
            "content": "def login(): pass",
        },
    ]

    citations = parse_citations_from_response(response, chunks)
    assert len(citations) == 2
    assert citations[0]["file_path"] == "backend/app/core/security.py"
    assert citations[0]["start_line"] == 10
    assert citations[0]["end_line"] == 35
    assert citations[0]["symbol"] == "create_access_token"
    assert citations[1]["file_path"] == "backend/app/api/auth.py"
    assert citations[1]["start_line"] == 42
    assert citations[1]["end_line"] == 42
    assert citations[1]["symbol"] == "login"


def test_parse_citations_fallback_chunks():
    response = "This repository uses FastAPI with SQLAlchemy."
    chunks = [
        {
            "file_path": "backend/app/main.py",
            "start_line": 1,
            "end_line": 20,
            "symbols": [{"name": "app", "kind": "variable"}],
            "content": "app = FastAPI()",
        }
    ]

    citations = parse_citations_from_response(response, chunks)
    assert len(citations) == 1
    assert citations[0]["file_path"] == "backend/app/main.py"
    assert citations[0]["start_line"] == 1
    assert citations[0]["end_line"] == 20
    assert citations[0]["symbol"] == "app"


@patch("app.rag.retriever.generate_embedding")
@patch("app.rag.retriever.search_code")
def test_retrieve_context(mock_search_code, mock_generate_embedding):
    mock_generate_embedding.return_value = [0.1] * 768
    mock_search_code.return_value = [
        {
            "chunk_id": "chunk_1",
            "file_path": "src/index.ts",
            "content": "console.log('hi')",
            "score": 0.95,
        }
    ]

    res = retrieve_context(
        repository_id=1,
        query="where is index",
        user_gemini_key="AIzaFakeKey123",
        limit=5,
    )

    assert len(res) == 1
    assert res[0]["file_path"] == "src/index.ts"
    mock_generate_embedding.assert_called_once_with("where is index", "AIzaFakeKey123")
    mock_search_code.assert_called_once_with(
        repository_id=1,
        query_vector=[0.1] * 768,
        limit=5,
    )


def test_retrieve_context_empty_query():
    res = retrieve_context(1, "   ", "AIzaFakeKey123")
    assert res == []
