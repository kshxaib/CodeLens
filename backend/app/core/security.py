from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Union
import bcrypt
from cryptography.fernet import Fernet, InvalidToken
from jose import JWTError, jwt
from app.core.config import (
    get_encryption_key,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_SECRET_KEY,
    JWT_ALGORITHM,
)


def _get_fernet() -> Fernet:
    """Initializes Fernet cipher using configured key."""
    key = get_encryption_key()
    return Fernet(key)


def encrypt_api_key(plain_key: str) -> str:
    """
    Encrypts a plaintext API key using Fernet symmetric encryption.
    Returns URL-safe base64 string.
    """
    if not plain_key:
        return ""
    f = _get_fernet()
    encrypted_bytes = f.encrypt(plain_key.strip().encode("utf-8"))
    return encrypted_bytes.decode("utf-8")


def decrypt_api_key(encrypted_key: str) -> str:
    """
    Decrypts an encrypted API key back to plaintext.
    Returns empty string if token is invalid or corrupted.
    """
    if not encrypted_key:
        return ""
    f = _get_fernet()
    try:
        decrypted_bytes = f.decrypt(encrypted_key.encode("utf-8"))
        return decrypted_bytes.decode("utf-8")
    except (InvalidToken, Exception):
        return ""


def mask_api_key(key: str) -> str:
    """
    Masks an API key for safe display in UI.
    Example: 'AIzaSyBx9876543210AbCdEfGhIj' -> 'AIzaSy••••••••AbCd'
    """
    if not key:
        return ""
    cleaned = key.strip()
    if len(cleaned) <= 8:
        return "••••••••"
    prefix = cleaned[:6]
    suffix = cleaned[-4:]
    return f"{prefix}••••••••{suffix}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Generates bcrypt hash for password."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Creates a signed JWT access token with expiration."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a signed JWT access token."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
