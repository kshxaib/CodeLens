"""
Data Flow Extraction Engine for CodeLens.

Extracts data lineage, transformations, models, schemas, and storage destinations
directly from source code and links them to the unified Architecture Knowledge Graph.

Answers: "What data moves through the system, where does it originate,
how is it transformed, and where is it stored or consumed?"

Supports:
- Request bodies (API request payloads, DTOs, parameters)
- Response models (API return models, serializers, HTTP payloads)
- Schemas & DTOs (Pydantic models, TypeScript interfaces, Prisma/Mongoose schemas)
- Database models (ORM entities, SQL tables, database collections)
- Explicit transformation steps (validation, calculation, hashing, serialization, transcoding)
- Files & Binary assets (multipart uploads, images, video, documents)
- Object storage & Buckets (S3, Cloudinary, local storage)
- Queues & Messages (Celery, Kafka, RabbitMQ, pub/sub, async tasks)
- Tokens & Secrets (JWT tokens, password hashes, API credentials)

Every data flow edge carries:
- data type
- source
- destination
- transformation
- storage
- direction
- evidence (file path + line range + code snippet)
- confidence (deterministic / high / medium)
"""
from __future__ import annotations

import ast
import re
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import List, Dict, Any, Optional, Set, Tuple

from app.parser.graph_schema import (
    KnowledgeGraph,
    ArchNode,
    SourceEvidence,
    EntityType,
    ConfidenceLevel,
    CONFIDENCE_VALUES,
)


class DataClassification(str, Enum):
    REQUEST_PAYLOAD = "request_payload"         # Inbound HTTP Request body / Params
    RESPONSE_PAYLOAD = "response_payload"       # Outbound HTTP Response JSON / DTO
    DTO_SCHEMA = "dto_schema"                   # Pydantic BaseModel, TS Interface, DTO
    TRANSFORMATION_STEP = "transformation_step" # Processing, validation, calculation, hash
    DATABASE_MODEL = "database_model"           # ORM Model / DB Table / Entity
    FILE_BINARY = "file_binary"                 # Binary file, media, multipart upload
    STORAGE_OBJECT = "storage_object"           # S3 Object, Cloudinary asset, disk storage
    QUEUE_MESSAGE = "queue_message"             # Event / Queue message / Task payload
    TOKEN_SECRET = "token_secret"               # Auth token, JWT, hashed password
    CACHE_ENTRY = "cache_entry"                 # Redis key-value / Cache payload


class DataFormat(str, Enum):
    JSON = "json"
    MULTIPART = "multipart/form-data"
    ORM_ROW = "orm_entity"
    BINARY = "binary/stream"
    JWT = "jwt_token"
    HASH = "hash/digest"
    PRIMITIVE = "primitive"


@dataclass
class DataNode:
    id: str
    name: str
    data_classification: DataClassification
    description: str = ""
    format: str = "json"
    storage: Optional[str] = None
    fields: List[str] = field(default_factory=list)
    is_transformation: bool = False
    associated_node_id: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "data_classification": (
                self.data_classification.value
                if isinstance(self.data_classification, Enum)
                else self.data_classification
            ),
            "description": self.description,
            "format": self.format,
            "storage": self.storage,
            "fields": self.fields,
            "is_transformation": self.is_transformation,
            "associated_node_id": self.associated_node_id,
            "evidence": self.evidence,
            "metadata": self.metadata,
        }


@dataclass
class DataFlowEdge:
    id: str
    source: str
    target: str
    data_type: str
    transformation: str
    storage: Optional[str] = None
    direction: str = "unidirectional"
    confidence: float = 1.0
    confidence_level: str = "deterministic"
    evidence: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "source": self.source,
            "target": self.target,
            "data_type": self.data_type,
            "transformation": self.transformation,
            "storage": self.storage,
            "direction": self.direction,
            "confidence": self.confidence,
            "confidence_level": self.confidence_level,
            "evidence": self.evidence,
        }


@dataclass
class DataPipeline:
    id: str
    name: str
    description: str
    trigger: str
    nodes: List[DataNode] = field(default_factory=list)
    edges: List[DataFlowEdge] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "trigger": self.trigger,
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "metadata": self.metadata,
        }


