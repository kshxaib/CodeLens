import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Locate and load .env file from backend directory, fallback to root
backend_dir = Path(__file__).resolve().parent.parent.parent
env_file = backend_dir / ".env"

if env_file.exists():
    load_dotenv(dotenv_path=env_file)
else:
    root_env = backend_dir.parent / ".env"
    if root_env.exists():
        load_dotenv(dotenv_path=root_env)
    else:
        load_dotenv()

PROJECT_NAME: str = os.getenv("PROJECT_NAME", "CodeLens")
ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
API_V1_STR: str = os.getenv("API_V1_STR", "/api")

# Database & Vector DB
DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/codelens")
QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")

# Security & BYOK Encryption (Fernet 32-byte Base64 key)
ENCRYPTION_SECRET_KEY: str = os.getenv("ENCRYPTION_SECRET_KEY", "")

# JWT Authentication
JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "codelens-dev-jwt-secret-change-in-production")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

# GitHub OAuth App Credentials
GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")

# Frontend URL & CORS
FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

_cors_origins_raw = os.getenv("BACKEND_CORS_ORIGINS", "")
if _cors_origins_raw:
    try:
        BACKEND_CORS_ORIGINS: list[str] = json.loads(_cors_origins_raw)
    except Exception:
        BACKEND_CORS_ORIGINS = [item.strip() for item in _cors_origins_raw.split(",") if item.strip()]
else:
    BACKEND_CORS_ORIGINS = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


def get_encryption_key() -> bytes:
    """Returns the encryption key in bytes. Generates a fallback key if not set."""
    if ENCRYPTION_SECRET_KEY:
        return ENCRYPTION_SECRET_KEY.encode()
    return b"Z1NqZ1k5T215RjEwTFk2Q1I0VDFhV253T0pQeDRZdTQ="
