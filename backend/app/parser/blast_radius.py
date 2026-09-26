"""
Blast Radius computation for CodeLens.

Unified with the canonical Architecture Knowledge Graph and TraceService.
Eliminates duplicate AST call-graph crawlers in favor of the single graph engine.
"""
from typing import Dict, List, Any
from app.parser.knowledge_graph import build_knowledge_graph
from app.services.trace_service import TraceService


def compute_blast_radius(
    target_symbol: str,
    files: List[Dict[str, Any]],
    max_depth: int = 3,
) -> Dict[str, Any]:
    """
    Computes the impact blast radius (upstream callers and downstream callees)
    for a specific function, class, or symbol across the codebase using the
    unified Architecture Knowledge Graph.
    """
    if not target_symbol or not files:
        return {
            "target_symbol": target_symbol or "",
            "risk_level": "low",
            "impact_level": "low",
            "impacted_count": 0,
            "upstream_count": 0,
            "downstream_count": 0,
            "direct_count": 0,
            "upstream_dependents": [],
            "downstream_dependencies": [],
            "direct_dependencies": [],
            "nodes": [],
            "edges": [],
        }

    kg = build_knowledge_graph(files)
    trace_service = TraceService(kg, files)
    return trace_service.compute_symbol_blast_radius(target_symbol, max_depth=max_depth)
