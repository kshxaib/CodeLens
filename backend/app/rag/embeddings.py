import time
from typing import List, Optional
from google import genai
from google.genai import errors as genai_errors

EMBEDDING_MODEL = "text-embedding-004"
EMBEDDING_DIMENSION = 768


def get_embedding_dimension() -> int:
    """Returns the vector embedding dimension for text-embedding-004."""
    return EMBEDDING_DIMENSION


def generate_embedding(text: str, api_key: str) -> List[float]:
    """
    Generates a single 768-dimensional vector embedding for text
    using Google Gemini API with the user's decrypted API key.
    """
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIMENSION

    # Mock mode for testing
    if api_key.startswith("AIzaSy_MOCK_TEST_KEY_"):
        return [0.01 * (i % 10) for i in range(EMBEDDING_DIMENSION)]

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
        )
        # Extract embedding values
        if hasattr(response, "embedding") and response.embedding:
            return response.embedding.values
        if hasattr(response, "embeddings") and response.embeddings:
            return response.embeddings[0].values
        return [0.0] * EMBEDDING_DIMENSION
    except Exception as e:
        print(f"[!] Gemini embedding generation error: {e}")
        raise RuntimeError(f"Failed to generate Gemini embedding: {e}")


def generate_batch_embeddings(
    texts: List[str],
    api_key: str,
    batch_size: int = 50,
) -> List[List[float]]:
    """
    Generates embeddings for a batch of texts with chunking
    and error handling.
    """
    if not texts:
        return []

    # Mock mode for testing
    if api_key.startswith("AIzaSy_MOCK_TEST_KEY_"):
        return [[0.01 * ((i + idx) % 10) for i in range(EMBEDDING_DIMENSION)] for idx in range(len(texts))]

    client = genai.Client(api_key=api_key)
    all_embeddings: List[List[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        try:
            response = client.models.embed_content(
                model=EMBEDDING_MODEL,
                contents=batch,
            )
            if hasattr(response, "embeddings") and response.embeddings:
                for emb in response.embeddings:
                    all_embeddings.append(emb.values)
            else:
                # Fallback to individual calls
                for single_text in batch:
                    all_embeddings.append(generate_embedding(single_text, api_key))
        except Exception as e:
            print(f"[!] Batch embedding failed, falling back to sequential: {e}")
            for single_text in batch:
                all_embeddings.append(generate_embedding(single_text, api_key))
                time.sleep(0.05)  # Slight throttle to respect rate limits

    return all_embeddings
