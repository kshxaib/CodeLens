from typing import List, Dict, Any
from app.rag.embeddings import generate_embedding
from app.rag.vector_store import search_code


def retrieve_context(
    repository_id: int,
    query: str,
    user_gemini_key: str,
    limit: int = 6,
) -> List[Dict[str, Any]]:
    """
    Performs similarity search on Qdrant vector database strictly scoped
    to the target repository using the user's decrypted Gemini API key.
    """
    if not query or not query.strip():
        return []

    # 1. Generate query embedding (768-dim)
    query_vector = generate_embedding(query.strip(), user_gemini_key)

    # 2. Query Qdrant with repository_id payload filter
    hits = search_code(
        repository_id=repository_id,
        query_vector=query_vector,
        limit=limit,
    )

    return hits
