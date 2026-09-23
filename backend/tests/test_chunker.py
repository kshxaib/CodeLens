from app.services.chunker import chunk_file, CodeChunk


def test_chunk_small_python_file():
    code = """import os

def login_user(username, password):
    # Authenticate credentials
    return True

class Account:
    def get_balance(self):
        return 100
"""
    chunks = chunk_file("auth.py", code, "python", chunk_size=80, overlap=10)
    assert len(chunks) == 1

    c = chunks[0]
    assert c.chunk_index == 0
    assert c.file_path == "auth.py"
    assert c.start_line == 1
    assert c.end_line == len(code.splitlines())
    assert len(c.symbols) >= 2  # login_user, Account

    sym_names = [s["name"] for s in c.symbols]
    assert "login_user" in sym_names
    assert "Account" in sym_names
    assert "# File: auth.py" in c.augmented_content


def test_chunk_multi_window_sliding():
    # Generate 150 lines
    lines = [f"line_{i} = {i}" for i in range(1, 151)]
    code = "\n".join(lines)

    chunks = chunk_file("large.py", code, "python", chunk_size=80, overlap=10)
    # chunk 1: 1-80, chunk 2: 71-150 -> 2 chunks
    assert len(chunks) == 2

    assert chunks[0].start_line == 1
    assert chunks[0].end_line == 80

    assert chunks[1].start_line == 71
    assert chunks[1].end_line == 150


def test_chunk_empty_file():
    assert chunk_file("empty.py", "", "python") == []
    assert chunk_file("empty.py", "   \n\n  ", "python") == []
