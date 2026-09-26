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
    is_conversational_query,
)

CANDIDATE_CHAT_MODELS = [
    "gemini-flash-latest",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
]


def format_sse_event(event: str, data: Dict[str, Any]) -> str:
    """Formats a single Server-Sent Event (SSE) message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def stream_chat_response(
    repository_id: int,
    repo_full_name: str,
    question: str,
    user_gemini_key: str,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    model_name: Optional[str] = None,
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
        # Step 1: Detect intent (conversational greeting vs technical codebase query)
        is_conversational = is_conversational_query(question)

        if is_conversational:
            # For casual greetings, skip heavy vector retrieval
            yield format_sse_event("status", {
                "status": "generating",
                "message": "CodeLens Copilot thinking...",
                "context_chunks_count": 0,
            })
        else:
            # Step 2: Technical query - retrieve codebase context chunks
            yield format_sse_event("status", {
                "status": "retrieving",
                "message": "Retrieving relevant codebase context from vector store...",
            })

            retrieved_chunks = retrieve_context(
                repository_id=repository_id,
                query=question,
                user_gemini_key=user_gemini_key,
                limit=limit_context_chunks,
            )

            yield format_sse_event("status", {
                "status": "generating",
                "message": f"Analyzing {len(retrieved_chunks)} context chunks with Gemini...",
                "context_chunks_count": len(retrieved_chunks),
            })

        # Step 3: Build prompts with intent awareness
        system_instruction = build_system_prompt(repo_full_name, is_conversational=is_conversational)
        user_prompt = build_user_prompt(
            question,
            retrieved_chunks,
            conversation_history,
            is_conversational=is_conversational,
        )

        # Mock mode for testing
        if user_gemini_key.startswith("AIzaSy_MOCK_TEST_KEY_"):
            mock_tokens = [
                "Hello! " if is_conversational else "Based on the codebase, ",
                "I am CodeLens Copilot. " if is_conversational else "the implementation is in ",
                "How can I help you today?" if is_conversational else "[cite:backend/app/api/auth.py:25-50].",
            ]
            for tok in mock_tokens:
                full_response_text += tok
                yield format_sse_event("token", {"token": tok})
                await asyncio.sleep(0.01)
        else:
            # Live Google Gemini Client streaming with fallback model support
            client = genai.Client(api_key=user_gemini_key)
            config = types.GenerateContentConfig(
                system_instruction=system_instruction,
                temperature=0.7 if is_conversational else 0.2,
                top_p=0.95,
            )

            models_to_try = [model_name] if model_name else CANDIDATE_CHAT_MODELS
            stream_success = False
            last_err: Optional[Exception] = None

            for m in models_to_try:
                try:
                    response_stream = client.models.generate_content_stream(
                        model=m,
                        contents=user_prompt,
                        config=config,
                    )

                    chunk_received = False
                    for chunk in response_stream:
                        if chunk and chunk.text:
                            chunk_received = True
                            full_response_text += chunk.text
                            yield format_sse_event("token", {"token": chunk.text})
                            await asyncio.sleep(0)

                    if chunk_received or full_response_text:
                        stream_success = True
                        break
                except Exception as ex:
                    last_err = ex
                    print(f"[!] Gemini model {m} failed: {ex}. Checking fallback...")
                    if full_response_text:
                        # Tokens already yielded to client; don't restart mid-stream
                        break
                    continue

            if not stream_success and not full_response_text:
                raise last_err or RuntimeError("All candidate Gemini models failed to generate content.")

        # Step 4: Extract citations & finalize
        citations = parse_citations_from_response(
            full_response_text,
            retrieved_chunks,
            is_conversational=is_conversational,
        )

        yield format_sse_event("done", {
            "full_response": full_response_text,
            "citations": citations,
            "context_chunks_count": len(retrieved_chunks),
            "is_conversational": is_conversational,
        })

    except Exception as e:
        error_msg = str(e)
        yield format_sse_event("error", {
            "error": error_msg,
            "message": f"Gemini Streaming Error: {error_msg}",
        })
