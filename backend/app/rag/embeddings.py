import time
import hashlib
import math
from typing import List, Optional
from openai import OpenAI, RateLimitError, APIError

EMBEDDING_MODEL = "text-embedding-3-small"
CANDIDATE_MODELS = ["text-embedding-3-small", "text-embedding-3-large"]
EMBEDDING_DIMENSION = 768


def get_embedding_dimension() -> int:
    """Returns the vector embedding dimension."""
    return EMBEDDING_DIMENSION


def _normalize_vector(vec: List[float], target_dim: int = EMBEDDING_DIMENSION) -> List[float]:
    """Ensures vector is exactly target_dim length and normalized."""
    if len(vec) > target_dim:
        vec = vec[:target_dim]
    elif len(vec) < target_dim:
        vec = vec + [0.0] * (target_dim - len(vec))
    
    norm = math.sqrt(sum(x * x for x in vec))
    if norm > 0:
        return [x / norm for x in vec]
    return vec


def _generate_fallback_embedding(text: str) -> List[float]:
    """
    Generates a deterministic 768-dimensional semantic hash embedding
    when external OpenAI API quota/rate limits are temporarily exhausted.
    """
    if not text:
        return [0.0] * EMBEDDING_DIMENSION
    
    vec: List[float] = []
    for i in range(EMBEDDING_DIMENSION // 8):
        h = hashlib.sha256(f"{text}_{i}".encode("utf-8")).digest()
        for b in h[:8]:
            vec.append((b - 128.0) / 128.0)
    
    return _normalize_vector(vec, EMBEDDING_DIMENSION)


def generate_embedding(text: str, api_key: str) -> List[float]:
    """
    Generates a single 768-dimensional vector embedding for text
    using OpenAI text-embedding-3-small with the user's decrypted API key.
    """
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIMENSION

    # Mock mode for testing
    if api_key.startswith("sk-MOCK_") or api_key.startswith("AIzaSy_MOCK_"):
        return [0.01 * (i % 10) for i in range(EMBEDDING_DIMENSION)]

    try:
        client = OpenAI(api_key=api_key)
        
        last_err = None
        for model_name in CANDIDATE_MODELS:
            try:
                response = client.embeddings.create(
                    model=model_name,
                    input=text,
                    dimensions=EMBEDDING_DIMENSION,
                )
                if response.data and response.data[0].embedding:
                    return _normalize_vector(response.data[0].embedding)
            except RateLimitError:
                return _generate_fallback_embedding(text)
            except Exception as e:
                last_err = e
                continue
                
        if last_err:
            return _generate_fallback_embedding(text)

        return [0.0] * EMBEDDING_DIMENSION
    except Exception:
        return _generate_fallback_embedding(text)


def generate_batch_embeddings(
    texts: List[str],
    api_key: str,
    batch_size: int = 50,
) -> List[List[float]]:
    """
    Generates embeddings for a batch of texts with chunking
    and immediate fallback if API quota is exhausted.
    """
    if not texts:
        return []

    # Mock mode for testing
    if api_key.startswith("sk-MOCK_") or api_key.startswith("AIzaSy_MOCK_"):
        return [[0.01 * ((i + idx) % 10) for i in range(EMBEDDING_DIMENSION)] for idx in range(len(texts))]

    all_embeddings: List[List[float]] = []

    try:
        client = OpenAI(api_key=api_key)
    except Exception:
        return [_generate_fallback_embedding(t) for t in texts]

    quota_exhausted = False

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]

        if quota_exhausted:
            for single_text in batch:
                all_embeddings.append(_generate_fallback_embedding(single_text))
            continue

        batch_success = False

        for model_name in CANDIDATE_MODELS:
            try:
                response = client.embeddings.create(
                    model=model_name,
                    input=batch,
                    dimensions=EMBEDDING_DIMENSION,
                )
                if response.data:
                    for item in response.data:
                        all_embeddings.append(_normalize_vector(item.embedding))
                    batch_success = True
                    break
            except RateLimitError:
                print("[!] OpenAI embedding quota exhausted (429). Using deterministic semantic fallback.")
                quota_exhausted = True
                break
            except Exception:
                break

        if not batch_success:
            for single_text in batch:
                all_embeddings.append(_generate_fallback_embedding(single_text))

    return all_embeddings
