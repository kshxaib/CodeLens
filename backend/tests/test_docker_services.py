from fastapi.testclient import TestClient
from app.main import app
from app.db.session import check_db_connection

client = TestClient(app)


def test_live_postgres_container():
    """Verify live connection to PostgreSQL in Docker container."""
    is_connected = check_db_connection()
    assert is_connected is True, "PostgreSQL database in Docker container should be reachable"

    response = client.get("/api/health/db")
    assert response.status_code == 200
    assert response.json()["status"] == "connected"
    assert "latency_ms" in response.json()


def test_live_qdrant_container():
    """Verify live connection to Qdrant in Docker container."""
    response = client.get("/api/health/qdrant")
    assert response.status_code == 200
    assert response.json()["status"] == "connected"
    assert "latency_ms" in response.json()


def test_live_unified_health_keepalive():
    """Verify live /api/health endpoint pings both PostgreSQL and Qdrant in a single call."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"]["status"] == "connected"
    assert data["vector_db"]["status"] == "connected"
