"""
Architecture Knowledge Graph builder for CodeLens.

Analyzes all indexed repository files and builds a semantically rich graph
where nodes represent meaningful architectural entities and edges represent
typed, evidence-backed relationships.

Pipeline:
1. Build FileIndex for fast path resolution
2. Extract AST symbols from all files (via existing symbols.py)
3. Classify each file into an EntityType + ArchLayer
4. Detect and add synthetic nodes (PostgreSQL, Redis, Stripe, etc.)
5. Build IMPORTS edges — deterministic, directly from AST
6. Build CONSUMES edges — for external service imports
7. Build CALLS edges — inferred from call expressions + import resolution
8. Build READS/WRITES edges — inferred from ORM query patterns
9. Build DEPENDS_ON edges — for detected database connections
10. Finalize metadata and summary

Design principles:
- Deterministic facts (direct imports) → confidence 1.0
- Heuristic inferences (naming-based calls) → confidence 0.4-0.8
- Every edge carries SourceEvidence (file path + line range + optional snippet)
- External services are synthetic nodes (no source file)
- No LLM calls — all classification is rule-based
"""
from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any

from app.parser.symbols import extract_symbols, Symbol
from app.parser.graph_schema import (
    ArchNode,
    ArchEdge,
    KnowledgeGraph,
    EntityType,
    ArchLayer,
    RelationshipType,
    ConfidenceLevel,
    SourceEvidence,
    CONFIDENCE_VALUES,
    ENTITY_DEFAULT_LAYER,
)
from app.parser.dependency_resolver import (
    FileIndex,
    resolve_python_import,
    resolve_js_ts_import,
    extract_python_import_statements,
    extract_js_import_paths,
)
from app.parser.entity_classifier import (
    classify_file,
    detect_external_service_imports,
    extract_base_classes,
    extract_route_decorators,
    BASE_CLASS_RULES,
)


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def build_knowledge_graph(files: List[Dict[str, Any]]) -> KnowledgeGraph:
    """
    Build the Architecture Knowledge Graph from a list of indexed repository files.

    Each file dict must contain at minimum:
        file_path  (str)
        content    (str)
        language   (str)
        line_count (int)

    Returns a fully populated KnowledgeGraph with nodes, edges, and metadata.
    """
    kg = KnowledgeGraph(metadata={"file_count": len(files), "generator": "codelens-kg-v1"})

    # ------------------------------------------------------------------
    # Step 1: Build file index
    # ------------------------------------------------------------------
    file_index = FileIndex(files)

    # ------------------------------------------------------------------
    # Step 2: Extract AST symbols from all files
    # ------------------------------------------------------------------
    file_symbols: Dict[str, List[Symbol]] = {}
    for f in files:
        path = f["file_path"]
        content = f.get("content", "")
        if content:
            file_symbols[path] = extract_symbols(content, path)
        else:
            file_symbols[path] = []

    # ------------------------------------------------------------------
    # Shared state
    # ------------------------------------------------------------------
    file_node_map: Dict[str, str] = {}          # normalized_path → node_id
    external_service_map: Dict[str, str] = {}   # pkg_key → node_id
    edge_counter: List[int] = [0]

    def next_edge_id() -> str:
        edge_counter[0] += 1
        return f"edge_{edge_counter[0]:05d}"

    # ------------------------------------------------------------------
    # Step 3: Build file-level architecture nodes
    # ------------------------------------------------------------------
    for f in files:
        path = _normalize(f["file_path"])
        content = f.get("content", "")
        language = f.get("language", "text")
        line_count = f.get("line_count", 0)
        symbols = file_symbols.get(f["file_path"], [])

        entity_type, layer, confidence, conf_level = classify_file(
            path, symbols, content, language
        )

        # Build the node
        node_id = _make_node_id(entity_type, path)
        stem = Path(path).stem
        node_name = _canonical_name(stem, entity_type)
        top_symbols = _top_symbols(symbols)

        metadata: Dict[str, Any] = {
            "language": language,
            "line_count": line_count,
            "file_size": f.get("file_size", 0),
        }

        # Attach route info to API endpoint nodes
        if entity_type == EntityType.API_ENDPOINT and language == "python":
            routes = extract_route_decorators(content)
            if routes:
                metadata["routes"] = routes

        node = ArchNode(
            id=node_id,
            type=entity_type,
            name=node_name,
            display_name=stem,
            layer=layer,
            description=_describe(entity_type, node_name, layer, symbols),
            source_files=[path],
            symbols=top_symbols,
            metadata=metadata,
            confidence=confidence,
            confidence_level=conf_level,
            evidence=[SourceEvidence(file_path=path, start_line=1, end_line=line_count or 1)],
        )
        kg.nodes.append(node)
        file_node_map[path] = node_id

    # ------------------------------------------------------------------
    # Step 4: Detect and create synthetic external service nodes
    # ------------------------------------------------------------------
    for f in files:
        path = _normalize(f["file_path"])
        content = f.get("content", "")
        language = f.get("language", "text")

        for pkg_key, display_name, category in detect_external_service_imports(content, language):
            if pkg_key not in external_service_map:
                ext_id = f"ext_{_slug(pkg_key)}"
                ext_node = ArchNode(
                    id=ext_id,
                    type=EntityType.EXTERNAL_SERVICE,
                    name=display_name,
                    display_name=display_name,
                    layer=ArchLayer.INFRASTRUCTURE,
                    description=f"External {category} service: {display_name}",
                    metadata={"package": pkg_key, "category": category},
                    confidence=CONFIDENCE_VALUES[ConfidenceLevel.HIGH],
                    confidence_level=ConfidenceLevel.HIGH,
                )
                kg.nodes.append(ext_node)
                external_service_map[pkg_key] = ext_id

    # ------------------------------------------------------------------
    # Step 5: Detect database nodes (PostgreSQL, Redis, MongoDB, Qdrant)
    # ------------------------------------------------------------------
    _add_database_nodes(kg, files, file_node_map, next_edge_id)

    # ------------------------------------------------------------------
    # Step 6: Build IMPORTS edges (DETERMINISTIC)
    # ------------------------------------------------------------------
    _build_imports_edges(kg, files, file_index, file_node_map, next_edge_id)

    # ------------------------------------------------------------------
    # Step 7: Build CONSUMES edges for external services
    # ------------------------------------------------------------------
    _build_external_service_edges(
        kg, files, file_node_map, external_service_map, next_edge_id
    )

    # ------------------------------------------------------------------
    # Step 8: Build CALLS edges (MEDIUM confidence — name-based)
    # ------------------------------------------------------------------
    _build_call_edges(kg, files, file_symbols, file_node_map, file_index, next_edge_id)

    # ------------------------------------------------------------------
    # Step 9: Build READS/WRITES edges (HIGH confidence — ORM patterns)
    # ------------------------------------------------------------------
    _build_db_access_edges(kg, files, file_node_map, next_edge_id)

    # ------------------------------------------------------------------
    # Finalize
    # ------------------------------------------------------------------
    kg.metadata.update(kg.summary())
    return kg


