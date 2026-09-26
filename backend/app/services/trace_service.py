"""
Trace & Explore Service for CodeLens.

Provides interactive graph exploration and impact analysis across all five views
(Architecture, Workflow, Sequence, Data Flow, Lifecycle):

1. trace_node: Upstream, Current, Downstream traversal
2. find_path: Shortest / relevant path between two nodes
3. why_relationship: AST rule & source evidence explanation for edges
4. explain_component: Evidence-first architectural explanation (LLM + deterministic fallback)
5. calculate_impact: Direct/indirect dependents, depth, risk level
6. change_impact: File/function/symbol change propagation to files, APIs, workflows, and data pipelines
"""
from __future__ import annotations

import os
import re
from collections import defaultdict, deque
from typing import Dict, List, Any, Optional, Set, Tuple

from app.parser.graph_schema import (
    KnowledgeGraph,
    ArchNode,
    ArchEdge,
    SourceEvidence,
    ConfidenceLevel,
)
from app.core.security import decrypt_api_key


class TraceService:
    """
    Unified graph intelligence engine operating on the canonical Architecture Knowledge Graph.
    """

    def __init__(
        self,
        kg: KnowledgeGraph,
        files: List[Dict[str, Any]],
        workflows_data: Optional[Dict[str, Any]] = None,
        dataflows_data: Optional[Dict[str, Any]] = None,
        lifecycles_data: Optional[Dict[str, Any]] = None,
        sequences_data: Optional[Dict[str, Any]] = None,
    ):
        self.kg = kg
        self.files = files
        self.workflows_data = workflows_data or {}
        self.dataflows_data = dataflows_data or {}
        self.lifecycles_data = lifecycles_data or {}
        self.sequences_data = sequences_data or {}

        # Fast lookup indexes
        self.nodes_by_id: Dict[str, ArchNode] = {n.id: n for n in kg.nodes}
        self.nodes_by_name: Dict[str, ArchNode] = {n.name.lower(): n for n in kg.nodes}
        self.files_by_path: Dict[str, Dict[str, Any]] = {f.get("file_path", ""): f for f in files}

        # Adjacency maps for canonical KG
        self.outgoing_edges: Dict[str, List[ArchEdge]] = defaultdict(list)
        self.incoming_edges: Dict[str, List[ArchEdge]] = defaultdict(list)
        for e in kg.edges:
            self.outgoing_edges[e.source].append(e)
            self.incoming_edges[e.target].append(e)

    # -------------------------------------------------------------------------
    # Helper to resolve node across view models
    # -------------------------------------------------------------------------

    def _resolve_node(self, node_id: str, view: str = "architecture") -> Optional[Dict[str, Any]]:
        """Resolves node info either from canonical KG or view subgraphs."""
        node_id_clean = node_id.strip()
        if node_id_clean in self.nodes_by_id:
            return self.nodes_by_id[node_id_clean].to_dict()

        lower_id = node_id_clean.lower()
        if lower_id in self.nodes_by_name:
            return self.nodes_by_name[lower_id].to_dict()

        # Partial match
        for nid, n in self.nodes_by_id.items():
            if lower_id in nid.lower() or lower_id in n.name.lower() or lower_id in n.display_name.lower():
                return n.to_dict()

        # View-specific fallbacks (Workflow step, Lifecycle state, Dataflow node)
        if view == "workflow":
            for wf in self.workflows_data.get("workflows", []):
                for step in wf.get("steps", []):
                    if step.get("id") == node_id_clean or step.get("name") == node_id_clean:
                        return {
                            "id": step["id"],
                            "name": step["name"],
                            "display_name": step["name"],
                            "type": step.get("step_type", "step"),
                            "layer": "application",
                            "description": step.get("description", ""),
                            "evidence": [step.get("evidence")] if step.get("evidence") else [],
                        }

        if view == "lifecycle":
            for lc in self.lifecycles_data.get("lifecycles", []):
                for s in lc.get("states", []):
                    if s.get("id") == node_id_clean or s.get("name") == node_id_clean:
                        return {
                            "id": s["id"],
                            "name": s["name"],
                            "display_name": s["name"],
                            "type": s.get("state_type", "intermediate"),
                            "layer": "domain",
                            "description": s.get("description", ""),
                            "evidence": [s.get("evidence")] if s.get("evidence") else [],
                        }

        return None

    # -------------------------------------------------------------------------
    # FEATURE 1: Trace Path (Upstream, Current, Downstream)
    # -------------------------------------------------------------------------

    def trace_node(self, node_id: str, view: str = "architecture", depth: int = 1) -> Dict[str, Any]:
        """
        Calculates Upstream (callers/sources), Current, and Downstream (callees/targets)
        for a selected node.
        """
        current = self._resolve_node(node_id, view)
        target_id = current["id"] if current else node_id

        upstream: List[Dict[str, Any]] = []
        downstream: List[Dict[str, Any]] = []

        if view == "architecture" or target_id in self.nodes_by_id:
            # Canonical KG traversal
            # Upstream (incoming edges)
            for edge in self.incoming_edges.get(target_id, []):
                src_node = self.nodes_by_id.get(edge.source)
                if src_node:
                    upstream.append({
                        "node": src_node.to_dict(),
                        "relationship_type": edge.relationship_type.value,
                        "direction": "incoming",
                        "distance": 1,
                        "confidence": edge.confidence,
                        "confidence_level": edge.confidence_level.value,
                        "evidence": [ev.to_dict() for ev in edge.evidence],
                    })

            # Downstream (outgoing edges)
            for edge in self.outgoing_edges.get(target_id, []):
                tgt_node = self.nodes_by_id.get(edge.target)
                if tgt_node:
                    downstream.append({
                        "node": tgt_node.to_dict(),
                        "relationship_type": edge.relationship_type.value,
                        "direction": "outgoing",
                        "distance": 1,
                        "confidence": edge.confidence,
                        "confidence_level": edge.confidence_level.value,
                        "evidence": [ev.to_dict() for ev in edge.evidence],
                    })

        elif view == "workflow":
            for wf in self.workflows_data.get("workflows", []):
                steps_by_id = {s["id"]: s for s in wf.get("steps", [])}
                for t in wf.get("transitions", []):
                    if t.get("target") == target_id and t.get("source") in steps_by_id:
                        src_step = steps_by_id[t["source"]]
                        upstream.append({
                            "node": {
                                "id": src_step["id"],
                                "name": src_step["name"],
                                "type": src_step.get("step_type", "step"),
                                "layer": "application",
                                "description": src_step.get("description", ""),
                            },
                            "relationship_type": "TRANSITION",
                            "label": t.get("label", ""),
                            "condition": t.get("condition"),
                            "evidence": [t.get("evidence")] if t.get("evidence") else [],
                        })
                    elif t.get("source") == target_id and t.get("target") in steps_by_id:
                        tgt_step = steps_by_id[t["target"]]
                        downstream.append({
                            "node": {
                                "id": tgt_step["id"],
                                "name": tgt_step["name"],
                                "type": tgt_step.get("step_type", "step"),
                                "layer": "application",
                                "description": tgt_step.get("description", ""),
                            },
                            "relationship_type": "TRANSITION",
                            "label": t.get("label", ""),
                            "condition": t.get("condition"),
                            "evidence": [t.get("evidence")] if t.get("evidence") else [],
                        })

        elif view == "lifecycle":
            for lc in self.lifecycles_data.get("lifecycles", []):
                states_by_id = {s["id"]: s for s in lc.get("states", [])}
                states_by_name = {s["name"]: s for s in lc.get("states", [])}
                for t in lc.get("transitions", []):
                    to_st = states_by_id.get(t["to_state"]) or states_by_name.get(t["to_state"])
                    from_st = states_by_id.get(t["from_state"]) or states_by_name.get(t["from_state"])
                    is_tgt = t["to_state"] == target_id or (to_st and to_st["id"] == target_id)
                    is_src = t["from_state"] == target_id or (from_st and from_st["id"] == target_id)

                    if is_tgt and from_st:
                        upstream.append({
                            "node": {
                                "id": from_st["id"],
                                "name": from_st["name"],
                                "type": from_st.get("state_type", "intermediate"),
                                "layer": "domain",
                                "description": from_st.get("description", ""),
                            },
                            "relationship_type": "STATE_TRANSITION",
                            "event": t.get("event"),
                            "condition": t.get("condition"),
                            "evidence": [t.get("evidence")] if t.get("evidence") else [],
                        })
                    elif is_src and to_st:
                        downstream.append({
                            "node": {
                                "id": to_st["id"],
                                "name": to_st["name"],
                                "type": to_st.get("state_type", "intermediate"),
                                "layer": "domain",
                                "description": to_st.get("description", ""),
                            },
                            "relationship_type": "STATE_TRANSITION",
                            "event": t.get("event"),
                            "condition": t.get("condition"),
                            "evidence": [t.get("evidence")] if t.get("evidence") else [],
                        })

        # Deduplicate results
        def dedupe(items):
            seen = set()
            out = []
            for it in items:
                nid = it.get("node", {}).get("id")
                if nid and nid not in seen:
                    seen.add(nid)
                    out.append(it)
            return out

        return {
            "current": current or {"id": node_id, "name": node_id, "type": "unknown", "layer": "unknown"},
            "upstream": dedupe(upstream),
            "downstream": dedupe(downstream),
            "summary": {
                "upstream_count": len(upstream),
                "downstream_count": len(downstream),
                "total_connected": len(upstream) + len(downstream),
            },
        }

    # -------------------------------------------------------------------------
    # FEATURE 2: Trace Between Two Nodes
    # -------------------------------------------------------------------------

    def find_path(
        self,
        start_node_id: str,
        end_node_id: str,
        view: str = "architecture",
        max_hops: int = 8,
    ) -> Dict[str, Any]:
        """
        Calculates and returns the exact ordered path between two nodes:
        LoginPage -> AuthAPI -> AuthService -> UserRepository -> PostgreSQL
        """
        start_res = self._resolve_node(start_node_id, view)
        end_res = self._resolve_node(end_node_id, view)

        s_id = start_res["id"] if start_res else start_node_id
        e_id = end_res["id"] if end_res else end_node_id

        if s_id == e_id:
            node_data = start_res or {"id": s_id, "name": s_id}
            return {
                "found": True,
                "path_nodes": [node_data],
                "path_edges": [],
                "hop_count": 0,
                "summary": f"Start and End are the same node: {node_data.get('name')}",
            }

        # Build view-specific adjacency graph
        adj: Dict[str, List[Tuple[str, Any]]] = defaultdict(list)
        undirected_adj: Dict[str, List[Tuple[str, Any]]] = defaultdict(list)

        if view == "architecture" or s_id in self.nodes_by_id:
            for edge in self.kg.edges:
                adj[edge.source].append((edge.target, edge))
                undirected_adj[edge.source].append((edge.target, edge))
                undirected_adj[edge.target].append((edge.source, edge))
        elif view == "workflow":
            for wf in self.workflows_data.get("workflows", []):
                for t in wf.get("transitions", []):
                    adj[t["source"]].append((t["target"], t))
                    undirected_adj[t["source"]].append((t["target"], t))
                    undirected_adj[t["target"]].append((t["source"], t))
        elif view == "lifecycle":
            for lc in self.lifecycles_data.get("lifecycles", []):
                for t in lc.get("transitions", []):
                    adj[t["from_state"]].append((t["to_state"], t))
                    undirected_adj[t["from_state"]].append((t["to_state"], t))
                    undirected_adj[t["to_state"]].append((t["from_state"], t))
        elif view == "dataflow":
            for pipe in self.dataflows_data.get("pipelines", []):
                for e in pipe.get("edges", []):
                    adj[e["source"]].append((e["target"], e))
                    undirected_adj[e["source"]].append((e["target"], e))
                    undirected_adj[e["target"]].append((e["source"], e))

        # BFS for directed shortest path
        queue = deque([(s_id, [s_id], [])])
        visited: Set[str] = {s_id}
        found_path: Optional[List[str]] = None
        found_edges: Optional[List[Any]] = None

        while queue:
            curr, path, edge_list = queue.popleft()
            if curr == e_id:
                found_path = path
                found_edges = edge_list
                break
            if len(path) > max_hops:
                continue

            for nxt, edge_obj in adj.get(curr, []):
                if nxt not in visited:
                    visited.add(nxt)
                    queue.append((nxt, path + [nxt], edge_list + [edge_obj]))

        # Fallback to undirected if no forward directed path exists
        is_undirected_fallback = False
        if not found_path:
            u_queue = deque([(s_id, [s_id], [])])
            u_visited: Set[str] = {s_id}
            while u_queue:
                curr, path, edge_list = u_queue.popleft()
                if curr == e_id:
                    found_path = path
                    found_edges = edge_list
                    is_undirected_fallback = True
                    break
                if len(path) > max_hops:
                    continue
                for nxt, edge_obj in undirected_adj.get(curr, []):
                    if nxt not in u_visited:
                        u_visited.add(nxt)
                        u_queue.append((nxt, path + [nxt], edge_list + [edge_obj]))

        if not found_path:
            return {
                "found": False,
                "path_nodes": [],
                "path_edges": [],
                "hop_count": 0,
                "summary": f"No path found between '{start_res.get('name', s_id) if start_res else s_id}' and '{end_res.get('name', e_id) if end_res else e_id}'.",
            }

        # Format nodes and edges in path
        formatted_nodes: List[Dict[str, Any]] = []
        for nid in found_path:
            n_res = self._resolve_node(nid, view) or {"id": nid, "name": nid, "display_name": nid}
            formatted_nodes.append(n_res)

        formatted_edges: List[Dict[str, Any]] = []
        for e in (found_edges or []):
            if hasattr(e, "to_dict"):
                formatted_edges.append(e.to_dict())
            elif isinstance(e, dict):
                formatted_edges.append(e)

        node_names = [n.get("name", n.get("id")) for n in formatted_nodes]
        summary_text = " → ".join(node_names)
        if is_undirected_fallback:
            summary_text += " (via shared dependencies)"

        return {
            "found": True,
            "path_nodes": formatted_nodes,
            "path_edges": formatted_edges,
            "hop_count": len(formatted_nodes) - 1,
            "is_indirect": is_undirected_fallback,
            "summary": summary_text,
        }

    # -------------------------------------------------------------------------
    # FEATURE 4: Why? (Why does CodeLens believe this relationship exists?)
    # -------------------------------------------------------------------------

    def why_relationship(
        self,
        edge_id: Optional[str] = None,
        source_id: Optional[str] = None,
        target_id: Optional[str] = None,
        view: str = "architecture",
    ) -> Dict[str, Any]:
        """
        Inspects an edge and explains:
        'Why does CodeLens believe this relationship exists?'
        Returns exact code, line range, AST evidence rule, and confidence.
        """
        target_edge: Optional[ArchEdge] = None

        # Look in canonical KG
        if edge_id:
            target_edge = next((e for e in self.kg.edges if e.id == edge_id), None)

        if not target_edge and source_id and target_id:
            s_clean = source_id.strip()
            t_clean = target_id.strip()
            for e in self.kg.edges:
                if (e.source == s_clean and e.target == t_clean) or (
                    e.source.lower() == s_clean.lower() and e.target.lower() == t_clean.lower()
                ):
                    target_edge = e
                    break

        if target_edge:
            src_node = self.nodes_by_id.get(target_edge.source)
            tgt_node = self.nodes_by_id.get(target_edge.target)
            rel_type = target_edge.relationship_type.value

            # Build human-readable AST justification
            reason_map = {
                "CALLS": f"{src_node.name if src_node else 'Source'} directly calls or invokes methods/classes defined in {tgt_node.name if tgt_node else 'Target'}.",
                "IMPORTS": f"{src_node.name if src_node else 'Source'} explicitly imports symbols from {tgt_node.name if tgt_node else 'Target'}.",
                "READS": f"{src_node.name if src_node else 'Source'} queries / reads data models defined in {tgt_node.name if tgt_node else 'Target'}.",
                "WRITES": f"{src_node.name if src_node else 'Source'} mutates / writes state to {tgt_node.name if tgt_node else 'Target'}.",
                "CONSUMES": f"{src_node.name if src_node else 'Source'} consumes external client library / SDK for {tgt_node.name if tgt_node else 'Target'}.",
                "DEPENDS_ON": f"{src_node.name if src_node else 'Source'} requires {tgt_node.name if tgt_node else 'Target'} for runtime execution.",
                "TRIGGERS": f"{src_node.name if src_node else 'Source'} dispatches events that trigger execution of {tgt_node.name if tgt_node else 'Target'}.",
            }
            reason = reason_map.get(
                rel_type,
                f"Relationship {rel_type} verified via static code AST inspection."
            )

            evidence_items = []
            for ev in target_edge.evidence:
                # If snippet is missing, fetch from source files
                snippet = ev.snippet
                if not snippet and ev.file_path in self.files_by_path:
                    file_content = self.files_by_path[ev.file_path].get("content", "")
                    lines = file_content.splitlines()
                    s_idx = max(0, ev.start_line - 1)
                    e_idx = min(len(lines), ev.end_line)
                    snippet = "\n".join(lines[s_idx:e_idx])

                evidence_items.append({
                    "file_path": ev.file_path,
                    "start_line": ev.start_line,
                    "end_line": ev.end_line,
                    "snippet": snippet,
                })

            return {
                "source": src_node.to_dict() if src_node else {"id": target_edge.source, "name": target_edge.source},
                "target": tgt_node.to_dict() if tgt_node else {"id": target_edge.target, "name": target_edge.target},
                "relationship_type": rel_type,
                "direction": target_edge.direction,
                "confidence": target_edge.confidence,
                "confidence_level": target_edge.confidence_level.value,
                "reason": reason,
                "evidence": evidence_items,
            }

        # View-specific fallbacks (Lifecycle, Workflow)
        if view == "lifecycle" and source_id and target_id:
            for lc in self.lifecycles_data.get("lifecycles", []):
                for t in lc.get("transitions", []):
                    if (t.get("from_state") == source_id and t.get("to_state") == target_id) or (t.get("id") == edge_id):
                        ev = t.get("evidence")
                        return {
                            "source": {"id": t.get("from_state"), "name": t.get("from_state")},
                            "target": {"id": t.get("to_state"), "name": t.get("to_state")},
                            "relationship_type": "STATE_TRANSITION",
                            "direction": "directed",
                            "confidence": 1.0,
                            "confidence_level": t.get("confidence_level", "deterministic"),
                            "reason": f"State transition triggered by event '{t.get('event')}'. Guard condition: {t.get('condition') or 'Unconditional'}. Action: {t.get('action') or 'State mutation'}.",
                            "evidence": [ev] if ev else [],
                        }

        if view == "workflow" and source_id and target_id:
            for wf in self.workflows_data.get("workflows", []):
                for t in wf.get("transitions", []):
                    if (t.get("source") == source_id and t.get("target") == target_id) or (t.get("id") == edge_id):
                        ev = t.get("evidence")
                        return {
                            "source": {"id": t.get("source"), "name": t.get("source")},
                            "target": {"id": t.get("target"), "name": t.get("target")},
                            "relationship_type": "WORKFLOW_STEP_TRANSITION",
                            "direction": "directed",
                            "confidence": 1.0,
                            "confidence_level": "deterministic",
                            "reason": f"Execution flows from step '{t.get('source')}' to step '{t.get('target')}'. Label: {t.get('label')}. Condition: {t.get('condition') or 'Default'}.",
                            "evidence": [ev] if ev else [],
                        }

        return {
            "source": {"id": source_id or "unknown", "name": source_id or "unknown"},
            "target": {"id": target_id or "unknown", "name": target_id or "unknown"},
            "relationship_type": "INFERRED",
            "direction": "directed",
            "confidence": 0.5,
            "confidence_level": "inferred",
            "reason": "Inferred semantic connection based on graph topology.",
            "evidence": [],
        }

    # -------------------------------------------------------------------------
    # FEATURE 5: Explain (Grounded Architecture Component Explanation)
    # -------------------------------------------------------------------------

    async def explain_component(
        self,
        node_id: str,
        view: str = "architecture",
        gemini_api_key: Optional[str] = None,
        openai_api_key: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Explains a component using Gemini or deterministic analysis.
        Strict rule: Gather ALL deterministic facts first. Never hallucinate claims.
        """
        node_res = self._resolve_node(node_id, view)
        if not node_res:
            return {
                "component_name": node_id,
                "explanation": f"Component '{node_id}' was not found in the repository Knowledge Graph.",
                "evidence": [],
                "confidence": "inferred",
            }

        # 1. Gather all deterministic facts
        trace_data = self.trace_node(node_id, view)
        up_items = trace_data.get("upstream", [])
        down_items = trace_data.get("downstream", [])

        # Gather code excerpts
        source_evidence: List[Dict[str, Any]] = []
        for fpath in node_res.get("source_files", []):
            f_info = self.files_by_path.get(fpath)
            if f_info:
                content = f_info.get("content", "")
                lines = content.splitlines()
                snippet = "\n".join(lines[:min(25, len(lines))])
                source_evidence.append({
                    "file_path": fpath,
                    "start_line": 1,
                    "end_line": min(25, len(lines)),
                    "snippet": snippet,
                })

        # Structured deterministic brief
        brief_lines = [
            f"Component: {node_res.get('name')}",
            f"Architectural Role / Entity Type: {node_res.get('type')}",
            f"Layer: {node_res.get('layer')}",
            f"Source Files: {', '.join(node_res.get('source_files', [])) or 'Synthetic Service'}",
            f"Direct Callers / Upstream: {', '.join([u.get('node', {}).get('name', '') for u in up_items]) or 'None (Entrypoint)'}",
            f"Direct Callees / Downstream: {', '.join([d.get('node', {}).get('name', '') for d in down_items]) or 'None (Terminal Leaf)'}",
        ]
        if node_res.get("symbols"):
            sym_names = [s.get("name") for s in node_res.get("symbols", [])[:8]]
            brief_lines.append(f"Exported Symbols & Functions: {', '.join(sym_names)}")

        deterministic_brief = "\n".join(brief_lines)

        # 2. Check if an LLM key is available (Gemini or OpenAI)
        active_gemini_key = gemini_api_key or os.getenv("GEMINI_API_KEY")
        active_openai_key = openai_api_key or os.getenv("OPENAI_API_KEY")

        llm_explanation: Optional[str] = None

        if active_gemini_key:
            try:
                # Use Google GenAI
                from google import genai
                client = genai.Client(api_key=active_gemini_key)
                prompt = f"""
You are the CodeLens Architecture Copilot.
Explain the following architectural component concisely in 2-3 structured paragraphs.

STRICT INSTRUCTIONS:
- Base your explanation ENTIRELY and EXCLUSIVELY on the verified deterministic evidence below.
- Do NOT invent or assume frameworks, databases, or API routes not listed in the facts.
- Explicitly cite the source files and line ranges provided.
- Describe its architectural role, who calls it, what it depends on, and its data/control responsibilities.

DETERMINISTIC FACTS:
{deterministic_brief}

CODE SNIPPETS:
{source_evidence[0]['snippet'] if source_evidence else 'No snippet available.'}
"""
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )
                if response and response.text:
                    llm_explanation = response.text.strip()
            except Exception as e:
                print(f"[!] Gemini explanation failed: {e}")

        if not llm_explanation and active_openai_key:
            try:
                from openai import OpenAI
                client = OpenAI(api_key=active_openai_key)
                prompt = f"""
You are the CodeLens Architecture Copilot.
Explain the following architectural component concisely in 2-3 structured paragraphs based strictly on the verified facts below.
Cite the exact source files and line ranges. Do not hallucinate unverified dependencies.

DETERMINISTIC FACTS:
{deterministic_brief}
"""
                resp = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.2,
                )
                if resp.choices and resp.choices[0].message.content:
                    llm_explanation = resp.choices[0].message.content.strip()
            except Exception as e:
                print(f"[!] OpenAI fallback explanation failed: {e}")

        # 3. Fallback deterministic structured explanation
        if not llm_explanation:
            up_names = [f"`{u.get('node', {}).get('name')}`" for u in up_items]
            up_str = ", ".join(up_names) if up_names else "None — acts as a root or external entrypoint."
            down_names = [f"`{d.get('node', {}).get('name')}`" for d in down_items]
            down_str = ", ".join(down_names) if down_names else "None — acts as a terminal or sink node."
            files_str = ", ".join(node_res.get("source_files", [])) or "system configuration"

            llm_explanation = (
                f"### Architectural Role: {node_res.get('name')}\n\n"
                f"`{node_res.get('name')}` is classified as a **{node_res.get('type')}** operating in the **{node_res.get('layer')}** layer of the system. "
                f"It is defined in `{files_str}`.\n\n"
                f"**Data & Control Dependencies:**\n"
                f"- **Upstream Invocations ({len(up_items)}):** {up_str}\n"
                f"- **Downstream Dependencies ({len(down_items)}):** {down_str}\n\n"
                f"**Source Grounding:** Verified statically via AST import and call-graph resolution with confidence score **{node_res.get('confidence', 1.0)}**."
            )

        return {
            "component_name": node_res.get("name"),
            "component_type": node_res.get("type"),
            "layer": node_res.get("layer"),
            "explanation": llm_explanation,
            "deterministic_brief": deterministic_brief,
            "evidence": source_evidence,
            "upstream_count": len(up_items),
            "downstream_count": len(down_items),
            "confidence": "deterministic" if node_res.get("confidence", 1.0) >= 0.85 else "high",
        }

    # -------------------------------------------------------------------------
    # FEATURE 6: Impact ("Show what depends on this")
    # -------------------------------------------------------------------------

    def calculate_impact(self, node_id: str, view: str = "architecture", max_depth: int = 5) -> Dict[str, Any]:
        """
        Calculates impact:
        - direct dependents (distance = 1)
        - indirect dependents (distance > 1)
        - dependency depth
        - risk score
        """
        current = self._resolve_node(node_id, view)
        target_id = current["id"] if current else node_id

        # Traverse upstream (who depends on target_id)
        direct_dependents: List[Dict[str, Any]] = []
        indirect_dependents: List[Dict[str, Any]] = []
        visited: Dict[str, int] = {target_id: 0}
        queue = deque([(target_id, 0)])

        max_observed_depth = 0

        while queue:
            curr_id, depth = queue.popleft()
            if depth >= max_depth:
                continue

            for edge in self.incoming_edges.get(curr_id, []):
                caller_id = edge.source
                if caller_id not in visited:
                    next_depth = depth + 1
                    visited[caller_id] = next_depth
                    if next_depth > max_observed_depth:
                        max_observed_depth = next_depth

                    caller_node = self.nodes_by_id.get(caller_id)
                    item = {
                        "id": caller_id,
                        "name": caller_node.name if caller_node else caller_id,
                        "type": caller_node.type.value if caller_node else "unknown",
                        "layer": caller_node.layer.value if caller_node else "unknown",
                        "source_files": caller_node.source_files if caller_node else [],
                        "depth": next_depth,
                        "relationship_type": edge.relationship_type.value,
                    }

                    if next_depth == 1:
                        direct_dependents.append(item)
                    else:
                        indirect_dependents.append(item)

                    queue.append((caller_id, next_depth))

        total_impacted = len(direct_dependents) + len(indirect_dependents)

        # Risk scoring
        if total_impacted >= 8 or max_observed_depth >= 4:
            risk_level = "critical"
        elif total_impacted >= 4 or max_observed_depth >= 3:
            risk_level = "high"
        elif total_impacted >= 2:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Layer breakdown
        layer_counts: Dict[str, int] = defaultdict(int)
        for dep in direct_dependents + indirect_dependents:
            layer_counts[dep["layer"]] += 1

        return {
            "target": current or {"id": target_id, "name": target_id},
            "direct_dependents": direct_dependents,
            "indirect_dependents": indirect_dependents,
            "dependency_depth": max_observed_depth,
            "total_dependents_count": total_impacted,
            "risk_level": risk_level,
            "layer_breakdown": dict(layer_counts),
        }

    # -------------------------------------------------------------------------
    # FEATURE 7: Change Impact (File / Function / Symbol change propagation)
    # -------------------------------------------------------------------------

    def change_impact(
        self,
        file_path: Optional[str] = None,
        symbol_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Calculates potentially affected:
        - files
        - modules
        - services
        - APIs
        - workflows
        - data flows
        Every result is traceable to the graph.
        """
        matched_nodes: List[ArchNode] = []

        # Find nodes associated with this file or symbol
        clean_file = (file_path or "").replace("\\", "/").strip()
        clean_symbol = (symbol_name or "").strip()

        for node in self.kg.nodes:
            file_match = any(
                clean_file and (clean_file.endswith(sf) or sf.endswith(clean_file))
                for sf in node.source_files
            )
            sym_match = any(
                clean_symbol and (clean_symbol.lower() == s.get("name", "").lower())
                for s in node.symbols
            )
            name_match = clean_symbol and clean_symbol.lower() == node.name.lower()

            if file_match or sym_match or name_match:
                matched_nodes.append(node)

        # Traverse upstream from all matched nodes to find impacted blast radius
        impacted_node_ids: Set[str] = set()
        queue = deque([n.id for n in matched_nodes])

        while queue:
            curr_id = queue.popleft()
            if curr_id in impacted_node_ids:
                continue
            impacted_node_ids.add(curr_id)

            for edge in self.incoming_edges.get(curr_id, []):
                if edge.source not in impacted_node_ids:
                    queue.append(edge.source)

        impacted_nodes = [self.nodes_by_id[nid] for nid in impacted_node_ids if nid in self.nodes_by_id]

        # Categorize affected entities
        affected_files: Set[str] = set()
        affected_modules: List[str] = []
        affected_services: List[str] = []
        affected_apis: List[str] = []

        for node in impacted_nodes:
            for sf in node.source_files:
                affected_files.add(sf)

            if node.type.value in ("module", "class_def"):
                affected_modules.append(node.name)
            elif node.type.value in ("service", "worker", "application"):
                affected_services.append(node.name)
            elif node.type.value == "api_endpoint" or node.layer.value == "api_gateway":
                affected_apis.append(node.name)

        # Map to Affected Workflows
        affected_workflows: List[Dict[str, Any]] = []
        for wf in self.workflows_data.get("workflows", []):
            matching_steps = [
                s["name"] for s in wf.get("steps", [])
                if any(nid in s.get("id", "").lower() or nid in s.get("name", "").lower() for nid in impacted_node_ids)
            ]
            if matching_steps:
                affected_workflows.append({
                    "id": wf.get("id"),
                    "name": wf.get("name"),
                    "affected_steps": matching_steps,
                })

        # Map to Affected Data Flows
        affected_data_flows: List[Dict[str, Any]] = []
        for pipe in self.dataflows_data.get("pipelines", []):
            matching_entities = [
                n["name"] for n in pipe.get("nodes", [])
                if any(nid in n.get("id", "").lower() or nid in n.get("name", "").lower() for nid in impacted_node_ids)
            ]
            if matching_entities:
                affected_data_flows.append({
                    "id": pipe.get("id"),
                    "name": pipe.get("name"),
                    "affected_entities": matching_entities,
                })

        return {
            "query": {"file_path": file_path, "symbol_name": symbol_name},
            "root_nodes": [n.to_dict() for n in matched_nodes],
            "total_impacted_nodes": len(impacted_nodes),
            "affected_files": sorted(list(affected_files)),
            "affected_modules": sorted(list(set(affected_modules))),
            "affected_services": sorted(list(set(affected_services))),
            "affected_apis": sorted(list(set(affected_apis))),
            "affected_workflows": affected_workflows,
            "affected_data_flows": affected_data_flows,
            "risk_level": "critical" if len(affected_apis) > 0 or len(affected_workflows) > 0 else (
                "high" if len(affected_files) > 5 else ("medium" if len(affected_files) > 1 else "low")
            ),
        }

    # -------------------------------------------------------------------------
    # FEATURE 8: Symbol Blast Radius (Unified AKG Engine)
    # -------------------------------------------------------------------------

    def compute_symbol_blast_radius(
        self,
        symbol_name: str,
        max_depth: int = 3,
    ) -> Dict[str, Any]:
        """
        Computes symbol blast radius (upstream callers and downstream callees)
        using the Architecture Knowledge Graph.

        Replaces the old legacy AST crawler with the canonical graph representation.
        """
        if not symbol_name:
            return {
                "target_symbol": "",
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

        clean_symbol = symbol_name.strip().lower()

        # 1. Find nodes associated with target symbol
        target_nodes: List[ArchNode] = []
        for node in self.kg.nodes:
            if any(s.get("name", "").lower() == clean_symbol for s in node.symbols):
                target_nodes.append(node)
            elif node.name.lower() == clean_symbol or node.display_name.lower() == clean_symbol:
                target_nodes.append(node)

        # Fallback: check file contents if no direct node matched
        if not target_nodes:
            for node in self.kg.nodes:
                for sf in node.source_files:
                    if clean_symbol in sf.lower():
                        target_nodes.append(node)
                        break

        target_ids = {n.id for n in target_nodes}

        # 2. Traverse Upstream (impacted callers)
        upstream_nodes: Dict[str, ArchNode] = {}
        queue: deque = deque([(nid, 0) for nid in target_ids])
        visited_upstream: Set[str] = set(target_ids)

        while queue:
            curr_id, depth = queue.popleft()
            if depth >= max_depth:
                continue
            for edge in self.incoming_edges.get(curr_id, []):
                caller_id = edge.source
                if caller_id not in visited_upstream:
                    visited_upstream.add(caller_id)
                    node = self.nodes_by_id.get(caller_id)
                    if node:
                        upstream_nodes[caller_id] = node
                    queue.append((caller_id, depth + 1))

        # 3. Traverse Downstream (callees / dependencies)
        downstream_nodes: Dict[str, ArchNode] = {}
        downstream_queue: deque = deque([(nid, 0) for nid in target_ids])
        visited_downstream: Set[str] = set(target_ids)

        while downstream_queue:
            curr_id, depth = downstream_queue.popleft()
            if depth >= max_depth:
                continue
            for edge in self.outgoing_edges.get(curr_id, []):
                callee_id = edge.target
                if callee_id not in visited_downstream:
                    visited_downstream.add(callee_id)
                    node = self.nodes_by_id.get(callee_id)
                    if node:
                        downstream_nodes[callee_id] = node
                    downstream_queue.append((callee_id, depth + 1))

        # Check call expressions / symbol definitions across files if graph lacks synthetic callees
        extra_downstream: List[str] = []
        if target_nodes and self.files:
            for tn in target_nodes:
                for sf in tn.source_files:
                    file_dict = next((f for f in self.files if f.get("file_path") == sf), None)
                    if file_dict and file_dict.get("content"):
                        from app.parser.symbols import extract_symbols
                        syms = extract_symbols(file_dict["content"], sf)
                        for s in syms:
                            if s.kind == "call" and s.name != symbol_name:
                                extra_downstream.append(s.name)

        # Also check callers across files if AST resolution didn't map all calls
        if self.files:
            for f in self.files:
                path = f.get("file_path", "")
                content = f.get("content", "")
                if path not in [sf for tn in target_nodes for sf in tn.source_files]:
                    if symbol_name in content:
                        node = next((n for n in self.kg.nodes if path in n.source_files), None)
                        if node and node.id not in upstream_nodes and node.id not in target_ids:
                            upstream_nodes[node.id] = node

        impacted_count = len(upstream_nodes)
        if impacted_count >= 5:
            risk_level = "high"
        elif impacted_count >= 2:
            risk_level = "medium"
        else:
            risk_level = "low"

        # Build visualization nodes and edges
        viz_nodes: List[Dict[str, Any]] = [
            {
                "id": "target_node",
                "type": "targetNode",
                "data": {
                    "label": symbol_name,
                    "isTarget": True,
                    "role": "Target Symbol",
                    "riskLevel": risk_level,
                },
            }
        ]
        viz_edges: List[Dict[str, Any]] = []

        for idx, (up_id, up_node) in enumerate(upstream_nodes.items(), start=1):
            viz_id = f"upstream_{idx}"
            viz_nodes.append({
                "id": viz_id,
                "type": "upstreamNode",
                "data": {
                    "label": up_node.display_name or up_node.name,
                    "filePath": up_node.source_files[0] if up_node.source_files else "",
                    "role": "Upstream Caller (Impacted)",
                    "type": up_node.type.value,
                    "layer": up_node.layer.value,
                },
            })
            viz_edges.append({
                "id": f"edge_up_{idx}",
                "source": viz_id,
                "target": "target_node",
                "label": "calls",
                "animated": True,
                "style": {"stroke": "#EF4444"},
            })

        down_idx = 1
        for down_id, down_node in downstream_nodes.items():
            viz_id = f"downstream_{down_idx}"
            viz_nodes.append({
                "id": viz_id,
                "type": "downstreamNode",
                "data": {
                    "label": down_node.display_name or down_node.name,
                    "filePath": down_node.source_files[0] if down_node.source_files else "",
                    "role": "Downstream Callee",
                    "type": down_node.type.value,
                    "layer": down_node.layer.value,
                },
            })
            viz_edges.append({
                "id": f"edge_down_{down_idx}",
                "source": "target_node",
                "target": viz_id,
                "label": "invokes",
                "style": {"stroke": "#38BDF8"},
            })
            down_idx += 1

        for ex_name in extra_downstream:
            viz_id = f"downstream_{down_idx}"
            viz_nodes.append({
                "id": viz_id,
                "type": "downstreamNode",
                "data": {
                    "label": ex_name,
                    "role": "Downstream Callee",
                },
            })
            viz_edges.append({
                "id": f"edge_down_{down_idx}",
                "source": "target_node",
                "target": viz_id,
                "label": "invokes",
                "style": {"stroke": "#38BDF8"},
            })
            down_idx += 1

        upstream_names = [n.display_name or n.name for n in upstream_nodes.values()]
        downstream_names = [n.display_name or n.name for n in downstream_nodes.values()] + extra_downstream

        return {
            "target_symbol": symbol_name,
            "risk_level": risk_level,
            "impact_level": risk_level,
            "impacted_count": impacted_count,
            "upstream_count": len(upstream_nodes),
            "downstream_count": len(downstream_names),
            "direct_count": len(upstream_nodes) + len(downstream_names),
            "upstream_dependents": upstream_names,
            "downstream_dependencies": downstream_names,
            "direct_dependencies": downstream_names,
            "nodes": viz_nodes,
            "edges": viz_edges,
        }
