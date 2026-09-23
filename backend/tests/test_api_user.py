import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import engine
from app.db.models import User
from app.core.security import create_access_token, decrypt_api_key

client = TestClient(app)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def auth_user():
    session = TestSession()
    user = User(
        github_id=666601,
        username="gemini_user_test",
        email="gemini_user@codelens.dev",
        avatar_url="https://avatars.githubusercontent.com/u/666601",
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    yield user

    # Cleanup
    session.delete(user)
    session.commit()
    session.close()


def test_user_profile_endpoints(auth_user):
    token = create_access_token({"sub": str(auth_user.id), "username": auth_user.username})
    client.cookies.set("session_token", token)

    # 1. Initially user has no Gemini key
    get_res = client.get("/api/user/profile")
    assert get_res.status_code == 200
    profile = get_res.json()
    assert profile["username"] == "gemini_user_test"
    assert profile["has_gemini_key"] is False
    assert profile["masked_gemini_key"] is None

    # 2. Add Gemini Key (using mock test prefix)
    mock_key = "AIzaSy_MOCK_TEST_KEY_SecretValue9876543210"
    put_res = client.put("/api/user/gemini-key", json={"api_key": mock_key})
    assert put_res.status_code == 200
    key_data = put_res.json()
    assert key_data["status"] == "verified"
    assert key_data["has_key"] is True
    assert key_data["masked_key"].startswith("AIzaSy")
    assert "SecretValue" not in key_data["masked_key"]

    # 3. Verify Database stores encrypted key (not plain text)
    session = TestSession()
    db_user = session.query(User).filter_by(id=auth_user.id).first()
    assert db_user.gemini_api_key != mock_key
    assert decrypt_api_key(db_user.gemini_api_key) == mock_key
    session.close()

    # 4. Fetch profile again - should show has_gemini_key = True
    get_res2 = client.get("/api/user/profile")
    assert get_res2.status_code == 200
    assert get_res2.json()["has_gemini_key"] is True
    assert get_res2.json()["masked_gemini_key"] is not None

    # 5. Delete Gemini Key
    del_res = client.delete("/api/user/gemini-key")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "removed"
    assert del_res.json()["has_key"] is False

    # 6. Verify Database is cleared
    session = TestSession()
    db_user_after = session.query(User).filter_by(id=auth_user.id).first()
    assert db_user_after.gemini_api_key is None
    session.close()
