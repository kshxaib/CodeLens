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
    assert response.json()["connected"] is True


def test_live_qdrant_container():
    """Verify live connection to Qdrant in Docker container."""
    response = client.get("/api/health/qdrant")
    assert response.status_code == 200
    assert response.json()["connected"] is True
