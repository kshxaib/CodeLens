import re
import json
import asyncio
from typing import AsyncGenerator, List, Dict, Any, Optional
from openai import OpenAI, APIError, RateLimitError

from app.rag.retriever import retrieve_context
from app.rag.prompts import (
    build_system_prompt,
    build_user_prompt,
    parse_citations_from_response,
    is_conversational_query,
)

CANDIDATE_CHAT_MODELS = [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4.1-mini",
    "gpt-3.5-turbo",
]


def format_sse_event(event: str, data: Dict[str, Any]) -> str:
    """Formats a single Server-Sent Event (SSE) message."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def stream_chat_response(
    repository_id: int,
    repo_full_name: str,
    question: str,
    user_openai_key: Optional[str] = None,
    user_gemini_key: Optional[str] = None,
    conversation_history: Optional[List[Dict[str, Any]]] = None,
    model_name: Optional[str] = None,
    limit_context_chunks: int = 6,
) -> AsyncGenerator[str, None]:
    """
    Asynchronously streams the grounded AI Copilot response for a question using OpenAI.
    Yields standard Server-Sent Event strings:
    - `status`: Progress steps (retrieving, generating)
    - `token`: Individual streamed text tokens
    - `done`: Final structured payload with extracted citations & full text
    - `error`: Error details if generation fails
    """
    full_response_text = ""
    retrieved_chunks: List[Dict[str, Any]] = []
    active_api_key = user_openai_key or user_gemini_key or ""

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

            # Query contextualization for pronoun references ("is that", "these", "this", "it", etc.)
            search_query = question.strip()
            if conversation_history:
                last_user_messages = [
                    m.get("content", "").strip()
                    for m in conversation_history
                    if m.get("role") == "user" and m.get("content", "").strip()
                ]
                if last_user_messages:
                    prev_question = last_user_messages[-1]
                    lower_q = question.lower()
                    pronouns = {"this", "that", "these", "those", "it", "its", "they", "them", "here", "there"}
                    tokens = set(re.findall(r"\b\w+\b", lower_q))
                    if tokens.intersection(pronouns) or len(tokens) <= 6:
                        search_query = f"{prev_question} {question}".strip()

            retrieved_chunks = retrieve_context(
                repository_id=repository_id,
                query=search_query,
                user_openai_key=active_api_key,
                limit=limit_context_chunks,
            )

            yield format_sse_event("status", {
                "status": "generating",
                "message": f"Analyzing {len(retrieved_chunks)} context chunks with OpenAI...",
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
        if active_api_key.startswith("sk-MOCK_") or active_api_key.startswith("AIzaSy_MOCK_"):
            mock_tokens = [
                "Hello! " if is_conversational else "Based on the codebase, ",
                "I am CodeLens Copilot powered by OpenAI. " if is_conversational else "the implementation is in ",
                "How can I help you today?" if is_conversational else "[cite:backend/app/api/auth.py:25-50].",
            ]
            for tok in mock_tokens:
                full_response_text += tok
                yield format_sse_event("token", {"token": tok})
                await asyncio.sleep(0.01)
        else:
            # Live OpenAI Client streaming with fallback model support
            client = OpenAI(api_key=active_api_key)

            messages = [
                {"role": "system", "content": system_instruction},
            ]
            if conversation_history:
                for h in conversation_history[-6:]:
                    messages.append({
                        "role": h.get("role", "user"),
                        "content": h.get("content", ""),
                    })
            messages.append({"role": "user", "content": user_prompt})

            models_to_try = [model_name] if model_name else CANDIDATE_CHAT_MODELS
            stream_success = False
            last_err: Optional[Exception] = None

            for m in models_to_try:
                try:
                    response_stream = client.chat.completions.create(
                        model=m,
                        messages=messages,
                        stream=True,
                        temperature=0.7 if is_conversational else 0.2,
                    )

                    chunk_received = False
                    for chunk in response_stream:
                        delta = chunk.choices[0].delta if chunk.choices else None
                        if delta and delta.content:
                            chunk_received = True
                            full_response_text += delta.content
                            yield format_sse_event("token", {"token": delta.content})
                            await asyncio.sleep(0)

                    if chunk_received or full_response_text:
                        stream_success = True
                        break
                except Exception as ex:
                    last_err = ex
                    print(f"[!] OpenAI model {m} failed: {ex}. Checking fallback...")
                    if full_response_text:
                        # Tokens already yielded to client; don't restart mid-stream
                        break
                    continue

            if not stream_success and not full_response_text:
                raise last_err or RuntimeError("All candidate OpenAI models failed to generate content.")

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
            "message": f"OpenAI Streaming Error: {error_msg}",
        })
