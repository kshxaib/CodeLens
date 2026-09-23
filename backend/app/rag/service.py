import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from google import genai
from google.genai import types

from app.rag.retriever import retrieve_context
from app.rag.prompts import (
    build_system_prompt,
    build_user_prompt,
    parse_citations_from_response,
)

DEFAULT_CHAT_MODEL = "gemini-2.0-flash"


def format_sse_event(event: str, data: Dict[str, Any]) -> str:
    """Formats a single Server-Sent Event (SSE) message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def stream_chat_response(
    repository_id: int,
    repo_full_name: str,
    question: str,
    user_gemini_key: str,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    model_name: str = DEFAULT_CHAT_MODEL,
    limit_context_chunks: int = 6,
) -> AsyncGenerator[str, None]:
    """
    Asynchronously streams the grounded AI Copilot response for a question.
    Yields standard Server-Sent Event strings:
    - `status`: Progress steps (retrieving, generating)
    - `token`: Individual streamed text tokens
    - `done`: Final structured payload with extracted citations & full text
    - `error`: Error details if generation fails
    """
    full_response_text = ""
    retrieved_chunks: List[Dict[str, Any]] = []

    try:
        # Step 1: Notify retrieval status
        yield format_sse_event("status", {
            "status": "retrieving",
            "message": "Retrieving relevant codebase context from vector store...",
        })

        # Step 2: Retrieve context chunks
        retrieved_chunks = retrieve_context(
            repository_id=repository_id,
            query=question,
            user_gemini_key=user_gemini_key,
            limit=limit_context_chunks,
        )

        # Step 3: Notify generation status
        yield format_sse_event("status", {
            "status": "generating",
            "message": f"Analyzing {len(retrieved_chunks)} context chunks with Gemini...",
            "context_chunks_count": len(retrieved_chunks),
        })

        # Step 4: Build prompts
        system_instruction = build_system_prompt(repo_full_name)
        user_prompt = build_user_prompt(question, retrieved_chunks, conversation_history)

        # Mock mode for testing
        if user_gemini_key.startswith("AIzaSy_MOCK_TEST_KEY_"):
            mock_tokens = [
                "Based on the codebase, ",
                "the authentication handler is implemented in ",
                "[cite:backend/app/api/auth.py:25-50]. ",
                "It validates GitHub OAuth codes securely.",
            ]
            for tok in mock_tokens:
                full_response_text += tok
                yield format_sse_event("token", {"token": tok})
                await asyncio.sleep(0.01)
        else:
            # Live Google Gemini Client streaming
            client = genai.Client(api_key=user_gemini_key)
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.2,
                top_p=0.95,
            )

            # Generate streaming content
            response_stream = client.models.generate_content_stream(
                model=model_name,
                contents=user_prompt,
                config=config,
            )

            for chunk in response_stream:
                if chunk and chunk.text:
                    full_response_text += chunk.text
                    yield format_sse_event("token", {"token": chunk.text})
                    # Yield to event loop to keep SSE transmission snappy
                    await asyncio.sleep(0)

        # Step 5: Extract citations & finalize
        citations = parse_citations_from_response(full_response_text, retrieved_chunks)

        yield format_sse_event("done", {
            "full_response": full_response_text,
            "citations": citations,
            "context_chunks_count": len(retrieved_chunks),
        })

    except Exception as e:
        error_msg = str(e)
        yield format_sse_event("error", {
            "error": error_msg,
            "message": f"Gemini Streaming Error: {error_msg}",
        })
