from pathlib import Path
from typing import Dict, List, Any, Optional, Set
from app.parser.symbols import extract_symbols, Symbol


def classify_layer(file_path: str, symbols: List[Symbol]) -> str:
    """
    Classifies a file into one of 4 architectural layers:
    1. frontend: React/Vue/Svelte, HTML, CSS, client components, UI pages
    2. api_gateway: HTTP routers, endpoints, controllers, server entrypoints
    3. service: Business logic, core engines, utilities, helpers, processors
    4. data: Database models, schemas, migrations, Qdrant/Redis vector stores
    """
    path_lower = file_path.lower()
    ext = Path(file_path).suffix.lower()

    # 1. Frontend layer
    if ext in (".jsx", ".tsx", ".vue", ".svelte", ".html", ".css", ".scss"):
        return "frontend"
    if any(k in path_lower for k in ("frontend", "client", "components", "pages", "views", "ui", "public")):
        return "frontend"

    # 2. Data / Database layer
    if any(k in path_lower for k in ("models", "db", "database", "migrations", "schema", "qdrant", "redis", "entities", "repository")):
        return "data"

    # 3. API Gateway layer
    if any(k in path_lower for k in ("api", "routes", "controllers", "endpoints", "handlers", "server", "main.py", "app.py")):
        return "api_gateway"

    # 4. Service / Business Logic (Default for backend source files)
    return "service"


def generate_architecture_graph(files: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyzes all files in a repository and generates a comprehensive
    interactive topology map (Nodes & Edges) for React-Flow visual canvas.
    """
    nodes: List[Dict[str, Any]] = []
    edges: List[Dict[str, Any]] = []

    # Map file_path to node_id
    file_node_map: Dict[str, str] = {}
    file_symbols_map: Dict[str, List[Symbol]] = {}

    layer_counts: Dict[str, int] = {
        "frontend": 0,
        "api_gateway": 0,
        "service": 0,
        "data": 0,
    }

    # 1. Build Nodes
    for idx, file_info in enumerate(files):
        path = file_info.get("file_path", "")
        content = file_info.get("content", "")
        language = file_info.get("language", "text")

        symbols = extract_symbols(content, path) if content else []
        file_symbols_map[path] = symbols

        layer = classify_layer(path, symbols)
        layer_counts[layer] = layer_counts.get(layer, 0) + 1

        node_id = f"node_{idx + 1}"
        file_node_map[path] = node_id

        # Extract major symbols for preview
        top_symbols = [
            {"name": s.name, "kind": s.kind, "line": s.start_line}
            for s in symbols if s.kind in ("function", "class", "method")
        ][:6]

        nodes.append({
            "id": node_id,
            "type": "architectureNode",
            "layer": layer,
            "data": {
                "label": Path(path).name,
                "filePath": path,
                "language": language,
                "layer": layer,
                "symbolCount": len(symbols),
                "topSymbols": top_symbols,
                "lineCount": file_info.get("line_count", 0),
            },
        })

    # 2. Build Edges (Infer relationships from imports and file references)
    edge_counter = 1
    edge_set: Set[str] = set()

    for src_path, symbols in file_symbols_map.items():
        src_node_id = file_node_map.get(src_path)
        if not src_node_id:
            continue

        for sym in symbols:
            if sym.kind == "import":
                # Look for matching target files in repository
                for target_path, target_node_id in file_node_map.items():
                    if target_path == src_path:
                        continue

                    # Check if imported name matches target module/file
                    target_stem = Path(target_path).stem
                    if target_stem in sym.name:
                        edge_key = f"{src_node_id}->{target_node_id}"
                        if edge_key not in edge_set:
                            edge_set.add(edge_key)
                            edges.append({
                                "id": f"edge_{edge_counter}",
                                "source": src_node_id,
                                "target": target_node_id,
                                "label": "imports",
                                "type": "smoothstep",
                                "animated": True,
                            })
                            edge_counter += 1

    return {
        "nodes": nodes,
        "edges": edges,
        "summary": {
            "total_nodes": len(nodes),
            "total_edges": len(edges),
            "layer_distribution": layer_counts,
        },
    }
