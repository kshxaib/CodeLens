from __future__ import annotations

import json
import re
from pathlib import Path, PurePosixPath
from typing import Dict, List, Optional, Set, Tuple, Any

class FileIndex:

    JS_TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]
    PY_EXTENSIONS = [".py"]

    def __init__(self, files: List[Dict[str, Any]]) -> None:
        self._by_path: Dict[str, Dict[str, Any]] = {}
        self._by_stem: Dict[str, List[str]] = {}
        self._aliases: Dict[str, str] = {}

        for f in files:
            path = f["file_path"].replace("\\", "/")
            self._by_path[path] = f
            stem = Path(path).stem.lower()
            self._by_stem.setdefault(stem, []).append(path)

        self._load_ts_aliases(files)

    def _load_ts_aliases(self, files: List[Dict[str, Any]]) -> None:
        for f in files:
            fp = f["file_path"].replace("\\", "/")
            if Path(fp).name in ("tsconfig.json", "jsconfig.json"):
                try:
                    data = json.loads(f.get("content", "{}"))
                    opts = data.get("compilerOptions", {})
                    paths = opts.get("paths", {})
                    base_url = opts.get("baseUrl", ".").rstrip("/")

                    for alias_pattern, targets in paths.items():
                        alias_prefix = alias_pattern.rstrip("*").rstrip("/")
                        if targets:
                            target_prefix = targets[0].rstrip("*").rstrip("/")
                            if base_url and base_url != ".":
                                target_prefix = f"{base_url}/{target_prefix}".lstrip("/")
                            self._aliases[alias_prefix] = target_prefix
                except Exception:
                    pass
                break

        if not self._aliases:
            has_src = any(
                f["file_path"].replace("\\", "/").startswith("src/")
                for f in files
            )
            if has_src:
                self._aliases["@"] = "src"
                self._aliases["@/"] = "src/"
                self._aliases["~/"] = "src/"

    def lookup(self, path: str) -> Optional[str]:
        path = path.replace("\\", "/").lstrip("/")
        return path if path in self._by_path else None

    def lookup_with_extensions(
        self, path_no_ext: str, extensions: List[str]
    ) -> Optional[str]:
        base = path_no_ext.replace("\\", "/").lstrip("/")

        for ext in extensions:
            candidate = base + ext
            if candidate in self._by_path:
                return candidate

        for ext in extensions:
            index_candidate = base.rstrip("/") + "/index" + ext
            if index_candidate in self._by_path:
                return index_candidate

        return None

    def resolve_alias(self, import_path: str) -> str:
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
        path = path.replace("\\", "/").lstrip("/")
        return self._by_path.get(path)

def resolve_python_import(
    import_text: str,
    src_file: str,
    file_index: FileIndex,
) -> List[Tuple[str, str]]:
    text = import_text.strip()
    results: List[Tuple[str, str]] = []

    m_from = re.match(
        r"^from\s+(\.{0,4})([\w.]*)\s+import\s+(.+)$", text, re.DOTALL
    )
    if m_from:
        dots = m_from.group(1)
        module_part = m_from.group(2)
        names_str = m_from.group(3)

        if dots:
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
            if module_part:
                candidate_base = module_part.replace(".", "/")
                resolved = _resolve_python_module(candidate_base, file_index)
                if resolved:
                    for name in _parse_names(names_str):
                        results.append((resolved, name))

        return results

    m_import = re.match(r"^import\s+([\w.]+)(?:\s+as\s+\w+)?$", text)
    if m_import:
        module = m_import.group(1)
        candidate_base = module.replace(".", "/")
        resolved = _resolve_python_module(candidate_base, file_index)
        if resolved:
            results.append((resolved, module))

    return results

def _resolve_python_module(base_path: str, file_index: FileIndex) -> Optional[str]:
    base = base_path.replace("\\", "/").lstrip("/")

    candidate_prefixes = ["", "backend/", "src/"]
    
    for prefix in candidate_prefixes:
        candidate = prefix + base
        resolved = file_index.lookup_with_extensions(candidate, FileIndex.PY_EXTENSIONS)
        if resolved:
            return resolved
        init_candidate = candidate.rstrip("/") + "/__init__.py"
        if file_index.lookup(init_candidate):
            return init_candidate

    return None

def resolve_js_ts_import(
    import_path: str,
    src_file: str,
    file_index: FileIndex,
) -> Optional[str]:
    if not import_path:
        return None

    src_posix = src_file.replace("\\", "/")

    if import_path.startswith("."):
        src_dir = src_posix.rsplit("/", 1)[0] if "/" in src_posix else ""
        
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
        expanded = file_index.resolve_alias(import_path)
        if expanded == import_path:
            return None
        resolved_base = expanded.lstrip("/")

    exact = file_index.lookup(resolved_base)
    if exact:
        return exact

    resolved = file_index.lookup_with_extensions(
        resolved_base, FileIndex.JS_TS_EXTENSIONS
    )
    return resolved

def extract_python_import_statements(content: str) -> List[Tuple[str, int, int]]:
    results: List[Tuple[str, int, int]] = []
    lines = content.splitlines()
    i = 0

    while i < len(lines):
        stripped = lines[i].strip()

        if not (stripped.startswith("import ") or stripped.startswith("from ")):
            i += 1
            continue

        start_line = i + 1
        accumulated = stripped
        end_line = start_line

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

        cleaned = re.sub(r"\s*#.*$", "", accumulated, flags=re.MULTILINE).strip()
        if cleaned:
            results.append((cleaned, start_line, end_line))

        i += 1

    return results

def extract_js_import_paths(content: str) -> List[Tuple[str, int, int]]:
    results: List[Tuple[str, int, int]] = []

    static_re = re.compile(
        r"""^[ \t]*(?:import|export)\b[^'"]*?['"]([^'"]+)['"]""",
        re.MULTILINE,
    )
    for m in static_re.finditer(content):
        line_no = content[: m.start()].count("\n") + 1
        results.append((m.group(1), line_no, line_no))

    dynamic_re = re.compile(
        r"""(?:import|require)\s*\(\s*['"]([^'"]+)['"]\s*\)"""
    )
    for m in dynamic_re.finditer(content):
        line_no = content[: m.start()].count("\n") + 1
        results.append((m.group(1), line_no, line_no))

    seen: Set[Tuple[str, int]] = set()
    unique: List[Tuple[str, int, int]] = []
    for entry in results:
        key = (entry[0], entry[1])
        if key not in seen:
            seen.add(key)
            unique.append(entry)

    return unique

def _parse_names(names_str: str) -> List[str]:
    names_str = re.sub(r"[()]", "", names_str)
    if names_str.strip() == "*":
        return ["*"]

    names = []
    for part in names_str.split(","):
        part = part.strip()
        if " as " in part:
            part = part.split(" as ")[0].strip()
        part = re.sub(r"\s*#.*$", "", part).strip()
        if part and part.isidentifier():
            names.append(part)

    return names if names else ["*"]
