import re
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict, Any
from tree_sitter import Node
from app.parser.ast_parser import parse_source_code, detect_language

@dataclass
class Symbol:
    name: str
    kind: str
    start_line: int
    end_line: int
    signature: Optional[str] = None
    docstring: Optional[str] = None
    parent: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

def _get_node_text(node: Node, code_bytes: bytes) -> str:
    return code_bytes[node.start_byte:node.end_byte].decode("utf-8", errors="replace")

def _extract_python_symbols(root_node: Node, code_bytes: bytes) -> List[Symbol]:
    symbols: List[Symbol] = []

    def visit(node: Node, parent_class: Optional[str] = None):
        if node.type == "function_definition":
            name_node = node.child_by_field_name("name")
            name = _get_node_text(name_node, code_bytes) if name_node else "anonymous"
            start_line = node.start_point[0] + 1
            end_line = node.end_point[0] + 1

            lines = _get_node_text(node, code_bytes).splitlines()
            signature = lines[0].strip() if lines else name

            kind = "method" if parent_class else "function"
            symbols.append(Symbol(
                name=name,
                kind=kind,
                start_line=start_line,
                end_line=end_line,
                signature=signature,
                parent=parent_class,
            ))

            for child in node.children:
                visit(child, parent_class=parent_class)
            return

        elif node.type == "class_definition":
            name_node = node.child_by_field_name("name")
            name = _get_node_text(name_node, code_bytes) if name_node else "anonymous"
            start_line = node.start_point[0] + 1
            end_line = node.end_point[0] + 1

            lines = _get_node_text(node, code_bytes).splitlines()
            signature = lines[0].strip() if lines else f"class {name}"

            symbols.append(Symbol(
                name=name,
                kind="class",
                start_line=start_line,
                end_line=end_line,
                signature=signature,
            ))

            body_node = node.child_by_field_name("body")
            if body_node:
                for child in body_node.children:
                    visit(child, parent_class=name)
            return

        elif node.type in ("import_statement", "import_from_statement"):
            import_text = _get_node_text(node, code_bytes).strip()
            symbols.append(Symbol(
                name=import_text,
                kind="import",
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                signature=import_text,
            ))

        elif node.type == "call":
            func_node = node.child_by_field_name("function")
            if func_node:
                call_name = _get_node_text(func_node, code_bytes)
                symbols.append(Symbol(
                    name=call_name,
                    kind="call",
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    parent=parent_class,
                ))

        for child in node.children:
            visit(child, parent_class=parent_class)

    visit(root_node)
    return symbols

def _extract_js_ts_symbols(root_node: Node, code_bytes: bytes) -> List[Symbol]:
    symbols: List[Symbol] = []

    def visit(node: Node, parent_class: Optional[str] = None):
        if node.type in ("function_declaration", "method_definition"):
            name_node = node.child_by_field_name("name")
            name = _get_node_text(name_node, code_bytes) if name_node else "anonymous"
            start_line = node.start_point[0] + 1
            end_line = node.end_point[0] + 1

            lines = _get_node_text(node, code_bytes).splitlines()
            signature = lines[0].strip() if lines else name
            kind = "method" if parent_class or node.type == "method_definition" else "function"

            symbols.append(Symbol(
                name=name,
                kind=kind,
                start_line=start_line,
                end_line=end_line,
                signature=signature,
                parent=parent_class,
            ))

        elif node.type == "class_declaration":
            name_node = node.child_by_field_name("name")
            name = _get_node_text(name_node, code_bytes) if name_node else "anonymous"
            start_line = node.start_point[0] + 1
            end_line = node.end_point[0] + 1

            symbols.append(Symbol(
                name=name,
                kind="class",
                start_line=start_line,
                end_line=end_line,
                signature=f"class {name}",
            ))

            body_node = node.child_by_field_name("body")
            if body_node:
                for child in body_node.children:
                    visit(child, parent_class=name)
            return

        elif node.type == "lexical_declaration":
            for declarator in node.children:
                if declarator.type == "variable_declarator":
                    name_node = declarator.child_by_field_name("name")
                    value_node = declarator.child_by_field_name("value")
                    if name_node and value_node and value_node.type == "arrow_function":
                        name = _get_node_text(name_node, code_bytes)
                        start_line = node.start_point[0] + 1
                        end_line = node.end_point[0] + 1
                        lines = _get_node_text(node, code_bytes).splitlines()
                        signature = lines[0].strip() if lines else f"const {name} = () => ..."
                        symbols.append(Symbol(
                            name=name,
                            kind="function",
                            start_line=start_line,
                            end_line=end_line,
                            signature=signature,
                            parent=parent_class,
                        ))

        elif node.type == "import_statement":
            import_text = _get_node_text(node, code_bytes).strip()
            symbols.append(Symbol(
                name=import_text,
                kind="import",
                start_line=node.start_point[0] + 1,
                end_line=node.end_point[0] + 1,
                signature=import_text,
            ))

        elif node.type == "call_expression":
            func_node = node.child_by_field_name("function")
            if func_node:
                call_name = _get_node_text(func_node, code_bytes)
                symbols.append(Symbol(
                    name=call_name,
                    kind="call",
                    start_line=node.start_point[0] + 1,
                    end_line=node.end_point[0] + 1,
                    parent=parent_class,
                ))

        for child in node.children:
            visit(child, parent_class=parent_class)

    visit(root_node)
    return symbols

def _fallback_regex_symbols(code: str) -> List[Symbol]:
    symbols: List[Symbol] = []
    lines = code.splitlines()

    for idx, line in enumerate(lines, start=1):
        trimmed = line.strip()
        fn_match = re.match(r"^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\(", trimmed)
        if fn_match:
            symbols.append(Symbol(name=fn_match.group(1), kind="function", start_line=idx, end_line=idx, signature=trimmed))
            continue

        cls_match = re.match(r"^class\s+([a-zA-Z0-9_]+)", trimmed)
        if cls_match:
            symbols.append(Symbol(name=cls_match.group(1), kind="class", start_line=idx, end_line=idx, signature=trimmed))
            continue

        if trimmed.startswith("import ") or trimmed.startswith("from ") or trimmed.startswith("require("):
            symbols.append(Symbol(name=trimmed, kind="import", start_line=idx, end_line=idx, signature=trimmed))

    return symbols

def extract_symbols(code: str, file_path: str) -> List[Symbol]:
    if not code or not code.strip():
        return []

    tree, language = parse_source_code(code, file_path)
    if not tree or not tree.root_node:
        return _fallback_regex_symbols(code)

    code_bytes = code.encode("utf-8")

    if language == "python":
        symbols = _extract_python_symbols(tree.root_node, code_bytes)
    elif language in ("javascript", "typescript", "tsx"):
        symbols = _extract_js_ts_symbols(tree.root_node, code_bytes)
    else:
        symbols = _fallback_regex_symbols(code)

    symbols.sort(key=lambda s: s.start_line)
    return symbols
