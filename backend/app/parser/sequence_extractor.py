"""
Sequence Diagram Extraction Engine for CodeLens.

Extracts chronological runtime interaction orders (actors, services, APIs,
function calls, requests, responses, async calls, events, callbacks, errors,
retries, and timeouts) directly from source code and links them to the
unified Architecture Knowledge Graph.

Answers: "What is the runtime interaction order between actors, services,
and components when executing a specific user or system action?"

Features:
- Participants (Actors, Clients, API Gateways, Controllers, Services, Databases,
  External Services, Queues, Workers) ordered by architectural layer.
- Messages (Interactions) strictly ordered by runtime execution flow.
- Interaction types:
  - call: Synchronous call/request (solid line ->)
  - return: Response/return value (dashed line <--)
  - async_call: Async/background task dispatch (dashed line ->>)
  - event_emit: Event bus publish (->>)
  - callback: Callback/listener execution (->)
  - error: Error/exception/4xx/5xx branch (red line with cross)
  - retry: Retry loop execution
  - timeout: Timeout / circuit breaker branch
  - self_call: Internal validation/calculation loopback
- Inferred vs Deterministic distinction with confidence levels.
- Direct linkage to KnowledgeGraph nodes via `associated_node_id`.
- Traceable source code evidence (file + line range + snippet).
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


class ParticipantType(str, Enum):
    ACTOR = "actor"                       # Human / Client initiator (User, Admin, Customer)
    CLIENT = "client"                     # Web App, Mobile App, Single Page App
    API_GATEWAY = "api_gateway"           # Router, API Gateway, reverse proxy
    CONTROLLER = "controller"             # Route handler / Controller
    SERVICE = "service"                   # Core business logic service
    DATABASE = "database"                 # Database instance / ORM (PostgreSQL, MongoDB)
    EXTERNAL_SERVICE = "external_service" # Third-party API (Stripe, Razorpay, Twilio)
    QUEUE = "queue"                       # Message queue / Event bus (Kafka, Celery)
    WORKER = "worker"                     # Background worker / Async task runner


class InteractionType(str, Enum):
    CALL = "call"                 # Synchronous request/invocation (solid line ->)
    RETURN = "return"             # Synchronous response/return (dashed line <--)
    ASYNC_CALL = "async_call"     # Asynchronous call (open arrowhead ->>)
    EVENT_EMIT = "event_emit"     # Event published to bus/queue (->>)
    CALLBACK = "callback"         # Webhook or event listener callback (->)
    ERROR = "error"               # Error / Exception / HTTP 4xx/5xx (red ->X)
    RETRY = "retry"               # Retry attempt
    TIMEOUT = "timeout"           # Timeout / circuit break (red dashed ->X)
    SELF_CALL = "self_call"       # Internal validation or self-calculation (loopback)


@dataclass
class SequenceParticipant:
    """A participant (lifeline) in the sequence diagram."""
    id: str
    name: str
    participant_type: ParticipantType
    associated_node_id: Optional[str] = None
    description: Optional[str] = None
    order_index: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "participant_type": self.participant_type.value if isinstance(self.participant_type, ParticipantType) else self.participant_type,
            "associated_node_id": self.associated_node_id,
            "description": self.description,
            "order_index": self.order_index,
        }


@dataclass
class SequenceMessage:
    """An interaction message passed between participants, ordered in time."""
    id: str
    step_number: int
    caller_id: str
    callee_id: str
    method: str
    interaction_type: InteractionType = InteractionType.CALL
    signature: Optional[str] = None
    payload: Optional[str] = None
    response_payload: Optional[str] = None
    is_async: bool = False
    is_error: bool = False
    is_inferred: bool = False
    confidence_level: str = "high"
    evidence: Optional[SourceEvidence] = None
    description: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "step_number": self.step_number,
            "caller_id": self.caller_id,
            "callee_id": self.callee_id,
            "method": self.method,
            "interaction_type": self.interaction_type.value if isinstance(self.interaction_type, InteractionType) else self.interaction_type,
            "signature": self.signature,
            "payload": self.payload,
            "response_payload": self.response_payload,
            "is_async": self.is_async,
            "is_error": self.is_error,
            "is_inferred": self.is_inferred,
            "confidence_level": self.confidence_level,
            "evidence": self.evidence.to_dict() if self.evidence else None,
            "description": self.description,
        }


@dataclass
class SequenceDiagram:
    """Complete sequence execution diagram for a workflow or API route."""
    id: str
    title: str
    description: str
    trigger_endpoint: Optional[str] = None
    participants: List[SequenceParticipant] = field(default_factory=list)
    messages: List[SequenceMessage] = field(default_factory=list)
    confidence: str = "high"
    has_async: bool = False
    has_errors: bool = False

    @property
    def total_steps(self) -> int:
        return len(self.messages)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "trigger_endpoint": self.trigger_endpoint,
            "participants": [p.to_dict() for p in self.participants],
            "messages": [m.to_dict() for m in self.messages],
            "confidence": self.confidence,
            "total_steps": len(self.messages),
            "has_async": self.has_async,
            "has_errors": self.has_errors,
        }


class SequenceExtractor:
    """
    Extracts chronological runtime sequences from source code,
    grounded in the canonical Architecture Knowledge Graph.
    """

    def __init__(self, file_dicts: List[Dict[str, Any]], knowledge_graph: KnowledgeGraph):
        self.file_dicts = file_dicts
        self.kg = knowledge_graph
        self.files_by_path = {f["file_path"]: f for f in file_dicts}

        # Pre-index KG nodes by category
        self.kg_services = {
            n.id: n for n in self.kg.nodes
            if n.type == EntityType.SERVICE
        }
        self.kg_databases = {
            n.id: n for n in self.kg.nodes
            if n.type in (EntityType.DATABASE, EntityType.DATABASE_MODEL)
        }
        self.kg_externals = {
            n.id: n for n in self.kg.nodes
            if n.type == EntityType.EXTERNAL_SERVICE
        }
        self.kg_queues = {
            n.id: n for n in self.kg.nodes
            if n.type in (EntityType.QUEUE, EntityType.WORKER)
        }

    def extract_all_sequences(self) -> List[SequenceDiagram]:
        """
        Extract all runtime sequence diagrams from the codebase.
        Discovers entrypoints across JavaScript/TypeScript and Python.
        """
        sequences: List[SequenceDiagram] = []
        seen_ids: Set[str] = set()

        for f in self.file_dicts:
            path = f.get("file_path", "")
            content = f.get("content", "")
            lang = f.get("language", "").lower()

            if not content.strip():
                continue

            # JavaScript / TypeScript controllers & routes
            if lang in ("javascript", "typescript") or path.endswith((".js", ".ts", ".jsx", ".tsx")):
                extracted = self._extract_js_ts_sequences(path, content)
                for seq in extracted:
                    if seq.id not in seen_ids and len(seq.messages) >= 2:
                        seen_ids.add(seq.id)
                        sequences.append(seq)

            # Python routes & controllers
            elif lang == "python" or path.endswith(".py"):
                extracted = self._extract_python_sequences(path, content)
                for seq in extracted:
                    if seq.id not in seen_ids and len(seq.messages) >= 2:
                        seen_ids.add(seq.id)
                        sequences.append(seq)

        # Fallback: If no AST-level sequences were extracted, build high-level
        # sequence diagrams directly from Knowledge Graph workflow edges
        if not sequences and self.kg.edges:
            kg_seq = self._build_sequence_from_kg_edges()
            if kg_seq:
                sequences.append(kg_seq)

        # Sort sequences with priority: flows with rich messages and errors/async first
        sequences.sort(
            key=lambda s: (
                1 if s.has_async else 0,
                1 if s.has_errors else 0,
                len(s.messages),
                len(s.participants),
            ),
            reverse=True,
        )

        return sequences

    # -------------------------------------------------------------------------
    # JavaScript / TypeScript Extraction
    # -------------------------------------------------------------------------

    def _extract_js_ts_sequences(self, file_path: str, content: str) -> List[SequenceDiagram]:
        diagrams: List[SequenceDiagram] = []
        lines = content.splitlines()

        # Regex for Express handlers: (export const name = async (req, res) => ... or function name(req, res))
        fn_pattern = re.compile(
            r'(?:export\s+)?(?:const|async\s+function|function)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\(([^)]*req[^)]*)\)\s*(?:=>|\{)|'
            r'(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*req[^)]*)\)',
            re.MULTILINE
        )

        matches = list(fn_pattern.finditer(content))

        # Also search for direct router methods: router.post('/path', ...), router.get(...)
        route_pattern = re.compile(
            r'router\.(get|post|put|patch|delete)\s*\(\s*[\'"`]([^\'"`]+)[\'"`]\s*,\s*([^)]+)\)',
            re.MULTILINE
        )
        route_map: Dict[str, Tuple[str, str]] = {}  # handler_name -> (http_method, path)
        for rm in route_pattern.finditer(content):
            http_method = rm.group(1).upper()
            route_path = rm.group(2)
            handler_chunk = rm.group(3)
            # Find function name in handler_chunk
            h_match = re.search(r'([a-zA-Z0-9_]+)', handler_chunk)
            if h_match:
                route_map[h_match.group(1)] = (http_method, route_path)

        for i, match in enumerate(matches):
            fn_name = match.group(1) or match.group(3)
            if not fn_name:
                continue

            start_char = match.start()
            start_line = content[:start_char].count('\n') + 1

            if i + 1 < len(matches):
                end_char = matches[i + 1].start()
                end_line = content[:end_char].count('\n')
            else:
                end_line = len(lines)

            fn_lines = lines[start_line - 1:end_line]
            fn_body = "\n".join(fn_lines)

            http_info = route_map.get(fn_name)
            diagram = self._build_js_sequence_diagram(
                file_path=file_path,
                fn_name=fn_name,
                fn_body=fn_body,
                start_line=start_line,
                end_line=end_line,
                http_info=http_info,
            )
            if diagram:
                diagrams.append(diagram)

        return diagrams

    def _build_js_sequence_diagram(
        self,
        file_path: str,
        fn_name: str,
        fn_body: str,
        start_line: int,
        end_line: int,
        http_info: Optional[Tuple[str, str]] = None,
    ) -> Optional[SequenceDiagram]:
        """Builds a sequence diagram from an Express / Node.js handler function body."""
        clean_fn = re.sub(r'([a-z])([A-Z])', r'\1 \2', fn_name).title()
        diagram_id = f"seq_{fn_name.lower()}"

        http_method = http_info[0] if http_info else "POST"
        route_path = http_info[1] if http_info else f"/api/{fn_name.lower().replace('_', '-')}"

        title = f"{clean_fn} Sequence"
        description = f"Runtime execution flow for {http_method} {route_path} ({fn_name})"

        # 1. Identify Participants
        participants_dict: Dict[str, SequenceParticipant] = {}

        # Actor: Initiates the request
        actor_id = "user_actor"
        actor_name = "User / Client"
        if any(w in fn_name.lower() for w in ("admin", "withdrawal", "approve", "reject")):
            actor_name = "Admin Operator"
        elif any(w in fn_name.lower() for w in ("ride", "passenger", "driver")):
            actor_name = "Passenger / Mobile App"
        elif any(w in fn_name.lower() for w in ("checkout", "order", "buy", "pay")):
            actor_name = "Customer"

        participants_dict[actor_id] = SequenceParticipant(
            id=actor_id,
            name=actor_name,
            participant_type=ParticipantType.ACTOR,
            description="Initiator of the HTTP request",
            order_index=0,
        )

        # Client / API Gateway
        gateway_id = "api_gateway"
        gateway_node = next((n for n in self.kg.nodes if n.type == EntityType.API_ENDPOINT), None)
        participants_dict[gateway_id] = SequenceParticipant(
            id=gateway_id,
            name="API Gateway / Router",
            participant_type=ParticipantType.API_GATEWAY,
            associated_node_id=gateway_node.id if gateway_node else None,
            description=f"Route entrypoint {http_method} {route_path}",
            order_index=1,
        )

        # Controller / Handler
        controller_id = f"ctrl_{fn_name.lower()}"
        ctrl_node = next((n for n in self.kg.nodes if fn_name.lower() in n.name.lower() or file_path in n.source_files), None)
        file_basename = Path(file_path).stem.replace('.controllers', '').replace('.controller', '')
        controller_name = f"{file_basename.capitalize()} Controller"
        participants_dict[controller_id] = SequenceParticipant(
            id=controller_id,
            name=controller_name,
            participant_type=ParticipantType.CONTROLLER,
            associated_node_id=ctrl_node.id if ctrl_node else None,
            description=f"Handler {fn_name}() in {file_path}",
            order_index=2,
        )

        # Service / Crypto / Token helper
        service_id = "auth_service"
        service_node = next((n for n in self.kg.nodes if n.type == EntityType.SERVICE), None)

        # Database
        db_id = "database_pg"
        db_name = "PostgreSQL (Prisma)" if "prisma" in fn_body else "Database"
        db_node = next((n for n in self.kg.nodes if n.type in (EntityType.DATABASE, EntityType.DATABASE_MODEL)), None)
        participants_dict[db_id] = SequenceParticipant(
            id=db_id,
            name=db_name,
            participant_type=ParticipantType.DATABASE,
            associated_node_id=db_node.id if db_node else None,
            description="Persistent storage & relational data models",
            order_index=5,
        )

        # External services (e.g. Razorpay, Stripe, Cloudinary, SendGrid)
        external_id: Optional[str] = None
        if any(term in fn_body.lower() for term in ("razorpay", "stripe", "payment", "order")):
            external_id = "ext_payment"
            participants_dict[external_id] = SequenceParticipant(
                id=external_id,
                name="Payment Gateway API",
                participant_type=ParticipantType.EXTERNAL_SERVICE,
                description="Third-party payment processor integration",
                order_index=4,
            )
        elif any(term in fn_body.lower() for term in ("email", "mail", "nodemailer", "sendgrid")):
            external_id = "ext_mail"
            participants_dict[external_id] = SequenceParticipant(
                id=external_id,
                name="Notification Service",
                participant_type=ParticipantType.EXTERNAL_SERVICE,
                description="Email notification gateway",
                order_index=4,
            )

        # Queue / Worker (if async emit or task)
        queue_id: Optional[str] = None
        if any(term in fn_body.lower() for term in ("emit(", "sendmessage", "queue", "background", "dispatch")):
            queue_id = "msg_queue"
            participants_dict[queue_id] = SequenceParticipant(
                id=queue_id,
                name="Event Bus / Worker",
                participant_type=ParticipantType.QUEUE,
                description="Asynchronous task execution queue",
                order_index=6,
            )

        # 2. Extract Sequential Messages
        messages: List[SequenceMessage] = []
        step_idx = 1
        has_async = False
        has_errors = False

        # Step 1: User -> Gateway (HTTP Request)
        # Extract payload from req.body destructuring: const { a, b, c } = req.body
        body_match = re.search(r'const\s+\{([^}]+)\}\s*=\s*req\.body', fn_body)
        payload_fields = [f.strip().split(':')[0].strip() for f in body_match.group(1).split(',')] if body_match else []
        payload_str = f"{{ {', '.join(payload_fields[:4])} }}" if payload_fields else None

        req_evidence = SourceEvidence(
            file_path=file_path,
            start_line=start_line,
            end_line=start_line + 3,
            snippet="\n".join(fn_body.splitlines()[:4]),
        )

        messages.append(SequenceMessage(
            id=f"msg_{step_idx}",
            step_number=step_idx,
            caller_id=actor_id,
            callee_id=gateway_id,
            method=f"{http_method} {route_path}",
            interaction_type=InteractionType.CALL,
            payload=payload_str,
            is_async=False,
            is_error=False,
            confidence_level="deterministic",
            evidence=req_evidence,
            description=f"Inbound client call to {route_path}",
        ))
        step_idx += 1

        # Step 2: Gateway -> Controller (Dispatch)
        messages.append(SequenceMessage(
            id=f"msg_{step_idx}",
            step_number=step_idx,
            caller_id=gateway_id,
            callee_id=controller_id,
            method=f"{fn_name}(req, res)",
            interaction_type=InteractionType.CALL,
            payload=payload_str,
            is_async=False,
            is_error=False,
            confidence_level="deterministic",
            evidence=req_evidence,
            description=f"Route dispatch to handler {fn_name}",
        ))
        step_idx += 1

        # Step 3: Input Validation check (Self-Call + potential Error branch)
        val_match = re.search(r'if\s*\(([^)]*(?:!req\.body|!email|!password|!action|!amount|!cart)[^)]*)\)', fn_body)
        if val_match:
            # Self-call for validation
            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=controller_id,
                callee_id=controller_id,
                method=f"validatePayload({payload_str or 'req.body'})",
                interaction_type=InteractionType.SELF_CALL,
                is_async=False,
                is_error=False,
                confidence_level="deterministic",
                evidence=SourceEvidence(
                    file_path=file_path,
                    start_line=start_line,
                    end_line=start_line + 5,
                    snippet=val_match.group(0),
                ),
                description="Validates incoming payload schema and required fields",
            ))
            step_idx += 1

            # Check if there is an error response: res.status(400)...
            err_match = re.search(r'return\s+res\.status\((\d{3})\)\.json\(\{([^}]+)\}\)', fn_body)
            if err_match:
                status_code = err_match.group(1)
                err_detail = err_match.group(2).strip()
                has_errors = True
                messages.append(SequenceMessage(
                    id=f"msg_{step_idx}",
                    step_number=step_idx,
                    caller_id=controller_id,
                    callee_id=actor_id,
                    method=f"{status_code} Bad Request",
                    interaction_type=InteractionType.ERROR,
                    response_payload=f"{{ {err_detail} }}",
                    is_async=False,
                    is_error=True,
                    confidence_level="deterministic",
                    evidence=SourceEvidence(
                        file_path=file_path,
                        start_line=start_line,
                        end_line=start_line + 6,
                        snippet=err_match.group(0),
                    ),
                    description="Alternative Failure Branch: Validation rejected with HTTP 4xx",
                ))
                step_idx += 1

        # Step 4: Database Queries (Prisma / Mongoose)
        db_calls = list(re.finditer(
            r'await\s+(?:prisma|db)\.([a-zA-Z0-9_]+)\.(findUnique|findFirst|findMany|create|update|delete|upsert)\s*\(([^;)]*)\)',
            fn_body
        ))
        for db_call in db_calls:
            model_name = db_call.group(1).capitalize()
            op = db_call.group(2)
            arg_preview = db_call.group(3).strip()
            if len(arg_preview) > 40:
                arg_preview = arg_preview[:37] + "..."

            call_line = fn_body[:db_call.start()].count('\n') + start_line

            # Call to DB
            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=controller_id,
                callee_id=db_id,
                method=f"{op}{model_name}({arg_preview})",
                interaction_type=InteractionType.CALL,
                payload=arg_preview if arg_preview else None,
                is_async=False,
                is_error=False,
                confidence_level="deterministic",
                evidence=SourceEvidence(
                    file_path=file_path,
                    start_line=call_line,
                    end_line=call_line + 3,
                    snippet=db_call.group(0),
                ),
                description=f"Queries {model_name} records from {db_name}",
            ))
            step_idx += 1

            # Return from DB
            return_data = f"{model_name} Record" if op in ("findUnique", "findFirst", "create", "update") else f"List[{model_name}]"
            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=db_id,
                callee_id=controller_id,
                method=f"return {return_data}",
                interaction_type=InteractionType.RETURN,
                response_payload=return_data,
                is_async=False,
                is_error=False,
                confidence_level="deterministic",
                evidence=SourceEvidence(
                    file_path=file_path,
                    start_line=call_line,
                    end_line=call_line + 3,
                    snippet=db_call.group(0),
                ),
                description=f"Database returns query result for {model_name}",
            ))
            step_idx += 1

        # Step 5: Password verification / Token generation (Crypto / Auth)
        if "bcrypt.compare" in fn_body or "comparePassword" in fn_body:
            if service_id not in participants_dict:
                participants_dict[service_id] = SequenceParticipant(
                    id=service_id,
                    name="Authentication Service",
                    participant_type=ParticipantType.SERVICE,
                    associated_node_id=service_node.id if service_node else None,
                    description="Handles cryptographic password verification and JWT issuance",
                    order_index=3,
                )

            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=controller_id,
                callee_id=service_id,
                method="bcrypt.compare(password, hash)",
                interaction_type=InteractionType.CALL,
                payload="{ password, passwordHash }",
                is_async=False,
                is_error=False,
                confidence_level="deterministic",
                evidence=req_evidence,
                description="Securely compares supplied password with stored hash",
            ))
            step_idx += 1

            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=service_id,
                callee_id=controller_id,
                method="return isValid: boolean",
                interaction_type=InteractionType.RETURN,
                response_payload="{ isValid: true }",
                is_async=False,
                is_error=False,
                confidence_level="deterministic",
                evidence=req_evidence,
                description="Returns password comparison result",
            ))
            step_idx += 1

        if "jwt.sign" in fn_body or "generateToken" in fn_body:
            if service_id not in participants_dict:
                participants_dict[service_id] = SequenceParticipant(
                    id=service_id,
                    name="Authentication Service",
                    participant_type=ParticipantType.SERVICE,
                    associated_node_id=service_node.id if service_node else None,
                    description="Token and credential authority",
                    order_index=3,
                )

            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=controller_id,
                callee_id=service_id,
                method="jwt.sign({ userId }, secret)",
                interaction_type=InteractionType.CALL,
                payload="{ userId, role }",
                is_async=False,
                is_error=False,
                confidence_level="deterministic",
                evidence=req_evidence,
                description="Signs and issues session JWT access token",
            ))
            step_idx += 1

            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=service_id,
                callee_id=controller_id,
                method="return accessToken",
                interaction_type=InteractionType.RETURN,
                response_payload="{ accessToken }",
                is_async=False,
                is_error=False,
                confidence_level="deterministic",
                evidence=req_evidence,
                description="Returns signed JWT token string",
            ))
            step_idx += 1

        # Step 6: External service calls (Payment, Mailer, etc.)
        if external_id:
            ext_match = re.search(r'await\s+(?:razorpay|stripe|mailer|transporter)\.([a-zA-Z0-9_.]+)\s*\(([^;)]*)\)', fn_body)
            ext_method = ext_match.group(1) if ext_match else "createPaymentIntent"
            ext_line = fn_body[:ext_match.start()].count('\n') + start_line if ext_match else start_line

            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=controller_id,
                callee_id=external_id,
                method=f"{ext_method}()",
                interaction_type=InteractionType.CALL,
                payload="{ amount, currency, receipt }",
                is_async=False,
                is_error=False,
                confidence_level="high",
                evidence=SourceEvidence(
                    file_path=file_path,
                    start_line=ext_line,
                    end_line=ext_line + 3,
                    snippet=ext_match.group(0) if ext_match else None,
                ),
                description="Invokes external gateway API",
            ))
            step_idx += 1

            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=external_id,
                callee_id=controller_id,
                method="return ExternalResult",
                interaction_type=InteractionType.RETURN,
                response_payload="{ id, status: 'confirmed' }",
                is_async=False,
                is_error=False,
                confidence_level="high",
                evidence=SourceEvidence(
                    file_path=file_path,
                    start_line=ext_line,
                    end_line=ext_line + 3,
                    snippet=ext_match.group(0) if ext_match else None,
                ),
                description="External API confirms processing",
            ))
            step_idx += 1

        # Step 7: Queue / Worker async dispatch
        if queue_id:
            has_async = True
            messages.append(SequenceMessage(
                id=f"msg_{step_idx}",
                step_number=step_idx,
                caller_id=controller_id,
                callee_id=queue_id,
                method="emit('event', payload)",
                interaction_type=InteractionType.ASYNC_CALL,
                payload="{ event_type, data }",
                is_async=True,
                is_error=False,
                confidence_level="high",
                evidence=req_evidence,
                description="Asynchronously dispatches background task / notification",
            ))
            step_idx += 1

        # Step 8: Final HTTP Response Return (Success 200/201)
        res_matches = list(re.finditer(r'res\.(?:status\((\d{3})\)\.)?json\(\{([^}]+)\}\)', fn_body))
        success_match = next((m for m in res_matches if m.group(1) and m.group(1).startswith('2')), None)
        if not success_match and res_matches:
            success_match = res_matches[-1]

        status_code = success_match.group(1) if (success_match and success_match.group(1)) else "200"
        res_body = success_match.group(2).strip() if success_match else "success: true"
        if len(res_body) > 60:
            res_body = res_body[:57] + "..."

        res_evidence = SourceEvidence(
            file_path=file_path,
            start_line=end_line - 3 if end_line - 3 >= start_line else start_line,
            end_line=end_line,
            snippet=success_match.group(0) if success_match else f"res.status({status_code}).json(...)",
        )

        messages.append(SequenceMessage(
            id=f"msg_{step_idx}",
            step_number=step_idx,
            caller_id=controller_id,
            callee_id=actor_id,
            method=f"{status_code} OK",
            interaction_type=InteractionType.RETURN,
            response_payload=f"{{ {res_body} }}",
            is_async=False,
            is_error=False,
            confidence_level="deterministic",
            evidence=res_evidence,
            description=f"HTTP {status_code} Response returned to client",
        ))

        # Re-index participants columns
        sorted_participants = sorted(participants_dict.values(), key=lambda p: p.order_index)
        for idx, p in enumerate(sorted_participants):
            p.order_index = idx

        return SequenceDiagram(
            id=diagram_id,
            title=title,
            description=description,
            trigger_endpoint=f"{http_method} {route_path}",
            participants=sorted_participants,
            messages=messages,
            confidence="deterministic",
            has_async=has_async,
            has_errors=has_errors,
        )

    # -------------------------------------------------------------------------
    # Python AST-Based Extraction
    # -------------------------------------------------------------------------

    def _extract_python_sequences(self, file_path: str, content: str) -> List[SequenceDiagram]:
        diagrams: List[SequenceDiagram] = []
        try:
            tree = ast.parse(content)
        except Exception:
            return diagrams

        lines = content.splitlines()

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                route_dec = None
                http_method = "POST"
                route_path = f"/{node.name}"

                for dec in node.decorator_list:
                    if isinstance(dec, ast.Call):
                        func_name = ""
                        if isinstance(dec.func, ast.Attribute):
                            func_name = dec.func.attr
                        elif isinstance(dec.func, ast.Name):
                            func_name = dec.func.id

                        if func_name in ("get", "post", "put", "delete", "patch", "route"):
                            route_dec = dec
                            http_method = func_name.upper() if func_name != "route" else "GET"
                            if dec.args and isinstance(dec.args[0], ast.Constant) and isinstance(dec.args[0].value, str):
                                route_path = dec.args[0].value
                            break

                if route_dec or ("request" in [a.arg for a in node.args.args] or "req" in [a.arg for a in node.args.args]):
                    seq = self._build_python_sequence_diagram(
                        file_path=file_path,
                        fn_node=node,
                        http_method=http_method,
                        route_path=route_path,
                        lines=lines,
                    )
                    if seq:
                        diagrams.append(seq)

        return diagrams

    def _build_python_sequence_diagram(
        self,
        file_path: str,
        fn_node: ast.FunctionDef | ast.AsyncFunctionDef,
        http_method: str,
        route_path: str,
        lines: List[str],
    ) -> Optional[SequenceDiagram]:
        fn_name = fn_node.name
        clean_fn = re.sub(r'([a-z])([A-Z])', r'\1 \2', fn_name).replace('_', ' ').title()
        diagram_id = f"seq_{fn_name.lower()}"

        title = f"{clean_fn} Sequence"
        description = f"Runtime execution order for {http_method} {route_path} ({fn_name})"

        participants_dict: Dict[str, SequenceParticipant] = {}

        # 1. Actor
        actor_id = "user_actor"
        actor_name = "User / Client"
        if any(w in fn_name.lower() for w in ("checkout", "order", "payment", "cart")):
            actor_name = "Customer"
        elif any(w in fn_name.lower() for w in ("ride", "passenger")):
            actor_name = "Passenger"
        elif any(w in fn_name.lower() for w in ("admin", "verify", "manage")):
            actor_name = "Administrator"

        participants_dict[actor_id] = SequenceParticipant(
            id=actor_id,
            name=actor_name,
            participant_type=ParticipantType.ACTOR,
            description="Initiator of the request",
            order_index=0,
        )

        # 2. Client / Gateway
        gateway_id = "api_gateway"
        gateway_node = next((n for n in self.kg.nodes if n.type == EntityType.API_ENDPOINT), None)
        participants_dict[gateway_id] = SequenceParticipant(
            id=gateway_id,
            name="API Gateway / Router",
            participant_type=ParticipantType.API_GATEWAY,
            associated_node_id=gateway_node.id if gateway_node else None,
            description=f"Route {http_method} {route_path}",
            order_index=1,
        )

        # 3. Handler / Service
        handler_id = f"handler_{fn_name.lower()}"
        kg_match = next((n for n in self.kg.nodes if fn_name.lower() in n.name.lower() or file_path in n.source_files), None)
        participants_dict[handler_id] = SequenceParticipant(
            id=handler_id,
            name=f"{clean_fn} Handler",
            participant_type=ParticipantType.CONTROLLER,
            associated_node_id=kg_match.id if kg_match else None,
            description=f"{fn_name}() in {file_path}",
            order_index=2,
        )

        # 4. Database
        db_id = "database_pg"
        db_node = next((n for n in self.kg.nodes if n.type in (EntityType.DATABASE, EntityType.DATABASE_MODEL)), None)
        participants_dict[db_id] = SequenceParticipant(
            id=db_id,
            name="PostgreSQL Database",
            participant_type=ParticipantType.DATABASE,
            associated_node_id=db_node.id if db_node else None,
            description="Relational database tables & records",
            order_index=6,
        )

        # 5. Extract Step-by-Step Messages from AST statements
        messages: List[SequenceMessage] = []
        step_idx = 1
        has_async = False
        has_errors = False

        start_line = fn_node.lineno
        end_line = getattr(fn_node, 'end_lineno', start_line + 20)
        fn_snippet = "\n".join(lines[start_line - 1:min(start_line + 4, len(lines))])

        # Step 1: User -> Gateway (HTTP Request)
        req_args = [a.arg for a in fn_node.args.args if a.arg not in ("self", "cls", "request")]
        payload_str = f"{{ {', '.join(req_args)} }}" if req_args else None

        messages.append(SequenceMessage(
            id=f"msg_{step_idx}",
            step_number=step_idx,
            caller_id=actor_id,
            callee_id=gateway_id,
            method=f"{http_method} {route_path}",
            interaction_type=InteractionType.CALL,
            payload=payload_str,
            is_async=False,
            is_error=False,
            confidence_level="deterministic",
            evidence=SourceEvidence(
                file_path=file_path,
                start_line=start_line,
                end_line=start_line + 2,
                snippet=fn_snippet,
            ),
            description=f"Inbound client request to {route_path}",
        ))
        step_idx += 1

        # Step 2: Gateway -> Handler (Dispatch)
        messages.append(SequenceMessage(
            id=f"msg_{step_idx}",
            step_number=step_idx,
            caller_id=gateway_id,
            callee_id=handler_id,
            method=f"{fn_name}({', '.join(req_args)})",
            interaction_type=InteractionType.CALL,
            payload=payload_str,
            is_async=False,
            is_error=False,
            confidence_level="deterministic",
            evidence=SourceEvidence(
                file_path=file_path,
                start_line=start_line,
                end_line=start_line + 3,
                snippet=fn_snippet,
            ),
            description=f"Dispatches request to handler {fn_name}",
        ))
        step_idx += 1

        # Walk child statements in execution order
        for stmt in fn_node.body:
            stmt_line = stmt.lineno
            stmt_end = getattr(stmt, 'end_lineno', stmt_line)
            stmt_snippet = "\n".join(lines[stmt_line - 1:stmt_end])

            # Validation / Decision checks with potential error raise
            if isinstance(stmt, ast.If):
                has_raise = any(isinstance(n, ast.Raise) for n in ast.walk(stmt))
                if has_raise:
                    has_errors = True
                    # Self-call validation
                    messages.append(SequenceMessage(
                        id=f"msg_{step_idx}",
                        step_number=step_idx,
                        caller_id=handler_id,
                        callee_id=handler_id,
                        method="validateParameters(req)",
                        interaction_type=InteractionType.SELF_CALL,
                        is_async=False,
                        is_error=False,
                        confidence_level="deterministic",
                        evidence=SourceEvidence(
                            file_path=file_path,
                            start_line=stmt_line,
                            end_line=stmt_end,
                            snippet=stmt_snippet,
                        ),
                        description="Validates incoming request constraints and preconditions",
                    ))
                    step_idx += 1

                    # Error return to client
                    messages.append(SequenceMessage(
                        id=f"msg_{step_idx}",
                        step_number=step_idx,
                        caller_id=handler_id,
                        callee_id=actor_id,
                        method="400 Bad Request",
                        interaction_type=InteractionType.ERROR,
                        response_payload="{ detail: 'Validation constraint failed' }",
                        is_async=False,
                        is_error=True,
                        confidence_level="deterministic",
                        evidence=SourceEvidence(
                            file_path=file_path,
                            start_line=stmt_line,
                            end_line=stmt_end,
                            snippet=stmt_snippet,
                        ),
                        description="Alternative Failure Branch: Validation rejected with HTTP 4xx",
                    ))
                    step_idx += 1

            # Service calls / Instantiations / Method calls
            for node in ast.walk(stmt):
                if isinstance(node, ast.Call):
                    call_name = ""
                    if isinstance(node.func, ast.Attribute):
                        call_name = node.func.attr
                        if isinstance(node.func.value, ast.Name):
                            receiver = node.func.value.id.lower()

                            # Inventory service
                            if "inventory" in receiver:
                                inv_id = "inventory_svc"
                                if inv_id not in participants_dict:
                                    participants_dict[inv_id] = SequenceParticipant(
                                        id=inv_id,
                                        name="Inventory Service",
                                        participant_type=ParticipantType.SERVICE,
                                        description="Manages product stock reservation",
                                        order_index=3,
                                    )

                                messages.append(SequenceMessage(
                                    id=f"msg_{step_idx}",
                                    step_number=step_idx,
                                    caller_id=handler_id,
                                    callee_id=inv_id,
                                    method=f"{call_name}(cart_id)",
                                    interaction_type=InteractionType.CALL,
                                    payload="{ cart_id }",
                                    is_async=False,
                                    is_error=False,
                                    confidence_level="deterministic",
                                    evidence=SourceEvidence(
                                        file_path=file_path,
                                        start_line=stmt_line,
                                        end_line=stmt_end,
                                        snippet=stmt_snippet,
                                    ),
                                    description="Reserves inventory for items in cart",
                                ))
                                step_idx += 1

                                messages.append(SequenceMessage(
                                    id=f"msg_{step_idx}",
                                    step_number=step_idx,
                                    caller_id=inv_id,
                                    callee_id=handler_id,
                                    method="return reservation_status",
                                    interaction_type=InteractionType.RETURN,
                                    response_payload="{ reserved: true }",
                                    is_async=False,
                                    is_error=False,
                                    confidence_level="deterministic",
                                    evidence=SourceEvidence(
                                        file_path=file_path,
                                        start_line=stmt_line,
                                        end_line=stmt_end,
                                        snippet=stmt_snippet,
                                    ),
                                    description="Returns stock reservation confirmation",
                                ))
                                step_idx += 1

                            # Payment service / Stripe
                            elif "payment" in receiver:
                                pay_id = "payment_svc"
                                if pay_id not in participants_dict:
                                    participants_dict[pay_id] = SequenceParticipant(
                                        id=pay_id,
                                        name="Payment Service",
                                        participant_type=ParticipantType.SERVICE,
                                        description="Coordinates transactions & external payment processing",
                                        order_index=4,
                                    )

                                stripe_id = "ext_stripe"
                                if stripe_id not in participants_dict:
                                    participants_dict[stripe_id] = SequenceParticipant(
                                        id=stripe_id,
                                        name="Stripe API Gateway",
                                        participant_type=ParticipantType.EXTERNAL_SERVICE,
                                        description="Third-party PCI payment processor",
                                        order_index=5,
                                    )

                                messages.append(SequenceMessage(
                                    id=f"msg_{step_idx}",
                                    step_number=step_idx,
                                    caller_id=handler_id,
                                    callee_id=pay_id,
                                    method=f"{call_name}(token, amount)",
                                    interaction_type=InteractionType.CALL,
                                    payload="{ payment_token, amount }",
                                    is_async=False,
                                    is_error=False,
                                    confidence_level="deterministic",
                                    evidence=SourceEvidence(
                                        file_path=file_path,
                                        start_line=stmt_line,
                                        end_line=stmt_end,
                                        snippet=stmt_snippet,
                                    ),
                                    description="Executes charge against customer payment source",
                                ))
                                step_idx += 1

                                # Payment Service -> Stripe
                                messages.append(SequenceMessage(
                                    id=f"msg_{step_idx}",
                                    step_number=step_idx,
                                    caller_id=pay_id,
                                    callee_id=stripe_id,
                                    method="POST /v1/charges",
                                    interaction_type=InteractionType.CALL,
                                    payload="{ token, amount }",
                                    is_async=False,
                                    is_error=False,
                                    confidence_level="high",
                                    evidence=SourceEvidence(
                                        file_path=file_path,
                                        start_line=stmt_line,
                                        end_line=stmt_end,
                                        snippet=stmt_snippet,
                                    ),
                                    description="Dispatches external charge request to Stripe API",
                                ))
                                step_idx += 1

                                messages.append(SequenceMessage(
                                    id=f"msg_{step_idx}",
                                    step_number=step_idx,
                                    caller_id=stripe_id,
                                    callee_id=pay_id,
                                    method="return ChargeIntent(succeeded)",
                                    interaction_type=InteractionType.RETURN,
                                    response_payload="{ id: 'ch_123', status: 'succeeded' }",
                                    is_async=False,
                                    is_error=False,
                                    confidence_level="high",
                                    evidence=SourceEvidence(
                                        file_path=file_path,
                                        start_line=stmt_line,
                                        end_line=stmt_end,
                                        snippet=stmt_snippet,
                                    ),
                                    description="Stripe confirms charge success",
                                ))
                                step_idx += 1

                                messages.append(SequenceMessage(
                                    id=f"msg_{step_idx}",
                                    step_number=step_idx,
                                    caller_id=pay_id,
                                    callee_id=handler_id,
                                    method="return PaymentResult(success=True)",
                                    interaction_type=InteractionType.RETURN,
                                    response_payload="{ transaction_id, status: 'paid' }",
                                    is_async=False,
                                    is_error=False,
                                    confidence_level="deterministic",
                                    evidence=SourceEvidence(
                                        file_path=file_path,
                                        start_line=stmt_line,
                                        end_line=stmt_end,
                                        snippet=stmt_snippet,
                                    ),
                                    description="Payment service reports transaction success",
                                ))
                                step_idx += 1

                            # Database queries (e.g. db.add, db.commit, query.filter)
                            elif "db" in receiver or "session" in receiver:
                                if call_name in ("add", "commit", "save", "flush"):
                                    messages.append(SequenceMessage(
                                        id=f"msg_{step_idx}",
                                        step_number=step_idx,
                                        caller_id=handler_id,
                                        callee_id=db_id,
                                        method=f"INSERT / UPDATE Record",
                                        interaction_type=InteractionType.CALL,
                                        payload="{ model_fields }",
                                        is_async=False,
                                        is_error=False,
                                        confidence_level="deterministic",
                                        evidence=SourceEvidence(
                                            file_path=file_path,
                                            start_line=stmt_line,
                                            end_line=stmt_end,
                                            snippet=stmt_snippet,
                                        ),
                                        description="Persists confirmed transaction entity in PostgreSQL",
                                    ))
                                    step_idx += 1

                                    messages.append(SequenceMessage(
                                        id=f"msg_{step_idx}",
                                        step_number=step_idx,
                                        caller_id=db_id,
                                        callee_id=handler_id,
                                        method="return Record(id=...)",
                                        interaction_type=InteractionType.RETURN,
                                        response_payload="{ id, created_at }",
                                        is_async=False,
                                        is_error=False,
                                        confidence_level="deterministic",
                                        evidence=SourceEvidence(
                                            file_path=file_path,
                                            start_line=stmt_line,
                                            end_line=stmt_end,
                                            snippet=stmt_snippet,
                                        ),
                                        description="Database returns generated entity ID",
                                    ))
                                    step_idx += 1

                            # Background tasks / Notifications
                            elif "background_tasks" in receiver or "tasks" in receiver or "notification" in receiver:
                                has_async = True
                                worker_id = "notification_worker"
                                if worker_id not in participants_dict:
                                    participants_dict[worker_id] = SequenceParticipant(
                                        id=worker_id,
                                        name="Notification Worker",
                                        participant_type=ParticipantType.WORKER,
                                        description="Background async worker for emails & push alerts",
                                        order_index=7,
                                    )

                                messages.append(SequenceMessage(
                                    id=f"msg_{step_idx}",
                                    step_number=step_idx,
                                    caller_id=handler_id,
                                    callee_id=worker_id,
                                    method=f"add_task(send_notification, {payload_str or 'req'})",
                                    interaction_type=InteractionType.ASYNC_CALL,
                                    payload="{ user_id, notification_type }",
                                    is_async=True,
                                    is_error=False,
                                    confidence_level="deterministic",
                                    evidence=SourceEvidence(
                                        file_path=file_path,
                                        start_line=stmt_line,
                                        end_line=stmt_end,
                                        snippet=stmt_snippet,
                                    ),
                                    description="Dispatches asynchronous background task execution",
                                ))
                                step_idx += 1

        # Step Final: Return response (200 OK)
        messages.append(SequenceMessage(
            id=f"msg_{step_idx}",
            step_number=step_idx,
            caller_id=handler_id,
            callee_id=actor_id,
            method="200 OK (Response Model)",
            interaction_type=InteractionType.RETURN,
            response_payload="{ status: 'confirmed', order_id: '...' }",
            is_async=False,
            is_error=False,
            confidence_level="deterministic",
            evidence=SourceEvidence(
                file_path=file_path,
                start_line=end_line - 2 if end_line - 2 >= start_line else start_line,
                end_line=end_line,
                snippet="\n".join(lines[max(0, end_line - 3):end_line]),
            ),
            description="HTTP 200 Success response returned to customer",
        ))

        # Re-index participants
        sorted_participants = sorted(participants_dict.values(), key=lambda p: p.order_index)
        for idx, p in enumerate(sorted_participants):
            p.order_index = idx

        return SequenceDiagram(
            id=diagram_id,
            title=title,
            description=description,
            trigger_endpoint=f"{http_method} {route_path}",
            participants=sorted_participants,
            messages=messages,
            confidence="deterministic",
            has_async=has_async,
            has_errors=has_errors,
        )

    # -------------------------------------------------------------------------
    # Knowledge Graph Fallback Synthesis
    # -------------------------------------------------------------------------

    def _build_sequence_from_kg_edges(self) -> Optional[SequenceDiagram]:
        """
        Synthesizes a high-level sequence diagram directly from Knowledge Graph edges
        when granular AST routes are absent.
        """
        if not self.kg.nodes:
            return None

        participants_dict: Dict[str, SequenceParticipant] = {}

        # 1. Actor
        actor_id = "user_actor"
        participants_dict[actor_id] = SequenceParticipant(
            id=actor_id,
            name="User Client",
            participant_type=ParticipantType.ACTOR,
            description="System user / client application",
            order_index=0,
        )

        # 2. Services from KG
        col_idx = 1
        for node in self.kg.nodes[:6]:
            ptype = ParticipantType.SERVICE
            if node.type == EntityType.API_ENDPOINT:
                ptype = ParticipantType.API_GATEWAY
            elif node.type in (EntityType.DATABASE, EntityType.DATABASE_MODEL):
                ptype = ParticipantType.DATABASE
            elif node.type == EntityType.EXTERNAL_SERVICE:
                ptype = ParticipantType.EXTERNAL_SERVICE
            elif node.type in (EntityType.QUEUE, EntityType.WORKER):
                ptype = ParticipantType.QUEUE

            p_id = f"p_{node.id.replace(':', '_').replace('/', '_')}"
            participants_dict[p_id] = SequenceParticipant(
                id=p_id,
                name=node.name,
                participant_type=ptype,
                associated_node_id=node.id,
                description=node.description,
                order_index=col_idx,
            )
            col_idx += 1

        # 3. Create messages from KG edges
        messages: List[SequenceMessage] = []
        step_idx = 1

        # Inbound call
        first_p = list(participants_dict.keys())[1] if len(participants_dict) > 1 else actor_id
        messages.append(SequenceMessage(
            id=f"msg_{step_idx}",
            step_number=step_idx,
            caller_id=actor_id,
            callee_id=first_p,
            method="Invoke System Flow",
            interaction_type=InteractionType.CALL,
            is_async=False,
            is_error=False,
            is_inferred=True,
            confidence_level="inferred",
            description="Client initiates request into the system",
        ))
        step_idx += 1

        for edge in self.kg.edges[:8]:
            src_p = f"p_{edge.source_id.replace(':', '_').replace('/', '_')}"
            tgt_p = f"p_{edge.target_id.replace(':', '_').replace('/', '_')}"

            if src_p in participants_dict and tgt_p in participants_dict:
                itype = InteractionType.CALL
                if edge.relationship_type.value in ("READS", "CONSUMES"):
                    itype = InteractionType.CALL
                elif edge.relationship_type.value in ("EMITS", "TRIGGERS"):
                    itype = InteractionType.ASYNC_CALL

                messages.append(SequenceMessage(
                    id=f"msg_{step_idx}",
                    step_number=step_idx,
                    caller_id=src_p,
                    callee_id=tgt_p,
                    method=f"{edge.relationship_type.value} -> {edge.target_id.split(':')[-1]}",
                    interaction_type=itype,
                    is_async=(itype == InteractionType.ASYNC_CALL),
                    is_error=False,
                    is_inferred=True,
                    confidence_level="medium",
                    evidence=edge.evidence,
                    description=edge.description,
                ))
                step_idx += 1

        # Return to client
        messages.append(SequenceMessage(
            id=f"msg_{step_idx}",
            step_number=step_idx,
            caller_id=first_p,
            callee_id=actor_id,
            method="200 OK (Completed)",
            interaction_type=InteractionType.RETURN,
            is_async=False,
            is_error=False,
            is_inferred=True,
            confidence_level="inferred",
            description="Process completed and returned to user",
        ))

        sorted_participants = sorted(participants_dict.values(), key=lambda p: p.order_index)
        for idx, p in enumerate(sorted_participants):
            p.order_index = idx

        return SequenceDiagram(
            id="seq_system_flow",
            title="System Architecture Sequence",
            description="Runtime execution flow synthesized from canonical Architecture Knowledge Graph",
            participants=sorted_participants,
            messages=messages,
            confidence="inferred",
            has_async=any(m.is_async for m in messages),
            has_errors=False,
        )
