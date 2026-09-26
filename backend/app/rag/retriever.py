from typing import List, Dict, Any, Optional
from app.rag.embeddings import generate_embedding
from app.rag.vector_store import search_code


def retrieve_context(
    repository_id: int,
    query: str,
    user_openai_key: Optional[str] = None,
    user_gemini_key: Optional[str] = None,
    limit: int = 6,
) -> List[Dict[str, Any]]:
    """
    Performs similarity search on Qdrant vector database strictly scoped
    to the target repository using the user's decrypted OpenAI API key.
    Supports user_gemini_key for backward compatibility.
    """
    if not query or not query.strip():
        return []

    active_key = user_openai_key or user_gemini_key
    if not active_key:
        raise ValueError("An OpenAI API key is required to retrieve context.")

    # 1. Generate query embedding (768-dim)
    query_vector = generate_embedding(query.strip(), active_key)

    # 2. Query Qdrant with repository_id payload filter
    hits = search_code(
        repository_id=repository_id,
        query_vector=query_vector,
        limit=limit,
    )

    return hits
