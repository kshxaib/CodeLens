from typing import Dict, List, Any, Set, Optional
from collections import defaultdict
from app.parser.symbols import extract_symbols, Symbol


def compute_blast_radius(
    target_symbol: str,
    files: List[Dict[str, Any]],
    max_depth: int = 3,
) -> Dict[str, Any]:
    """
    Computes the impact blast radius (upstream callers and downstream callees)
    for a specific function, class, or symbol across the codebase.

    Returns a focused subgraph of nodes, edges, upstream reach, downstream reach,
    and a calculated Risk Level (low | medium | high).
    """
    if not target_symbol:
        return {
            "target_symbol": "",
            "nodes": [],
            "edges": [],
            "risk_level": "low",
            "impact_level": "low",
            "impacted_count": 0,
            "upstream_count": 0,
            "downstream_count": 0,
            "direct_count": 0,
            "upstream_dependents": [],
            "downstream_dependencies": [],
            "direct_dependencies": [],
        }

    # Map: symbol_name -> list of files/functions that DEFINE it
    symbol_definitions: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    # Map: caller_symbol/file -> list of symbols/functions it CALLS
    caller_to_callees: Dict[str, Set[str]] = defaultdict(set)
    # Map: callee_symbol -> list of callers (UPSTREAM dependents)
    callee_to_callers: Dict[str, Set[str]] = defaultdict(set)

    # 1. Parse all files and map call chains
    for file_info in files:
        path = file_info.get("file_path", "")
        content = file_info.get("content", "")
        symbols = extract_symbols(content, path) if content else []

        # Track defined symbols
        for sym in symbols:
            if sym.kind in ("function", "method", "class", "async_function"):
                symbol_definitions[sym.name].append({
                    "file_path": path,
                    "symbol": sym,
                })

        # Track callers and invocations
        current_fn = path
        for sym in symbols:
            if sym.kind in ("function", "method", "class"):
                current_fn = f"{path}::{sym.name}"
            elif sym.kind == "call":
                caller_to_callees[current_fn].add(sym.name)
                callee_to_callers[sym.name].add(current_fn)

    # 2. Traverse Upstream (Who will break if target_symbol changes)
    upstream_nodes: Set[str] = set()
    queue = [(target_symbol, 0)]
    visited = {target_symbol}

    while queue:
        curr, depth = queue.pop(0)
        if depth >= max_depth:
            continue
        for caller in callee_to_callers.get(curr, set()):
            if caller not in visited:
                visited.add(caller)
                upstream_nodes.add(caller)
                queue.append((caller.split("::")[-1] if "::" in caller else caller, depth + 1))

    # 3. Traverse Downstream (What does target_symbol call)
    downstream_nodes: Set[str] = set()
    target_keys = [k for k in caller_to_callees if k.endswith(f"::{target_symbol}") or k == target_symbol]
    
    for tk in target_keys:
        for callee in caller_to_callees.get(tk, set()):
            downstream_nodes.add(callee)

    # 4. Calculate Risk Level
    impacted_count = len(upstream_nodes)
    if impacted_count >= 5:
        risk_level = "high"
    elif impacted_count >= 2:
        risk_level = "medium"
    else:
        risk_level = "low"

    # 5. Build Visualization Graph (Nodes & Edges)
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

    # Target Node
    nodes.append({
        "id": "target_node",
        "type": "targetNode",
        "data": {
            "label": target_symbol,
            "isTarget": True,
            "role": "Target Symbol",
            "riskLevel": risk_level,
        },
    })

    # Upstream Nodes & Edges
    for idx, up_caller in enumerate(upstream_nodes, start=1):
        up_id = f"upstream_{idx}"
        nodes.append({
            "id": up_id,
            "type": "upstreamNode",
            "data": {
                "label": up_caller.split("::")[-1] if "::" in up_caller else up_caller,
                "filePath": up_caller.split("::")[0] if "::" in up_caller else "",
                "role": "Upstream Caller (Impacted)",
            },
        })
        edges.append({
            "id": f"edge_up_{idx}",
            "source": up_id,
            "target": "target_node",
            "label": "calls",
            "animated": True,
            "style": {"stroke": "#EF4444"},  # Red for blast impact
        })

    # Downstream Nodes & Edges
    for idx, down_callee in enumerate(downstream_nodes, start=1):
        down_id = f"downstream_{idx}"
        nodes.append({
            "id": down_id,
            "type": "downstreamNode",
            "data": {
                "label": down_callee,
                "role": "Downstream Callee",
            },
        })
        edges.append({
            "id": f"edge_down_{idx}",
            "source": "target_node",
            "target": down_id,
            "label": "invokes",
            "style": {"stroke": "#38BDF8"},  # Blue for downstream dependency
        })

    return {
        "target_symbol": target_symbol,
        "risk_level": risk_level,
        "impact_level": risk_level,
        "impacted_count": impacted_count,
        "upstream_count": len(upstream_nodes),
        "downstream_count": len(downstream_nodes),
        "direct_count": len(upstream_nodes) + len(downstream_nodes),
        "upstream_dependents": list(upstream_nodes),
        "downstream_dependencies": list(downstream_nodes),
        "direct_dependencies": list(downstream_nodes),
        "nodes": nodes,
        "edges": edges,
    }