# ---------------------------------------------------------------------------
# Edge builders
# ---------------------------------------------------------------------------

def _build_imports_edges(
    kg: KnowledgeGraph,
    files: List[Dict],
    file_index: FileIndex,
    file_node_map: Dict[str, str],
    next_edge_id,
) -> None:
    """
    Build IMPORTS edges by resolving all import statements.

    Python: `from app.services.payment import PaymentService`
    JS/TS:  `import { api } from '../api/client'`

    Confidence: DETERMINISTIC (import statement is explicitly in AST)
    """
    for f in files:
        path = _normalize(f["file_path"])
        content = f.get("content", "")
        language = f.get("language", "text")
        src_id = file_node_map.get(path)
        if not src_id or not content:
            continue

        if language == "python":
            for import_text, start_line, end_line in extract_python_import_statements(content):
                for target_path, imported_name in resolve_python_import(
                    import_text, path, file_index
                ):
                    tgt_id = file_node_map.get(_normalize(target_path))
                    if tgt_id and tgt_id != src_id:
                        snippet = _snippet(content, start_line, end_line)
                        _upsert_edge(
                            kg,
                            next_edge_id(),
                            src_id,
                            tgt_id,
                            RelationshipType.IMPORTS,
                            confidence=CONFIDENCE_VALUES[ConfidenceLevel.DETERMINISTIC],
                            confidence_level=ConfidenceLevel.DETERMINISTIC,
                            evidence=[SourceEvidence(
                                file_path=path,
                                start_line=start_line,
                                end_line=end_line,
                                snippet=snippet,
                            )],
                        )

        elif language in ("javascript", "typescript", "tsx", "jsx"):
            for import_path_str, start_line, end_line in extract_js_import_paths(content):
                target_path = resolve_js_ts_import(import_path_str, path, file_index)
                if target_path:
                    tgt_id = file_node_map.get(_normalize(target_path))
                    if tgt_id and tgt_id != src_id:
                        snippet = _snippet(content, start_line, end_line)
                        _upsert_edge(
                            kg,
                            next_edge_id(),
                            src_id,
                            tgt_id,
                            RelationshipType.IMPORTS,
                            confidence=CONFIDENCE_VALUES[ConfidenceLevel.DETERMINISTIC],
                            confidence_level=ConfidenceLevel.DETERMINISTIC,
                            evidence=[SourceEvidence(
                                file_path=path,
                                start_line=start_line,
                                end_line=end_line,
                                snippet=snippet,
                            )],
                        )


