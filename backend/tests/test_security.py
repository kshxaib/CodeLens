import time
from datetime import timedelta
from app.core.security import (
    encrypt_api_key,
    decrypt_api_key,
    mask_api_key,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


def test_encrypt_decrypt_roundtrip():
    sample_key = "AIzaSyTestApiKey1234567890abcdefGHIJKLMN"
    encrypted = encrypt_api_key(sample_key)

    assert encrypted != sample_key
    assert len(encrypted) > len(sample_key)

    decrypted = decrypt_api_key(encrypted)
    assert decrypted == sample_key


def test_encrypt_empty_or_none():
    assert encrypt_api_key("") == ""
    assert decrypt_api_key("") == ""
    assert decrypt_api_key("invalid_corrupted_ciphertext") == ""


def test_mask_api_key():
    sample_key = "AIzaSyTestApiKey1234567890abcdefGHIJ"
    masked = mask_api_key(sample_key)

    assert masked.startswith("AIzaSy")
    assert masked.endswith("GHIJ")
    assert "••••••••" in masked
    assert "TestApiKey" not in masked

    assert mask_api_key("") == ""
    assert mask_api_key("short") == "••••••••"


def test_jwt_create_and_decode():
    payload = {"sub": "12345", "username": "shoaib", "role": "admin"}
    token = create_access_token(payload, expires_delta=timedelta(minutes=15))

    assert isinstance(token, str)
    decoded = decode_access_token(token)

    assert decoded is not None
    assert decoded["sub"] == "12345"
    assert decoded["username"] == "shoaib"
    assert "exp" in decoded


def test_jwt_expired():
    payload = {"sub": "12345"}
    # Token already expired
    token = create_access_token(payload, expires_delta=timedelta(seconds=-10))
    decoded = decode_access_token(token)
    assert decoded is None


def test_password_hash():
    password = "SuperSecretPassword123!"
    hashed = get_password_hash(password)

    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
