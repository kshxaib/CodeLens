import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker
from app.main import app
from app.db.session import engine
from app.db.models import User, Repository, RepositoryAccess, File
from app.core.security import create_access_token, encrypt_api_key
from app.services.indexer import index_repository

client = TestClient(app)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture
def auth_context():
    session = TestSession()
    encrypted_key = encrypt_api_key("AIzaSy_MOCK_TEST_KEY_SecretRepo123")
    user = User(
        github_id=555501,
        username="shoaib_repo_tester",
        email="repo_test@codelens.dev",
        gemini_api_key=encrypted_key,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    token = create_access_token({"sub": str(user.id), "username": user.username})
    client.cookies.set("session_token", token)

    yield {"user": user, "token": token, "session": session}

    # Cleanup
    session.query(RepositoryAccess).filter_by(user_id=user.id).delete()
    session.delete(user)
    session.commit()
    session.close()


def test_add_and_list_repository(auth_context):
    user = auth_context["user"]

    # 1. Add Repository
    res = client.post("/api/repositories", json={"url": "https://github.com/kshxaib/CodeLens-Demo"})
    assert res.status_code == 200
    repo_data = res.json()
    assert repo_data["name"] == "CodeLens-Demo"
    assert repo_data["owner"] == "kshxaib"
    assert repo_data["full_name"] == "kshxaib/CodeLens-Demo"

    repo_id = repo_data["id"]

    # 2. List Repositories
    list_res = client.get("/api/repositories")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(r["id"] == repo_id for r in list_data["repositories"])

    # 3. Get Repository Details
    get_res = client.get(f"/api/repositories/{repo_id}")
    assert get_res.status_code == 200
    assert get_res.json()["full_name"] == "kshxaib/CodeLens-Demo"


def test_index_and_view_files_and_architecture(auth_context):
    user = auth_context["user"]
    session = auth_context["session"]

    # Create Repo
    repo = Repository(
        github_id=999123,
        owner="testowner",
        name="testservice",
        full_name="testowner/testservice",
        html_url="https://github.com/testowner/testservice",
        clone_url="https://github.com/testowner/testservice.git",
        default_branch="main",
    )
    session.add(repo)
    session.commit()
    session.refresh(repo)

    access = RepositoryAccess(user_id=user.id, repository_id=repo.id, permission="admin")
    session.add(access)
    session.commit()

    # Mock source files for testing
    mock_files = [
        {
            "file_path": "src/api/auth.py",
            "content": "from src.services.user import verify_login\ndef handle_auth():\n    return verify_login()\n",
            "language": "python",
            "file_size": 150,
            "line_count": 3,
            "file_hash": "hash_auth_123",
        },
        {
            "file_path": "src/services/user.py",
            "content": "def verify_login():\n    return True\n",
            "language": "python",
            "file_size": 80,
            "line_count": 2,
            "file_hash": "hash_user_456",
        },
    ]

    # Run Indexing
    mock_key = "AIzaSy_MOCK_TEST_KEY_SecretRepo123"
    index_result = index_repository(
        repository_id=repo.id,
        db=session,
        user_gemini_key=mock_key,
        custom_files=mock_files,
    )

    assert index_result["status"] == "success"
    assert index_result["file_count"] == 2
    assert index_result["chunk_count"] >= 2
    assert index_result["vectors_upserted"] >= 2

    # Verify Files endpoint
    files_res = client.get(f"/api/repositories/{repo.id}/files")
    assert files_res.status_code == 200
    files_data = files_res.json()
    assert len(files_data) == 2
    file_id = files_data[0]["id"]

    # Verify In-App Code Viewer endpoint
    content_res = client.get(f"/api/repositories/{repo.id}/files/{file_id}")
    assert content_res.status_code == 200
    assert "content" in content_res.json()
    assert len(content_res.json()["content"]) > 0

    # Verify Architecture Graph endpoint
    arch_res = client.get(f"/api/repositories/{repo.id}/architecture")
    assert arch_res.status_code == 200
    arch_data = arch_res.json()
    assert "nodes" in arch_data
    assert "edges" in arch_data
    assert len(arch_data["nodes"]) == 2

    # Verify Blast Radius endpoint
    blast_res = client.get(f"/api/repositories/{repo.id}/blast-radius?symbol=verify_login")
    assert blast_res.status_code == 200
    blast_data = blast_res.json()
    assert blast_data["target_symbol"] == "verify_login"
    assert blast_data["upstream_count"] >= 1  # Called by handle_auth

    # Cleanup repo
    session.delete(repo)
    session.commit()
