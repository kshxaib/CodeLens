from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from app.db.models import Repository, File, ArchitectureGraph
from app.services.git_service import clone_and_scan_repository
from app.services.chunker import chunk_file, CodeChunk
from app.parser.architecture import generate_architecture_graph
from app.parser.knowledge_graph import build_knowledge_graph
from app.rag.embeddings import generate_batch_embeddings
from app.rag.vector_store import delete_repository_vectors, upsert_chunks


def index_repository(
    repository_id: int,
    db: Session,
    user_openai_key: Optional[str] = None,
    user_gemini_key: Optional[str] = None,
    github_token: Optional[str] = None,
    custom_files: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Executes the complete end-to-end repository indexing pipeline:
    1. Sets index_status = 'indexing'
    2. Ephemerally clones and scans repo (or uses custom_files in testing)
    3. Persists source files in PostgreSQL 'files' table
    4. Generates & caches architecture topology graph in PostgreSQL
    5. Splits code into AST structure-aware chunks
    6. Generates 768-dim embeddings with user's OpenAI key
    7. Idempotently upserts vectors into Qdrant collection
    8. Updates repository record with index_status = 'indexed' and metadata
    """
    repo = db.query(Repository).filter(Repository.id == repository_id).first()
    if not repo:
        raise ValueError(f"Repository {repository_id} not found.")

    active_key = user_openai_key or user_gemini_key
    if not active_key:
        raise ValueError("An OpenAI API key is required to index the repository.")

    # 1. Update status to indexing
    repo.index_status = "indexing"
    db.commit()

    try:
        # 2. Ingest files
        if custom_files is not None:
            scanned_files = custom_files
            commit_sha = "test_commit_sha_123"
        else:
            scanned_files, commit_sha = clone_and_scan_repository(
                clone_url=repo.clone_url,
                github_token=github_token,
            )

        # 3. Clean up previous files in PostgreSQL
        db.query(File).filter(File.repository_id == repository_id).delete()
        db.query(ArchitectureGraph).filter(ArchitectureGraph.repository_id == repository_id).delete()
        db.commit()

        # Insert new files
        total_symbols = 0
        for f in scanned_files:
            file_record = File(
                repository_id=repository_id,
                file_path=f["file_path"],
                language=f["language"],
                file_size=f["file_size"],
                line_count=f["line_count"],
                file_hash=f["file_hash"],
                content=f["content"],
            )
            db.add(file_record)

        db.commit()

        # 4. Generate Architecture Graph & Knowledge Graph, save to PostgreSQL
        arch_graph_data = generate_architecture_graph(scanned_files)

        # Build the semantic Knowledge Graph and embed it in graph_data.
        # Using the existing JSON column avoids a DB migration while still
        # making the KG available to the new /knowledge-graph API endpoint.
        try:
            kg = build_knowledge_graph(scanned_files)
            arch_graph_data["knowledge_graph"] = kg.to_dict()
        except Exception as kg_err:
            # KG build failure must NOT block the existing indexing pipeline.
            print(f"[!] Knowledge graph build warning for repo {repository_id}: {kg_err}")
            arch_graph_data["knowledge_graph"] = None

        arch_record = ArchitectureGraph(
            repository_id=repository_id,
            commit_sha=commit_sha,
            graph_data=arch_graph_data,
        )
        db.add(arch_record)
        db.commit()

        # 5. Structure-Aware Chunking across all files
        all_chunks: List[CodeChunk] = []
        for f in scanned_files:
            file_chunks = chunk_file(
                file_path=f["file_path"],
                content=f["content"],
                language=f["language"],
            )
            for c in file_chunks:
                total_symbols += len(c.symbols)
            all_chunks.extend(file_chunks)

        # 6. Generate Embeddings using User's OpenAI Key (768 dimensions)
        chunk_texts = [c.augmented_content for c in all_chunks]
        embeddings = generate_batch_embeddings(
            texts=chunk_texts,
            api_key=active_key,
            batch_size=50,
        )

        # 7. Qdrant Vector Store Upsert
        delete_repository_vectors(repository_id)
        upserted_count = upsert_chunks(
            repository_id=repository_id,
            chunks=all_chunks,
            embeddings=embeddings,
        )

        # 8. Mark repository as indexed
        now = datetime.now(timezone.utc)
        repo.index_status = "indexed"
        repo.last_indexed_at = now
        repo.last_indexed_commit = commit_sha
        repo.file_count = len(scanned_files)
        repo.symbol_count = total_symbols
        db.commit()
        db.refresh(repo)

        return {
            "status": "success",
            "repository_id": repo.id,
            "file_count": len(scanned_files),
            "chunk_count": len(all_chunks),
            "vectors_upserted": upserted_count,
            "commit_sha": commit_sha,
        }

    except Exception as e:
        print(f"[!] Indexing failed for repository {repository_id}: {e}")
        repo.index_status = "failed"
        db.commit()
        return {
            "status": "failed",
            "repository_id": repository_id,
            "error": str(e),
        }
