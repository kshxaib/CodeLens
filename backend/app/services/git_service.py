import os
import shutil
import tempfile
import hashlib
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
from app.parser.ast_parser import detect_language

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    "out",
    "target",
    "coverage",
    "__pycache__",
    ".venv",
    "venv",
    ".next",
    ".nuxt",
    ".idea",
    ".vscode",
    "vendor",
    ".turbo",
    ".cache",
    ".pytest_cache",
    "migrations",
    "migration",
    "alembic",
    "generated",
    ".gradle",
    ".settings",
    ".docusaurus",
}

EXCLUDED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp",
    ".mp4", ".mp3", ".wav", ".pdf", ".zip", ".tar", ".gz", ".7z",
    ".exe", ".dll", ".so", ".dylib", ".bin",
    ".min.js", ".min.css", ".map", ".lock",
}

EXCLUDED_FILES = {
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "cargo.lock",
    "poetry.lock",
    "composer.lock",
    "gemfile.lock",
    "flake.lock",
    "bun.lockb",
    "bun.lock",
    "migration.sql",
    ".ds_store",
    "thumbs.db",
}

MAX_FILE_SIZE_BYTES = 1024 * 1024  # 1MB max file size limit for source code


def is_excluded(file_path: Path, root_dir: Path) -> bool:
    """Checks whether a file should be excluded from indexing."""
    try:
        rel_parts = file_path.relative_to(root_dir).parts
    except ValueError:
        rel_parts = file_path.parts

    # Check directory exclusions
    for part in rel_parts[:-1]:
        if part.lower() in EXCLUDED_DIRS or part.startswith("."):
            return True

    file_name = file_path.name.lower()
    if file_name in EXCLUDED_FILES or file_name.startswith("."):
        return True

    # Check extension exclusions
    ext = file_path.suffix.lower()
    if ext in EXCLUDED_EXTENSIONS:
        return True

    # Double extension check (e.g. .min.js)
    if any(file_name.endswith(ex) for ex in EXCLUDED_EXTENSIONS):
        return True

    return False


def scan_directory(directory_path: str) -> List[Dict[str, Any]]:
    """
    Scans a directory recursively and extracts metadata and contents
    for all eligible source code files.
    """
    root = Path(directory_path).resolve()
    scanned_files: List[Dict[str, Any]] = []

    for root_dir, dirs, files in os.walk(root):
        # Prune excluded directories in-place
        dirs[:] = [d for d in dirs if d.lower() not in EXCLUDED_DIRS and not d.startswith(".")]

        for file_name in files:
            file_path = Path(root_dir) / file_name

            if is_excluded(file_path, root):
                continue

            try:
                stat = file_path.stat()
                file_size = stat.st_size

                # Skip files larger than 1MB
                if file_size > MAX_FILE_SIZE_BYTES or file_size == 0:
                    continue

                # Read text safely (skip binary content)
                try:
                    content = file_path.read_text(encoding="utf-8")
                except (UnicodeDecodeError, Exception):
                    continue

                rel_path = file_path.relative_to(root).as_posix()
                line_count = len(content.splitlines())
                file_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
                language = detect_language(rel_path)

                scanned_files.append({
                    "file_path": rel_path,
                    "language": language,
                    "file_size": file_size,
                    "line_count": line_count,
                    "file_hash": file_hash,
                    "content": content,
                })
            except Exception as e:
                print(f"[!] Warning reading {file_path}: {e}")
                continue

    # Sort alphabetically by path
    scanned_files.sort(key=lambda f: f["file_path"])
    return scanned_files


def clone_and_scan_repository(
    clone_url: str,
    github_token: Optional[str] = None,
) -> Tuple[List[Dict[str, Any]], str]:
    """
    Performs an ephemeral shallow clone of a GitHub repository,
    scans all files, extracts commit SHA, and cleans up the temporary directory.
    """
    temp_dir = tempfile.mkdtemp(prefix="codelens_clone_")
    commit_sha = "unknown"

    try:
        # Inject token if private repository authentication is needed
        clean_clone_url = clone_url.rstrip("/")
        auth_clone_url = clean_clone_url
        if github_token and "github.com" in clean_clone_url:
            auth_clone_url = clean_clone_url.replace(
                "https://github.com",
                f"https://x-access-token:{github_token}@github.com",
            )

        # Execute git clone --depth 1
        cmd = ["git", "clone", "--depth", "1", auth_clone_url, temp_dir]
        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=180,
        )

        if result.returncode != 0:
            raise RuntimeError(f"Git clone failed: {result.stderr.strip()}")

        # Get latest commit SHA
        sha_res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=temp_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if sha_res.returncode == 0:
            commit_sha = sha_res.stdout.strip()

        # Scan files in cloned repo
        scanned_files = scan_directory(temp_dir)
        return scanned_files, commit_sha

    finally:
        # Guarantee cleanup of temporary directory
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)
