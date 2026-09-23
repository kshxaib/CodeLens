from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional
from app.parser.symbols import extract_symbols, Symbol

DEFAULT_CHUNK_SIZE = 80
DEFAULT_CHUNK_OVERLAP = 10


@dataclass
class CodeChunk:
    """Represents an AST-correlated structure-aware code chunk."""
    chunk_index: int
    file_path: str
    language: str
    start_line: int  # 1-indexed
    end_line: int    # 1-indexed
    symbols: List[Dict[str, Any]]
    raw_content: str
    augmented_content: str

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def chunk_file(
    file_path: str,
    content: str,
    language: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[CodeChunk]:
    """
    Splits a source file into logical structure-aware chunks.
    Correlates each chunk with intersecting AST symbols and prefixes
    an augmentation header for rich vector embeddings.
    """
    if not content or not content.strip():
        return []

    lines = content.splitlines(keepends=True)
    total_lines = len(lines)

    if total_lines == 0:
        return []

    # 1. Extract all AST symbols in this file
    extracted_symbols = extract_symbols(content, file_path)

    chunks: List[CodeChunk] = []
    chunk_idx = 0
    start = 0

    while start < total_lines:
        end = min(start + chunk_size, total_lines)
        chunk_lines = lines[start:end]
        raw_code = "".join(chunk_lines)

        start_line = start + 1
        end_line = end

        # 2. Find intersecting symbols
        intersecting_symbols: List[Dict[str, Any]] = []
        for sym in extracted_symbols:
            # Check for range overlap: max(start1, start2) <= min(end1, end2)
            if max(start_line, sym.start_line) <= min(end_line, sym.end_line):
                intersecting_symbols.append({
                    "name": sym.name,
                    "kind": sym.kind,
                    "start_line": sym.start_line,
                    "end_line": sym.end_line,
                    "parent": sym.parent,
                })

        # 3. Create context header for embedding optimization
        symbol_summary = ", ".join([f"{s['kind']}:{s['name']}" for s in intersecting_symbols[:5]])
        if not symbol_summary:
            symbol_summary = "none"

        comment_prefix = "//" if language not in ("python", "yaml", "ruby", "bash") else "#"
        header = (
            f"{comment_prefix} File: {file_path} | Language: {language} | "
            f"Lines: {start_line}-{end_line} | Context: {symbol_summary}\n"
        )
        augmented_content = f"{header}\n{raw_code}"

        chunks.append(CodeChunk(
            chunk_index=chunk_idx,
            file_path=file_path,
            language=language,
            start_line=start_line,
            end_line=end_line,
            symbols=intersecting_symbols,
            raw_content=raw_code,
            augmented_content=augmented_content,
        ))

        chunk_idx += 1
        if end >= total_lines:
            break
        start += (chunk_size - overlap)

    return chunks