def _build_external_service_edges(
    kg: KnowledgeGraph,
    files: List[Dict],
    file_node_map: Dict[str, str],
    external_service_map: Dict[str, str],
    next_edge_id,
) -> None:
    """
    Build CONSUMES / AUTHENTICATES / EMITS edges to external services.

    Detected by matching known package imports to external service nodes.
    Confidence: HIGH (import statement is deterministic; relationship type is inferred)
    """
    for f in files:
        path = _normalize(f["file_path"])
        content = f.get("content", "")
        language = f.get("language", "text")
        src_id = file_node_map.get(path)
        if not src_id or not content:
            continue

        for pkg_key, display_name, category in detect_external_service_imports(content, language):
            ext_id = external_service_map.get(pkg_key)
            if not ext_id:
                continue

            rel_type = _category_to_rel(category)

            # Find the import line for evidence
            if language == "python":
                m = re.search(
                    rf"^(?:import|from)\s+{re.escape(pkg_key)}", content, re.MULTILINE
                )
            else:
                m = re.search(
                    rf"""['"](?:@?{re.escape(pkg_key)})['"']""", content
                )

            start_line = content[: m.start()].count("\n") + 1 if m else 1
            snippet = _snippet(content, start_line, start_line)

            _upsert_edge(
                kg,
                next_edge_id(),
                src_id,
                ext_id,
                rel_type,
                confidence=CONFIDENCE_VALUES[ConfidenceLevel.HIGH],
                confidence_level=ConfidenceLevel.HIGH,
                evidence=[SourceEvidence(
                    file_path=path, start_line=start_line, end_line=start_line,
                    snippet=snippet,
                )],
            )


