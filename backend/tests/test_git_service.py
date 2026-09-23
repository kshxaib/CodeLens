import tempfile
import os
from pathlib import Path
from app.services.git_service import is_excluded, scan_directory


def test_is_excluded_rules():
    root = Path("/fake/repo")

    # Excluded dirs
    assert is_excluded(root / "node_modules" / "express" / "index.js", root) is True
    assert is_excluded(root / ".git" / "config", root) is True
    assert is_excluded(root / "dist" / "bundle.js", root) is True
    assert is_excluded(root / "__pycache__" / "main.cpython-313.pyc", root) is True

    # Excluded files & extensions
    assert is_excluded(root / "package-lock.json", root) is True
    assert is_excluded(root / "assets" / "logo.png", root) is True
    assert is_excluded(root / "bundle.min.js", root) is True
    assert is_excluded(root / "app.min.css", root) is True

    # Valid source files
    assert is_excluded(root / "src" / "index.js", root) is False
    assert is_excluded(root / "app" / "main.py", root) is False
    assert is_excluded(root / "components" / "Header.tsx", root) is False
    assert is_excluded(root / "README.md", root) is False


def test_scan_directory_with_mock_files():
    with tempfile.TemporaryDirectory() as temp_dir:
        root = Path(temp_dir)

        # Create valid files
        (root / "src").mkdir()
        (root / "src" / "main.py").write_text("def hello():\n    return 'world'\n", encoding="utf-8")
        (root / "README.md").write_text("# Project Docs\n", encoding="utf-8")

        # Create excluded files/dirs
        (root / "node_modules").mkdir()
        (root / "node_modules" / "lib.js").write_text("ignored", encoding="utf-8")
        (root / "package-lock.json").write_text("{}", encoding="utf-8")
        (root / "logo.png").write_bytes(b"\x89PNG\r\n\x1a\n")

        files = scan_directory(temp_dir)
        paths = [f["file_path"] for f in files]

        assert "src/main.py" in paths
        assert "README.md" in paths
        assert "node_modules/lib.js" not in paths
        assert "package-lock.json" not in paths
        assert "logo.png" not in paths

        # Check metadata
        main_file = next(f for f in files if f["file_path"] == "src/main.py")
        assert main_file["language"] == "python"
        assert main_file["line_count"] == 2
        assert len(main_file["file_hash"]) == 64
        assert "def hello():" in main_file["content"]
