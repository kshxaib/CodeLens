import os
from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from cryptography.fernet import Fernet


class Settings(BaseSettings):
    PROJECT_NAME: str = "CodeLens"
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api"

    # Database & Vector DB
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/codelens"
    QDRANT_URL: str = "http://localhost:6333"

    # Security & BYOK Encryption (Fernet 32-byte Base64 key)
    ENCRYPTION_SECRET_KEY: str = ""

    # JWT Authentication
    JWT_SECRET_KEY: str = "codelens-dev-jwt-secret-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # GitHub OAuth App Credentials
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""

    # Frontend URL & CORS
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    def get_encryption_key(self) -> bytes:
        """Returns the encryption key in bytes. Generates a fallback key if not set."""
        if self.ENCRYPTION_SECRET_KEY:
            return self.ENCRYPTION_SECRET_KEY.encode()
        # Fallback deterministic key for dev/test if not supplied
        return b"Z1NqZ1k5T215RjEwTFk2Q1I0VDFhV253T0pQeDRZdTQ="


settings = Settings()
