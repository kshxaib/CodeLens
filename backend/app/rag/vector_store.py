import uuid
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from qdrant_client.http.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from app.core.config import QDRANT_URL
from app.services.chunker import CodeChunk
from app.rag.embeddings import EMBEDDING_DIMENSION

COLLECTION_NAME = "codelens_code"

# Singleton Qdrant client
_client: Optional[QdrantClient] = None


def get_qdrant_client() -> QdrantClient:
    """Returns the initialized Qdrant client instance."""
    global _client
    if _client is None:
        _client = QdrantClient(url=QDRANT_URL, timeout=10.0, check_compatibility=False)
    return _client


def ensure_collection_exists() -> bool:
    """
    Ensures the codelens_code collection exists with 768 dimensions
    and payload indexes for scoped multi-tenant repository filtering.
    """
    client = get_qdrant_client()
    try:
        collections = client.get_collections().collections
        exists = any(c.name == COLLECTION_NAME for c in collections)

        if not exists:
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=EMBEDDING_DIMENSION, distance=Distance.COSINE),
            )
            # Create payload field indexes for high-speed scoped filtering
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="repository_id",
                field_schema=models.PayloadSchemaType.INTEGER,
            )
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="file_path",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name="language",
                field_schema=models.PayloadSchemaType.KEYWORD,
            )
            print(f"[*] Created Qdrant collection: {COLLECTION_NAME}")
        return True
    except Exception as e:
        print(f"[!] Qdrant collection initialization error: {e}")
        return False


def delete_repository_vectors(repository_id: int) -> bool:
    """
    Idempotently purges all vector points associated with a repository.
    """
    client = get_qdrant_client()
    try:
        ensure_collection_exists()
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=Filter(
                    must=[
                        FieldCondition(
                            key="repository_id",
                            match=MatchValue(value=repository_id),
                        )
                    ]
                )
            ),
        )
        return True
    except Exception as e:
        print(f"[!] Error purging vectors for repo {repository_id}: {e}")
        return False


def upsert_chunks(
    repository_id: int,
    chunks: List[CodeChunk],
    embeddings: List[List[float]],
) -> int:
    """
    Batch upserts code chunks and vector embeddings into Qdrant.
    Generates deterministic UUID5 point IDs.
    """
    if not chunks or not embeddings or len(chunks) != len(embeddings):
        return 0

    ensure_collection_exists()
    client = get_qdrant_client()

    points: List[PointStruct] = []
    namespace = uuid.NAMESPACE_DNS

    for chunk, vector in zip(chunks, embeddings):
        # Generate deterministic UUID for idempotent upserts
        point_id_str = f"repo_{repository_id}_{chunk.file_path}_{chunk.start_line}_{chunk.end_line}"
        point_uuid = str(uuid.uuid5(namespace, point_id_str))

        payload = {
            "repository_id": repository_id,
            "file_path": chunk.file_path,
            "language": chunk.language,
            "start_line": chunk.start_line,
            "end_line": chunk.end_line,
            "symbols": chunk.symbols,
            "content": chunk.raw_content,
        }

        points.append(PointStruct(
            id=point_uuid,
            vector=vector,
            payload=payload,
        ))

    # Batch upsert points
    batch_size = 100
    total_upserted = 0

    for i in range(0, len(points), batch_size):
        batch = points[i:i + batch_size]
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=batch,
        )
        total_upserted += len(batch)

    return total_upserted


def search_code(
    repository_id: int,
    query_vector: List[float],
    limit: int = 5,
) -> List[Dict[str, Any]]:
    """
    Performs cosine similarity search filtered strictly by repository_id.
    """
    ensure_collection_exists()
    client = get_qdrant_client()

    search_result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        query_filter=Filter(
            must=[
                FieldCondition(
                    key="repository_id",
                    match=MatchValue(value=repository_id),
                )
            ]
        ),
        limit=limit,
        with_payload=True,
    )

    results: List[Dict[str, Any]] = []
    for hit in search_result.points:
        payload = hit.payload or {}
        results.append({
            "score": hit.score,
            "file_path": payload.get("file_path", ""),
            "language": payload.get("language", ""),
            "start_line": payload.get("start_line", 1),
            "end_line": payload.get("end_line", 1),
            "symbols": payload.get("symbols", []),
            "content": payload.get("content", ""),
        })

    return results
