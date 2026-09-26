"""
Language-aware import dependency resolver for Python and JavaScript/TypeScript.

Resolves import statements to actual file paths within the repository,
enabling accurate, evidence-backed edge generation in the Knowledge Graph.

Key capabilities:
- Python absolute imports:  from app.parser.symbols import X
- Python relative imports:  from . import utils, from .. import base
- JS/TS relative imports:   import { X } from '../api/client'
- JS/TS path aliases:       import X from '@/components/Foo'
- JS/TS index resolution:   import X from './components' → components/index.ts
- JS/TS dynamic require():  const X = require('./config')
"""
from __future__ import annotations

import json
import re
from pathlib import Path, PurePosixPath
from typing import Dict, List, Optional, Set, Tuple, Any


# ---------------------------------------------------------------------------
# File Index
# ---------------------------------------------------------------------------

class FileIndex:
    """
    Fast lookup index for all files in a repository.

    Built once at the start of Knowledge Graph construction and used
    by all import resolution calls.

    Supports:
    - Exact path lookup
    - Extension-aware lookup (tries .ts, .tsx, .js, .jsx, .py, etc.)
    - Index file resolution (./components → ./components/index.ts)
    - TS/JS path alias expansion (@/ → src/, ~/ → src/, etc.)
    """

    # Ordered list of extensions to try when resolving an extensionless import
    JS_TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]
    PY_EXTENSIONS = [".py"]

    def __init__(self, files: List[Dict[str, Any]]) -> None:
        # Normalized path (forward slashes) → file entry
        self._by_path: Dict[str, Dict[str, Any]] = {}
        # filename stem → list of normalized paths (for disambiguation)
        self._by_stem: Dict[str, List[str]] = {}
        # TS/JS path aliases: prefix → replacement
        self._aliases: Dict[str, str] = {}

        for f in files:
            path = f["file_path"].replace("\\", "/")
            self._by_path[path] = f
            stem = Path(path).stem.lower()
            self._by_stem.setdefault(stem, []).append(path)

        self._load_ts_aliases(files)

    # ------------------------------------------------------------------
    # Alias loading
    # ------------------------------------------------------------------

    def _load_ts_aliases(self, files: List[Dict[str, Any]]) -> None:
        """Load path aliases from tsconfig.json or jsconfig.json."""
        for f in files:
            fp = f["file_path"].replace("\\", "/")
            if Path(fp).name in ("tsconfig.json", "jsconfig.json"):
                try:
                    data = json.loads(f.get("content", "{}"))
                    opts = data.get("compilerOptions", {})
                    paths = opts.get("paths", {})
                    base_url = opts.get("baseUrl", ".").rstrip("/")

                    for alias_pattern, targets in paths.items():
                        # "@/*": ["src/*"]  →  "@/" → "<baseUrl>/src/"
                        alias_prefix = alias_pattern.rstrip("*").rstrip("/")
                        if targets:
                            target_prefix = targets[0].rstrip("*").rstrip("/")
                            if base_url and base_url != ".":
                                target_prefix = f"{base_url}/{target_prefix}".lstrip("/")
                            self._aliases[alias_prefix] = target_prefix
                except Exception:
                    pass
                break

        # Heuristic defaults when no tsconfig found
        if not self._aliases:
            has_src = any(
                f["file_path"].replace("\\", "/").startswith("src/")
                for f in files
            )
            if has_src:
                self._aliases["@"] = "src"
                self._aliases["@/"] = "src/"
                self._aliases["~/"] = "src/"

    # ------------------------------------------------------------------
    # Core lookup methods
    # ------------------------------------------------------------------

    def lookup(self, path: str) -> Optional[str]:
        """Return normalized path if it exists exactly in the index."""
        path = path.replace("\\", "/").lstrip("/")
        return path if path in self._by_path else None

    def lookup_with_extensions(
        self, path_no_ext: str, extensions: List[str]
    ) -> Optional[str]:
        """
        Try appending each extension to find the file.
        Also tries <path>/index<ext> for directory-style imports.
        """
        base = path_no_ext.replace("\\", "/").lstrip("/")

        # Direct extension match
        for ext in extensions:
            candidate = base + ext
            if candidate in self._by_path:
                return candidate

        # Index file resolution: './components' → './components/index.ts'
        for ext in extensions:
            index_candidate = base.rstrip("/") + "/index" + ext
            if index_candidate in self._by_path:
                return index_candidate

        return None

    def resolve_alias(self, import_path: str) -> str:
        """
        Expand a TS/JS path alias to a real repository-relative path.
        Tries longest alias prefix first to avoid partial matches.
        """
        for alias in sorted(self._aliases, key=len, reverse=True):
            if import_path.startswith(alias):
                replacement = self._aliases[alias]
                remainder = import_path[len(alias):]
                resolved = f"{replacement}/{remainder}".replace("//", "/").lstrip("/")
                return resolved
        return import_path

    @property
    def all_paths(self) -> Set[str]:
        return set(self._by_path.keys())

    def get_file(self, path: str) -> Optional[Dict[str, Any]]:
        """Return full file entry by path."""
        path = path.replace("\\", "/").lstrip("/")
        return self._by_path.get(path)


