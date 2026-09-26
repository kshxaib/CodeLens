from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    JSON,
    func,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


class User(Base):
    """
    User model storing GitHub identity, OAuth tokens, and encrypted BYOK Gemini API keys.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(BigInteger, unique=True, nullable=False, index=True)
    username = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    github_access_token = Column(String(500), nullable=True)
    openai_api_key = Column(String(500), nullable=True)  # Fernet encrypted OpenAI key
    gemini_api_key = Column(String(500), nullable=True)  # Legacy Fernet encrypted key
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    repository_accesses = relationship(
        "RepositoryAccess",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    conversations = relationship(
        "Conversation",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Repository(Base):
    """
    Repository model storing ingested GitHub repositories, indexing state, and metadata.
    """
    __tablename__ = "repositories"

    id = Column(Integer, primary_key=True, index=True)
    github_id = Column(BigInteger, unique=True, nullable=False, index=True)
    owner = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    full_name = Column(String(500), nullable=False, index=True)
    html_url = Column(String(500), nullable=False)
    clone_url = Column(String(500), nullable=False)
    private = Column(Boolean, default=False, nullable=False)
    default_branch = Column(String(255), default="main", nullable=False)
    description = Column(String(1000), nullable=True)
    index_status = Column(String(50), default="not_indexed", nullable=False)  # not_indexed | indexing | indexed | failed
    last_indexed_commit = Column(String(100), nullable=True)
    last_indexed_at = Column(DateTime(timezone=True), nullable=True)
    file_count = Column(Integer, default=0, nullable=False)
    symbol_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    accesses = relationship(
        "RepositoryAccess",
        back_populates="repository",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    files = relationship(
        "File",
        back_populates="repository",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    conversations = relationship(
        "Conversation",
        back_populates="repository",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    architecture_graphs = relationship(
        "ArchitectureGraph",
        back_populates="repository",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class RepositoryAccess(Base):
    """
    Mapping table representing user access rights and roles per repository.
    """
    __tablename__ = "repository_access"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    permission = Column(String(50), default="read", nullable=False)  # read | write | admin
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "repository_id", name="uq_user_repository_access"),
    )

    # Relationships
    user = relationship("User", back_populates="repository_accesses")
    repository = relationship("Repository", back_populates="accesses")


class File(Base):
    """
    Source code files stored for in-app code viewing and exact citation highlighting.
    """
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(1000), nullable=False)
    language = Column(String(50), nullable=True)
    file_size = Column(BigInteger, default=0, nullable=False)
    line_count = Column(Integer, default=0, nullable=False)
    file_hash = Column(String(64), nullable=True)
    content = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("repository_id", "file_path", name="uq_repository_file"),
        Index("idx_files_repo_path", "repository_id", "file_path"),
    )

    # Relationships
    repository = relationship("Repository", back_populates="files")


class Conversation(Base):
    """
    Multi-threaded conversation session per repository and user.
    """
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), default="New Chat", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    repository = relationship("Repository", back_populates="conversations")
    user = relationship("User", back_populates="conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Message(Base):
    """
    Chat message history containing user questions, assistant streaming responses, and citations.
    """
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # user | assistant | system
    content = Column(Text, nullable=False)
    sources = Column(JSON, default=list, nullable=True)  # List of citation objects
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")


class ArchitectureGraph(Base):
    """
    Cached architecture topology diagrams and blast radius dependency metadata.
    """
    __tablename__ = "architecture_graphs"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    commit_sha = Column(String(100), nullable=False)
    graph_data = Column(JSON, nullable=False)  # Nodes and edges JSON structure
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("repository_id", "commit_sha", name="uq_repo_arch_commit"),
    )

    # Relationships
    repository = relationship("Repository", back_populates="architecture_graphs")
