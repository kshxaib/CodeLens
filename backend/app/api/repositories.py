import re
from typing import List, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User, Repository, RepositoryAccess, File, ArchitectureGraph
from app.api.auth import get_current_user
from app.core.security import decrypt_api_key
from app.schemas.repository import RepositoryRead, RepositoryListResponse, AddRepositoryRequest, RepositorySummary, ExplainComponentRequest
from app.services.indexer import index_repository
from app.parser.knowledge_graph import build_knowledge_graph
from app.parser.workflow_extractor import WorkflowExtractor
from app.parser.data_flow_extractor import DataFlowExtractor
from app.parser.sequence_extractor import SequenceExtractor
from app.parser.lifecycle_extractor import LifecycleExtractor
from app.services.trace_service import TraceService
from app.services.evidence_service import EvidenceService

router = APIRouter(prefix="/repositories", tags=["Repositories & Workspace"])

@router.get("/github/user-repos", summary="Fetch GitHub Repositories for Authenticated User")
async def get_github_user_repos(
    current_user: User = Depends(get_current_user),
):
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
    access = db.query(RepositoryAccess).filter(
        RepositoryAccess.repository_id == repo_id,
        RepositoryAccess.user_id == user.id,
    ).first()

    if not access:
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
    clean_url = payload.url.strip().rstrip("/")
    if clean_url.endswith(".git"):
        clean_url = clean_url[:-4].rstrip("/")

    match = re.match(r"^https?://github\.com/([^/]+)/([^/]+)$", clean_url)
    if not match:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid GitHub URL format.")

    owner, repo_name = match.group(1).strip(), match.group(2).strip()
    full_name = f"{owner}/{repo_name}"

    existing_repo = db.query(Repository).filter(Repository.full_name == full_name).first()
    if not existing_repo:
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
    return get_user_repository_access(id, current_user, db)

@router.post("/{id}/index", summary="Trigger Repository Indexing")
async def trigger_repository_indexing(
    id: int,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    repo = get_user_repository_access(id, current_user, db)

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
    return await get_knowledge_graph(id=id, current_user=current_user, db=db)

@router.get("/{id}/blast-radius", summary="Compute Symbol Blast Radius")
async def get_symbol_blast_radius(
    id: int,
    symbol: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = _get_trace_service(id, current_user, db)
    return service.compute_symbol_blast_radius(symbol)

@router.get("/{id}/knowledge-graph", summary="Get Architecture Knowledge Graph")
async def get_knowledge_graph(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
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
    return result

def _get_trace_service(id: int, current_user: User, db: Session) -> TraceService:
    get_user_repository_access(id, current_user, db)
    arch = (
        db.query(ArchitectureGraph)
        .filter(ArchitectureGraph.repository_id == id)
        .order_by(ArchitectureGraph.created_at.desc())
        .first()
    )
    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
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

    wf_data = arch.graph_data.get("workflows") if arch and arch.graph_data else {}
    df_data = arch.graph_data.get("data_flows") if arch and arch.graph_data else {}
    lc_data = arch.graph_data.get("lifecycles") if arch and arch.graph_data else {}
    seq_data = arch.graph_data.get("sequences") if arch and arch.graph_data else {}

    return TraceService(kg, file_dicts, wf_data, df_data, lc_data, seq_data)

@router.get("/{id}/trace/node", summary="Trace Node Upstream and Downstream")
async def trace_node_endpoint(
    id: int,
    node_id: str,
    view: str = "architecture",
    depth: int = 1,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = _get_trace_service(id, current_user, db)
    return service.trace_node(node_id, view=view, depth=depth)

@router.get("/{id}/trace/path", summary="Find Path Between Two Nodes")
async def find_path_endpoint(
    id: int,
    start_node: str,
    end_node: str,
    view: str = "architecture",
    max_hops: int = 8,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = _get_trace_service(id, current_user, db)
    return service.find_path(start_node, end_node, view=view, max_hops=max_hops)

@router.get("/{id}/trace/why", summary="Why Does This Relationship Exist?")
async def why_relationship_endpoint(
    id: int,
    edge_id: Optional[str] = None,
    source: Optional[str] = None,
    target: Optional[str] = None,
    view: str = "architecture",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = _get_trace_service(id, current_user, db)
    return service.why_relationship(edge_id=edge_id, source_id=source, target_id=target, view=view)

@router.post("/{id}/trace/explain", summary="Explain Architecture Component")
async def explain_component_endpoint(
    id: int,
    payload: ExplainComponentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = _get_trace_service(id, current_user, db)
    gemini_key = decrypt_api_key(current_user.gemini_api_key) if current_user.gemini_api_key else None
    openai_key = decrypt_api_key(current_user.openai_api_key) if current_user.openai_api_key else None
    return await service.explain_component(
        node_id=payload.node_id,
        view=payload.view,
        gemini_api_key=gemini_key,
        openai_api_key=openai_key,
    )

@router.get("/{id}/trace/impact", summary="Calculate Dependent Impact")
async def calculate_impact_endpoint(
    id: int,
    node_id: str,
    view: str = "architecture",
    max_depth: int = 5,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = _get_trace_service(id, current_user, db)
    return service.calculate_impact(node_id, view=view, max_depth=max_depth)

@router.get("/{id}/trace/change-impact", summary="Calculate File or Symbol Change Impact")
async def change_impact_endpoint(
    id: int,
    file_path: Optional[str] = None,
    symbol: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    service = _get_trace_service(id, current_user, db)
    return service.change_impact(file_path=file_path, symbol_name=symbol)

def _get_evidence_service(id: int, current_user: User, db: Session) -> EvidenceService:
    get_user_repository_access(id, current_user, db)
    files = (
        db.query(File.file_path, File.content, File.language, File.line_count)
        .filter(File.repository_id == id)
        .all()
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
    return EvidenceService(kg, file_dicts)

@router.get("/{id}/evidence/node", summary="Get Evidence for a Node Classification")
async def get_node_evidence(
    id: int,
    node_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = _get_evidence_service(id, current_user, db)
    return svc.get_node_evidence(node_id)

@router.get("/{id}/evidence/edge", summary="Get Evidence for a Relationship")
async def get_edge_evidence(
    id: int,
    edge_id: Optional[str] = None,
    source: Optional[str] = None,
    target: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = _get_evidence_service(id, current_user, db)
    return svc.get_edge_evidence(
        edge_id=edge_id,
        source_id=source,
        target_id=target,
    )

@router.get("/{id}/evidence/stats", summary="Repository Evidence Quality Statistics")
async def get_evidence_stats(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = _get_evidence_service(id, current_user, db)
    return svc.get_repository_evidence_stats()

@router.get("/{id}/evidence/verify", summary="Verify a Specific Architecture Claim")
async def verify_claim(
    id: int,
    source: str,
    target: str,
    relationship: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    svc = _get_evidence_service(id, current_user, db)
    return svc.verify_claim(
        source_id=source,
        target_id=target,
        claimed_relationship=relationship,
    )
