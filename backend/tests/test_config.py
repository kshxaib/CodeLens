from app.core import config


def test_config_defaults():
    assert config.PROJECT_NAME == "CodeLens"
    assert config.API_V1_STR == "/api"
    assert "localhost" in config.DATABASE_URL
    assert "6333" in config.QDRANT_URL
    assert len(config.BACKEND_CORS_ORIGINS) > 0


def test_encryption_key_retrieval():
    key = config.get_encryption_key()
    assert isinstance(key, bytes)
    assert len(key) > 0
