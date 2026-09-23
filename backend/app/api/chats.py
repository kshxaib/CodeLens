import json
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db, SessionLocal
from app.db.models import User, Repository, Conversation, Message
from app.api.auth import get_current_user
from app.api.repositories import get_user_repository_access
from app.core.security import decrypt_api_key
from app.schemas.chat import (
    MessageCreate,
    MessageRead,
    ConversationRead,
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationCreate,
    ChatStreamRequest,
)
from app.rag.service import stream_chat_response

router = APIRouter(prefix="/repositories/{repository_id}/chats", tags=["Chat & Copilot"])


@router.get("", response_model=ConversationListResponse, summary="List Repository Chat Threads")
async def list_conversations(
    repository_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lists all active chat threads for the specified repository and user."""
    repo = get_user_repository_access(repository_id, current_user, db)

    conversations = (
        db.query(Conversation)
        .filter(
            Conversation.repository_id == repo.id,
            Conversation.user_id == current_user.id,
        )
        .order_by(Conversation.updated_at.desc())
        .all()
    )

    conv_list = []
    for c in conversations:
        msg_count = db.query(Message).filter(Message.conversation_id == c.id).count()
        conv_list.append(
            ConversationRead(
                id=c.id,
                repository_id=c.repository_id,
                user_id=c.user_id,
                title=c.title,
                message_count=msg_count,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
        )

    return {"conversations": conv_list, "total": len(conv_list)}


@router.post("", response_model=ConversationRead, summary="Create New Chat Thread")
async def create_conversation(
    repository_id: int,
    payload: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Creates a new threaded conversation for the repository."""
    repo = get_user_repository_access(repository_id, current_user, db)

    title = (payload.title or "New Chat").strip()
    if not title:
        title = "New Chat"

    conv = Conversation(
        repository_id=repo.id,
        user_id=current_user.id,
        title=title[:255],
    )
    db.add(conv)
    db.commit()
    db.refresh(conv)

    return ConversationRead(
        id=conv.id,
        repository_id=conv.repository_id,
        user_id=conv.user_id,
        title=conv.title,
        message_count=0,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
    )


@router.get("/{chat_id}", response_model=ConversationDetailResponse, summary="Get Chat Thread Details")
async def get_conversation(
    repository_id: int,
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetches a specific conversation thread along with its message history and citations."""
    repo = get_user_repository_access(repository_id, current_user, db)

    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == chat_id,
            Conversation.repository_id == repo.id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )

    msg_reads = [
        MessageRead(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            sources=m.sources or [],
            created_at=m.created_at,
        )
        for m in messages
    ]

    return ConversationDetailResponse(
        id=conv.id,
        repository_id=conv.repository_id,
        user_id=conv.user_id,
        title=conv.title,
        message_count=len(msg_reads),
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        messages=msg_reads,
    )


@router.delete("/{chat_id}", summary="Delete Chat Thread")
async def delete_conversation(
    repository_id: int,
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deletes a conversation thread and all its messages."""
    repo = get_user_repository_access(repository_id, current_user, db)

    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == chat_id,
            Conversation.repository_id == repo.id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    db.delete(conv)
    db.commit()

    return {"detail": "Conversation deleted successfully."}


@router.post("/{chat_id}/stream", summary="Stream Real-Time SSE Chat Response")
async def stream_chat(
    repository_id: int,
    chat_id: int,
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submits a developer prompt to a specific chat thread and streams the
    grounded Gemini Copilot response via Server-Sent Events (SSE).
    """
    repo = get_user_repository_access(repository_id, current_user, db)

    # 1. Verify BYOK Gemini API key
    if not current_user.gemini_api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API key is required. Please configure your key in User Settings.",
        )

    try:
        user_gemini_key = decrypt_api_key(current_user.gemini_api_key)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to decrypt Gemini API key. Please re-enter your key in Settings.",
        )

    # 2. Verify conversation
    conv = (
        db.query(Conversation)
        .filter(
            Conversation.id == chat_id,
            Conversation.repository_id == repo.id,
            Conversation.user_id == current_user.id,
        )
        .first()
    )
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    # 3. If conversation is default titled, update with first query words
    question_text = payload.content.strip()
    if conv.title == "New Chat":
        auto_title = question_text[:40] + ("..." if len(question_text) > 40 else "")
        conv.title = auto_title
        db.add(conv)

    # 4. Save User Message
    user_msg = Message(
        conversation_id=conv.id,
        role="user",
        content=question_text,
        sources=[],
    )
    db.add(user_msg)
    db.commit()

    # 5. Fetch prior conversation history for context continuity
    past_messages = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in past_messages]

    # 6. Stream generator wrapper that persists assistant message on completion
    async def sse_event_generator():
        saved = False
        async for sse_chunk in stream_chat_response(
            repository_id=repo.id,
            repo_full_name=repo.full_name,
            question=question_text,
            user_gemini_key=user_gemini_key,
            conversation_history=history,
        ):
            yield sse_chunk

            # Check if event is 'done' to save assistant message
            if "event: done" in sse_chunk and not saved:
                try:
                    data_str = sse_chunk.split("data: ")[1].strip()
                    payload_data = json.loads(data_str)
                    full_resp = payload_data.get("full_response", "")
                    citations = payload_data.get("citations", [])

                    # Persist assistant response
                    with SessionLocal() as write_db:
                        assistant_msg = Message(
                            conversation_id=conv.id,
                            role="assistant",
                            content=full_resp,
                            sources=citations,
                        )
                        write_db.add(assistant_msg)
                        target_conv = write_db.query(Conversation).filter(Conversation.id == conv.id).first()
                        if target_conv:
                            target_conv.updated_at = datetime.now(timezone.utc)
                        write_db.commit()
                        saved = True
                except Exception as ex:
                    print(f"[!] Error saving assistant message: {ex}")

    return StreamingResponse(
        sse_event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
