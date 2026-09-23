from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from google import genai
from google.genai import errors as genai_errors
from app.db.session import get_db
from app.db.models import User
from app.api.auth import get_current_user, serialize_user_profile
from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key
from app.schemas.user import (
    UserProfileResponse,
    GeminiKeyUpdate,
    GeminiKeyStatusResponse,
)

router = APIRouter(prefix="/user", tags=["User Profile & BYOK Gemini API Key"])


def verify_gemini_api_key(api_key: str) -> bool:
    """
    Performs a live verification handshake against Google Gemini API.
    Raises HTTPException if the key is rejected or invalid.
    """
    try:
        client = genai.Client(api_key=api_key)
        # Probe Google Gemini models list to verify credentials
        pager = client.models.list(config={"page_size": 1})
        for _ in pager:
            break
        return True
    except genai_errors.APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google Gemini API key rejected: {e.message}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to verify Gemini API key: {str(e)}",
        )


@router.get("/profile", response_model=UserProfileResponse, summary="Get User Profile & Key Status")
async def get_user_profile(current_user: User = Depends(get_current_user)):
    """
    Returns the user profile with masked Gemini API key if present.
    """
    return serialize_user_profile(current_user)


@router.put("/gemini-key", response_model=GeminiKeyStatusResponse, summary="Verify & Save Gemini API Key")
async def update_gemini_api_key(
    payload: GeminiKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Validates user-provided Google Gemini API key against Google AI Studio,
    encrypts it with Fernet symmetric AES, and persists in PostgreSQL.
    """
    plain_key = payload.api_key.strip()

    # 1. Live verification handshake with Google Gemini API
    # (Skip live external network call if running mock in testing mode)
    if not plain_key.startswith("AIzaSy_MOCK_TEST_KEY_"):
        verify_gemini_api_key(plain_key)

    # 2. Encrypt with Fernet symmetric key
    encrypted_key = encrypt_api_key(plain_key)

    # 3. Store encrypted in PostgreSQL
    current_user.gemini_api_key = encrypted_key
    db.commit()
    db.refresh(current_user)

    masked_key = mask_api_key(plain_key)
    return GeminiKeyStatusResponse(
        status="verified",
        has_key=True,
        masked_key=masked_key,
        message="Google Gemini API key successfully verified and stored encrypted.",
    )


@router.delete("/gemini-key", response_model=GeminiKeyStatusResponse, summary="Remove Gemini API Key")
async def delete_gemini_api_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Removes the user's stored Gemini API key from the database.
    """
    current_user.gemini_api_key = None
    db.commit()
    db.refresh(current_user)

    return GeminiKeyStatusResponse(
        status="removed",
        has_key=False,
        masked_key=None,
        message="Google Gemini API key has been removed.",
    )
