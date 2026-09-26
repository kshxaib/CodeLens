"""
Tests for the Evidence Service and Source Evidence Verification Layer.

Ensures that:
1. Claims WITH direct code evidence are marked VERIFIED.
2. Claims WITHOUT direct code evidence are EXPLICITLY marked INFERRED — never faked as certain.
3. Edges with no evidence in the graph return a well-formed INFERRED response.
4. EvidenceType is correctly serialized in all responses.
5. Verify endpoint returns VERIFIED / INFERRED / NOT_FOUND correctly.
6. Repository evidence stats reflect correct counts.
"""
import pytest
from app.parser.graph_schema import (
    KnowledgeGraph,
    ArchNode,
    ArchEdge,
    EntityType,
    ArchLayer,
    RelationshipType,
    ConfidenceLevel,
    EvidenceType,
    SourceEvidence,
)
from app.services.evidence_service import EvidenceService


# ---------------------------------------------------------------------------
# Test Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def verified_graph():
    """Graph with fully verified (direct AST) evidence on all edges."""
    kg = KnowledgeGraph()

    chat_svc = ArchNode(
        id="svc_chat",
        name="ChatService",
        display_name="chat_service",
        type=EntityType.SERVICE,
        layer=ArchLayer.APPLICATION,
        source_files=["backend/services/chat.py"],
        evidence=[
            SourceEvidence(
                file_path="backend/services/chat.py",
                start_line=1,
                end_line=10,
                snippet="class ChatService:",
                evidence_type=EvidenceType.AST,
                symbol="ChatService",
            )
        ],
    )
    qdrant_repo = ArchNode(
        id="mod_qdrant_repo",
        name="QdrantRepository",
        display_name="qdrant_repository",
        type=EntityType.DATABASE,
        layer=ArchLayer.INFRASTRUCTURE,
        source_files=["backend/db/qdrant.py"],
    )
    kg.nodes.extend([chat_svc, qdrant_repo])

    edge = ArchEdge(
        id="edge_chat_qdrant",
        source="svc_chat",
        target="mod_qdrant_repo",
        relationship_type=RelationshipType.CALLS,
        confidence=1.0,
        confidence_level=ConfidenceLevel.DETERMINISTIC,
        evidence=[
            SourceEvidence(
                file_path="backend/services/chat.py",
                start_line=82,
                end_line=89,
                snippet="retriever.search_chunks(...)",
                evidence_type=EvidenceType.FUNCTION_CALL,
                symbol="search_chunks",
            )
        ],
    )
    kg.edges.append(edge)
    return kg


@pytest.fixture
def inferred_graph():
    """Graph where edges have INFERRED evidence type (no direct code line)."""
    kg = KnowledgeGraph()

    svc_a = ArchNode(
        id="svc_a", name="ServiceA", display_name="service_a",
        type=EntityType.SERVICE, layer=ArchLayer.APPLICATION,
        source_files=["app/service_a.py"],
    )
    svc_b = ArchNode(
        id="svc_b", name="ServiceB", display_name="service_b",
        type=EntityType.SERVICE, layer=ArchLayer.APPLICATION,
        source_files=["app/service_b.py"],
    )
    kg.nodes.extend([svc_a, svc_b])

    inferred_edge = ArchEdge(
        id="edge_inferred",
        source="svc_a",
        target="svc_b",
        relationship_type=RelationshipType.DEPENDS_ON,
        confidence=0.55,
        confidence_level=ConfidenceLevel.MEDIUM,
        evidence=[
            SourceEvidence(
                file_path="",
                start_line=0,
                end_line=0,
                snippet=None,
                evidence_type=EvidenceType.INFERRED,
                symbol=None,
            )
        ],
    )
    kg.edges.append(inferred_edge)
    return kg


@pytest.fixture
def no_evidence_graph():
    """Graph with edges that have ZERO evidence items attached."""
    kg = KnowledgeGraph()

    node_x = ArchNode(
        id="node_x", name="NodeX", display_name="node_x",
        type=EntityType.MODULE, layer=ArchLayer.DOMAIN,
        source_files=["app/x.py"],
    )
    node_y = ArchNode(
        id="node_y", name="NodeY", display_name="node_y",
        type=EntityType.MODULE, layer=ArchLayer.DOMAIN,
        source_files=["app/y.py"],
    )
    kg.nodes.extend([node_x, node_y])

    # Edge with zero evidence items
    bare_edge = ArchEdge(
        id="edge_bare",
        source="node_x",
        target="node_y",
        relationship_type=RelationshipType.IMPORTS,
        confidence=0.8,
        confidence_level=ConfidenceLevel.HIGH,
        evidence=[],   # <-- NO evidence
    )
    kg.edges.append(bare_edge)
    return kg


