"""
Legacy Architecture Parser compatibility layer.

Unified with the canonical Architecture Knowledge Graph (AKG).
Ensures zero duplicate or competing heuristic graph engines exist.
All architecture generation is powered by build_knowledge_graph.
"""
from typing import Dict, List, Any, Optional
from app.parser.symbols import Symbol
from app.parser.knowledge_graph import build_knowledge_graph
from app.parser.entity_classifier import classify_file


def classify_layer(file_path: str, symbols: Optional[List[Symbol]] = None) -> str:
    """
    Classifies a file into an architectural tier using the unified entity classifier.
    Maps canonical ArchLayer to legacy 4-tier naming for backwards compatibility.
    """
    _, layer, _, _ = classify_file(file_path, symbols or [], "", "")
    val = layer.value
    if val == "presentation":
        return "frontend"
    if val in ("application", "domain"):
        return "service"
    if val == "infrastructure":
        return "data"
    return val


def generate_architecture_graph(files: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generates architecture graph using the canonical Architecture Knowledge Graph builder.
    Eliminates the obsolete heuristic graph generator in favor of AKG.
    """
    kg = build_knowledge_graph(files)
    kg_dict = kg.to_dict()

    layer_dist: Dict[str, int] = {
        "frontend": 0,
        "api_gateway": 0,
        "service": 0,
        "data": 0,
    }
    for node in kg.nodes:
        layer_name = node.layer.value
        if layer_name == "presentation":
            bucket = "frontend"
        elif layer_name in ("application", "domain"):
            bucket = "service"
        elif layer_name == "infrastructure":
            bucket = "data"
        else:
            bucket = layer_name
        layer_dist[bucket] = layer_dist.get(bucket, 0) + 1

    return {
        "nodes": kg_dict["nodes"],
        "edges": kg_dict["edges"],
        "knowledge_graph": kg_dict,
        "summary": {
            "total_nodes": len(kg.nodes),
            "total_edges": len(kg.edges),
            "layer_distribution": layer_dist,
        },
    }
