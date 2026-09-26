import re
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, Repository, RepositoryAccess, File, ArchitectureGraph
from app.api.auth import get_current_user
from app.core.security import decrypt_api_key
from app.schemas.repository import (
    RepositoryRead,
    RepositoryListResponse,
    AddRepositoryRequest,
    RepositorySummary,
)
from app.parser.blast_radius import compute_blast_radius
from app.services.indexer import index_repository
from app.parser.knowledge_graph import build_knowledge_graph
from app.parser.workflow_extractor import WorkflowExtractor
from app.parser.data_flow_extractor import DataFlowExtractor
from app.parser.sequence_extractor import SequenceExtractor
from app.parser.lifecycle_extractor import LifecycleExtractor

router = APIRouter(prefix="/repositories", tags=["Repositories & Workspace"])


@router.get("/github/user-repos", summary="Fetch GitHub Repositories for Authenticated User")
async def get_github_user_repos(
    current_user: User = Depends(get_current_user),
):
    """
    Fetches the authenticated user's repositories (public, personal private, and accessible collaborator/org repos)
    directly from GitHub REST API.
    """
    if not current_user.github_access_token:
        return {"repositories": []}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.get(
                "https://api.github.com/user/repos",
                params={"per_page": 100, "sort": "updated", "affiliation": "owner,collaborator,organization_member"},
                headers={
                    "Authorization": f"Bearer {current_user.github_access_token}",
                    "Accept": "application/vnd.github.v3+json",
                },
            )
            if res.status_code == 200:
                data = res.json()
                repos = [
                    {
                        "id": r.get("id"),
                        "name": r.get("name"),
                        "full_name": r.get("full_name"),
                        "private": r.get("private", False),
                        "html_url": r.get("html_url"),
                        "description": r.get("description"),
                        "default_branch": r.get("default_branch", "main"),
                        "owner": r.get("owner", {}).get("login"),
                        "is_fork": r.get("fork", False),
                    }
                    for r in data
                ]
                return {"repositories": repos}
    except Exception as e:
        print(f"[!] Error fetching user GitHub repos: {e}")

    return {"repositories": []}


def get_user_repository_access(
    repo_id: int,
    user: User,
    db: Session,
) -> Repository:
    """Helper to verify user has access to specified repository."""
    access = db.query(RepositoryAccess).filter(
        RepositoryAccess.repository_id == repo_id,
        RepositoryAccess.user_id == user.id,
    ).first()

    if not access:
        # Check if user is owner
        repo = db.query(Repository).filter(Repository.id == repo_id).first()
        if not repo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repository not found.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this repository.")

    return access.repository