def make_service(kg: KnowledgeGraph) -> EvidenceService:
    return EvidenceService(kg, files=[])


# ---------------------------------------------------------------------------
# Test: SourceEvidence properties
# ---------------------------------------------------------------------------

class TestSourceEvidenceProperties:
    def test_ast_evidence_is_not_inferred(self):
        ev = SourceEvidence("app/auth.py", 10, 20, "class AuthService:", EvidenceType.AST)
        assert not ev.is_inferred
        assert ev.has_location

    def test_inferred_evidence_is_inferred(self):
        ev = SourceEvidence("", 0, 0, None, EvidenceType.INFERRED)
        assert ev.is_inferred
        assert not ev.has_location

    def test_llm_inferred_is_inferred(self):
        ev = SourceEvidence("", 0, 0, None, EvidenceType.LLM_INFERRED)
        assert ev.is_inferred

    def test_function_call_evidence(self):
        ev = SourceEvidence("app/chat.py", 82, 89, "retriever.search_chunks()", EvidenceType.FUNCTION_CALL, "search_chunks")
        assert not ev.is_inferred
        assert ev.has_location
        assert ev.symbol == "search_chunks"

    def test_to_dict_includes_evidence_type(self):
        ev = SourceEvidence("app/x.py", 1, 5, "x = 1", EvidenceType.IMPORT)
        d = ev.to_dict()
        assert d["evidence_type"] == "import"
        assert d["is_inferred"] is False
        assert d["has_location"] is True


# ---------------------------------------------------------------------------
# Test: ArchEdge properties
# ---------------------------------------------------------------------------

class TestArchEdgeProperties:
    def test_edge_with_ast_evidence_not_inferred(self, verified_graph):
        edge = verified_graph.edges[0]
        assert not edge.is_inferred
        assert edge.has_evidence

    def test_edge_with_inferred_evidence_is_inferred(self, inferred_graph):
        edge = inferred_graph.edges[0]
        assert edge.is_inferred
        assert not edge.has_evidence  # has_location=False for INFERRED ev with empty file_path

    def test_edge_with_no_evidence_is_inferred(self, no_evidence_graph):
        edge = no_evidence_graph.edges[0]
        assert edge.is_inferred       # No evidence → treated as inferred
        assert not edge.has_evidence

    def test_edge_to_dict_includes_is_inferred(self, verified_graph):
        d = verified_graph.edges[0].to_dict()
        assert "is_inferred" in d
        assert "has_evidence" in d
        assert d["is_inferred"] is False
        assert d["has_evidence"] is True


# ---------------------------------------------------------------------------
# Test: EvidenceService.get_edge_evidence
# ---------------------------------------------------------------------------

class TestGetEdgeEvidence:
    def test_verified_edge_returns_verified_status(self, verified_graph):
        svc = make_service(verified_graph)
        result = svc.get_edge_evidence(source_id="svc_chat", target_id="mod_qdrant_repo")
        assert result["verification"]["status"] == "VERIFIED"
        assert result["is_inferred"] is False
        assert result["has_evidence"] is True
        assert len(result["evidence"]) == 1
        assert result["evidence"][0]["evidence_type"] == "function_call"

    def test_inferred_edge_returns_inferred_status(self, inferred_graph):
        svc = make_service(inferred_graph)
        result = svc.get_edge_evidence(source_id="svc_a", target_id="svc_b")
        assert result["verification"]["status"] == "INFERRED"
        assert result["is_inferred"] is True
        assert result["verification"]["warning"] is not None
        assert "heuristic" in result["verification"]["warning"].lower()

    def test_missing_edge_returns_inferred_not_found(self, verified_graph):
        svc = make_service(verified_graph)
        result = svc.get_edge_evidence(source_id="nonexistent_a", target_id="nonexistent_b")
        # Must not pretend certainty — explicit inferred response
        assert result["is_inferred"] is True
        assert result["confidence"] == 0.5
        assert result["relationship_type"] == "INFERRED"
        assert result["has_evidence"] is False

    def test_no_evidence_edge_marked_inferred(self, no_evidence_graph):
        svc = make_service(no_evidence_graph)
        result = svc.get_edge_evidence(source_id="node_x", target_id="node_y")
        assert result["is_inferred"] is True
        assert result["verification"]["warning"] is not None

    def test_evidence_type_metadata_populated(self, verified_graph):
        svc = make_service(verified_graph)
        result = svc.get_edge_evidence(source_id="svc_chat", target_id="mod_qdrant_repo")
        meta = result["evidence_type_metadata"]
        assert len(meta) >= 1
        types = [m["type"] for m in meta]
        assert "function_call" in types

    def test_reason_includes_inferred_warning_for_inferred_edge(self, inferred_graph):
        svc = make_service(inferred_graph)
        result = svc.get_edge_evidence(source_id="svc_a", target_id="svc_b")
        assert "inferred" in result["reason"].lower()