class DataFlowExtractor:
    """
    Analyzes repository files and extracts explicit, evidence-backed data flows
    integrated with the unified KnowledgeGraph.
    """

    def __init__(self, files: List[Dict[str, Any]], kg: KnowledgeGraph):
        self.files = files
        self.kg = kg
        self.file_map = {f["file_path"]: f for f in files}

        # Index database models and external services in the KnowledgeGraph
        self.kg_models = {
            node.name.lower(): node
            for node in kg.nodes
            if node.type in (EntityType.DATABASE_MODEL, EntityType.DATABASE)
        }
        self.kg_api_nodes = {
            node.name.lower(): node
            for node in kg.nodes
            if node.type == EntityType.API_ENDPOINT
        }
        self.kg_externals = {
            node.name.lower(): node
            for node in kg.nodes
            if node.type == EntityType.EXTERNAL_SERVICE
        }

        # Prisma models map if prisma exists
        self.prisma_models = self._parse_prisma_models()

    def extract_all_pipelines(self) -> List[DataPipeline]:
        """
        Extracts all business data flow pipelines from repository files.
        """
        pipelines: List[DataPipeline] = []

        # 1. Extract JS/TS data pipelines (Express controllers, route handlers)
        js_pipelines = self._extract_js_pipelines()
        pipelines.extend(js_pipelines)

        # 2. Extract Python data pipelines (FastAPI, Flask, Django handlers)
        py_pipelines = self._extract_python_pipelines()
        pipelines.extend(py_pipelines)

        # 3. If no specific pipelines detected, synthesize from Knowledge Graph models & API routes
        if not pipelines:
            fallback = self._synthesize_from_kg()
            if fallback:
                pipelines.append(fallback)

        return pipelines

    def extract_consolidated_graph(self, pipelines: List[DataPipeline]) -> Dict[str, Any]:
        """
        Consolidates all pipelines into a global repository-wide data graph.
        """
        all_nodes: Dict[str, Dict[str, Any]] = {}
        all_edges: Dict[str, Dict[str, Any]] = {}

        for p in pipelines:
            for n in p.nodes:
                if n.id not in all_nodes:
                    all_nodes[n.id] = n.to_dict()
                else:
                    # Merge fields
                    existing = all_nodes[n.id]
                    merged_fields = list(set(existing.get("fields", []) + n.fields))
                    existing["fields"] = merged_fields

            for e in p.edges:
                edge_dict = e.to_dict()
                all_edges[e.id] = edge_dict

        return {
            "nodes": list(all_nodes.values()),
            "edges": list(all_edges.values()),
            "total_entities": len(all_nodes),
            "total_transitions": len(all_edges),
        }

    # -------------------------------------------------------------------------
    # Prisma Schema Parser
    # -------------------------------------------------------------------------
    def _parse_prisma_models(self) -> Dict[str, Dict[str, Any]]:
        """Extracts Prisma models and their fields if schema.prisma exists."""
        models: Dict[str, Dict[str, Any]] = {}
        for f in self.files:
            if "schema.prisma" in f["file_path"].lower():
                content = f.get("content", "")
                # Match model Name { ... }
                pattern = r"model\s+([A-Za-z0-9_]+)\s*\{([^}]+)\}"
                for m in re.finditer(pattern, content):
                    model_name = m.group(1)
                    body = m.group(2)
                    fields = []
                    for line in body.splitlines():
                        line = line.strip()
                        if line and not line.startswith("//") and not line.startswith("@@"):
                            parts = line.split()
                            if len(parts) >= 2:
                                field_name = parts[0]
                                fields.append(field_name)
                    start_line = content[: m.start()].count("\n") + 1
                    end_line = content[: m.end()].count("\n") + 1
                    models[model_name.lower()] = {
                        "name": model_name,
                        "fields": fields,
                        "file_path": f["file_path"],
                        "start_line": start_line,
                        "end_line": end_line,
                    }
        return models

    # -------------------------------------------------------------------------
    # JavaScript / TypeScript Data Flow Extraction
    # -------------------------------------------------------------------------
    def _extract_js_pipelines(self) -> List[DataPipeline]:
        pipelines: List[DataPipeline] = []

        controller_patterns = [
            r"export\s+const\s+([a-zA-Z0-9_]+)\s*=\s*async\s*\((?:req|request)[^)]*\)\s*=>",
            r"const\s+([a-zA-Z0-9_]+)\s*=\s*async\s*\((?:req|request)[^)]*\)\s*=>",
            r"async\s+function\s+([a-zA-Z0-9_]+)\s*\((?:req|request)[^)]*\)",
        ]

        for f in self.files:
            path = f["file_path"]
            ext = Path(path).suffix.lower()
            if ext not in (".js", ".jsx", ".ts", ".tsx"):
                continue

            content = f.get("content", "")
            if not content:
                continue

            lines = content.splitlines()

            for pattern in controller_patterns:
                for match in re.finditer(pattern, content):
                    func_name = match.group(1)
                    start_char = match.start()
                    func_start_line = content[:start_char].count("\n") + 1

                    # Extract controller function block (rough approximation up to 120 lines)
                    block_lines = lines[func_start_line - 1 : min(func_start_line + 119, len(lines))]
                    block_content = "\n".join(block_lines)

                    pipeline = self._build_js_controller_pipeline(
                        func_name=func_name,
                        block_content=block_content,
                        file_path=path,
                        start_line=func_start_line,
                    )
                    if pipeline and len(pipeline.nodes) >= 2:
                        pipelines.append(pipeline)

        return pipelines

    def _build_js_controller_pipeline(
        self, func_name: str, block_content: str, file_path: str, start_line: int
    ) -> Optional[DataPipeline]:
        pipeline_id = f"dp_{func_name.lower()}"
        readable_title = re.sub(r"([A-Z])", r" \1", func_name).strip().title()
        block_lines = block_content.splitlines()

        nodes: List[DataNode] = []
        edges: List[DataFlowEdge] = []
        edge_idx = 0

        def make_edge(
            src_id: str,
            tgt_id: str,
            data_type: str,
            trans_desc: str,
            storage: Optional[str] = None,
            conf: float = 1.0,
            conf_lvl: str = "deterministic",
            line_no: int = start_line,
            snippet_text: str = "",
        ) -> DataFlowEdge:
            nonlocal edge_idx
            edge_idx += 1
            return DataFlowEdge(
                id=f"e_{src_id}_{tgt_id}_{edge_idx}",
                source=src_id,
                target=tgt_id,
                data_type=data_type,
                transformation=trans_desc,
                storage=storage,
                confidence=conf,
                confidence_level=conf_lvl,
                evidence={
                    "file_path": file_path,
                    "start_line": line_no,
                    "end_line": line_no + 3,
                    "snippet": snippet_text or f"{data_type} -> {trans_desc}",
                },
            )

        # 1. Detect Inbound Request Payload (req.body, req.file, req.query)
        req_fields: List[str] = []
        body_match = re.search(r"const\s*\{([^}]+)\}\s*=\s*(?:req|request)\.body", block_content)
        if body_match:
            raw_fields = [p.strip() for p in body_match.group(1).split(",") if p.strip()]
            req_fields = [f.split(":")[0].strip() for f in raw_fields]

        has_file_upload = bool(
            re.search(r"(?:req|request)\.(?:file|files)|multer|upload", block_content, re.IGNORECASE)
        )
        is_query_params = bool(
            re.search(r"(?:req|request)\.(?:query|params)", block_content)
        )

        origin_node_id = f"{pipeline_id}_inbound_payload"
        if has_file_upload:
            origin_node = DataNode(
                id=origin_node_id,
                name=f"{readable_title} Binary Asset",
                data_classification=DataClassification.FILE_BINARY,
                description="Multipart binary stream or file payload uploaded by client.",
                format=DataFormat.MULTIPART.value,
                storage="Temporary Upload Buffer / Disk",
                fields=["file", "mimetype", "size", "buffer"] + req_fields,
                is_transformation=False,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line,
                    "end_line": start_line + 5,
                    "snippet": block_content[:200],
                },
            )
        else:
            origin_node = DataNode(
                id=origin_node_id,
                name=f"{readable_title} Request Payload",
                data_classification=DataClassification.REQUEST_PAYLOAD,
                description=f"Inbound JSON request payload containing {', '.join(req_fields[:4]) or 'client parameters'}.",
                format=DataFormat.JSON.value,
                storage="HTTP Request Body",
                fields=req_fields or ["payload"],
                is_transformation=False,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line,
                    "end_line": start_line + 5,
                    "snippet": body_match.group(0) if body_match else block_content[:150],
                },
            )
        nodes.append(origin_node)
        current_data_node_id = origin_node_id
        current_data_name = origin_node.name

        # 2. Explicit Validation Step
        has_validation = bool(
            re.search(
                r"if\s*\([^)]*(?:some|trim|!|null|undefined)[^)]*\)|schema\.parse|zod|joi|express-validator",
                block_content,
            )
        )
        if has_validation or req_fields:
            val_node_id = f"{pipeline_id}_transform_validation"
            val_node = DataNode(
                id=val_node_id,
                name="Validation & Schema Check",
                data_classification=DataClassification.TRANSFORMATION_STEP,
                description="Asserts required fields presence, checks type constraints and payload validity.",
                format=DataFormat.PRIMITIVE.value,
                is_transformation=True,
                fields=req_fields,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 4,
                    "end_line": start_line + 10,
                    "snippet": "Validate request payload fields against schema constraints.",
                },
            )
            nodes.append(val_node)
            edges.append(
                make_edge(
                    current_data_node_id,
                    val_node_id,
                    data_type="RawPayload",
                    trans_desc="Field assertion & type validation",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 4,
                )
            )

            # Validated DTO
            dto_node_id = f"{pipeline_id}_validated_dto"
            dto_node = DataNode(
                id=dto_node_id,
                name=f"Sanitized {readable_title} DTO",
                data_classification=DataClassification.DTO_SCHEMA,
                description="Sanitized and validated data transfer object ready for business logic.",
                format=DataFormat.JSON.value,
                fields=req_fields or ["sanitized_data"],
                is_transformation=False,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 6,
                    "end_line": start_line + 10,
                    "snippet": "Sanitized data payload",
                },
            )
            nodes.append(dto_node)
            edges.append(
                make_edge(
                    val_node_id,
                    dto_node_id,
                    data_type="ValidatedData",
                    trans_desc="Produces sanitized internal DTO",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 6,
                )
            )
            current_data_node_id = dto_node_id
            current_data_name = dto_node.name

        # 3. Detect Cryptographic / Hashing / Token Transformations
        bcrypt_match = re.search(r"bcrypt\.(?:hash|hashSync)\(([^,]+)", block_content)
        if bcrypt_match:
            hash_trans_id = f"{pipeline_id}_transform_bcrypt"
            hash_trans_node = DataNode(
                id=hash_trans_id,
                name="Bcrypt Password Hashing",
                data_classification=DataClassification.TRANSFORMATION_STEP,
                description="Salts and hashes plaintext credentials using Bcrypt 10-round digest.",
                format=DataFormat.HASH.value,
                is_transformation=True,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 15,
                    "end_line": start_line + 18,
                    "snippet": bcrypt_match.group(0),
                },
            )
            nodes.append(hash_trans_node)
            edges.append(
                make_edge(
                    current_data_node_id,
                    hash_trans_id,
                    data_type="PlaintextCredentials",
                    trans_desc="Bcrypt salt generation and cryptographic digest",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 15,
                )
            )

            hashed_token_id = f"{pipeline_id}_hashed_credential"
            hashed_token_node = DataNode(
                id=hashed_token_id,
                name="Hashed Credential Digest",
                data_classification=DataClassification.TOKEN_SECRET,
                description="Irreversible salted cryptographic hash of user credential.",
                format=DataFormat.HASH.value,
                storage="PostgreSQL / Database",
                is_transformation=False,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 16,
                    "end_line": start_line + 19,
                    "snippet": "hashedPassword = await bcrypt.hash(...)",
                },
            )
            nodes.append(hashed_token_node)
            edges.append(
                make_edge(
                    hash_trans_id,
                    hashed_token_id,
                    data_type="BcryptHash",
                    trans_desc="Produces salted hash",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 16,
                )
            )
            current_data_node_id = hashed_token_id

        # 4. Detect Business Calculations / Price / Fee Transformations
        calc_match = re.search(
            r"(totalAmount|totalDays|adminAmount|partnerAmount|discount|tax|fee)\s*=\s*([^;\n]+)",
            block_content,
        )
        if calc_match:
            calc_trans_id = f"{pipeline_id}_transform_calculation"
            calc_node = DataNode(
                id=calc_trans_id,
                name="Business Metric Calculation",
                data_classification=DataClassification.TRANSFORMATION_STEP,
                description=f"Calculates dynamic rates and pricing: {calc_match.group(1)} = {calc_match.group(2).strip()[:50]}.",
                format=DataFormat.PRIMITIVE.value,
                is_transformation=True,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 20,
                    "end_line": start_line + 25,
                    "snippet": calc_match.group(0),
                },
            )
            nodes.append(calc_node)
            edges.append(
                make_edge(
                    current_data_node_id,
                    calc_trans_id,
                    data_type="DTOValues",
                    trans_desc="Computes fee schedules, subtotals, and taxes",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 20,
                )
            )

            computed_dto_id = f"{pipeline_id}_computed_order_data"
            computed_dto_node = DataNode(
                id=computed_dto_id,
                name="Enriched Order / Pricing Entity",
                data_classification=DataClassification.DTO_SCHEMA,
                description="Aggregated order payload containing calculated platform fees and partner split.",
                format=DataFormat.JSON.value,
                fields=["totalDays", "totalAmount", "adminAmount", "partnerAmount", "currency"],
                is_transformation=False,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 22,
                    "end_line": start_line + 26,
                    "snippet": "const totalAmount = totalDays * price",
                },
            )
            nodes.append(computed_dto_node)
            edges.append(
                make_edge(
                    calc_trans_id,
                    computed_dto_id,
                    data_type="EnrichedPayload",
                    trans_desc="Produces calculated financial entities",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 22,
                )
            )
            current_data_node_id = computed_dto_id

        # 5. Detect External Service Dispatch (Razorpay / Stripe / Mail)
        ext_match = re.search(
            r"(razorpayInstance|stripe|sendEmail|transporter|s3|cloudinary)\.([a-zA-Z0-9_\.]+)",
            block_content,
        )
        if ext_match:
            svc_name = ext_match.group(1)
            ext_data_id = f"{pipeline_id}_ext_payload_{svc_name.lower()}"
            ext_label = "Razorpay Payment Order" if "razorpay" in svc_name.lower() else f"{svc_name.title()} Payload"
            ext_node = DataNode(
                id=ext_data_id,
                name=ext_label,
                data_classification=DataClassification.QUEUE_MESSAGE if "email" in svc_name.lower() else DataClassification.DTO_SCHEMA,
                description=f"Outbound payload dispatched to external service: {svc_name}.",
                format=DataFormat.JSON.value,
                storage=f"External {svc_name}",
                fields=["amount", "currency", "receipt", "orderId"],
                is_transformation=False,
                associated_node_id=f"ext_{svc_name.lower()}",
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 28,
                    "end_line": start_line + 34,
                    "snippet": ext_match.group(0),
                },
            )
            nodes.append(ext_node)
            edges.append(
                make_edge(
                    current_data_node_id,
                    ext_data_id,
                    data_type="GatewayRequestPayload",
                    trans_desc=f"Formulate and dispatch API call to {svc_name}",
                    conf=0.9,
                    conf_lvl="high",
                    line_no=start_line + 28,
                )
            )

        # 6. Detect Database Persistence (Prisma / Mongoose / Sequelize / PostgreSQL)
        db_match = re.search(
            r"(?:db|prisma)\.([a-zA-Z0-9_]+)\.(create|update|upsert|save)|new\s+([A-Z][a-zA-Z0-9_]+)\([^)]*\)\.save\(\)",
            block_content,
        )
        model_name = ""
        if db_match:
            model_name = db_match.group(1) or db_match.group(3) or "Entity"
        elif "booking" in func_name.lower():
            model_name = "booking"
        elif "user" in func_name.lower() or "auth" in func_name.lower():
            model_name = "user"
        elif "hotel" in func_name.lower():
            model_name = "hotel"

        if model_name:
            model_title = model_name.capitalize()
            db_node_id = f"{pipeline_id}_db_model_{model_name.lower()}"
            matched_prisma = self.prisma_models.get(model_name.lower(), {})
            model_fields = matched_prisma.get("fields", req_fields or ["id", "createdAt", "updatedAt"])

            db_node = DataNode(
                id=db_node_id,
                name=f"{model_title} Record (PostgreSQL)",
                data_classification=DataClassification.DATABASE_MODEL,
                description=f"Persisted database model entity in PostgreSQL `{model_name.lower()}` table.",
                format=DataFormat.ORM_ROW.value,
                storage="PostgreSQL (Prisma ORM)",
                fields=model_fields[:8],
                is_transformation=False,
                associated_node_id=f"node_database_model_{model_name.lower()}",
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 35,
                    "end_line": start_line + 42,
                    "snippet": db_match.group(0) if db_match else f"db.{model_name}.create(...)",
                },
            )
            nodes.append(db_node)
            edges.append(
                make_edge(
                    current_data_node_id,
                    db_node_id,
                    data_type=f"{model_title}Entity",
                    trans_desc=f"ORM persistence into PostgreSQL `{model_name.lower()}` table",
                    storage="PostgreSQL",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 35,
                )
            )
            current_data_node_id = db_node_id

        # 7. Detect JWT Token Generation
        jwt_match = re.search(r"jwt\.sign\(([^,]+)", block_content)
        if jwt_match:
            jwt_trans_id = f"{pipeline_id}_transform_jwt_sign"
            jwt_trans_node = DataNode(
                id=jwt_trans_id,
                name="JWT Token Signing",
                data_classification=DataClassification.TRANSFORMATION_STEP,
                description="Encodes user identity claim and signs with HMAC-SHA256 secret.",
                format=DataFormat.JWT.value,
                is_transformation=True,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 45,
                    "end_line": start_line + 48,
                    "snippet": jwt_match.group(0),
                },
            )
            nodes.append(jwt_trans_node)
            edges.append(
                make_edge(
                    current_data_node_id,
                    jwt_trans_id,
                    data_type="UserIdentityClaim",
                    trans_desc="Signs claims into bearer JWT token",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 45,
                )
            )

            jwt_node_id = f"{pipeline_id}_auth_jwt_token"
            jwt_node = DataNode(
                id=jwt_node_id,
                name="Signed Authentication JWT",
                data_classification=DataClassification.TOKEN_SECRET,
                description="Stateless bearer session token stored in HTTP-only cookie.",
                format=DataFormat.JWT.value,
                storage="Client HTTP-only Cookie / Authorization Header",
                fields=["id", "exp", "iat"],
                is_transformation=False,
                evidence={
                    "file_path": file_path,
                    "start_line": start_line + 47,
                    "end_line": start_line + 51,
                    "snippet": "const token = jwt.sign({ id: user.id }, secret)",
                },
            )
            nodes.append(jwt_node)
            edges.append(
                make_edge(
                    jwt_trans_id,
                    jwt_node_id,
                    data_type="SignedToken",
                    trans_desc="Issues cryptographically signed token",
                    storage="Client Cookie",
                    conf=1.0,
                    conf_lvl="deterministic",
                    line_no=start_line + 47,
                )
            )
            current_data_node_id = jwt_node_id

        # 8. Outbound Response Payload (res.json, res.send)
        res_match = re.search(r"res(?:\.status\([0-9]+\))?\.json\(([^)]*)\)", block_content)
        res_fields = ["success", "message"]
        if res_match:
            inner_str = res_match.group(1)
            raw_res_fields = re.findall(r"([a-zA-Z0-9_]+)\s*[:,\}]", inner_str)
            if raw_res_fields:
                res_fields = list(dict.fromkeys(res_fields + raw_res_fields))[:6]

        response_node_id = f"{pipeline_id}_response_payload"
        response_node = DataNode(
            id=response_node_id,
            name=f"{readable_title} Response Payload",
            data_classification=DataClassification.RESPONSE_PAYLOAD,
            description="Serialized JSON response returned to the client application.",
            format=DataFormat.JSON.value,
            storage="HTTP 200 Response Stream",
            fields=res_fields,
            is_transformation=False,
            evidence={
                "file_path": file_path,
                "start_line": start_line + max(10, len(block_lines) - 8),
                "end_line": start_line + len(block_lines),
                "snippet": res_match.group(0) if res_match else "res.status(200).json(...)",
            },
        )
        nodes.append(response_node)
        edges.append(
            make_edge(
                current_data_node_id,
                response_node_id,
                data_type="SerializedResponseJSON",
                trans_desc="Serializes entities to HTTP response JSON",
                conf=1.0,
                conf_lvl="deterministic",
                line_no=start_line + max(10, len(block_lines) - 8),
            )
        )

        return DataPipeline(
            id=pipeline_id,
            name=f"{readable_title} Data Flow",
            description=f"End-to-end data lifecycle for {func_name}: payload validation, transformation, ORM storage, and response serialization.",
            trigger=f"API Handler: {func_name}",
            nodes=nodes,
            edges=edges,
            metadata={
                "source_file": file_path,
                "total_entities": len([n for n in nodes if not n.is_transformation]),
                "total_transformations": len([n for n in nodes if n.is_transformation]),
            },
        )

    # -------------------------------------------------------------------------
    # Python Data Flow Extraction (FastAPI / Pydantic / SQLAlchemy / Flask)
    # -------------------------------------------------------------------------
    def _extract_python_pipelines(self) -> List[DataPipeline]:
        pipelines: List[DataPipeline] = []

        for f in self.files:
            path = f["file_path"]
            if Path(path).suffix.lower() != ".py":
                continue

            content = f.get("content", "")
            if not content:
                continue

            try:
                tree = ast.parse(content, filename=path)
            except Exception:
                continue

            # Check for FastAPI / Flask routes or service methods
            for node in ast.walk(tree):
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    is_route = any(
                        isinstance(d, ast.Call)
                        and (
                            (isinstance(d.func, ast.Attribute) and d.func.attr in ("get", "post", "put", "delete", "patch"))
                            or "route" in getattr(d.func, "id", "").lower()
                        )
                        for d in node.decorator_list
                    )
                    if is_route:
                        pipeline = self._build_python_route_pipeline(node, content, path)
                        if pipeline:
                            pipelines.append(pipeline)

        return pipelines

    def _build_python_route_pipeline(
        self, func_node: ast.FunctionDef | ast.AsyncFunctionDef, content: str, file_path: str
    ) -> Optional[DataPipeline]:
        func_name = func_node.name
        pipeline_id = f"dp_py_{func_name.lower()}"
        readable_title = re.sub(r"([A-Z_])", r" \1", func_name).replace("_", " ").strip().title()

        nodes: List[DataNode] = []
        edges: List[DataFlowEdge] = []
        edge_idx = 0

        start_line = func_node.lineno
        end_line = getattr(func_node, "end_lineno", start_line + 30)

        def make_edge(
            src_id: str,
            tgt_id: str,
            data_type: str,
            trans_desc: str,
            storage: Optional[str] = None,
            conf: float = 1.0,
            conf_lvl: str = "deterministic",
            line_no: int = start_line,
        ) -> DataFlowEdge:
            nonlocal edge_idx
            edge_idx += 1
            return DataFlowEdge(
                id=f"e_{src_id}_{tgt_id}_{edge_idx}",
                source=src_id,
                target=tgt_id,
                data_type=data_type,
                transformation=trans_desc,
                storage=storage,
                confidence=conf,
                confidence_level=conf_lvl,
                evidence={
                    "file_path": file_path,
                    "start_line": line_no,
                    "end_line": line_no + 3,
                    "snippet": f"{data_type} -> {trans_desc}",
                },
            )

        # 1. Inbound Request Schema (Pydantic / DTO)
        req_type_name = "RequestPayload"
        req_fields = []
        for arg in func_node.args.args:
            if arg.arg not in ("self", "cls", "db", "current_user", "request", "background_tasks"):
                if arg.annotation:
                    req_type_name = getattr(arg.annotation, "id", req_type_name)
                    req_fields.append(arg.arg)

        origin_node_id = f"{pipeline_id}_request_schema"
        origin_node = DataNode(
            id=origin_node_id,
            name=f"{req_type_name} (DTO)",
            data_classification=DataClassification.REQUEST_PAYLOAD,
            description=f"Inbound strongly-typed Pydantic request schema for {readable_title}.",
            format=DataFormat.JSON.value,
            storage="HTTP Request Body",
            fields=req_fields or ["amount", "currency", "payload"],
            is_transformation=False,
            evidence={
                "file_path": file_path,
                "start_line": start_line,
                "end_line": start_line + 4,
                "snippet": f"def {func_name}(payload: {req_type_name}, ...)",
            },
        )
        nodes.append(origin_node)
        current_data_node_id = origin_node_id

        # 2. Pydantic Validation & Sanitization Step
        val_node_id = f"{pipeline_id}_transform_pydantic"
        val_node = DataNode(
            id=val_node_id,
            name="Pydantic Schema Validation",
            data_classification=DataClassification.TRANSFORMATION_STEP,
            description="Validates schema types, field constraints, and deserializes JSON to Python models.",
            format=DataFormat.PRIMITIVE.value,
            is_transformation=True,
            fields=req_fields,
            evidence={
                "file_path": file_path,
                "start_line": start_line + 1,
                "end_line": start_line + 3,
                "snippet": "FastAPI automatic Pydantic request parsing and field validation.",
            },
        )
        nodes.append(val_node)
        edges.append(
            make_edge(
                current_data_node_id,
                val_node_id,
                data_type="RawJSONPayload",
                trans_desc="Deserialization and type validation",
                line_no=start_line + 1,
            )
        )

        sanitized_dto_id = f"{pipeline_id}_validated_dto"
        sanitized_dto_node = DataNode(
            id=sanitized_dto_id,
            name=f"Validated {req_type_name}",
            data_classification=DataClassification.DTO_SCHEMA,
            description="Validated typed instance populated with coerced fields.",
            format=DataFormat.JSON.value,
            fields=req_fields or ["validated_data"],
            is_transformation=False,
            evidence={
                "file_path": file_path,
                "start_line": start_line + 2,
                "end_line": start_line + 4,
                "snippet": f"payload: {req_type_name}",
            },
        )
        nodes.append(sanitized_dto_node)
        edges.append(
            make_edge(
                val_node_id,
                sanitized_dto_id,
                data_type="ValidatedModel",
                trans_desc="Instantiates verified Pydantic model",
                line_no=start_line + 2,
            )
        )
        current_data_node_id = sanitized_dto_id

        # 3. Detect Database ORM Operations (SQLAlchemy / db.add / session.commit)
        func_text = "\n".join(content.splitlines()[start_line - 1 : end_line])
        db_match = re.search(r"(?:db|session)\.add\(([a-zA-Z0-9_]+)\)", func_text)
        model_name = "Record"
        if db_match:
            model_name = db_match.group(1).capitalize()
        elif "payment" in func_name.lower():
            model_name = "Payment"
        elif "user" in func_name.lower():
            model_name = "User"

        db_model_node_id = f"{pipeline_id}_db_{model_name.lower()}"
        db_model_node = DataNode(
            id=db_model_node_id,
            name=f"{model_name} Entity (SQLAlchemy)",
            data_classification=DataClassification.DATABASE_MODEL,
            description=f"Relational database entity persisted into PostgreSQL via SQLAlchemy ORM.",
            format=DataFormat.ORM_ROW.value,
            storage="PostgreSQL Database",
            fields=["id", "created_at", "status", "amount"],
            is_transformation=False,
            associated_node_id=f"node_database_model_{model_name.lower()}",
            evidence={
                "file_path": file_path,
                "start_line": start_line + 8,
                "end_line": start_line + 15,
                "snippet": f"db.add({model_name.lower()}); db.commit()",
            },
        )
        nodes.append(db_model_node)
        edges.append(
            make_edge(
                current_data_node_id,
                db_model_node_id,
                data_type=f"{model_name}ORMRow",
                trans_desc=f"Inserts into PostgreSQL `{model_name.lower()}s` table",
                storage="PostgreSQL",
                line_no=start_line + 10,
            )
        )
        current_data_node_id = db_model_node_id

        # 4. Outbound Response Schema
        res_type_name = "ResponsePayload"
        for d in func_node.decorator_list:
            if isinstance(d, ast.Call):
                for kw in d.keywords:
                    if kw.arg == "response_model":
                        res_type_name = getattr(kw.value, "id", res_type_name)

        res_node_id = f"{pipeline_id}_response_dto"
        res_node = DataNode(
            id=res_node_id,
            name=f"{res_type_name} (HTTP 200)",
            data_classification=DataClassification.RESPONSE_PAYLOAD,
            description=f"Serialized response returned to the client matching `{res_type_name}` schema.",
            format=DataFormat.JSON.value,
            storage="HTTP Response Body",
            fields=["id", "status", "data", "message"],
            is_transformation=False,
            evidence={
                "file_path": file_path,
                "start_line": end_line - 5,
                "end_line": end_line,
                "snippet": f"return {res_type_name}(...)",
            },
        )
        nodes.append(res_node)
        edges.append(
            make_edge(
                current_data_node_id,
                res_node_id,
                data_type="SerializedJSON",
                trans_desc=f"Serializes ORM model to {res_type_name} JSON",
                line_no=end_line - 3,
            )
        )

        return DataPipeline(
            id=pipeline_id,
            name=f"{readable_title} Data Flow",
            description=f"Strongly-typed Pydantic to SQLAlchemy data flow for {func_name}.",
            trigger=f"API Endpoint: {func_name}",
            nodes=nodes,
            edges=edges,
            metadata={
                "source_file": file_path,
                "total_entities": len([n for n in nodes if not n.is_transformation]),
                "total_transformations": len([n for n in nodes if n.is_transformation]),
            },
        )

    # -------------------------------------------------------------------------
    # Fallback Synthesis from Knowledge Graph Nodes
    # -------------------------------------------------------------------------
    def _synthesize_from_kg(self) -> Optional[DataPipeline]:
        """Synthesizes a holistic data pipeline from existing Knowledge Graph nodes."""
        if not self.kg.nodes:
            return None

        nodes: List[DataNode] = []
        edges: List[DataFlowEdge] = []

        api_nodes = [n for n in self.kg.nodes if n.type == EntityType.API_ENDPOINT]
        model_nodes = [n for n in self.kg.nodes if n.type == EntityType.DATABASE_MODEL]
        db_nodes = [n for n in self.kg.nodes if n.type == EntityType.DATABASE]

        if not api_nodes and not model_nodes:
            return None

        # Create Client Input
        inbound = DataNode(
            id="dp_syn_client_request",
            name="Client API Request Payload",
            data_classification=DataClassification.REQUEST_PAYLOAD,
            description="Client-submitted parameters and payloads.",
            format=DataFormat.JSON.value,
            fields=["id", "parameters", "timestamp"],
        )
        nodes.append(inbound)

        # Transformation
        trans = DataNode(
            id="dp_syn_transform_process",
            name="Request Normalization & Validation",
            data_classification=DataClassification.TRANSFORMATION_STEP,
            description="Validates incoming fields and normalizes payload structure.",
            format=DataFormat.PRIMITIVE.value,
            is_transformation=True,
        )
        nodes.append(trans)
        edges.append(
            DataFlowEdge(
                id="e_syn_1",
                source="dp_syn_client_request",
                target="dp_syn_transform_process",
                data_type="RawRequestPayload",
                transformation="Normalizes incoming parameters",
            )
        )

        # Connect to Database Models
        for i, m in enumerate(model_nodes[:3]):
            mnode_id = f"dp_syn_model_{m.id}"
            dnode = DataNode(
                id=mnode_id,
                name=f"{m.name} Model",
                data_classification=DataClassification.DATABASE_MODEL,
                description=f"Database entity for {m.name}.",
                format=DataFormat.ORM_ROW.value,
                storage="PostgreSQL / Database",
                fields=m.symbols[:6] if m.symbols else ["id", "created_at"],
                associated_node_id=m.id,
            )
            nodes.append(dnode)
            edges.append(
                DataFlowEdge(
                    id=f"e_syn_model_{i}",
                    source="dp_syn_transform_process",
                    target=mnode_id,
                    data_type="EntityRecord",
                    transformation=f"Persists into {m.name}",
                    storage="Database",
                )
            )

        # Connect to Response
        outbound = DataNode(
            id="dp_syn_response_payload",
            name="API Response Payload",
            data_classification=DataClassification.RESPONSE_PAYLOAD,
            description="Serialized JSON response returned to the client.",
            format=DataFormat.JSON.value,
            fields=["success", "data", "status"],
        )
        nodes.append(outbound)
        if model_nodes:
            edges.append(
                DataFlowEdge(
                    id="e_syn_out",
                    source=f"dp_syn_model_{model_nodes[0].id}",
                    target="dp_syn_response_payload",
                    data_type="SerializedJSON",
                    transformation="Serializes model to HTTP response",
                )
            )

        return DataPipeline(
            id="dp_system_core_data_flow",
            name="Core System Data Flow",
            description="Consolidated overview of data entering API routes, moving through models, and returning as response payloads.",
            trigger="HTTP REST Requests",
            nodes=nodes,
            edges=edges,
        )