@router.get("", response_model=RepositoryListResponse, summary="List Accessible Repositories")
async def list_repositories(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns list of repositories accessible to the current user."""
    accesses = db.query(RepositoryAccess).filter(RepositoryAccess.user_id == current_user.id).all()
    repo_ids = [a.repository_id for a in accesses]
    repos = db.query(Repository).filter(Repository.id.in_(repo_ids)).order_by(Repository.updated_at.desc()).all()

    return {"repositories": repos, "total": len(repos)}


@router.post("", response_model=RepositoryRead, summary="Add Repository by GitHub URL")
async def add_repository(
    payload: AddRepositoryRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Adds a new GitHub repository to CodeLens workspace.
    Parses owner and name from URL and registers repository in database.
    """
    clean_url = payload.url.strip().rstrip("/")
    if clean_url.endswith(".git"):
        clean_url = clean_url[:-4].rstrip("/")

    match = re.match(r"^https?://github\.com/([^/]+)/([^/]+)$", clean_url)
    if not match:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GitHub URL format.")

    owner, repo_name = match.group(1).strip(), match.group(2).strip()
    full_name = f"{owner}/{repo_name}"

    # Check if repo already exists in DB
    existing_repo = db.query(Repository).filter(Repository.full_name == full_name).first()
    if not existing_repo:
        # Create deterministic pseudo github_id if offline/mock
        pseudo_github_id = abs(hash(full_name)) % (10**9)
        existing_repo = Repository(
            github_id=pseudo_github_id,
            owner=owner,
            name=repo_name,
            full_name=full_name,
            html_url=f"https://github.com/{full_name}",
            clone_url=f"https://github.com/{full_name}.git",
            default_branch="main",
            index_status="not_indexed",
        )
        db.add(existing_repo)
        db.commit()
        db.refresh(existing_repo)

    # Ensure current user has access record
    access = db.query(RepositoryAccess).filter(
        RepositoryAccess.user_id == current_user.id,
        RepositoryAccess.repository_id == existing_repo.id,
    ).first()

    if not access:
        access = RepositoryAccess(
            user_id=current_user.id,
            repository_id=existing_repo.id,
            permission="admin",
        )
        db.add(access)
        db.commit()

    return existing_repo


@router.get("/{id}", response_model=RepositoryRead, summary="Get Repository Details")
async def get_repository(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns metadata, file count, and indexing status for a repository."""
    return get_user_repository_access(id, current_user, db)


@router.post("/{id}/index", summary="Trigger Repository Indexing")
async def trigger_repository_indexing(
    id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Triggers code parsing, AST extraction, and vector embedding for repository.
    Requires user to have configured their Google Gemini API Key in Profile Settings.
    """
    repo = get_user_repository_access(id, current_user, db)

    # Verify user has configured their BYOK OpenAI key
    encrypted_key = getattr(current_user, "openai_api_key", None) or current_user.gemini_api_key
    if not encrypted_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OpenAI API key is missing. Please configure your key in Profile & Settings before indexing.",
        )

    decrypted_key = decrypt_api_key(encrypted_key)
    if not decrypted_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to decrypt API key. Please re-enter your key in Settings.",
        )

    # Run indexing in background
    def run_indexer_task(repo_id: int, api_key: str, gh_token: Optional[str]):
        from app.db.session import SessionLocal
        task_db = SessionLocal()
        try:
            index_repository(
                repository_id=repo_id,
                db=task_db,
                user_openai_key=api_key,
                user_gemini_key=api_key,
                github_token=gh_token,
            )
        finally:
            task_db.close()

    background_tasks.add_task(
        run_indexer_task,
        repo.id,
        decrypted_key,
        current_user.github_access_token,
    )

    repo.index_status = "indexing"
    db.commit()

    return {
        "status": "indexing_started",
        "repository_id": repo.id,
        "message": f"Indexing started for {repo.full_name}",
    }