# ---------------------------------------------------------------------------
# Test: EvidenceService.get_node_evidence
# ---------------------------------------------------------------------------

class TestGetNodeEvidence:
    def test_node_with_ast_evidence_is_verified(self, verified_graph):
        svc = make_service(verified_graph)
        result = svc.get_node_evidence("svc_chat")
        assert result["verification"]["status"] == "VERIFIED"
        assert result["is_inferred"] is False

    def test_node_without_evidence_is_inferred(self, verified_graph):
        svc = make_service(verified_graph)
        # QdrantRepository node has no evidence in fixture
        result = svc.get_node_evidence("mod_qdrant_repo")
        assert result["is_inferred"] is True
        assert result["verification"]["warning"] is not None

    def test_nonexistent_node_returns_not_found(self, verified_graph):
        svc = make_service(verified_graph)
        result = svc.get_node_evidence("does_not_exist")
        assert result["verification"]["status"] == "NOT_FOUND"
        assert result["is_inferred"] is True


# ---------------------------------------------------------------------------
# Test: EvidenceService.verify_claim
# ---------------------------------------------------------------------------

class TestVerifyClaim:
    def test_verified_claim_returns_verified(self, verified_graph):
        svc = make_service(verified_graph)
        result = svc.verify_claim("svc_chat", "mod_qdrant_repo", "CALLS")
        assert result["status"] == "VERIFIED"
        assert result["type_match"] is True
        assert result["is_inferred"] is False

    def test_wrong_relationship_type_returns_partial(self, verified_graph):
        svc = make_service(verified_graph)
        result = svc.verify_claim("svc_chat", "mod_qdrant_repo", "IMPORTS")
        assert result["status"] == "PARTIAL"
        assert result["type_match"] is False

    def test_inferred_edge_claim_returns_inferred(self, inferred_graph):
        svc = make_service(inferred_graph)
        result = svc.verify_claim("svc_a", "svc_b", "DEPENDS_ON")
        assert result["status"] == "INFERRED"
        assert result["is_inferred"] is True

    def test_nonexistent_edge_claim_returns_not_found(self, verified_graph):
        svc = make_service(verified_graph)
        result = svc.verify_claim("unknown_x", "unknown_y", "CALLS")
        assert result["status"] == "NOT_FOUND"
        assert result["confidence"] == 0.0


# ---------------------------------------------------------------------------
# Test: EvidenceService.get_repository_evidence_stats
# ---------------------------------------------------------------------------

class TestRepositoryEvidenceStats:
    def test_stats_count_verified_vs_inferred(self, verified_graph):
        svc = make_service(verified_graph)
        stats = svc.get_repository_evidence_stats()
        assert stats["total_edges"] == 1
        assert stats["edges_with_direct_evidence"] == 1
        assert stats["edges_inferred"] == 0
        assert stats["evidence_coverage_pct"] == 100.0

    def test_stats_for_no_evidence_graph(self, no_evidence_graph):
        svc = make_service(no_evidence_graph)
        stats = svc.get_repository_evidence_stats()
        assert stats["edges_no_evidence"] == 1
        assert stats["edges_with_direct_evidence"] == 0
        assert stats["evidence_coverage_pct"] == 0.0

    def test_stats_include_evidence_type_breakdown(self, verified_graph):
        svc = make_service(verified_graph)
        stats = svc.get_repository_evidence_stats()
        assert "evidence_type_breakdown" in stats
        assert "function_call" in stats["evidence_type_breakdown"]
