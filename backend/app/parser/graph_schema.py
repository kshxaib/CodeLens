from __future__ import annotations

from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any

class EntityType(str, Enum):
    APPLICATION = "application"
    SERVICE = "service"
    MODULE = "module"
    COMPONENT = "component"
    API_ENDPOINT = "api_endpoint"
    DATABASE = "database"
    DATABASE_MODEL = "database_model"
    EXTERNAL_SERVICE = "external_service"
    QUEUE = "queue"
    WORKER = "worker"
    STORAGE = "storage"
    FUNCTION = "function"
    CLASS_DEF = "class"
    LIFECYCLE_ENTITY = "lifecycle_entity"

class ArchLayer(str, Enum):
    PRESENTATION = "presentation"
    API_GATEWAY = "api_gateway"
    APPLICATION = "application"
    DOMAIN = "domain"
    INFRASTRUCTURE = "infrastructure"
    UNKNOWN = "unknown"

class RelationshipType(str, Enum):
    IMPORTS = "IMPORTS"
    CALLS = "CALLS"
    DEPENDS_ON = "DEPENDS_ON"
    EXPOSES = "EXPOSES"
    CONSUMES = "CONSUMES"
    READS = "READS"
    WRITES = "WRITES"
    PERSISTS = "PERSISTS"
    AUTHENTICATES = "AUTHENTICATES"
    EMITS = "EMITS"
    LISTENS = "LISTENS"
    TRIGGERS = "TRIGGERS"
    TRANSFORMS = "TRANSFORMS"
    CONTAINS = "CONTAINS"
    IMPLEMENTS = "IMPLEMENTS"

class ConfidenceLevel(str, Enum):
    DETERMINISTIC = "deterministic"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class EvidenceType(str, Enum):
    AST = "ast"
    IMPORT = "import"
    FUNCTION_CALL = "function_call"
    ROUTE = "route"
    DB_ACCESS = "db_access"
    CONFIGURATION = "configuration"
    INFERRED = "inferred"
    LLM_INFERRED = "llm_inferred"

CONFIDENCE_VALUES: Dict[ConfidenceLevel, float] = {
    ConfidenceLevel.DETERMINISTIC: 1.0,
    ConfidenceLevel.HIGH: 0.85,
    ConfidenceLevel.MEDIUM: 0.55,
    ConfidenceLevel.LOW: 0.30,
}

EVIDENCE_TYPE_MIN_CONFIDENCE: Dict[str, float] = {
    EvidenceType.AST: 1.0,
    EvidenceType.IMPORT: 1.0,
    EvidenceType.FUNCTION_CALL: 0.85,
    EvidenceType.ROUTE: 0.90,
    EvidenceType.DB_ACCESS: 0.85,
    EvidenceType.CONFIGURATION: 0.75,
    EvidenceType.INFERRED: 0.55,
    EvidenceType.LLM_INFERRED: 0.55,
}

ENTITY_DEFAULT_LAYER: Dict[EntityType, ArchLayer] = {
    EntityType.APPLICATION: ArchLayer.APPLICATION,
    EntityType.SERVICE: ArchLayer.APPLICATION,
    EntityType.MODULE: ArchLayer.DOMAIN,
    EntityType.COMPONENT: ArchLayer.PRESENTATION,
    EntityType.API_ENDPOINT: ArchLayer.API_GATEWAY,
    EntityType.DATABASE: ArchLayer.INFRASTRUCTURE,
    EntityType.DATABASE_MODEL: ArchLayer.DOMAIN,
    EntityType.EXTERNAL_SERVICE: ArchLayer.INFRASTRUCTURE,
    EntityType.QUEUE: ArchLayer.INFRASTRUCTURE,
    EntityType.WORKER: ArchLayer.APPLICATION,
    EntityType.STORAGE: ArchLayer.INFRASTRUCTURE,
    EntityType.FUNCTION: ArchLayer.DOMAIN,
    EntityType.CLASS_DEF: ArchLayer.DOMAIN,
    EntityType.LIFECYCLE_ENTITY: ArchLayer.DOMAIN,
}