@router.get("/{id}/files", summary="List Indexed Repository Files")
async def list_repository_files(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns list of indexed source files in the repository."""
    get_user_repository_access(id, current_user, db)
    files = db.query(File.id, File.file_path, File.language, File.line_count, File.file_size).filter(
        File.repository_id == id
    ).order_by(File.file_path.asc()).all()

    return [
        {
            "id": f.id,
            "file_path": f.file_path,
            "language": f.language,
            "line_count": f.line_count,
            "file_size": f.file_size,
        }
        for f in files
    ]


@router.get("/{id}/files/{file_id}", summary="Get File Content for In-App Code Viewer")
async def get_file_content(
    id: int,
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetches raw source code content for citation highlighting and in-app code viewing.
    """
    get_user_repository_access(id, current_user, db)
    file_record = db.query(File).filter(File.id == file_id, File.repository_id == id).first()

    if not file_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found in this repository.")

    return {
        "id": file_record.id,
        "repository_id": file_record.repository_id,
        "file_path": file_record.file_path,
        "language": file_record.language,
        "line_count": file_record.line_count,
        "content": file_record.content,
    }


@router.get("/{id}/architecture", summary="Get Architecture Topology Map")
async def get_repository_architecture(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns cached living architecture topology diagram for visual canvas."""
    get_user_repository_access(id, current_user, db)
    arch = db.query(ArchitectureGraph).filter(ArchitectureGraph.repository_id == id).order_by(
        ArchitectureGraph.created_at.desc()
    ).first()

    if not arch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Architecture map not available. Please index the repository first.",
        )

    return arch.graph_data


@router.get("/{id}/blast-radius", summary="Compute Symbol Blast Radius")
async def get_symbol_blast_radius(
    id: int,
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Computes caller-callee dependency blast radius for a given symbol."""
    get_user_repository_access(id, current_user, db)
    files = db.query(File.file_path, File.content, File.language).filter(File.repository_id == id).all()

    file_dicts = [
        {"file_path": f.file_path, "content": f.content, "language": f.language}
        for f in files
    ]

    return compute_blast_radius(symbol, file_dicts)


@router.get("/{id}/knowledge-graph", summary="Get Architecture Knowledge Graph")
async def get_knowledge_graph(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the Architecture Knowledge Graph for the repository.

    The KG is built during indexing and stored inside the architecture_graphs
    table. It contains:
    - Semantically typed nodes (service, api_endpoint, database_model, etc.)
    - Typed edges with relationship types (IMPORTS, CALLS, READS, WRITES, etc.)
    - Source evidence for every edge (file path + line range + code snippet)
    - Confidence scores distinguishing deterministic facts from inferences

    If the repository was indexed before the KG feature was added, use
    GET /{id}/knowledge-graph/build to generate it on demand.
    """
    get_user_repository_access(id, current_user, db)
    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )

    kg_data = arch.graph_data.get("knowledge_graph") if (arch and arch.graph_data) else None
    if kg_data:
        return kg_data

    # Auto-generate if missing but files exist
    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found for repository. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    kg_dict = kg.to_dict()

    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["knowledge_graph"] = kg_dict
        arch.graph_data = graph_data
        db.commit()
    else:
        new_arch = ArchitectureGraph(
            repository_id=id,
            graph_data={"knowledge_graph": kg_dict, "nodes": [], "edges": []}
        )
        db.add(new_arch)
        db.commit()

    return kg_dict


@router.post("/{id}/knowledge-graph/build", summary="Build Knowledge Graph On-Demand")
async def build_knowledge_graph_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Builds (or rebuilds) the Architecture Knowledge Graph on demand.

    Useful when:
    - The repository was indexed before the KG feature was added.
    - A quick refresh is needed without full re-indexing.

    Reads file contents from the database (no GitHub clone needed).
    Stores the result in the latest ArchitectureGraph record.
    Returns the generated Knowledge Graph immediately.
    """
    get_user_repository_access(id, current_user, db)

    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    kg_dict = kg.to_dict()

    # Persist into the latest arch record if one exists
    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )
    if arch:
        graph_data = arch.graph_data or {}
        graph_data["knowledge_graph"] = kg_dict
        arch.graph_data = graph_data
        db.commit()

    return kg_dict


@router.get("/{id}/workflows", summary="Get Extracted Workflows")
async def get_workflows_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns extracted business workflows for the repository.
    Answers: "What process does this system execute?"
    Supports start, step, decision, failure, retry, external, and async nodes.
    """
    get_user_repository_access(id, current_user, db)
    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )

    workflows_data = arch.graph_data.get("workflows") if (arch and arch.graph_data) else None
    if workflows_data:
        return {"workflows": workflows_data}

    # Generate on demand
    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    extractor = WorkflowExtractor(file_dicts, kg)
    workflows = extractor.extract_all_workflows()
    serialized_workflows = [wf.to_dict() for wf in workflows]

    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["workflows"] = serialized_workflows
        arch.graph_data = graph_data
        db.commit()
    else:
        new_arch = ArchitectureGraph(
            repository_id=id,
            graph_data={"workflows": serialized_workflows, "knowledge_graph": kg.to_dict(), "nodes": [], "edges": []}
        )
        db.add(new_arch)
        db.commit()

    return {"workflows": serialized_workflows}


@router.post("/{id}/workflows/build", summary="Rebuild Extracted Workflows On-Demand")
async def build_workflows_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-extracts and persists all business workflows from source files and KnowledgeGraph.
    """
    get_user_repository_access(id, current_user, db)

    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    extractor = WorkflowExtractor(file_dicts, kg)
    workflows = extractor.extract_all_workflows()
    serialized_workflows = [wf.to_dict() for wf in workflows]

    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )
    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["workflows"] = serialized_workflows
        arch.graph_data = graph_data
        db.commit()

    return {"workflows": serialized_workflows}


@router.get("/{id}/data-flows", summary="Get Extracted Data Flows")
async def get_data_flows_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns extracted data flow pipelines and consolidated data lineage graph.
    Answers: "What data moves through the system, where does it originate,
    how is it transformed, and where is it stored or consumed?"
    """
    get_user_repository_access(id, current_user, db)
    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )

    data_flows_cache = arch.graph_data.get("data_flows") if (arch and arch.graph_data) else None
    if data_flows_cache:
        return data_flows_cache

    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    extractor = DataFlowExtractor(file_dicts, kg)
    pipelines = extractor.extract_all_pipelines()
    serialized_pipelines = [p.to_dict() for p in pipelines]
    consolidated_graph = extractor.extract_consolidated_graph(pipelines)

    result = {
        "pipelines": serialized_pipelines,
        "global_graph": consolidated_graph,
        "summary": {
            "total_pipelines": len(pipelines),
            "total_entities": consolidated_graph.get("total_entities", 0),
            "total_transitions": consolidated_graph.get("total_transitions", 0),
        },
    }

    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["data_flows"] = result
        arch.graph_data = graph_data
        db.commit()
    else:
        new_arch = ArchitectureGraph(
            repository_id=id,
            graph_data={"data_flows": result, "knowledge_graph": kg.to_dict(), "nodes": [], "edges": []},
        )
        db.add(new_arch)
        db.commit()

    return result


@router.post("/{id}/data-flows/build", summary="Rebuild Extracted Data Flows On-Demand")
async def build_data_flows_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-extracts and persists all data flow pipelines and lineages from source files.
    """
    get_user_repository_access(id, current_user, db)

    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    extractor = DataFlowExtractor(file_dicts, kg)
    pipelines = extractor.extract_all_pipelines()
    serialized_pipelines = [p.to_dict() for p in pipelines]
    consolidated_graph = extractor.extract_consolidated_graph(pipelines)

    result = {
        "pipelines": serialized_pipelines,
        "global_graph": consolidated_graph,
        "summary": {
            "total_pipelines": len(pipelines),
            "total_entities": consolidated_graph.get("total_entities", 0),
            "total_transitions": consolidated_graph.get("total_transitions", 0),
        },
    }

    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )
    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["data_flows"] = result
        arch.graph_data = graph_data
        db.commit()

    return result