def _build_call_edges(
    kg: KnowledgeGraph,
    files: List[Dict],
    file_symbols: Dict[str, List[Symbol]],
    file_node_map: Dict[str, str],
    file_index: FileIndex,
    next_edge_id,
) -> None:
    """
    Build CALLS edges by matching call expressions to defined functions/classes.

    Strategy:
    1. Build a map of function/class names → defining node IDs
    2. For each call expression in each file, look up the callee name
    3. If there's a resolved import for that name in the source file,
       use it to identify the target node (HIGH confidence)
    4. Otherwise fall back to name-matching across all nodes (MEDIUM confidence)

    Avoids self-loops and duplicate edges.
    """
    # Build: defined_name → [node_id, ...]
    name_to_nodes: Dict[str, List[str]] = defaultdict(list)
    for f in files:
        path = _normalize(f["file_path"])
        nid = file_node_map.get(path)
        if not nid:
            continue
        for sym in file_symbols.get(f["file_path"], []):
            if sym.kind in ("function", "class", "method"):
                name_to_nodes[sym.name].append(nid)

    # Build: (src_file, imported_name) → target_node_id
    # Enables high-confidence resolution when the callee was imported
    import_resolution_cache: Dict[Tuple[str, str], Optional[str]] = {}

    def resolve_import_for_name(src_path: str, name: str) -> Optional[str]:
        """Find the node where `name` was imported from in src_path."""
        key = (src_path, name)
        if key in import_resolution_cache:
            return import_resolution_cache[key]

        content = ""
        for f in files:
            if _normalize(f["file_path"]) == src_path:
                content = f.get("content", "")
                break

        result = None
        if content:
            language = "python"
            for f in files:
                if _normalize(f["file_path"]) == src_path:
                    language = f.get("language", "python")
                    break

            if language == "python":
                for import_text, _, _ in extract_python_import_statements(content):
                    for target_path, imported_name in resolve_python_import(
                        import_text, src_path, file_index
                    ):
                        if imported_name == name or imported_name == "*":
                            nid = file_node_map.get(_normalize(target_path))
                            if nid:
                                result = nid
                                break
                    if result:
                        break

        import_resolution_cache[key] = result
        return result

    for f in files:
        path = _normalize(f["file_path"])
        content = f.get("content", "")
        src_id = file_node_map.get(path)
        if not src_id or not content:
            continue

        for sym in file_symbols.get(f["file_path"], []):
            if sym.kind != "call":
                continue

            # Base name only (strip method chains: service.create → service)
            base_name = sym.name.split(".")[0]
            if not base_name or len(base_name) < 2:
                continue

            # Try import-based resolution first (HIGH confidence)
            resolved_id = resolve_import_for_name(path, base_name)
            if resolved_id and resolved_id != src_id:
                snippet = _snippet(content, sym.start_line, sym.end_line)
                _upsert_edge(
                    kg,
                    next_edge_id(),
                    src_id,
                    resolved_id,
                    RelationshipType.CALLS,
                    confidence=CONFIDENCE_VALUES[ConfidenceLevel.HIGH],
                    confidence_level=ConfidenceLevel.HIGH,
                    evidence=[SourceEvidence(
                        file_path=path,
                        start_line=sym.start_line,
                        end_line=sym.end_line,
                        snippet=snippet,
                    )],
                )
                continue

            # Fall back to name matching (MEDIUM confidence)
            candidate_ids = [
                nid for nid in name_to_nodes.get(base_name, [])
                if nid != src_id
            ]
            if len(candidate_ids) == 1:
                # Single match — use it
                snippet = _snippet(content, sym.start_line, sym.end_line)
                _upsert_edge(
                    kg,
                    next_edge_id(),
                    src_id,
                    candidate_ids[0],
                    RelationshipType.CALLS,
                    confidence=CONFIDENCE_VALUES[ConfidenceLevel.MEDIUM],
                    confidence_level=ConfidenceLevel.MEDIUM,
                    evidence=[SourceEvidence(
                        file_path=path,
                        start_line=sym.start_line,
                        end_line=sym.end_line,
                        snippet=snippet,
                    )],
                )


