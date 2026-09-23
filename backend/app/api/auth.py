import secrets
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
import httpx
from sqlalchemy.orm import Session
from app.core.config import (
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
    FRONTEND_URL,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.core.security import create_access_token, decode_access_token, mask_api_key, decrypt_api_key
from app.db.session import get_db
from app.db.models import User
from app.schemas.auth import GitHubOAuthURLResponse, TokenResponse
from app.schemas.user import UserProfileResponse, UserRead

router = APIRouter(prefix="/auth", tags=["Authentication & OAuth"])


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency resolving authenticated user from HTTP-only session cookie or Bearer token.
    """
    token = request.cookies.get("session_token")
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. No session token found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with session does not exist.",
        )

    return user


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Optional user dependency for public routes that can be personalized."""
    try:
        return get_current_user(request, db)
    except HTTPException:
        return None


def serialize_user_profile(user: User) -> UserProfileResponse:
    """Helper to convert User model to UserProfileResponse with masked Gemini key."""
    decrypted_key = decrypt_api_key(user.gemini_api_key) if user.gemini_api_key else ""
    has_key = bool(decrypted_key)
    masked_key = mask_api_key(decrypted_key) if has_key else None

    return UserProfileResponse(
        id=user.id,
        github_id=user.github_id,
        username=user.username,
        email=user.email,
        avatar_url=user.avatar_url,
        has_gemini_key=has_key,
        masked_gemini_key=masked_key,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/github", summary="Get GitHub OAuth Redirect URL")
async def get_github_oauth_url(redirect_uri: Optional[str] = None, redirect: bool = False):
    """
    Generates GitHub OAuth authorization URL with required scopes (`read:user repo`).
    If redirect=True is passed, automatically performs an HTTP 307 Redirect.
    """
    state = secrets.token_urlsafe(16)
    callback_target = redirect_uri or f"{FRONTEND_URL}/"
    
    oauth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={callback_target}"
        f"&scope=read:user%20repo"
        f"&state={state}"
    )
    if redirect:
        return RedirectResponse(url=oauth_url)
    return {"url": oauth_url, "state": state}


@router.get("/callback", summary="GitHub OAuth Callback")
async def github_callback(
    code: str,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Exchanges authorization code for GitHub access token, fetches user profile,
    upserts User record in PostgreSQL, and sets HTTP-only session cookie.
    """
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth client credentials are not configured on the backend.",
        )

    # 1. Exchange code for GitHub access token
    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
        )
        token_data = token_res.json()

        if "error" in token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"GitHub OAuth error: {token_data.get('error_description', token_data['error'])}",
            )

        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to retrieve access token from GitHub.",
            )

        # 2. Fetch GitHub User Profile
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github.v3+json",
            },
        )
        if user_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch user profile from GitHub API.",
            )

        gh_user = user_res.json()

    # 3. Upsert User in PostgreSQL
    github_id = gh_user["id"]
    username = gh_user["login"]
    avatar_url = gh_user.get("avatar_url")
    email = gh_user.get("email")

    user = db.query(User).filter(User.github_id == github_id).first()
    if not user:
        user = User(
            github_id=github_id,
            username=username,
            email=email,
            avatar_url=avatar_url,
            github_access_token=access_token,
        )
        db.add(user)
    else:
        user.username = username
        user.avatar_url = avatar_url
        user.github_access_token = access_token
        if email:
            user.email = email

    db.commit()
    db.refresh(user)

    # 4. Generate JWT session token
    jwt_token = create_access_token(
        data={"sub": str(user.id), "github_id": user.github_id, "username": user.username}
    )

    # 5. Set secure HTTP-only cookie
    max_age = ACCESS_TOKEN_EXPIRE_MINUTES * 60
    response.set_cookie(
        key="session_token",
        value=jwt_token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=False,  # Set to True in production HTTPS
        path="/",
    )

    profile_resp = serialize_user_profile(user)
    return {
        "access_token": jwt_token,
        "token_type": "bearer",
        "expires_in": max_age,
        "user": profile_resp,
    }


@router.get("/me", response_model=UserProfileResponse, summary="Get Current Authenticated User")
async def get_me(current_user: User = Depends(get_current_user)):
    """
    Returns the currently authenticated user's profile and Gemini BYOK key status.
    """
    return serialize_user_profile(current_user)


@router.post("/logout", summary="Logout User & Invalidate Session")
async def logout(response: Response):
    """
    Logs out the current user by clearing the HTTP-only session cookie.
    """
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully", "status": "success"}