@router.get("/{id}/sequences", summary="Get Extracted Runtime Sequences")
async def get_sequences_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns extracted chronological runtime sequence diagrams for the repository.
    Answers: "What is the runtime interaction order between actors, services,
    and components when executing a specific action?"
    """
    get_user_repository_access(id, current_user, db)
    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )

    sequences_cache = arch.graph_data.get("sequences") if (arch and arch.graph_data) else None
    if sequences_cache:
        return sequences_cache

    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    extractor = SequenceExtractor(file_dicts, kg)
    sequences = extractor.extract_all_sequences()
    serialized_sequences = [s.to_dict() for s in sequences]

    result = {
        "sequences": serialized_sequences,
        "summary": {
            "total_sequences": len(sequences),
            "total_interactions": sum(s.total_steps for s in sequences),
            "async_sequences": sum(1 for s in sequences if s.has_async),
            "error_handled_sequences": sum(1 for s in sequences if s.has_errors),
        },
    }

    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["sequences"] = result
        arch.graph_data = graph_data
        db.commit()
    else:
        new_arch = ArchitectureGraph(
            repository_id=id,
            graph_data={"sequences": result, "knowledge_graph": kg.to_dict(), "nodes": [], "edges": []},
        )
        db.add(new_arch)
        db.commit()

    return result


@router.post("/{id}/sequences/build", summary="Rebuild Extracted Runtime Sequences On-Demand")
async def build_sequences_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-extracts and persists all chronological runtime sequence diagrams from source files.
    """
    get_user_repository_access(id, current_user, db)

    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    extractor = SequenceExtractor(file_dicts, kg)
    sequences = extractor.extract_all_sequences()
    serialized_sequences = [s.to_dict() for s in sequences]

    result = {
        "sequences": serialized_sequences,
        "summary": {
            "total_sequences": len(sequences),
            "total_interactions": sum(s.total_steps for s in sequences),
            "async_sequences": sum(1 for s in sequences if s.has_async),
            "error_handled_sequences": sum(1 for s in sequences if s.has_errors),
        },
    }

    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )
    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["sequences"] = result
        arch.graph_data = graph_data
        db.commit()

    return result


