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
    if not query or not query.strip():
        return []

    active_key = user_openai_key or user_gemini_key
    if not active_key:
        raise ValueError("An OpenAI API key is required to retrieve context.")

    query_vector = generate_embedding(query.strip(), active_key)

    hits = search_code(
        repository_id=repository_id,
        query_vector=query_vector,
        limit=limit,
    )

    return hits
