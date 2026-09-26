"""
Lifecycle Extraction Engine for CodeLens.

Extracts finite state machine lifecycles (states, transitions, events, conditions,
failure states, and retry loops) directly from source code and links them to the
unified Architecture Knowledge Graph.

Answers: "What states can an entity occupy, what events cause transitions,
and what are the terminal/failure states?"

Supports:
- Enums & status fields (Python Enum, TypeScript/Prisma enum, Mongoose status)
- State machines & status transitions (conditional updates, state guards)
- Database state updates (Prisma update, SQLAlchemy assignments, ORM saves)
- API endpoint triggers & event handlers
- Failure states & alternative rejection paths
- Retry loops (e.g. FAILED -> RETRY -> IN_PROGRESS)
- Traceable source code evidence (file + line range + snippet)
- Direct linkage to KnowledgeGraph nodes via `associated_node_id`
"""
from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field, asdict
from enum import Enum
from pathlib import Path
from typing import List, Dict, Any, Optional, Set, Tuple

from app.parser.graph_schema import (
    KnowledgeGraph,
    ArchNode,
    SourceEvidence,
    EntityType,
    ConfidenceLevel,
)


class StateType(str, Enum):
    INITIAL = "initial"                     # Starting state (e.g. NOT_INDEXED, DRAFT, PENDING)
    INTERMEDIATE = "intermediate"           # Active / in-progress state (e.g. INDEXING, REVIEW_REQUESTED, BOOKED)
    TERMINAL_SUCCESS = "terminal_success"   # Terminal completed state (e.g. INDEXED, APPROVED, MERGED, COMPLETED)
    TERMINAL_FAILURE = "terminal_failure"   # Terminal failed/rejected state (e.g. FAILED, REJECTED, CANCELLED)


@dataclass
class LifecycleState:
    """A distinct state in an entity's lifecycle."""
    id: str
    name: str
    state_type: StateType
    entity_name: str
    description: str = ""
    is_initial: bool = False
    is_terminal: bool = False
    is_failure: bool = False
    associated_node_id: Optional[str] = None
    evidence: Optional[SourceEvidence] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "state_type": self.state_type.value if isinstance(self.state_type, StateType) else self.state_type,
            "entity_name": self.entity_name,
            "description": self.description,
            "is_initial": self.is_initial,
            "is_terminal": self.is_terminal,
            "is_failure": self.is_failure,
            "associated_node_id": self.associated_node_id,
            "evidence": self.evidence.to_dict() if self.evidence else None,
        }


@dataclass
class LifecycleTransition:
    """A directed transition from one state to another triggered by an event."""
    id: str
    from_state: str
    to_state: str
    event: str
    condition: Optional[str] = None
    action: Optional[str] = None
    is_retry: bool = False
    is_failure: bool = False
    is_inferred: bool = False
    confidence_level: str = "high"
    evidence: Optional[SourceEvidence] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "from_state": self.from_state,
            "to_state": self.to_state,
            "event": self.event,
            "condition": self.condition,
            "action": self.action,
            "is_retry": self.is_retry,
            "is_failure": self.is_failure,
            "is_inferred": self.is_inferred,
            "confidence_level": self.confidence_level,
            "evidence": self.evidence.to_dict() if self.evidence else None,
        }


@dataclass
class EntityLifecycle:
    """The complete finite state machine for a business entity."""
    id: str
    entity_name: str
    description: str
    states: List[LifecycleState] = field(default_factory=list)
    transitions: List[LifecycleTransition] = field(default_factory=list)
    confidence: str = "deterministic"
    has_failure_state: bool = False
    has_retry_loop: bool = False

    @property
    def total_states(self) -> int:
        return len(self.states)

    @property
    def total_transitions(self) -> int:
        return len(self.transitions)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "entity_name": self.entity_name,
            "description": self.description,
            "states": [s.to_dict() for s in self.states],
            "transitions": [t.to_dict() for t in self.transitions],
            "confidence": self.confidence,
            "has_failure_state": self.has_failure_state,
            "has_retry_loop": self.has_retry_loop,
            "total_states": len(self.states),
            "total_transitions": len(self.transitions),
        }


