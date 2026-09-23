from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "CodeLens"
    assert data["status"] == "online"


def test_api_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "CodeLens"
    assert data["version"] == "1.0.0"
    assert "database" in data
    assert data["database"]["status"] == "connected"
    assert data["database"]["engine"] == "PostgreSQL"
    assert "vector_db" in data
    assert data["vector_db"]["status"] == "connected"
    assert data["vector_db"]["engine"] == "Qdrant"


def test_api_health_subroutes():
    # Test /api/health/db
    db_resp = client.get("/api/health/db")
    assert db_resp.status_code == 200
    assert db_resp.json()["status"] == "connected"

    # Test /api/health/qdrant
    qdrant_resp = client.get("/api/health/qdrant")
    assert qdrant_resp.status_code == 200
    assert qdrant_resp.json()["status"] == "connected"
