import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import engine
from app.db.models import User
from app.core.security import create_access_token, encrypt_api_key

client = TestClient(app)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def test_user():
    session = TestSession()
    encrypted_key = encrypt_api_key("AIzaSyTestingAuthToken1234567890")
    user = User(
        github_id=777701,
        username="shoaib_auth_tester",
        email="shoaib_test@codelens.dev",
        avatar_url="https://avatars.githubusercontent.com/u/777701",
        github_access_token="gho_mock_access_token_abc",
        gemini_api_key=encrypted_key,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    yield user

    # Cleanup
    session.delete(user)
    session.commit()
    session.close()


def test_get_github_oauth_url():
    response = client.get("/api/auth/github")
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert "state" in data
    assert "https://github.com/login/oauth/authorize" in data["url"]
    assert "scope=read:user%20repo" in data["url"]


def test_get_me_unauthorized():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_get_me_with_cookie(test_user):
    token = create_access_token({"sub": str(test_user.id), "username": test_user.username})

    # Set cookie in TestClient
    client.cookies.set("session_token", token)
    response = client.get("/api/auth/me")

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "shoaib_auth_tester"
    assert data["has_gemini_key"] is True
    assert data["masked_gemini_key"].startswith("AIzaSy")
    assert "TestingAuthToken" not in data["masked_gemini_key"]


def test_get_me_with_bearer_header(test_user):
    token = create_access_token({"sub": str(test_user.id), "username": test_user.username})
    client.cookies.clear()

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "shoaib_auth_tester"


def test_logout():
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    # Verify cookie was deleted / set to expire
    assert 'session_token=""' in response.headers.get("set-cookie", "") or "session_token=;" in response.headers.get("set-cookie", "")
