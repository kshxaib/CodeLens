from __future__ import annotations

import re
from collections import defaultdict
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any

from app.parser.symbols import extract_symbols, Symbol
from app.parser.graph_schema import ArchNode, ArchEdge, KnowledgeGraph, EntityType, ArchLayer, RelationshipType, ConfidenceLevel, SourceEvidence, CONFIDENCE_VALUES, ENTITY_DEFAULT_LAYER
from app.parser.dependency_resolver import FileIndex, resolve_python_import, resolve_js_ts_import, extract_python_import_statements, extract_js_import_paths
from app.parser.entity_classifier import classify_file, detect_external_service_imports, extract_base_classes, extract_route_decorators, BASE_CLASS_RULES

def build_knowledge_graph(files: List[Dict[str, Any]]) -> KnowledgeGraph:
    kg = KnowledgeGraph(metadata={"file_count": len(files), "generator": "codelens-kg-v1"})

    file_index = FileIndex(files)

    file_symbols: Dict[str, List[Symbol]] = {}
    for f in files:
        path = f["file_path"]
        content = f.get("content", "")
        if content:
            file_symbols[path] = extract_symbols(content, path)
        else:
            file_symbols[path] = []

    file_node_map: Dict[str, str] = {}
    external_service_map: Dict[str, str] = {}
    edge_counter: List[int] = [0]

    def next_edge_id() -> str:
        edge_counter[0] += 1
        return f"edge_{edge_counter[0]:05d}"

    for f in files:
        path = _normalize(f["file_path"])
        content = f.get("content", "")
        language = f.get("language", "text")
        line_count = f.get("line_count", 0)
        symbols = file_symbols.get(f["file_path"], [])

        entity_type, layer, confidence, conf_level = classify_file(
            path, symbols, content, language
        )

        node_id = _make_node_id(entity_type, path)
        stem = Path(path).stem
        node_name = _canonical_name(stem, entity_type)
        top_symbols = _top_symbols(symbols)

        metadata: Dict[str, Any] = {
            "language": language,
            "line_count": line_count,
            "file_size": f.get("file_size", 0),
        }

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

    _add_database_nodes(kg, files, file_node_map, next_edge_id)

    _build_imports_edges(kg, files, file_index, file_node_map, next_edge_id)

    _build_external_service_edges(
        kg, files, file_node_map, external_service_map, next_edge_id
    )

    _build_call_edges(kg, files, file_symbols, file_node_map, file_index, next_edge_id)

    _build_db_access_edges(kg, files, file_node_map, next_edge_id)

    kg.metadata.update(kg.summary())
    return kg

def _build_imports_edges(
    kg: KnowledgeGraph,
    files: List[Dict],
    file_index: FileIndex,
    file_node_map: Dict[str, str],
    next_edge_id,
) -> None:
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
    name_to_nodes: Dict[str, List[str]] = defaultdict(list)
    for f in files:
        path = _normalize(f["file_path"])
        nid = file_node_map.get(path)
        if not nid:
            continue
        for sym in file_symbols.get(f["file_path"], []):
            if sym.kind in ("function", "class", "method"):
                name_to_nodes[sym.name].append(nid)

    import_resolution_cache: Dict[Tuple[str, str], Optional[str]] = {}

    def resolve_import_for_name(src_path: str, name: str) -> Optional[str]:
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

            base_name = sym.name.split(".")[0]
            if not base_name or len(base_name) < 2:
                continue

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

            candidate_ids = [
                nid for nid in name_to_nodes.get(base_name, [])
                if nid != src_id
            ]
            if len(candidate_ids) == 1:
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
    model_node_map: Dict[str, str] = {}
    for node in kg.nodes:
        if node.type == EntityType.DATABASE_MODEL:
            model_node_map[node.name] = node.id
            model_node_map[node.display_name] = node.id
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

        write_re = re.compile(r"(?:db|session)\.add\s*\(\s*(\w+)\s*\)")
        lines = content.splitlines()
        for m in write_re.finditer(content):
            line_no = content[: m.start()].count("\n") + 1
            look_start = max(0, line_no - 10)
            context_block = "\n".join(lines[look_start : line_no])

            for model_name, tgt_id in model_node_map.items():
                if tgt_id == src_id:
                    continue
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
    for e in kg.edges:
        if (
            e.source == source
            and e.target == target
            and e.relationship_type == rel_type
        ):
            existing_keys = {(ev.file_path, ev.start_line) for ev in e.evidence}
            for ev in evidence:
                if (ev.file_path, ev.start_line) not in existing_keys:
                    e.evidence.append(ev)
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

def _normalize(path: str) -> str:
    return path.replace("\\", "/").lstrip("/")

def _slug(text: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_]", "_", text).lower().strip("_")

def _make_node_id(entity_type: EntityType, path: str) -> str:
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
    if entity_type in (
        EntityType.SERVICE, EntityType.DATABASE_MODEL,
        EntityType.CLASS_DEF, EntityType.WORKER, EntityType.API_ENDPOINT,
    ):
        parts = stem.replace("-", "_").split("_")
        return "".join(p.capitalize() for p in parts if p)
    return stem

def _top_symbols(symbols: List[Symbol], limit: int = 10) -> List[Dict]:
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
    lines = content.splitlines()
    s = max(0, start_line - 1)
    e = min(len(lines), end_line)
    text = "\n".join(lines[s:e]).strip()
    if len(text) > max_chars:
        text = text[:max_chars] + "..."
    return text if text else None

def _category_to_rel(category: str) -> RelationshipType:
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