@dataclass
class SourceEvidence:
    file_path: str
    start_line: int
    end_line: int
    snippet: Optional[str] = None
    evidence_type: EvidenceType = EvidenceType.AST
    symbol: Optional[str] = None

    @property
    def is_inferred(self) -> bool:
        return self.evidence_type in (EvidenceType.INFERRED, EvidenceType.LLM_INFERRED)

    @property
    def has_location(self) -> bool:
        return bool(self.file_path and self.start_line > 0)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["evidence_type"] = self.evidence_type.value
        d["is_inferred"] = self.is_inferred
        d["has_location"] = self.has_location
        return d

@dataclass
class ArchNode:
    id: str
    type: EntityType
    name: str
    display_name: str
    layer: ArchLayer
    description: str = ""
    source_files: List[str] = field(default_factory=list)
    symbols: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0
    confidence_level: ConfidenceLevel = ConfidenceLevel.DETERMINISTIC
    evidence: List[SourceEvidence] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["type"] = self.type.value
        d["layer"] = self.layer.value
        d["confidence_level"] = self.confidence_level.value
        d["evidence"] = [e.to_dict() for e in self.evidence]
        return d

@dataclass
class ArchEdge:
    id: str
    source: str
    target: str
    relationship_type: RelationshipType
    direction: str = "directed"
    confidence: float = 1.0
    confidence_level: ConfidenceLevel = ConfidenceLevel.DETERMINISTIC
    evidence: List[SourceEvidence] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["relationship_type"] = self.relationship_type.value
        d["confidence_level"] = self.confidence_level.value
        d["evidence"] = [e.to_dict() for e in self.evidence]
        d["is_inferred"] = self.is_inferred
        d["has_evidence"] = self.has_evidence
        return d

    @property
    def is_inferred(self) -> bool:
        if not self.evidence:
            return True
        return all(e.is_inferred for e in self.evidence)

    @property
    def has_evidence(self) -> bool:
        return any(e.has_location for e in self.evidence)

@dataclass
class KnowledgeGraph:
    nodes: List[ArchNode] = field(default_factory=list)
    edges: List[ArchEdge] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "metadata": self.metadata,
        }

    def get_node(self, node_id: str) -> Optional[ArchNode]:
        for n in self.nodes:
            if n.id == node_id:
                return n
        return None

    def get_edges_from(self, node_id: str) -> List[ArchEdge]:
        return [e for e in self.edges if e.source == node_id]

    def get_edges_to(self, node_id: str) -> List[ArchEdge]:
        return [e for e in self.edges if e.target == node_id]

    def get_edges_by_type(self, rel_type: RelationshipType) -> List[ArchEdge]:
        return [e for e in self.edges if e.relationship_type == rel_type]

    def get_nodes_by_type(self, entity_type: EntityType) -> List[ArchNode]:
        return [n for n in self.nodes if n.type == entity_type]

    def get_nodes_by_layer(self, layer: ArchLayer) -> List[ArchNode]:
        return [n for n in self.nodes if n.layer == layer]

    def summary(self) -> Dict[str, Any]:
        from collections import Counter
        node_types = Counter(n.type.value for n in self.nodes)
        edge_types = Counter(e.relationship_type.value for e in self.edges)
        layers = Counter(n.layer.value for n in self.nodes)
        avg_confidence = (
            sum(e.confidence for e in self.edges) / len(self.edges)
            if self.edges else 0.0
        )
        return {
            "total_nodes": len(self.nodes),
            "total_edges": len(self.edges),
            "node_types": dict(node_types),
            "edge_types": dict(edge_types),
            "layers": dict(layers),
            "avg_edge_confidence": round(avg_confidence, 3),
            "deterministic_edges": sum(
                1 for e in self.edges
                if e.confidence_level == ConfidenceLevel.DETERMINISTIC
            ),
            "inferred_edges": sum(
                1 for e in self.edges
                if e.confidence_level != ConfidenceLevel.DETERMINISTIC
            ),
        }
