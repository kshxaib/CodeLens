import os
from pathlib import Path
from typing import Dict, Optional, Tuple
from tree_sitter import Language, Parser, Tree
import tree_sitter_python
import tree_sitter_javascript
import tree_sitter_typescript
import tree_sitter_java
import tree_sitter_go

# Extension to language mapping
EXTENSION_LANGUAGE_MAP: Dict[str, str] = {
    ".py": "python",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
    ".java": "java",
    ".go": "go",
    ".sql": "sql",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".md": "markdown",
    ".html": "html",
    ".css": "css",
    ".scss": "scss",
    ".rs": "rust",
    ".c": "c",
    ".cpp": "cpp",
    ".h": "c",
    ".hpp": "cpp",
}

# Cache for initialized Tree-sitter Language and Parser instances
_PARSER_CACHE: Dict[str, Parser] = {}


def _init_parser(lang_name: str) -> Optional[Parser]:
    """Initializes and caches a Tree-sitter parser for a specific language."""
    if lang_name in _PARSER_CACHE:
        return _PARSER_CACHE[lang_name]

    try:
        if lang_name == "python":
            lang = Language(tree_sitter_python.language())
        elif lang_name == "javascript":
            lang = Language(tree_sitter_javascript.language())
        elif lang_name == "typescript":
            lang = Language(tree_sitter_typescript.language_typescript())
        elif lang_name == "tsx":
            lang = Language(tree_sitter_typescript.language_tsx())
        elif lang_name == "java":
            lang = Language(tree_sitter_java.language())
        elif lang_name == "go":
            lang = Language(tree_sitter_go.language())
        else:
            return None

        parser = Parser(lang)
        _PARSER_CACHE[lang_name] = parser
        return parser
    except Exception as e:
        print(f"[!] Error loading parser for {lang_name}: {e}")
        return None


def detect_language(file_path: str) -> str:
    """Detects canonical programming language from file path extension."""
    ext = Path(file_path).suffix.lower()
    return EXTENSION_LANGUAGE_MAP.get(ext, "text")


def parse_source_code(code: str, file_path: str) -> Tuple[Optional[Tree], str]:
    """
    Parses source code into a Tree-sitter AST.
    Returns a tuple of (Tree-sitter Tree or None, language_name).
    """
    language = detect_language(file_path)
    parser = _init_parser(language)

    if not parser:
        return None, language

    try:
        code_bytes = code.encode("utf-8")
        tree = parser.parse(code_bytes)
        return tree, language
    except Exception as e:
        print(f"[!] AST parse error for {file_path} ({language}): {e}")
        return None, language