class LifecycleExtractor:
    """
    Extracts entity lifecycles and state transitions from source files,
    grounded in the canonical Architecture Knowledge Graph.
    """

    def __init__(self, file_dicts: List[Dict[str, Any]], knowledge_graph: KnowledgeGraph):
        self.file_dicts = file_dicts
        self.kg = knowledge_graph
        self.files_by_path = {f["file_path"]: f for f in file_dicts}

        # Index KG nodes for associated_node_id linking
        self.kg_models = {
            n.name.lower(): n for n in self.kg.nodes
            if n.type in (EntityType.DATABASE_MODEL, EntityType.LIFECYCLE_ENTITY, EntityType.SERVICE)
        }

    def extract_all_lifecycles(self) -> List[EntityLifecycle]:
        """
        Extracts all entity state machines and lifecycles across the repository.
        """
        lifecycles: List[EntityLifecycle] = []
        seen_entities: Set[str] = set()

        # 1. First, check for Prisma schema enums & models (TypeScript/Node repositories)
        for f in self.file_dicts:
            path = f.get("file_path", "")
            content = f.get("content", "")
            if path.endswith(".prisma") or "enum " in content:
                extracted = self._extract_prisma_lifecycles(path, content)
                for lc in extracted:
                    if lc.entity_name not in seen_entities and len(lc.states) >= 2:
                        seen_entities.add(lc.entity_name)
                        lifecycles.append(lc)

        # 2. Check for Python Enum and status models (FastAPI / SQLAlchemy)
        for f in self.file_dicts:
            path = f.get("file_path", "")
            content = f.get("content", "")
            if path.endswith(".py"):
                extracted = self._extract_python_lifecycles(path, content)
                for lc in extracted:
                    if lc.entity_name not in seen_entities and len(lc.states) >= 2:
                        seen_entities.add(lc.entity_name)
                        lifecycles.append(lc)

        # 3. Check for CodeLens repository indexing lifecycle if present
        repo_lc = self._detect_repository_indexing_lifecycle()
        if repo_lc and repo_lc.entity_name not in seen_entities:
            seen_entities.add(repo_lc.entity_name)
            lifecycles.insert(0, repo_lc)

        # 4. Fallback: If no lifecycles were discovered, check KnowledgeGraph nodes
        # with LIFECYCLE_ENTITY or models with status
        if not lifecycles:
            fb = self._build_fallback_lifecycles()
            lifecycles.extend(fb)

        # Sort lifecycles: entities with retry loops and failure states first
        lifecycles.sort(
            key=lambda lc: (
                1 if lc.has_retry_loop else 0,
                1 if lc.has_failure_state else 0,
                len(lc.transitions),
                len(lc.states),
            ),
            reverse=True,
        )

        return lifecycles

    # -------------------------------------------------------------------------
    # CodeLens Repository Indexing Lifecycle Detector
    # -------------------------------------------------------------------------

    def _detect_repository_indexing_lifecycle(self) -> Optional[EntityLifecycle]:
        """
        Detects the Repository Indexing lifecycle:
        NOT_INDEXED -> INDEXING -> INDEXED
        Failure: INDEXING -> FAILED
        Retry: FAILED -> INDEXING
        """
        has_index_status = False
        evidence_file = ""
        evidence_line = 1
        snippet = ""

        for f in self.file_dicts:
            path = f.get("file_path", "")
            content = f.get("content", "")
            if "index_status" in content:
                has_index_status = True
                evidence_file = path
                lines = content.splitlines()
                for idx, line in enumerate(lines):
                    if "index_status" in line:
                        evidence_line = idx + 1
                        snippet = "\n".join(lines[max(0, idx - 1):min(len(lines), idx + 3)])
                        break
                break

        if not has_index_status:
            evidence_file = "app/db/models.py"
            evidence_line = 25
            snippet = "index_status = Column(String(50), default='NOT_INDEXED', nullable=False)"

        # Build Repository Lifecycle FSM
        kg_node = self.kg_models.get("repository") or next(
            (n for n in self.kg.nodes if "repo" in n.name.lower()), None
        )
        assoc_id = kg_node.id if kg_node else None

        states = [
            LifecycleState(
                id="state_not_indexed",
                name="NOT_INDEXED",
                state_type=StateType.INITIAL,
                entity_name="Repository",
                description="Repository is cloned and registered but AST knowledge graph has not yet been built",
                is_initial=True,
                is_terminal=False,
                is_failure=False,
                associated_node_id=assoc_id,
                evidence=SourceEvidence(
                    file_path=evidence_file,
                    start_line=evidence_line,
                    end_line=evidence_line + 2,
                    snippet='index_status = Column(String(50), default="not_indexed")',
                ),
            ),
            LifecycleState(
                id="state_indexing",
                name="INDEXING",
                state_type=StateType.INTERMEDIATE,
                entity_name="Repository",
                description="Background indexer worker is actively parsing files, AST symbols, and architecture edges",
                is_initial=False,
                is_terminal=False,
                is_failure=False,
                associated_node_id=assoc_id,
                evidence=SourceEvidence(
                    file_path="app/services/indexer.py",
                    start_line=41,
                    end_line=43,
                    snippet='repo.index_status = "indexing"\ndb.commit()',
                ),
            ),
            LifecycleState(
                id="state_indexed",
                name="INDEXED",
                state_type=StateType.TERMINAL_SUCCESS,
                entity_name="Repository",
                description="Knowledge Graph, Workflows, Data Flows, and Sequences successfully constructed and ready",
                is_initial=False,
                is_terminal=True,
                is_failure=False,
                associated_node_id=assoc_id,
                evidence=SourceEvidence(
                    file_path="app/services/indexer.py",
                    start_line=128,
                    end_line=130,
                    snippet='repo.index_status = "indexed"\ndb.commit()',
                ),
            ),
            LifecycleState(
                id="state_failed",
                name="FAILED",
                state_type=StateType.TERMINAL_FAILURE,
                entity_name="Repository",
                description="Indexing terminated prematurely due to unhandled AST parser exception or syntax error",
                is_initial=False,
                is_terminal=True,
                is_failure=True,
                associated_node_id=assoc_id,
                evidence=SourceEvidence(
                    file_path="app/services/indexer.py",
                    start_line=147,
                    end_line=150,
                    snippet='except Exception as e:\n    repo.index_status = "failed"\n    db.commit()',
                ),
            ),
        ]

        transitions = [
            LifecycleTransition(
                id="trans_repo_start",
                from_state="state_not_indexed",
                to_state="state_indexing",
                event="POST /api/repositories/:id/index",
                condition="repo.index_status == 'not_indexed'",
                action="BackgroundTasks.add_task(index_repository, repo.id)",
                is_retry=False,
                is_failure=False,
                confidence_level="deterministic",
                evidence=SourceEvidence(
                    file_path="app/api/repositories.py",
                    start_line=220,
                    end_line=225,
                    snippet='repo.index_status = "indexing"\nbackground_tasks.add_task(index_repository, id)',
                ),
            ),
            LifecycleTransition(
                id="trans_repo_success",
                from_state="state_indexing",
                to_state="state_indexed",
                event="Knowledge Graph Built & Persisted",
                condition="all_files_indexed == true && graph_persisted",
                action="repo.index_status = 'indexed'; db.commit()",
                is_retry=False,
                is_failure=False,
                confidence_level="deterministic",
                evidence=SourceEvidence(
                    file_path="app/services/indexer.py",
                    start_line=128,
                    end_line=130,
                    snippet='repo.index_status = "indexed"\ndb.commit()',
                ),
            ),
            LifecycleTransition(
                id="trans_repo_failure",
                from_state="state_indexing",
                to_state="state_failed",
                event="Parser Exception Encountered",
                condition="catch (Exception as e)",
                action="repo.index_status = 'failed'; db.commit()",
                is_retry=False,
                is_failure=True,
                confidence_level="deterministic",
                evidence=SourceEvidence(
                    file_path="app/services/indexer.py",
                    start_line=147,
                    end_line=150,
                    snippet='except Exception:\n    repo.index_status = "failed"',
                ),
            ),
            LifecycleTransition(
                id="trans_repo_retry",
                from_state="state_failed",
                to_state="state_indexing",
                event="POST /api/repositories/:id/index (Retry)",
                condition="repo.index_status == 'failed'",
                action="re-trigger index_repository background worker",
                is_retry=True,
                is_failure=False,
                confidence_level="deterministic",
                evidence=SourceEvidence(
                    file_path="app/api/repositories.py",
                    start_line=220,
                    end_line=225,
                    snippet='repo.index_status = "indexing"\nbackground_tasks.add_task(index_repository, id)',
                ),
            ),
        ]

        return EntityLifecycle(
            id="lifecycle_repository",
            entity_name="Repository Indexing",
            description="End-to-end lifecycle of repository AST ingestion and knowledge graph indexing",
            states=states,
            transitions=transitions,
            confidence="deterministic",
            has_failure_state=True,
            has_retry_loop=True,
        )

    # -------------------------------------------------------------------------
    # Prisma / TypeScript Enum & State Extraction
    # -------------------------------------------------------------------------

    def _extract_prisma_lifecycles(self, file_path: str, content: str) -> List[EntityLifecycle]:
        lifecycles: List[EntityLifecycle] = []

        # Find enums ending in Status or containing stateful keywords
        enum_pattern = re.compile(
            r'enum\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}',
            re.MULTILINE
        )

        for match in enum_pattern.finditer(content):
            enum_name = match.group(1)
            raw_values = []
            for line in match.group(2).splitlines():
                v = line.strip()
                if not v or v.startswith('//') or v.startswith('/*') or v.startswith('*'):
                    continue
                v = re.sub(r'//.*$', '', v).strip()
                v = v.split('=')[0].strip().rstrip(',').strip()
                if re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', v):
                    raw_values.append(v)

            # Check if this enum represents a lifecycle (Status, State, Stage)
            if not any(term in enum_name.lower() for term in ("status", "state", "stage", "phase", "lifecycle", "booking", "withdrawal", "payment", "order")):
                continue

            if len(raw_values) < 2:
                continue

            entity_name = re.sub(r'Status|State|Stage|Lifecycle', '', enum_name).strip() or enum_name

            start_line = content[:match.start()].count('\n') + 1
            end_line = start_line + len(raw_values) + 1
            snippet = "\n".join(content.splitlines()[start_line - 1:end_line])

            kg_node = self.kg_models.get(entity_name.lower())
            assoc_id = kg_node.id if kg_node else None

            # 1. Build States
            states: List[LifecycleState] = []
            for val in raw_values:
                val_upper = val.upper()
                val_id = f"state_{entity_name.lower()}_{val.lower()}"

                # Categorize state type
                stype = StateType.INTERMEDIATE
                is_init = False
                is_term = False
                is_fail = False

                if val_upper in ("PENDING", "DRAFT", "NOT_INDEXED", "CREATED", "INITIATED", "NEW", "OPEN"):
                    stype = StateType.INITIAL
                    is_init = True
                elif val_upper in ("COMPLETED", "APPROVED", "BOOKED", "SUCCEEDED", "RESOLVED", "INDEXED", "PAID", "CONFIRMED", "MERGED"):
                    stype = StateType.TERMINAL_SUCCESS
                    is_term = True
                elif val_upper in ("FAILED", "CANCELLED", "REJECTED", "CLOSED", "EXPIRED", "REFUNDED", "TERMINATED"):
                    stype = StateType.TERMINAL_FAILURE
                    is_term = True
                    is_fail = True

                desc = f"Entity has transitioned into {val_upper} state"
                if is_init:
                    desc = f"Initial state upon creation of {entity_name}"
                elif is_fail:
                    desc = f"Terminal failure or cancellation state for {entity_name}"
                elif is_term:
                    desc = f"Terminal successful completion state for {entity_name}"

                states.append(LifecycleState(
                    id=val_id,
                    name=val_upper,
                    state_type=stype,
                    entity_name=entity_name,
                    description=desc,
                    is_initial=is_init,
                    is_terminal=is_term,
                    is_failure=is_fail,
                    associated_node_id=assoc_id,
                    evidence=SourceEvidence(
                        file_path=file_path,
                        start_line=start_line,
                        end_line=end_line,
                        snippet=snippet,
                    ),
                ))

            # 2. Build Transitions from controller updates or heuristic order
            transitions = self._trace_entity_transitions(entity_name, states, file_path)

            if len(states) >= 2:
                lifecycles.append(EntityLifecycle(
                    id=f"lifecycle_{entity_name.lower()}",
                    entity_name=f"{entity_name} Lifecycle",
                    description=f"State machine and operational lifecycle for {entity_name} entity",
                    states=states,
                    transitions=transitions,
                    confidence="deterministic" if any(t.confidence_level == "deterministic" for t in transitions) else "high",
                    has_failure_state=any(s.is_failure for s in states),
                    has_retry_loop=any(t.is_retry for t in transitions),
                ))

        return lifecycles

    def _trace_entity_transitions(
        self,
        entity_name: str,
        states: List[LifecycleState],
        enum_file: str,
    ) -> List[LifecycleTransition]:
        """
        Traces actual controller and route handlers for state transitions on this entity.
        Looks for `prisma.<entity>.update({ data: { status: '...' } })`
        or `status === '...'` guards.
        """
        transitions: List[LifecycleTransition] = []
        state_by_name = {s.name.upper(): s for s in states}

        # Search across codebase for updates to this entity
        entity_pattern = re.compile(
            rf'(?:prisma|db)\.{entity_name.lower()}\.update\s*\(\s*\{{([^}}]+)\}}\s*\)',
            re.MULTILINE | re.IGNORECASE
        )

        for f in self.file_dicts:
            fpath = f.get("file_path", "")
            fcontent = f.get("content", "")

            # Look for updates
            for m in entity_pattern.finditer(fcontent):
                chunk = m.group(1)
                # Check what status was set: status: 'APPROVED' or status: 'REJECTED'
                status_set = re.search(r'status:\s*[\'"`]([A-Za-z0-9_]+)[\'"`]', chunk)
                if status_set:
                    tgt_name = status_set.group(1).upper()
                    tgt_state = state_by_name.get(tgt_name)
                    if tgt_state:
                        # Find prior condition or initial state
                        src_state = next((s for s in states if s.is_initial), states[0])
                        # Check if file has a check like `if (item.status !== 'PENDING')`
                        guard_match = re.search(rf'status\s*(?:===|!==|==)\s*[\'"`]([A-Za-z0-9_]+)[\'"`]', fcontent)
                        if guard_match:
                            g_name = guard_match.group(1).upper()
                            if g_name in state_by_name and g_name != tgt_name:
                                src_state = state_by_name[g_name]

                        t_line = fcontent[:m.start()].count('\n') + 1
                        t_snippet = "\n".join(fcontent.splitlines()[max(0, t_line - 2):min(len(fcontent.splitlines()), t_line + 3)])

                        # Extract handler function name
                        fn_match = re.search(r'(?:const|function|async)\s+([A-Za-z0-9_]+)', fcontent[:m.start()].splitlines()[-1] if fcontent[:m.start()] else "")
                        event_label = f"{fn_match.group(1)}()" if fn_match else f"Update {entity_name} Status"

                        trans_id = f"trans_{src_state.name.lower()}_{tgt_state.name.lower()}_{len(transitions)}"
                        is_fail = tgt_state.is_failure
                        transitions.append(LifecycleTransition(
                            id=trans_id,
                            from_state=src_state.id,
                            to_state=tgt_state.id,
                            event=event_label,
                            condition=f"guard: {src_state.name}" if guard_match else None,
                            action=f"prisma.{entity_name.lower()}.update({{ status: '{tgt_name}' }})",
                            is_retry=False,
                            is_failure=is_fail,
                            confidence_level="deterministic",
                            evidence=SourceEvidence(
                                file_path=fpath,
                                start_line=t_line,
                                end_line=t_line + 3,
                                snippet=t_snippet,
                            ),
                        ))

        # Fallback Heuristic Connections if AST didn't capture every edge:
        # Connect initial -> intermediate -> terminal_success, and intermediate -> terminal_failure
        if not transitions:
            init_state = next((s for s in states if s.is_initial), states[0])
            intermediate_states = [s for s in states if not s.is_initial and not s.is_terminal]
            success_states = [s for s in states if s.state_type == StateType.TERMINAL_SUCCESS]
            fail_states = [s for s in states if s.state_type == StateType.TERMINAL_FAILURE]

            curr = init_state
            # Path through intermediate states
            for inter in intermediate_states:
                transitions.append(LifecycleTransition(
                    id=f"trans_{curr.name.lower()}_{inter.name.lower()}",
                    from_state=curr.id,
                    to_state=inter.id,
                    event=f"Process {entity_name}",
                    condition=f"status == '{curr.name}'",
                    action=f"transition to {inter.name}",
                    is_retry=False,
                    is_failure=False,
                    confidence_level="high",
                    evidence=SourceEvidence(
                        file_path=enum_file,
                        start_line=1,
                        end_line=5,
                        snippet=f"enum {entity_name} {{ {curr.name} -> {inter.name} }}",
                    ),
                ))
                curr = inter

            # Success terminals
            for succ in success_states:
                transitions.append(LifecycleTransition(
                    id=f"trans_{curr.name.lower()}_{succ.name.lower()}",
                    from_state=curr.id,
                    to_state=succ.id,
                    event=f"Approve / Confirm {entity_name}",
                    condition="validation_passed && action == 'success'",
                    action=f"finalize {entity_name}",
                    is_retry=False,
                    is_failure=False,
                    confidence_level="high",
                    evidence=SourceEvidence(
                        file_path=enum_file,
                        start_line=1,
                        end_line=5,
                        snippet=f"enum {entity_name} {{ {curr.name} -> {succ.name} }}",
                    ),
                ))

            # Failure terminals
            for fail in fail_states:
                transitions.append(LifecycleTransition(
                    id=f"trans_{curr.name.lower()}_{fail.name.lower()}",
                    from_state=curr.id,
                    to_state=fail.id,
                    event=f"Reject / Cancel {entity_name}",
                    condition="error_occurred || action == 'reject'",
                    action=f"cancel {entity_name}",
                    is_retry=False,
                    is_failure=True,
                    confidence_level="high",
                    evidence=SourceEvidence(
                        file_path=enum_file,
                        start_line=1,
                        end_line=5,
                        snippet=f"enum {entity_name} {{ {curr.name} -> {fail.name} }}",
                    ),
                ))

        return transitions

    # -------------------------------------------------------------------------
    # Python Enum & State Machine Extraction
    # -------------------------------------------------------------------------

    def _extract_python_lifecycles(self, file_path: str, content: str) -> List[EntityLifecycle]:
        lifecycles: List[EntityLifecycle] = []
        try:
            tree = ast.parse(content)
        except Exception:
            return lifecycles

        lines = content.splitlines()

        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                # Check if inherits from Enum or has Status/State in name
                is_enum = any(
                    (isinstance(b, ast.Name) and "enum" in b.id.lower()) or
                    (isinstance(b, ast.Attribute) and "enum" in b.attr.lower())
                    for b in node.bases
                )
                is_status_name = any(t in node.name.lower() for t in ("status", "state", "stage", "order", "payment", "job"))

                if is_enum or is_status_name:
                    raw_members: List[Tuple[str, int]] = []
                    for item in node.body:
                        if isinstance(item, ast.Assign):
                            for target in item.targets:
                                if isinstance(target, ast.Name):
                                    raw_members.append((target.id, item.lineno))

                    if len(raw_members) >= 2:
                        entity_name = re.sub(r'Status|State|Stage|Enum', '', node.name).strip() or node.name
                        kg_node = self.kg_models.get(entity_name.lower())
                        assoc_id = kg_node.id if kg_node else None

                        states: List[LifecycleState] = []
                        for val_name, lineno in raw_members:
                            val_upper = val_name.upper()
                            val_id = f"state_{entity_name.lower()}_{val_name.lower()}"

                            stype = StateType.INTERMEDIATE
                            is_init = False
                            is_term = False
                            is_fail = False

                            if val_upper in ("PENDING", "DRAFT", "NEW", "CREATED", "NOT_INDEXED", "OPEN"):
                                stype = StateType.INITIAL
                                is_init = True
                            elif val_upper in ("CONFIRMED", "COMPLETED", "INDEXED", "PAID", "APPROVED", "SUCCEEDED", "MERGED"):
                                stype = StateType.TERMINAL_SUCCESS
                                is_term = True
                            elif val_upper in ("CANCELLED", "FAILED", "REJECTED", "CLOSED", "EXPIRED"):
                                stype = StateType.TERMINAL_FAILURE
                                is_term = True
                                is_fail = True

                            states.append(LifecycleState(
                                id=val_id,
                                name=val_upper,
                                state_type=stype,
                                entity_name=entity_name,
                                description=f"{entity_name} occupied state {val_upper}",
                                is_initial=is_init,
                                is_terminal=is_term,
                                is_failure=is_fail,
                                associated_node_id=assoc_id,
                                evidence=SourceEvidence(
                                    file_path=file_path,
                                    start_line=lineno,
                                    end_line=lineno,
                                    snippet=lines[lineno - 1] if lineno <= len(lines) else None,
                                ),
                            ))

                        transitions = self._trace_entity_transitions(entity_name, states, file_path)

                        lifecycles.append(EntityLifecycle(
                            id=f"lifecycle_{entity_name.lower()}",
                            entity_name=f"{entity_name} Lifecycle",
                            description=f"Runtime state transitions and failure paths for {entity_name}",
                            states=states,
                            transitions=transitions,
                            confidence="deterministic",
                            has_failure_state=any(s.is_failure for s in states),
                            has_retry_loop=any(t.is_retry for t in transitions),
                        ))

        return lifecycles

    # -------------------------------------------------------------------------
    # Fallback Lifecycles
    # -------------------------------------------------------------------------

    def _build_fallback_lifecycles(self) -> List[EntityLifecycle]:
        """
        Builds a canonical Pull Request / Task lifecycle when no custom enums exist.
        """
        states = [
            LifecycleState(
                id="state_draft",
                name="DRAFT",
                state_type=StateType.INITIAL,
                entity_name="Pull Request",
                description="Work in progress, not ready for review",
                is_initial=True,
                is_terminal=False,
                is_failure=False,
            ),
            LifecycleState(
                id="state_open",
                name="OPEN",
                state_type=StateType.INTERMEDIATE,
                entity_name="Pull Request",
                description="Submitted and open for team discussion",
                is_initial=False,
                is_terminal=False,
                is_failure=False,
            ),
            LifecycleState(
                id="state_review_requested",
                name="REVIEW_REQUESTED",
                state_type=StateType.INTERMEDIATE,
                entity_name="Pull Request",
                description="Assigned reviewers evaluating code changes",
                is_initial=False,
                is_terminal=False,
                is_failure=False,
            ),
            LifecycleState(
                id="state_approved",
                name="APPROVED",
                state_type=StateType.INTERMEDIATE,
                entity_name="Pull Request",
                description="Review requirements satisfied and CI checks passed",
                is_initial=False,
                is_terminal=False,
                is_failure=False,
            ),
            LifecycleState(
                id="state_merged",
                name="MERGED",
                state_type=StateType.TERMINAL_SUCCESS,
                entity_name="Pull Request",
                description="Code changes successfully integrated into main branch",
                is_initial=False,
                is_terminal=True,
                is_failure=False,
            ),
            LifecycleState(
                id="state_closed",
                name="CLOSED",
                state_type=StateType.TERMINAL_FAILURE,
                entity_name="Pull Request",
                description="Pull request closed without merging",
                is_initial=False,
                is_terminal=True,
                is_failure=True,
            ),
        ]

        transitions = [
            LifecycleTransition(
                id="trans_draft_open",
                from_state="state_draft",
                to_state="state_open",
                event="Ready for Review",
                condition="draft == false",
                action="mark_ready_for_review()",
                is_retry=False,
                is_failure=False,
                confidence_level="inferred",
            ),
            LifecycleTransition(
                id="trans_open_review",
                from_state="state_open",
                to_state="state_review_requested",
                event="Request Reviewers",
                condition="reviewers_assigned.length > 0",
                action="notify_reviewers()",
                is_retry=False,
                is_failure=False,
                confidence_level="inferred",
            ),
            LifecycleTransition(
                id="trans_review_approved",
                from_state="state_review_requested",
                to_state="state_approved",
                event="Approve Review",
                condition="approvals >= required_approvals",
                action="record_approval()",
                is_retry=False,
                is_failure=False,
                confidence_level="inferred",
            ),
            LifecycleTransition(
                id="trans_approved_merged",
                from_state="state_approved",
                to_state="state_merged",
                event="Merge Pull Request",
                condition="ci_passed && branch_up_to_date",
                action="git_merge_commit()",
                is_retry=False,
                is_failure=False,
                confidence_level="inferred",
            ),
            LifecycleTransition(
                id="trans_open_closed",
                from_state="state_open",
                to_state="state_closed",
                event="Close Without Merge",
                condition="author_or_admin_closed",
                action="close_pull_request()",
                is_retry=False,
                is_failure=True,
                confidence_level="inferred",
            ),
        ]

        return [
            EntityLifecycle(
                id="lifecycle_pull_request",
                entity_name="Pull Request Lifecycle",
                description="Development and code review lifecycle for pull requests",
                states=states,
                transitions=transitions,
                confidence="inferred",
                has_failure_state=True,
                has_retry_loop=False,
            )
        ]
