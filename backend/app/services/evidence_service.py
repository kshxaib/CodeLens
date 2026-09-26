"""
Evidence Service for CodeLens.

Provides a dedicated, queryable layer for source evidence across the
Architecture Knowledge Graph. Every claim — node classification, edge
relationship — must be traceable to deterministic source code.

Core Principle (ENFORCED):
  - Claims WITHOUT direct code evidence are NEVER presented as certain.
  - They are explicitly marked: is_inferred=True, confidence_level="inferred".
  - LLM-generated summaries MUST cite AST-proven facts.

Evidence Types (from graph_schema.EvidenceType):
  - ast             → Direct AST parse (class definition, decorator, base class)
  - import          → Static import statement
  - function_call   → Call expression in source code
  - route           → HTTP route decorator or router.add_route()
  - db_access       → ORM query or raw SQL
  - configuration   → Config file or environment variable reference
  - inferred        → Heuristic guess (naming conventions, topology)
  - llm_inferred    → LLM-generated claim grounded in AST facts
"""
from __future__ import annotations

from typing import Dict, List, Any, Optional

from app.parser.graph_schema import (
    KnowledgeGraph,
    ArchEdge,
    ArchNode,
    SourceEvidence,
    EvidenceType,
    ConfidenceLevel,
    CONFIDENCE_VALUES,
)


# ---------------------------------------------------------------------------
# Evidence verification result structure
# ---------------------------------------------------------------------------

def _make_evidence_dict(
    ev: SourceEvidence,
    file_content: Optional[str] = None,
) -> Dict[str, Any]:
    """Serialize a SourceEvidence with enriched snippet from real file content."""
    snippet = ev.snippet
    if not snippet and file_content and ev.has_location:
        lines = file_content.splitlines()
        s_idx = max(0, ev.start_line - 1)
        e_idx = min(len(lines), ev.end_line)
        snippet = "\n".join(lines[s_idx:e_idx])

    return {
        "file_path": ev.file_path,
        "start_line": ev.start_line,
        "end_line": ev.end_line,
        "snippet": snippet,
        "evidence_type": ev.evidence_type.value,
        "symbol": ev.symbol,
        "is_inferred": ev.is_inferred,
        "has_location": ev.has_location,
    }


