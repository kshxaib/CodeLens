"""
Canonical Architecture Knowledge Graph schema for CodeLens.

Defines the node types, edge relationship types, architectural layers,
confidence levels, and evidence structures that form the unified
representation of a repository's architecture.

Design principles:
- Nodes represent SEMANTIC entities, not files
- Every edge must carry source evidence (file + line range)
- Confidence distinguishes deterministic facts from inferred relationships
- Serializable to JSON for persistence and API response
"""
from __future__ import annotations

from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import List, Optional, Dict, Any


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class EntityType(str, Enum):
    """
    Semantic type of an architecture node.

    Nodes represent meaningful architectural entities — not just files.
    One file may produce multiple nodes (e.g., a file with 3 service classes),
    and some nodes have no corresponding file (e.g., PostgreSQL, Stripe).
    """
    APPLICATION = "application"           # Top-level app entry point (main.py, App.tsx)
    SERVICE = "service"                   # Business logic service (PaymentService)
    MODULE = "module"                     # Generic utility/helper module
    COMPONENT = "component"               # UI component (React, Vue, Svelte)
    API_ENDPOINT = "api_endpoint"         # HTTP route handler / controller
    DATABASE = "database"                 # Database instance (PostgreSQL, Redis, MongoDB)
    DATABASE_MODEL = "database_model"     # ORM model / DB table / schema
    EXTERNAL_SERVICE = "external_service" # Third-party API (Stripe, SendGrid, AWS)
    QUEUE = "queue"                       # Message queue / event bus (Celery, RabbitMQ)
    WORKER = "worker"                     # Background worker / async task
    STORAGE = "storage"                   # File/blob storage (S3, GCS, Cloudinary)
    FUNCTION = "function"                 # Standalone function or utility
    CLASS_DEF = "class"                   # Generic class definition
    LIFECYCLE_ENTITY = "lifecycle_entity" # Event-driven entity with distinct lifecycle


class ArchLayer(str, Enum):
    """
    Horizontal architectural layer of a node.

    Layers represent the conceptual tier in a layered architecture.
    Used for visual grouping and dependency direction enforcement.
    """
    PRESENTATION = "presentation"       # UI pages, components, screens
    API_GATEWAY = "api_gateway"         # HTTP routes, controllers, entrypoints
    APPLICATION = "application"         # Application services, use-cases, handlers
    DOMAIN = "domain"                   # Business logic, domain models, value objects
    INFRASTRUCTURE = "infrastructure"   # DB, queues, external APIs, file storage
    UNKNOWN = "unknown"                 # Could not be determined


class RelationshipType(str, Enum):
    """
    Semantic type of a directed edge in the Knowledge Graph.

    Each type carries a distinct architectural meaning and implies
    a directional dependency.
    """
    IMPORTS = "IMPORTS"             # Module-level static import dependency
    CALLS = "CALLS"                 # Runtime function or method invocation
    DEPENDS_ON = "DEPENDS_ON"       # General dependency (injected, configured)
    EXPOSES = "EXPOSES"             # Service or module exposes an API or interface
    CONSUMES = "CONSUMES"           # Consumes a queue message, event, or external API
    READS = "READS"                 # Reads from a data store or model
    WRITES = "WRITES"               # Writes to a data store or model
    PERSISTS = "PERSISTS"           # Service persists data through a model/repository
    AUTHENTICATES = "AUTHENTICATES" # Authenticates via an identity/auth service
    EMITS = "EMITS"                 # Emits an event or message to a queue/bus
    LISTENS = "LISTENS"             # Listens for events from a queue or event bus
    TRIGGERS = "TRIGGERS"           # Triggers a workflow, worker, or side effect
    TRANSFORMS = "TRANSFORMS"       # Data transformation pipeline step
    CONTAINS = "CONTAINS"           # Module or class contains a child entity
    IMPLEMENTS = "IMPLEMENTS"       # Class implements an interface or abstract base


class ConfidenceLevel(str, Enum):
    """
    Qualitative confidence in a classification or inferred relationship.

    Used to distinguish provably true facts from heuristic inferences.
    """
    DETERMINISTIC = "deterministic"  # Proved by AST (e.g. direct import statement)
    HIGH = "high"                    # Strong signal (decorator, base class, naming)
    MEDIUM = "medium"                # Naming conventions, path patterns
    LOW = "low"                      # Heuristic or weak signal


# Numeric confidence value for each level
CONFIDENCE_VALUES: Dict[ConfidenceLevel, float] = {
    ConfidenceLevel.DETERMINISTIC: 1.0,
    ConfidenceLevel.HIGH: 0.85,
    ConfidenceLevel.MEDIUM: 0.55,
    ConfidenceLevel.LOW: 0.30,
}

# Default layer assignment for each entity type
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


# ---------------------------------------------------------------------------
# Evidence and Node/Edge dataclasses
# ---------------------------------------------------------------------------

@dataclass
class SourceEvidence:
    """
    Traceable source-code evidence for a relationship or classification.

    Every inferred relationship must link back to a specific file and
    line range where the inference was made. Optionally includes a
    short code snippet for human inspection.
    """
    file_path: str
    start_line: int
    end_line: int
    snippet: Optional[str] = None  # Short code excerpt (max ~200 chars)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class ArchNode:
    """
    A node in the Architecture Knowledge Graph.

    Represents a semantically meaningful architectural entity.
    - id: stable, unique, slug-based identifier
    - type: semantic entity type (SERVICE, DATABASE_MODEL, etc.)
    - layer: horizontal architectural tier
    - confidence: how certain we are of the classification
    - evidence: list of source-code locations that support the classification
    - source_files: which files this entity originates from
    - symbols: key AST symbols within this entity
    - metadata: entity-specific extra fields (routes, db_type, etc.)
    """
    id: str
    type: EntityType
    name: str                                   # Canonical name (e.g. "PaymentService")
    display_name: str                            # Visualization label (e.g. "payment_service")
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
    """
    A directed, typed edge in the Architecture Knowledge Graph.

    Every edge must carry at least one SourceEvidence linking to the
    exact file and line range where the relationship was detected.

    - relationship_type: semantic meaning of the connection
    - confidence: how certain we are this relationship exists
    - confidence_level: qualitative band
    - evidence: source locations that prove or suggest this edge
    """
    id: str
    source: str                  # Source ArchNode.id
    target: str                  # Target ArchNode.id
    relationship_type: RelationshipType
    direction: str = "directed"  # "directed" | "bidirectional"
    confidence: float = 1.0
    confidence_level: ConfidenceLevel = ConfidenceLevel.DETERMINISTIC
    evidence: List[SourceEvidence] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["relationship_type"] = self.relationship_type.value
        d["confidence_level"] = self.confidence_level.value
        d["evidence"] = [e.to_dict() for e in self.evidence]
        return d


@dataclass
class KnowledgeGraph:
    """
    The unified Architecture Knowledge Graph for a repository.

    Contains all architectural nodes and typed edges with full source evidence.
    Designed to be the single source of truth for all architecture views
    (Architecture, Workflow, Sequence, Data Flow, Lifecycle).
    """
    nodes: List[ArchNode] = field(default_factory=list)
    edges: List[ArchEdge] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    # ------------------------------------------------------------------
    # Serialization
    # ------------------------------------------------------------------

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
            "metadata": self.metadata,
        }

    # ------------------------------------------------------------------
    # Query helpers
    # ------------------------------------------------------------------

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

    # ------------------------------------------------------------------
    # Summary / stats
    # ------------------------------------------------------------------

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