# ---------------------------------------------------------------------------
# Python import resolution
# ---------------------------------------------------------------------------

def resolve_python_import(
    import_text: str,
    src_file: str,
    file_index: FileIndex,
) -> List[Tuple[str, str]]:
    """
    Resolve a Python import statement to file paths in the repository.

    Returns a list of (resolved_file_path, imported_symbol_name) tuples.
    External packages (not found in the repo) return an empty list.

    Handles:
    - `import app.parser.symbols`
    - `from app.parser.symbols import extract_symbols, Symbol`
    - `from . import utils`          (relative, same package)
    - `from .. import base`          (relative, parent package)
    - `from .utils import helper`    (relative with sub-module)
    """
    text = import_text.strip()
    results: List[Tuple[str, str]] = []

    # ---- `from X import Y` ----
    m_from = re.match(
        r"^from\s+(\.{0,4})([\w.]*)\s+import\s+(.+)$", text, re.DOTALL
    )
    if m_from:
        dots = m_from.group(1)        # leading dots for relative imports
        module_part = m_from.group(2) # module path (may be empty for `from . import X`)
        names_str = m_from.group(3)   # imported names

        if dots:
            # Relative import
            levels = len(dots)
            src_dir = PurePosixPath(src_file.replace("\\", "/")).parent
            for _ in range(levels - 1):
                src_dir = src_dir.parent

            if module_part:
                candidate_base = str(src_dir / module_part.replace(".", "/"))
            else:
                candidate_base = str(src_dir)

            resolved = _resolve_python_module(candidate_base, file_index)
            if resolved:
                for name in _parse_names(names_str):
                    results.append((resolved, name))
        else:
            # Absolute import
            if module_part:
                candidate_base = module_part.replace(".", "/")
                resolved = _resolve_python_module(candidate_base, file_index)
                if resolved:
                    for name in _parse_names(names_str):
                        results.append((resolved, name))
                # else: external package — skip

        return results

    # ---- `import X` or `import X as Y` ----
    m_import = re.match(r"^import\s+([\w.]+)(?:\s+as\s+\w+)?$", text)
    if m_import:
        module = m_import.group(1)
        candidate_base = module.replace(".", "/")
        resolved = _resolve_python_module(candidate_base, file_index)
        if resolved:
            results.append((resolved, module))

    return results


def _resolve_python_module(base_path: str, file_index: FileIndex) -> Optional[str]:
    """Try to find a Python module or package in the index.
    
    Tries multiple path prefix strategies to handle monorepo layouts where
    files are stored as 'backend/app/...' but imports use 'app/...'.
    """
    base = base_path.replace("\\", "/").lstrip("/")

    # Common backend root prefixes to try prepending
    candidate_prefixes = ["", "backend/", "src/"]
    
    for prefix in candidate_prefixes:
        candidate = prefix + base
        # Try as direct file: app/parser/symbols.py
        resolved = file_index.lookup_with_extensions(candidate, FileIndex.PY_EXTENSIONS)
        if resolved:
            return resolved
        # Try as package: app/parser/symbols/__init__.py
        init_candidate = candidate.rstrip("/") + "/__init__.py"
        if file_index.lookup(init_candidate):
            return init_candidate

    return None


# ---------------------------------------------------------------------------
# JS / TS import resolution
# ---------------------------------------------------------------------------

