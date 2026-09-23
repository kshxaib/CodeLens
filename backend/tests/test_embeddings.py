from app.rag.embeddings import (
    get_embedding_dimension,
    generate_embedding,
    generate_batch_embeddings,
    EMBEDDING_DIMENSION,
)


def test_embedding_dimensions():
    assert get_embedding_dimension() == 768
    assert EMBEDDING_DIMENSION == 768


def test_mock_embedding_generation():
    mock_key = "AIzaSy_MOCK_TEST_KEY_Secret123"
    vec = generate_embedding("def calculate(): pass", mock_key)

    assert isinstance(vec, list)
    assert len(vec) == 768
    assert all(isinstance(x, float) for x in vec)


def test_mock_batch_embedding_generation():
    mock_key = "AIzaSy_MOCK_TEST_KEY_Secret123"
    texts = [
        "function login() {}",
        "class DatabaseConnection {}",
        "def main(): pass",
    ]
    batch_vecs = generate_batch_embeddings(texts, mock_key, batch_size=2)

    assert len(batch_vecs) == 3
    for vec in batch_vecs:
        assert len(vec) == 768


def test_empty_embedding():
    mock_key = "AIzaSy_MOCK_TEST_KEY_Secret123"
    empty_vec = generate_embedding("", mock_key)
    assert len(empty_vec) == 768
    assert all(x == 0.0 for x in empty_vec)

    assert generate_batch_embeddings([], mock_key) == []