def _build_db_access_edges(
    kg: KnowledgeGraph,
    files: List[Dict],
    file_node_map: Dict[str, str],
    next_edge_id,
) -> None:
    """
    Build READS and WRITES edges between services and database model nodes.

    Detects SQLAlchemy ORM patterns:
    - READS:  db.query(Model)   / session.query(Model)
    - WRITES: db.add(model_var) / session.add(model_var)

    For WRITES, looks back up to 10 lines to find the model class name.
    Confidence: HIGH for db.query(ClassName), MEDIUM for db.add(varName)
    """
    # Build: class_name → node_id for DATABASE_MODEL nodes
    model_node_map: Dict[str, str] = {}
    for node in kg.nodes:
        if node.type == EntityType.DATABASE_MODEL:
            model_node_map[node.name] = node.id
            model_node_map[node.display_name] = node.id
            # Also index individual class names from the node's symbols
            for sym in node.symbols:
                if sym.get("kind") == "class" and sym.get("name"):
                    model_node_map[sym["name"]] = node.id

    for f in files:
        path = _normalize(f["file_path"])
        content = f.get("content", "")
        language = f.get("language", "text")
        src_id = file_node_map.get(path)
        if not src_id or not content or language != "python":
            continue

        # READS: db.query(Model) or session.query(Model)
        read_re = re.compile(r"(?:db|session)\.query\s*\(\s*([A-Z]\w+)\s*\)")
        for m in read_re.finditer(content):
            model_name = m.group(1)
            tgt_id = model_node_map.get(model_name)
            if tgt_id and tgt_id != src_id:
                line_no = content[: m.start()].count("\n") + 1
                _upsert_edge(
                    kg,
                    next_edge_id(),
                    src_id,
                    tgt_id,
                    RelationshipType.READS,
                    confidence=CONFIDENCE_VALUES[ConfidenceLevel.HIGH],
                    confidence_level=ConfidenceLevel.HIGH,
                    evidence=[SourceEvidence(
                        file_path=path,
                        start_line=line_no,
                        end_line=line_no,
                        snippet=_snippet(content, line_no, line_no),
                    )],
                )

        # WRITES: db.add(variable) — look nearby for model instantiation
        write_re = re.compile(r"(?:db|session)\.add\s*\(\s*(\w+)\s*\)")
        lines = content.splitlines()
        for m in write_re.finditer(content):
            line_no = content[: m.start()].count("\n") + 1
            # Look back up to 10 lines for model class name
            look_start = max(0, line_no - 10)
            context_block = "\n".join(lines[look_start : line_no])

            for model_name, tgt_id in model_node_map.items():
                if tgt_id == src_id:
                    continue
                # Model name appears in nearby context as instantiation
                if re.search(rf"\b{re.escape(model_name)}\s*\(", context_block):
                    _upsert_edge(
                        kg,
                        next_edge_id(),
                        src_id,
                        tgt_id,
                        RelationshipType.WRITES,
                        confidence=CONFIDENCE_VALUES[ConfidenceLevel.HIGH],
                        confidence_level=ConfidenceLevel.HIGH,
                        evidence=[SourceEvidence(
                            file_path=path,
                            start_line=look_start + 1,
                            end_line=line_no,
                            snippet=_snippet(content, look_start + 1, line_no),
                        )],
                    )
                    break


