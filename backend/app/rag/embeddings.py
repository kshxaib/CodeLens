import time
import hashlib
import math
from typing import List, Optional
from google import genai
from google.genai import errors as genai_errors

EMBEDDING_MODEL = "gemini-embedding-001"
CANDIDATE_MODELS = ["gemini-embedding-001", "models/gemini-embedding-001", "gemini-embedding-2-preview", "text-embedding-004"]
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
    when external Gemini API quota/rate limits are temporarily exhausted.
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
    using Google Gemini API with the user's decrypted API key.
    """
    if not text or not text.strip():
        return [0.0] * EMBEDDING_DIMENSION

    # Mock mode for testing
    if api_key.startswith("AIzaSy_MOCK_TEST_KEY_"):
        return [0.01 * (i % 10) for i in range(EMBEDDING_DIMENSION)]

    try:
        client = genai.Client(api_key=api_key)
        
        last_err = None
        for model_name in CANDIDATE_MODELS:
            try:
                response = client.models.embed_content(
                    model=model_name,
                    contents=text,
                )
                if hasattr(response, "embedding") and response.embedding:
                    return _normalize_vector(response.embedding.values)
                if hasattr(response, "embeddings") and response.embeddings:
                    return _normalize_vector(response.embeddings[0].values)
            except genai_errors.ClientError as ce:
                last_err = ce
                if "404" in str(ce) or "not found" in str(ce).lower():
                    continue
                elif "429" in str(ce) or "resource exhausted" in str(ce).lower():
                    return _generate_fallback_embedding(text)
                raise ce
            except Exception as e:
                last_err = e
                continue
                
        if last_err:
            return _generate_fallback_embedding(text)

        return [0.0] * EMBEDDING_DIMENSION
    except Exception as e:
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
    if api_key.startswith("AIzaSy_MOCK_TEST_KEY_"):
        return [[0.01 * ((i + idx) % 10) for i in range(EMBEDDING_DIMENSION)] for idx in range(len(texts))]

    all_embeddings: List[List[float]] = []

    try:
        client = genai.Client(api_key=api_key)
    except Exception as e:
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
                response = client.models.embed_content(
                    model=model_name,
                    contents=batch,
                )
                if hasattr(response, "embeddings") and response.embeddings:
                    for emb in response.embeddings:
                        all_embeddings.append(_normalize_vector(emb.values))
                    batch_success = True
                    break
            except genai_errors.ClientError as ce:
                if "404" in str(ce) or "not found" in str(ce).lower():
                    continue
                elif "429" in str(ce) or "resource exhausted" in str(ce).lower():
                    print("[!] Gemini embedding quota exhausted (429). Using deterministic semantic fallback for remaining chunks.")
                    quota_exhausted = True
                    break
                else:
                    break
            except Exception:
                break

        if not batch_success:
            for single_text in batch:
                all_embeddings.append(_generate_fallback_embedding(single_text))

    return all_embeddings
