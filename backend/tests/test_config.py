from app.core.config import settings


def test_settings_defaults():
    assert settings.PROJECT_NAME == "CodeLens"
    assert settings.API_V1_STR == "/api"
    assert "localhost" in settings.DATABASE_URL
    assert "6333" in settings.QDRANT_URL
    assert len(settings.BACKEND_CORS_ORIGINS) > 0


def test_encryption_key_retrieval():
    key = settings.get_encryption_key()
    assert isinstance(key, bytes)
    assert len(key) > 0