def _add_database_nodes(
    kg: KnowledgeGraph,
    files: List[Dict],
    file_node_map: Dict[str, str],
    next_edge_id,
) -> None:
    """
    Add synthetic nodes for detected database instances.

    Detection patterns:
    - PostgreSQL: connection strings, psycopg2, asyncpg imports
    - Redis:      redis:// connection string, Redis() instantiation
    - MongoDB:    mongodb:// connection string, MongoClient
    - Qdrant:     qdrant_client import, QdrantClient usage
    """
    DB_PATTERNS = [
        (
            "postgresql",
            "db_postgresql",
            "PostgreSQL",
            "PostgreSQL relational database",
            r"postgresql://|postgres://|psycopg2|asyncpg",
        ),
        (
            "redis",
            "db_redis",
            "Redis",
            "Redis in-memory cache and queue",
            r"redis://|Redis\s*\(|aioredis|from\s+redis\b",
        ),
        (
            "mongodb",
            "db_mongodb",
            "MongoDB",
            "MongoDB document database",
            r"mongodb://|MongoClient\s*\(|from\s+pymongo\b",
        ),
        (
            "qdrant",
            "db_qdrant",
            "Qdrant",
            "Qdrant vector database for semantic search",
            r"QdrantClient\s*\(|qdrant_client",
        ),
    ]

    added_dbs: Set[str] = set()

    for f in files:
        path = _normalize(f["file_path"])
        content = f.get("content", "")
        src_id = file_node_map.get(path)
        if not content:
            continue

        for db_key, db_id, db_name, db_desc, pattern in DB_PATTERNS:
            if re.search(pattern, content, re.IGNORECASE):
                if db_key not in added_dbs:
                    db_node = ArchNode(
                        id=db_id,
                        type=EntityType.DATABASE,
                        name=db_name,
                        display_name=db_name,
                        layer=ArchLayer.INFRASTRUCTURE,
                        description=db_desc,
                        metadata={"db_type": db_key},
                        confidence=CONFIDENCE_VALUES[ConfidenceLevel.HIGH],
                        confidence_level=ConfidenceLevel.HIGH,
                    )
                    kg.nodes.append(db_node)
                    added_dbs.add(db_key)

                if src_id:
                    m = re.search(pattern, content, re.IGNORECASE)
                    line_no = content[: m.start()].count("\n") + 1 if m else 1
                    _upsert_edge(
                        kg,
                        next_edge_id(),
                        src_id,
                        db_id,
                        RelationshipType.DEPENDS_ON,
                        confidence=CONFIDENCE_VALUES[ConfidenceLevel.HIGH],
                        confidence_level=ConfidenceLevel.HIGH,
                        evidence=[SourceEvidence(
                            file_path=path,
                            start_line=line_no,
                            end_line=line_no,
                            snippet=_snippet(content, line_no, line_no),
                        )],
                    )


# ---------------------------------------------------------------------------
# Edge deduplication
# ---------------------------------------------------------------------------

def _upsert_edge(
    kg: KnowledgeGraph,
    edge_id: str,
    source: str,
    target: str,
    rel_type: RelationshipType,
    confidence: float,
    confidence_level: ConfidenceLevel,
    evidence: List[SourceEvidence],
    metadata: Optional[Dict] = None,
) -> None:
    """
    Add an edge to the graph, or merge evidence into an existing edge.

    Deduplication key: (source, target, relationship_type).
    When merging, evidence from the new edge is appended if not already present.
    The highest confidence value is kept.
    """
    for e in kg.edges:
        if (
            e.source == source
            and e.target == target
            and e.relationship_type == rel_type
        ):
            # Merge evidence
            existing_keys = {(ev.file_path, ev.start_line) for ev in e.evidence}
            for ev in evidence:
                if (ev.file_path, ev.start_line) not in existing_keys:
                    e.evidence.append(ev)
            # Keep highest confidence
            if confidence > e.confidence:
                e.confidence = confidence
                e.confidence_level = confidence_level
            return

    kg.edges.append(
        ArchEdge(
            id=edge_id,
            source=source,
            target=target,
            relationship_type=rel_type,
            confidence=confidence,
            confidence_level=confidence_level,
            evidence=evidence,
            metadata=metadata or {},
        )
    )


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _normalize(path: str) -> str:
    """Normalize file path to forward slashes, stripped of leading slash."""
    return path.replace("\\", "/").lstrip("/")


def _slug(text: str) -> str:
    """Create a filesystem-safe slug from any string."""
    return re.sub(r"[^a-zA-Z0-9_]", "_", text).lower().strip("_")