def resolve_js_ts_import(
    import_path: str,
    src_file: str,
    file_index: FileIndex,
) -> Optional[str]:
    """
    Resolve a JS/TS import specifier to a file path in the repository.

    Returns None for:
    - External npm packages (no ./ or ../ prefix, not an alias)
    - Imports that cannot be found in the repository

    Handles:
    - `import { X } from '../api/client'`    → relative resolution
    - `import X from '@/components/Foo'`     → alias expansion
    - `import X from './components'`          → index file fallback
    - `const X = require('./utils')`         → CommonJS require
    """
    if not import_path:
        return None

    src_posix = src_file.replace("\\", "/")

    if import_path.startswith("."):
        # Relative import — resolve against source file directory
        src_dir = src_posix.rsplit("/", 1)[0] if "/" in src_posix else ""
        
        # Manually resolve the relative path
        parts = (src_dir + "/" + import_path).split("/")
        resolved_parts = []
        for part in parts:
            if part == "..":
                if resolved_parts:
                    resolved_parts.pop()
            elif part and part != ".":
                resolved_parts.append(part)
        resolved_base = "/".join(resolved_parts)

    else:
        # Try alias expansion first
        expanded = file_index.resolve_alias(import_path)
        if expanded == import_path:
            # No alias matched → external npm package
            return None
        resolved_base = expanded.lstrip("/")

    # 1. Exact path match
    exact = file_index.lookup(resolved_base)
    if exact:
        return exact

    # 2. Try with extensions
    resolved = file_index.lookup_with_extensions(
        resolved_base, FileIndex.JS_TS_EXTENSIONS
    )
    return resolved


# ---------------------------------------------------------------------------
# Import statement extractors
# ---------------------------------------------------------------------------

def extract_python_import_statements(content: str) -> List[Tuple[str, int, int]]:
    """
    Extract all Python import statements from source code.

    Returns list of (import_text, start_line_1indexed, end_line_1indexed).
    Handles multi-line imports joined with backslash or parentheses.
    """
    results: List[Tuple[str, int, int]] = []
    lines = content.splitlines()
    i = 0

    while i < len(lines):
        stripped = lines[i].strip()

        if not (stripped.startswith("import ") or stripped.startswith("from ")):
            i += 1
            continue

        start_line = i + 1  # 1-indexed
        accumulated = stripped
        end_line = start_line

        # Continuation: backslash or open paren
        while True:
            open_parens = accumulated.count("(") - accumulated.count(")")
            ends_backslash = accumulated.rstrip().endswith("\\")

            if not (ends_backslash or open_parens > 0):
                break
            i += 1
            if i >= len(lines):
                break
            accumulated = (
                accumulated.rstrip("\\").rstrip() + " " + lines[i].strip()
            )
            end_line = i + 1

        # Strip inline comments
        cleaned = re.sub(r"\s*#.*$", "", accumulated, flags=re.MULTILINE).strip()
        if cleaned:
            results.append((cleaned, start_line, end_line))

        i += 1

    return results


def extract_js_import_paths(content: str) -> List[Tuple[str, int, int]]:
    """
    Extract all import/require paths from JS/TS source code.

    Returns list of (import_path_string, start_line_1indexed, end_line_1indexed).

    Captures:
    - Static ES module imports:  import X from '...'
    - Named re-exports:         export { X } from '...'
    - Dynamic imports:           import('...')
    - CommonJS require:          require('...')
    """
    results: List[Tuple[str, int, int]] = []

    # Static imports and re-exports
    static_re = re.compile(
        r"""^[ \t]*(?:import|export)\b[^'"]*?['"]([^'"]+)['"]""",
        re.MULTILINE,
    )
    for m in static_re.finditer(content):
        line_no = content[: m.start()].count("\n") + 1
        results.append((m.group(1), line_no, line_no))

    # Dynamic import() and require()
    dynamic_re = re.compile(
        r"""(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)"""
    )
    for m in dynamic_re.finditer(content):
        line_no = content[: m.start()].count("\n") + 1
        # Avoid duplicating already-caught static imports
        results.append((m.group(1), line_no, line_no))

    # Deduplicate by (path, line)
    seen: Set[Tuple[str, int]] = set()
    unique: List[Tuple[str, int, int]] = []
    for entry in results:
        key = (entry[0], entry[1])
        if key not in seen:
            seen.add(key)
            unique.append(entry)

    return unique


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_names(names_str: str) -> List[str]:
    """
    Parse the name list from a Python 'from X import A, B as C, *' clause.
    Returns canonical names (strips aliases, parentheses, and whitespace).
    """
    # Remove parentheses used for multi-line imports
    names_str = re.sub(r"[()]", "", names_str)
    if names_str.strip() == "*":
        return ["*"]

    names = []
    for part in names_str.split(","):
        part = part.strip()
        # Strip "as alias"
        if " as " in part:
            part = part.split(" as ")[0].strip()
        # Strip inline comments
        part = re.sub(r"\s*#.*$", "", part).strip()
        if part and part.isidentifier():
            names.append(part)

    return names if names else ["*"]
