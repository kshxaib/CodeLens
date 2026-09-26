import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.db.session import Base, engine
from app.db.models import User, Repository, RepositoryAccess, File, Conversation, Message, ArchitectureGraph
from app.core.security import encrypt_api_key, decrypt_api_key

Base.metadata.create_all(bind=engine)
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    session = TestSession()
    try:
        yield session
    finally:
        session.rollback()
        session.close()

def test_create_user_with_encrypted_gemini_key(db):
    plain_gemini_key = "AIzaSyTestApiKeyForVerification12345"
    encrypted_key = encrypt_api_key(plain_gemini_key)

    user = User(
        github_id=999901,
        username="test_shoaib_user",
        email="test@codelens.dev",
        avatar_url="https://avatars.githubusercontent.com/u/999901",
        github_access_token="gho_test_access_token_123",
        gemini_api_key=encrypted_key,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    assert user.id is not None
    assert user.username == "test_shoaib_user"
    assert user.gemini_api_key == encrypted_key
    assert decrypt_api_key(user.gemini_api_key) == plain_gemini_key

    db.delete(user)
    db.commit()

def test_repository_hierarchy_and_relationships(db):
    user = User(
        github_id=999902,
        username="repo_owner",
        email="owner@codelens.dev",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    repo = Repository(
        github_id=888801,
        owner="repo_owner",
        name="codelens-test-repo",
        full_name="repo_owner/codelens-test-repo",
        html_url="https://github.com/repo_owner/codelens-test-repo",
        clone_url="https://github.com/repo_owner/codelens-test-repo.git",
        default_branch="main",
        index_status="indexed",
        file_count=1,
        symbol_count=5,
    )
    db.add(repo)
    db.commit()
    db.refresh(repo)

    access = RepositoryAccess(
        user_id=user.id,
        repository_id=repo.id,
        permission="admin",
    )
    db.add(access)

    file_record = File(
        repository_id=repo.id,
        file_path="src/main.py",
        language="python",
        file_size=1024,
        line_count=45,
        content="def main():\n    print('Hello CodeLens')\n",
    )
    db.add(file_record)

    arch_graph = ArchitectureGraph(
        repository_id=repo.id,
        commit_sha="a1b2c3d4e5",
        graph_data={"nodes": [{"id": "api", "label": "API Gateway"}], "edges": []},
    )
    db.add(arch_graph)

    convo = Conversation(
        repository_id=repo.id,
        user_id=user.id,
        title="Architecture Discussion",
    )
    db.add(convo)
    db.commit()
    db.refresh(convo)

    msg = Message(
        conversation_id=convo.id,
        role="assistant",
        content="The entrypoint is defined in main.py.",
        sources=[{"file_path": "src/main.py", "start_line": 1, "end_line": 2, "symbol": "main"}],
    )
    db.add(msg)
    db.commit()

    fetched_repo = db.query(Repository).filter_by(id=repo.id).first()
    assert fetched_repo is not None
    assert len(fetched_repo.files) == 1
    assert fetched_repo.files[0].file_path == "src/main.py"
    assert len(fetched_repo.conversations) == 1
    assert len(fetched_repo.conversations[0].messages) == 1
    assert fetched_repo.conversations[0].messages[0].sources[0]["symbol"] == "main"
    assert len(fetched_repo.architecture_graphs) == 1

    db.delete(fetched_repo)
    db.commit()

    assert db.query(File).filter_by(repository_id=repo.id).first() is None
    assert db.query(Conversation).filter_by(repository_id=repo.id).first() is None
    assert db.query(ArchitectureGraph).filter_by(repository_id=repo.id).first() is None
    assert db.query(Message).filter_by(conversation_id=convo.id).first() is None

    db.delete(user)
    db.commit()