class EvidenceService:
    """
    Dedicated service for querying and verifying source evidence in the Knowledge Graph.

    Guarantees:
    1. Claims without evidence are EXPLICITLY marked is_inferred=True / confidence="inferred".
    2. Evidence is fetched from real file content when snippet is missing.
    3. LLM explanations are flagged as llm_inferred and must reference AST evidence.
    4. Inferred edges are NOT rejected — they are surfaced transparently.
    """

    # Human-readable labels for each evidence type
    EVIDENCE_TYPE_LABELS: Dict[str, str] = {
        EvidenceType.AST.value: "AST Parse",
        EvidenceType.IMPORT.value: "Static Import",
        EvidenceType.FUNCTION_CALL.value: "Function Call",
        EvidenceType.ROUTE.value: "HTTP Route",
        EvidenceType.DB_ACCESS.value: "Database Access",
        EvidenceType.CONFIGURATION.value: "Configuration",
        EvidenceType.INFERRED.value: "Inferred (Heuristic)",
        EvidenceType.LLM_INFERRED.value: "LLM Inferred",
    }

    # Color tokens for UI badge rendering
    EVIDENCE_TYPE_COLORS: Dict[str, str] = {
        EvidenceType.AST.value: "emerald",
        EvidenceType.IMPORT.value: "sky",
        EvidenceType.FUNCTION_CALL.value: "violet",
        EvidenceType.ROUTE.value: "amber",
        EvidenceType.DB_ACCESS.value: "rose",
        EvidenceType.CONFIGURATION.value: "orange",
        EvidenceType.INFERRED.value: "zinc",
        EvidenceType.LLM_INFERRED.value: "indigo",
    }

    def __init__(
        self,
        kg: KnowledgeGraph,
        files: List[Dict[str, Any]],
    ):
        self.kg = kg
        self.files_by_path: Dict[str, Dict[str, Any]] = {
            f.get("file_path", ""): f for f in files
        }
        self.nodes_by_id: Dict[str, ArchNode] = {n.id: n for n in kg.nodes}
        self.edges_by_id: Dict[str, ArchEdge] = {e.id: e for e in kg.edges}

    # ---------------------------------------------------------------------------
    # Public API
    # ---------------------------------------------------------------------------

    def get_node_evidence(self, node_id: str) -> Dict[str, Any]:
        """
        Returns the full evidence set for a node classification.

        If the node has no evidence, it is marked as inferred.
        """
        node = self.nodes_by_id.get(node_id)
        if not node:
            return self._not_found_response(node_id, "node")

        evidence_items = self._enrich_evidence_list(node.evidence)
        verification_status = self._compute_node_verification(node, evidence_items)

        return {
            "entity_id": node.id,
            "entity_name": node.name,
            "entity_type": node.type.value,
            "layer": node.layer.value,
            "confidence": node.confidence,
            "confidence_level": node.confidence_level.value,
            "evidence": evidence_items,
            "source_files": node.source_files,
            "verification": verification_status,
            "is_inferred": not evidence_items or all(e["is_inferred"] for e in evidence_items),
            "evidence_summary": self._summarize_evidence(evidence_items),
        }

    def get_edge_evidence(
        self,
        edge_id: Optional[str] = None,
        source_id: Optional[str] = None,
        target_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Returns full provenance for an edge relationship.

        If the edge has no direct code evidence, the claim is EXPLICITLY
        marked as inferred — never falsely presented as certain.
        """
        edge = self._resolve_edge(edge_id, source_id, target_id)
        if not edge:
            # No edge found → explicitly inferred connection
            return self._inferred_edge_response(source_id, target_id)

        src_node = self.nodes_by_id.get(edge.source)
        tgt_node = self.nodes_by_id.get(edge.target)
        evidence_items = self._enrich_evidence_list(edge.evidence)
        verification_status = self._compute_edge_verification(edge, evidence_items)

        return {
            "edge_id": edge.id,
            "source": src_node.to_dict() if src_node else {"id": edge.source, "name": edge.source},
            "target": tgt_node.to_dict() if tgt_node else {"id": edge.target, "name": edge.target},
            "relationship_type": edge.relationship_type.value,
            "direction": edge.direction,
            "confidence": edge.confidence,
            "confidence_level": edge.confidence_level.value,
            "evidence": evidence_items,
            "is_inferred": edge.is_inferred,
            "has_evidence": edge.has_evidence,
            "reason": self._build_reason(edge, src_node, tgt_node),
            "verification": verification_status,
            "evidence_summary": self._summarize_evidence(evidence_items),
            "evidence_type_metadata": self._get_evidence_type_metadata(evidence_items),
        }

    def get_repository_evidence_stats(self) -> Dict[str, Any]:
        """
        Returns overall evidence quality statistics for the repository.
        Useful for a repository-level "confidence dashboard".
        """
        total_edges = len(self.kg.edges)
        total_nodes = len(self.kg.nodes)

        edges_with_evidence = sum(1 for e in self.kg.edges if e.has_evidence)
        edges_inferred = sum(1 for e in self.kg.edges if e.is_inferred)
        edges_no_evidence = sum(1 for e in self.kg.edges if not e.evidence)

        # Evidence type breakdown
        type_counts: Dict[str, int] = {}
        for edge in self.kg.edges:
            for ev in edge.evidence:
                t = ev.evidence_type.value
                type_counts[t] = type_counts.get(t, 0) + 1

        # Average confidence
        avg_confidence = (
            sum(e.confidence for e in self.kg.edges) / total_edges
            if total_edges > 0 else 0.0
        )
        deterministic_edges = sum(
            1 for e in self.kg.edges
            if e.confidence_level == ConfidenceLevel.DETERMINISTIC
        )

        return {
            "total_nodes": total_nodes,
            "total_edges": total_edges,
            "edges_with_direct_evidence": edges_with_evidence,
            "edges_inferred": edges_inferred,
            "edges_no_evidence": edges_no_evidence,
            "evidence_coverage_pct": round(100 * edges_with_evidence / total_edges, 1) if total_edges else 0,
            "avg_confidence": round(avg_confidence, 3),
            "deterministic_edges": deterministic_edges,
            "evidence_type_breakdown": type_counts,
            "evidence_type_labels": self.EVIDENCE_TYPE_LABELS,
        }

    def verify_claim(
        self,
        source_id: str,
        target_id: str,
        claimed_relationship: str,
    ) -> Dict[str, Any]:
        """
        Verifies whether a specific claimed relationship has source evidence.

        Returns:
        - VERIFIED: Direct evidence found in source code
        - INFERRED: No direct evidence; relationship is a heuristic guess
        - NOT_FOUND: Edge does not exist in the graph at all
        """
        edge = self._resolve_edge(None, source_id, target_id)
        if not edge:
            return {
                "status": "NOT_FOUND",
                "message": f"No relationship between '{source_id}' and '{target_id}' found in the Knowledge Graph.",
                "is_inferred": True,
                "confidence": 0.0,
                "evidence": [],
            }

        # Check if claimed type matches
        type_match = edge.relationship_type.value.upper() == claimed_relationship.upper()
        evidence_items = self._enrich_evidence_list(edge.evidence)

        if edge.has_evidence and not edge.is_inferred:
            status = "VERIFIED" if type_match else "PARTIAL"
            message = (
                f"Relationship verified via {edge.confidence_level.value} source evidence."
                if type_match
                else f"Edge exists but as {edge.relationship_type.value}, not {claimed_relationship}."
            )
        else:
            status = "INFERRED"
            message = (
                "This relationship is a heuristic inference. "
                "No direct code reference was found. Treat with caution."
            )

        return {
            "status": status,
            "message": message,
            "claimed_relationship": claimed_relationship,
            "actual_relationship": edge.relationship_type.value,
            "type_match": type_match,
            "is_inferred": edge.is_inferred,
            "confidence": edge.confidence,
            "confidence_level": edge.confidence_level.value,
            "evidence": evidence_items,
        }

    # ---------------------------------------------------------------------------
    # Internal helpers
    # ---------------------------------------------------------------------------

    def _resolve_edge(
        self,
        edge_id: Optional[str],
        source_id: Optional[str],
        target_id: Optional[str],
    ) -> Optional[ArchEdge]:
        if edge_id and edge_id in self.edges_by_id:
            return self.edges_by_id[edge_id]

        if source_id and target_id:
            s, t = source_id.strip().lower(), target_id.strip().lower()
            for e in self.kg.edges:
                if (
                    e.source.lower() == s and e.target.lower() == t
                ) or (
                    e.source.lower() in s and e.target.lower() in t
                ):
                    return e
        return None

    def _enrich_evidence_list(self, evidence: List[SourceEvidence]) -> List[Dict[str, Any]]:
        """Convert evidence items to dict, enriching snippet from file content."""
        result = []
        for ev in evidence:
            file_content = None
            if ev.file_path and ev.file_path in self.files_by_path:
                file_content = self.files_by_path[ev.file_path].get("content", "")
            result.append(_make_evidence_dict(ev, file_content))
        return result

    def _compute_node_verification(
        self, node: ArchNode, evidence_items: List[Dict]
    ) -> Dict[str, Any]:
        has_direct = any(not e["is_inferred"] and e["has_location"] for e in evidence_items)
        return {
            "status": "VERIFIED" if has_direct else "INFERRED",
            "confidence_pct": round(node.confidence * 100),
            "evidence_count": len(evidence_items),
            "direct_evidence_count": sum(1 for e in evidence_items if not e["is_inferred"]),
            "inferred_evidence_count": sum(1 for e in evidence_items if e["is_inferred"]),
            "warning": None if has_direct else (
                "⚠ Classification inferred from naming conventions and path patterns. "
                "No direct AST proof found."
            ),
        }

    def _compute_edge_verification(
        self, edge: ArchEdge, evidence_items: List[Dict]
    ) -> Dict[str, Any]:
        has_direct = edge.has_evidence and not edge.is_inferred
        return {
            "status": "VERIFIED" if has_direct else "INFERRED",
            "confidence_pct": round(edge.confidence * 100),
            "evidence_count": len(evidence_items),
            "direct_evidence_count": sum(1 for e in evidence_items if not e["is_inferred"]),
            "inferred_evidence_count": sum(1 for e in evidence_items if e["is_inferred"]),
            "warning": None if has_direct else (
                "⚠ Relationship is a heuristic inference. "
                "No direct code reference found. "
                "Treat this connection with appropriate uncertainty."
            ),
        }

    def _build_reason(
        self,
        edge: ArchEdge,
        src: Optional[ArchNode],
        tgt: Optional[ArchNode],
    ) -> str:
        src_name = src.name if src else edge.source
        tgt_name = tgt.name if tgt else edge.target
        rel = edge.relationship_type.value

        reason_map = {
            "CALLS": f"{src_name} directly calls or invokes methods/classes defined in {tgt_name}.",
            "IMPORTS": f"{src_name} explicitly imports symbols from {tgt_name} via a static import statement.",
            "READS": f"{src_name} queries or reads data models defined in {tgt_name}.",
            "WRITES": f"{src_name} mutates or writes state to {tgt_name}.",
            "CONSUMES": f"{src_name} consumes the external client library/SDK for {tgt_name}.",
            "DEPENDS_ON": f"{src_name} depends on {tgt_name} for runtime execution or configuration.",
            "TRIGGERS": f"{src_name} dispatches events that trigger execution of {tgt_name}.",
            "EMITS": f"{src_name} emits messages/events consumed by {tgt_name}.",
            "LISTENS": f"{src_name} subscribes to events or messages from {tgt_name}.",
            "EXPOSES": f"{src_name} exposes an interface, API, or route via {tgt_name}.",
            "AUTHENTICATES": f"{src_name} delegates authentication to {tgt_name}.",
            "PERSISTS": f"{src_name} persists its domain state through {tgt_name}.",
            "TRANSFORMS": f"{src_name} passes data to {tgt_name} for transformation.",
        }

        base = reason_map.get(rel, f"Relationship {rel} detected via static code analysis.")
        if edge.is_inferred:
            base += (
                f"\n\n⚠ NOTE: This is an inferred relationship "
                f"(confidence: {round(edge.confidence * 100)}%). "
                "No direct code line was found. The connection is based on naming patterns "
                "or graph topology, not AST proof."
            )
        return base

    def _summarize_evidence(self, evidence_items: List[Dict]) -> Dict[str, Any]:
        if not evidence_items:
            return {
                "total": 0,
                "by_type": {},
                "files": [],
                "is_fully_inferred": True,
                "strongest_type": "inferred",
            }

        by_type: Dict[str, int] = {}
        files = set()
        for ev in evidence_items:
            t = ev["evidence_type"]
            by_type[t] = by_type.get(t, 0) + 1
            if ev["file_path"]:
                files.add(ev["file_path"])

        # Strongest type priority (higher = more certain)
        priority = {
            "ast": 8, "import": 7, "route": 6, "function_call": 5,
            "db_access": 4, "configuration": 3, "llm_inferred": 2, "inferred": 1,
        }
        strongest = max(by_type.keys(), key=lambda k: priority.get(k, 0))

        return {
            "total": len(evidence_items),
            "by_type": by_type,
            "files": sorted(files),
            "is_fully_inferred": all(e["is_inferred"] for e in evidence_items),
            "strongest_type": strongest,
        }

    def _get_evidence_type_metadata(self, evidence_items: List[Dict]) -> List[Dict[str, Any]]:
        """Returns UI metadata (label, color) for each unique evidence type present."""
        seen = set()
        result = []
        for ev in evidence_items:
            t = ev["evidence_type"]
            if t not in seen:
                seen.add(t)
                result.append({
                    "type": t,
                    "label": self.EVIDENCE_TYPE_LABELS.get(t, t),
                    "color": self.EVIDENCE_TYPE_COLORS.get(t, "zinc"),
                })
        return result

    def _not_found_response(self, entity_id: str, entity_kind: str) -> Dict[str, Any]:
        return {
            "entity_id": entity_id,
            "entity_name": entity_id,
            "entity_type": "unknown",
            "confidence": 0.0,
            "confidence_level": "inferred",
            "evidence": [],
            "is_inferred": True,
            "verification": {
                "status": "NOT_FOUND",
                "confidence_pct": 0,
                "evidence_count": 0,
                "direct_evidence_count": 0,
                "inferred_evidence_count": 0,
                "warning": f"⚠ {entity_kind.title()} '{entity_id}' was not found in the Knowledge Graph.",
            },
            "evidence_summary": {
                "total": 0,
                "by_type": {},
                "files": [],
                "is_fully_inferred": True,
                "strongest_type": "inferred",
            },
        }

    def _inferred_edge_response(
        self,
        source_id: Optional[str],
        target_id: Optional[str],
    ) -> Dict[str, Any]:
        """Explicit response for edges with no evidence in the graph."""
        return {
            "edge_id": None,
            "source": {"id": source_id or "unknown", "name": source_id or "unknown"},
            "target": {"id": target_id or "unknown", "name": target_id or "unknown"},
            "relationship_type": "INFERRED",
            "direction": "directed",
            "confidence": 0.5,
            "confidence_level": ConfidenceLevel.MEDIUM.value,
            "evidence": [],
            "is_inferred": True,
            "has_evidence": False,
            "reason": (
                "⚠ Inferred relationship — No direct source evidence found.\n"
                "This connection is based on semantic proximity or graph topology, "
                "not on a verified code reference. Confidence: Medium (50%)."
            ),
            "verification": {
                "status": "INFERRED",
                "confidence_pct": 50,
                "evidence_count": 0,
                "direct_evidence_count": 0,
                "inferred_evidence_count": 0,
                "warning": (
                    "⚠ No source evidence found for this relationship. "
                    "It is presented as an inferred connection, not a proven fact."
                ),
            },
            "evidence_summary": {
                "total": 0,
                "by_type": {},
                "files": [],
                "is_fully_inferred": True,
                "strongest_type": "inferred",
            },
            "evidence_type_metadata": [{
                "type": "inferred",
                "label": "Inferred (Heuristic)",
                "color": "zinc",
            }],
        }
