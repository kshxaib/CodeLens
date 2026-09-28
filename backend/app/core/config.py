import os
import json
from pathlib import Path
from dotenv import load_dotenv

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

DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/codelens")
QDRANT_URL: str = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_API_KEY: str = os.getenv("QDRANT_API_KEY", "")

ENCRYPTION_SECRET_KEY: str = os.getenv("ENCRYPTION_SECRET_KEY", "")

JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "codelens-dev-jwt-secret-change-in-production")
JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))

GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")

FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")

_cors_origins_raw = os.getenv("BACKEND_CORS_ORIGINS", "")
if _cors_origins_raw:
    try:
        BACKEND_CORS_ORIGINS: list[str] = json.loads(_cors_origins_raw)
    except Exception:
        BACKEND_CORS_ORIGINS = [item.strip() for item in _cors_origins_raw.split(",") if item.strip()]
else:
    BACKEND_CORS_ORIGINS = []

for dev_origin in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]:
    if dev_origin not in BACKEND_CORS_ORIGINS:
        BACKEND_CORS_ORIGINS.append(dev_origin)

def get_encryption_key() -> bytes:
    fallback_key = b"fQsk50EgvkWL89Tzazno3G-HDmSKbS5wLNZO6vyOBd8="
    if ENCRYPTION_SECRET_KEY:
        try:
            import base64
            key_bytes = ENCRYPTION_SECRET_KEY.strip().encode()
            decoded = base64.urlsafe_b64decode(key_bytes)
            if len(decoded) == 32:
                return key_bytes
        except Exception:
            pass
    return fallback_key