@router.get("/{id}/lifecycles", summary="Get Extracted Entity Lifecycles")
async def get_lifecycles_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns finite state machine lifecycles for entities in the repository.
    Answers: "What states can an entity occupy, what events cause transitions,
    and what are the terminal/failure states?"
    """
    get_user_repository_access(id, current_user, db)
    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )

    lifecycles_cache = arch.graph_data.get("lifecycles") if (arch and arch.graph_data) else None
    if lifecycles_cache:
        return lifecycles_cache

    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    extractor = LifecycleExtractor(file_dicts, kg)
    lifecycles = extractor.extract_all_lifecycles()
    serialized_lifecycles = [lc.to_dict() for lc in lifecycles]

    result = {
        "lifecycles": serialized_lifecycles,
        "summary": {
            "total_lifecycles": len(lifecycles),
            "total_states": sum(lc.total_states for lc in lifecycles),
            "total_transitions": sum(lc.total_transitions for lc in lifecycles),
            "entities_with_retries": sum(1 for lc in lifecycles if lc.has_retry_loop),
            "entities_with_failures": sum(1 for lc in lifecycles if lc.has_failure_state),
        },
    }

    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["lifecycles"] = result
        arch.graph_data = graph_data
        db.commit()
    else:
        new_arch = ArchitectureGraph(
            repository_id=id,
            graph_data={"lifecycles": result, "knowledge_graph": kg.to_dict(), "nodes": [], "edges": []},
        )
        db.add(new_arch)
        db.commit()

    return result


@router.post("/{id}/lifecycles/build", summary="Rebuild Extracted Entity Lifecycles On-Demand")
async def build_lifecycles_endpoint(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-extracts and persists all finite state machine lifecycles from source files.
    """
    get_user_repository_access(id, current_user, db)

    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
    )
    if not files:
        raise HTTPException(
            status_code=404,
            detail="No indexed files found. Please index the repository first.",
        )

    file_dicts = [
        {
            "file_path": f.file_path,
            "content": f.content or "",
            "language": f.language or "text",
            "line_count": f.line_count or 0,
        }
        for f in files
    ]

    kg = build_knowledge_graph(file_dicts)
    extractor = LifecycleExtractor(file_dicts, kg)
    lifecycles = extractor.extract_all_lifecycles()
    serialized_lifecycles = [lc.to_dict() for lc in lifecycles]

    result = {
        "lifecycles": serialized_lifecycles,
        "summary": {
            "total_lifecycles": len(lifecycles),
            "total_states": sum(lc.total_states for lc in lifecycles),
            "total_transitions": sum(lc.total_transitions for lc in lifecycles),
            "entities_with_retries": sum(1 for lc in lifecycles if lc.has_retry_loop),
            "entities_with_failures": sum(1 for lc in lifecycles if lc.has_failure_state),
        },
    }

    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )
    if arch:
        graph_data = dict(arch.graph_data or {})
        graph_data["lifecycles"] = result
        arch.graph_data = graph_data
        db.commit()

    return result



