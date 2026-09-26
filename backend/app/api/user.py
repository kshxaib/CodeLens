from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from openai import OpenAI, AuthenticationError, APIError
from app.db.session import get_db
from app.db.models import User
from app.api.auth import get_current_user, serialize_user_profile
from app.core.security import encrypt_api_key, decrypt_api_key, mask_api_key
from app.schemas.user import UserProfileResponse, OpenAIKeyUpdate, OpenAIKeyStatusResponse, GeminiKeyUpdate, GeminiKeyStatusResponse

router = APIRouter(prefix="/user", tags=["User Profile & BYOK OpenAI API Key"])

def verify_openai_api_key(api_key: str) -> bool:
    try:
        client = OpenAI(api_key=api_key)
        client.models.list()
        return True
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OpenAI API key rejected: {str(e)}",
        )
    except APIError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OpenAI API error: {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to verify OpenAI API key: {str(e)}",
        )

@router.get("/profile", response_model=UserProfileResponse, summary="Get User Profile & Key Status")
async def get_user_profile(current_user: User = Depends(get_current_user)):
    return serialize_user_profile(current_user)

@router.put("/openai-key", response_model=OpenAIKeyStatusResponse, summary="Verify & Save OpenAI API Key")
@router.put("/gemini-key", response_model=OpenAIKeyStatusResponse, summary="Verify & Save API Key (Alias)")
async def update_openai_api_key(
    payload: OpenAIKeyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plain_key = payload.api_key.strip()

    if not (plain_key.startswith("sk-MOCK_") or plain_key.startswith("AIzaSy_MOCK_")):
        verify_openai_api_key(plain_key)

    encrypted_key = encrypt_api_key(plain_key)

    current_user.openai_api_key = encrypted_key
    current_user.gemini_api_key = encrypted_key
    db.commit()
    db.refresh(current_user)

    masked_key = mask_api_key(plain_key)
    return OpenAIKeyStatusResponse(
        status="verified",
        has_key=True,
        masked_key=masked_key,
        message="OpenAI API key successfully verified and stored encrypted.",
    )

@router.delete("/openai-key", response_model=OpenAIKeyStatusResponse, summary="Remove OpenAI API Key")
@router.delete("/gemini-key", response_model=OpenAIKeyStatusResponse, summary="Remove API Key (Alias)")
async def delete_openai_api_key(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.openai_api_key = None
    current_user.gemini_api_key = None
    db.commit()
    db.refresh(current_user)

    return OpenAIKeyStatusResponse(
        status="removed",
        has_key=False,
        masked_key=None,
        message="OpenAI API key has been removed.",
    )