def _make_node_id(entity_type: EntityType, path: str) -> str:
    """Create a stable, human-readable node ID from entity type + file path."""
    prefixes = {
        EntityType.APPLICATION: "app",
        EntityType.SERVICE: "svc",
        EntityType.MODULE: "mod",
        EntityType.COMPONENT: "cmp",
        EntityType.API_ENDPOINT: "api",
        EntityType.DATABASE: "db",
        EntityType.DATABASE_MODEL: "mdl",
        EntityType.EXTERNAL_SERVICE: "ext",
        EntityType.QUEUE: "que",
        EntityType.WORKER: "wrk",
        EntityType.STORAGE: "sto",
        EntityType.FUNCTION: "fn",
        EntityType.CLASS_DEF: "cls",
        EntityType.LIFECYCLE_ENTITY: "lce",
    }
    prefix = prefixes.get(entity_type, "mod")
    stem = Path(path).stem
    return f"{prefix}_{_slug(stem)}"


def _canonical_name(stem: str, entity_type: EntityType) -> str:
    """
    Convert a file stem to a proper canonical name.
    Services/Models get PascalCase; others keep their stem.
    """
    if entity_type in (
        EntityType.SERVICE, EntityType.DATABASE_MODEL,
        EntityType.CLASS_DEF, EntityType.WORKER, EntityType.API_ENDPOINT,
    ):
        parts = stem.replace("-", "_").split("_")
        return "".join(p.capitalize() for p in parts if p)
    return stem


def _top_symbols(symbols: List[Symbol], limit: int = 10) -> List[Dict]:
    """Extract top symbols for node metadata."""
    return [
        {
            "name": s.name,
            "kind": s.kind,
            "start_line": s.start_line,
            "end_line": s.end_line,
            "signature": s.signature,
        }
        for s in symbols
        if s.kind in ("function", "class", "method")
    ][:limit]


def _describe(
    entity_type: EntityType,
    name: str,
    layer: ArchLayer,
    symbols: List[Symbol],
) -> str:
    """Auto-generate a short description for a node."""
    fn_count = sum(1 for s in symbols if s.kind in ("function", "method"))
    cls_count = sum(1 for s in symbols if s.kind == "class")
    descriptions = {
        EntityType.SERVICE: f"{name} — business logic service ({fn_count} operations)",
        EntityType.API_ENDPOINT: f"{name} — API handler ({fn_count} endpoints)",
        EntityType.COMPONENT: f"{name} — UI component",
        EntityType.DATABASE_MODEL: f"{name} — data model ({fn_count} methods)",
        EntityType.WORKER: f"{name} — background worker ({fn_count} tasks)",
        EntityType.EXTERNAL_SERVICE: f"{name} — external service integration",
        EntityType.DATABASE: f"{name} — data store",
        EntityType.MODULE: f"{name} — {layer.value} module ({fn_count} functions, {cls_count} classes)",
        EntityType.FUNCTION: f"{name} — utilities ({fn_count} functions)",
        EntityType.CLASS_DEF: f"{name} — class definition",
    }
    return descriptions.get(entity_type, f"{name} ({entity_type.value})")


def _snippet(content: str, start_line: int, end_line: int, max_chars: int = 200) -> Optional[str]:
    """Extract a short code snippet between start_line and end_line (1-indexed)."""
    lines = content.splitlines()
    s = max(0, start_line - 1)
    e = min(len(lines), end_line)
    text = "\n".join(lines[s:e]).strip()
    if len(text) > max_chars:
        text = text[:max_chars] + "..."
    return text if text else None


def _category_to_rel(category: str) -> RelationshipType:
    """Map external service category to the most appropriate relationship type."""
    mapping = {
        "payment": RelationshipType.CONSUMES,
        "email": RelationshipType.CONSUMES,
        "auth": RelationshipType.AUTHENTICATES,
        "queue": RelationshipType.EMITS,
        "cloud": RelationshipType.CONSUMES,
        "storage": RelationshipType.WRITES,
        "monitoring": RelationshipType.EMITS,
        "tracing": RelationshipType.EMITS,
        "cache": RelationshipType.READS,
        "database": RelationshipType.READS,
        "search": RelationshipType.READS,
        "vector_db": RelationshipType.READS,
        "communication": RelationshipType.CONSUMES,
    }
    return mapping.get(category, RelationshipType.DEPENDS_ON)
