import pytest
from app.parser.graph_schema import (
    KnowledgeGraph,
    ArchNode,
    ArchEdge,
    EntityType,
    ArchLayer,
    RelationshipType,
    ConfidenceLevel,
    SourceEvidence,
)
from app.services.trace_service import TraceService


@pytest.fixture
def sample_graph():
    kg = KnowledgeGraph()

    # Nodes: LoginPage -> AuthAPI -> AuthService -> UserRepository -> PostgreSQL
    login = ArchNode(
        id="cmp_login",
        name="LoginPage",
        display_name="login_page",
        type=EntityType.COMPONENT,
        layer=ArchLayer.PRESENTATION,
        source_files=["frontend/src/pages/Login.tsx"],
    )
    api = ArchNode(
        id="api_auth",
        name="AuthAPI",
        display_name="auth_api",
        type=EntityType.API_ENDPOINT,
        layer=ArchLayer.API_GATEWAY,
        source_files=["backend/app/api/auth.py"],
    )
    svc = ArchNode(
        id="svc_auth",
        name="AuthService",
        display_name="auth_service",
        type=EntityType.SERVICE,
        layer=ArchLayer.APPLICATION,
        source_files=["backend/app/services/auth_service.py"],
    )
    repo = ArchNode(
        id="mod_user_repo",
        name="UserRepository",
        display_name="user_repository",
        type=EntityType.MODULE,
        layer=ArchLayer.DOMAIN,
        source_files=["backend/app/db/repositories/user_repo.py"],
    )
    db = ArchNode(
        id="db_postgres",
        name="PostgreSQL",
        display_name="postgresql",
        type=EntityType.DATABASE,
        layer=ArchLayer.INFRASTRUCTURE,
        source_files=[],
    )

    kg.nodes.extend([login, api, svc, repo, db])

    # Edges
    e1 = ArchEdge(
        id="edge_1",
        source="cmp_login",
        target="api_auth",
        relationship_type=RelationshipType.CALLS,
        confidence=1.0,
        confidence_level=ConfidenceLevel.DETERMINISTIC,
        evidence=[SourceEvidence("frontend/src/pages/Login.tsx", 15, 20, "await api.login(creds)")],
    )
    e2 = ArchEdge(
        id="edge_2",
        source="api_auth",
        target="svc_auth",
        relationship_type=RelationshipType.CALLS,
        confidence=1.0,
        confidence_level=ConfidenceLevel.DETERMINISTIC,
        evidence=[SourceEvidence("backend/app/api/auth.py", 42, 45, "auth_service.authenticate(user)")],
    )
    e3 = ArchEdge(
        id="edge_3",
        source="svc_auth",
        target="mod_user_repo",
        relationship_type=RelationshipType.CALLS,
        confidence=1.0,
        confidence_level=ConfidenceLevel.DETERMINISTIC,
        evidence=[SourceEvidence("backend/app/services/auth_service.py", 81, 86, "user_repo.find_by_email(email)")],
    )
    e4 = ArchEdge(
        id="edge_4",
        source="mod_user_repo",
        target="db_postgres",
        relationship_type=RelationshipType.DEPENDS_ON,
        confidence=1.0,
        confidence_level=ConfidenceLevel.DETERMINISTIC,
        evidence=[SourceEvidence("backend/app/db/repositories/user_repo.py", 22, 28, "db.query(User).all()")],
    )

    kg.edges.extend([e1, e2, e3, e4])

    files = [
        {"file_path": "frontend/src/pages/Login.tsx", "content": "export const LoginPage = () => {};", "language": "typescript"},
        {"file_path": "backend/app/api/auth.py", "content": "@router.post('/login')\ndef login(): pass", "language": "python"},
        {"file_path": "backend/app/services/auth_service.py", "content": "class AuthService:\n    def authenticate(): pass", "language": "python"},
        {"file_path": "backend/app/db/repositories/user_repo.py", "content": "class UserRepository:\n    def find(): pass", "language": "python"},
    ]

    return kg, files


def test_trace_node_upstream_downstream(sample_graph):
    kg, files = sample_graph
    service = TraceService(kg, files)

    # Feature 1: Trace AuthService
    res = service.trace_node("svc_auth")
    assert res["current"]["name"] == "AuthService"
    assert len(res["upstream"]) == 1
    assert res["upstream"][0]["node"]["name"] == "AuthAPI"
    assert len(res["downstream"]) == 1
    assert res["downstream"][0]["node"]["name"] == "UserRepository"


def test_find_path_between_two_nodes(sample_graph):
    kg, files = sample_graph
    service = TraceService(kg, files)

    # Feature 2: Path from LoginPage to PostgreSQL
    path_res = service.find_path("cmp_login", "db_postgres")
    assert path_res["found"] is True
    assert path_res["hop_count"] == 4
    names = [n["name"] for n in path_res["path_nodes"]]
    assert names == ["LoginPage", "AuthAPI", "AuthService", "UserRepository", "PostgreSQL"]
    assert len(path_res["path_edges"]) == 4


def test_why_edge_relationship(sample_graph):
    kg, files = sample_graph
    service = TraceService(kg, files)

    # Feature 4: Why does edge_3 exist? (AuthService CALLS UserRepository)
    why = service.why_relationship(edge_id="edge_3")
    assert why["source"]["name"] == "AuthService"
    assert why["target"]["name"] == "UserRepository"
    assert why["relationship_type"] == "CALLS"
    assert len(why["evidence"]) == 1
    assert why["evidence"][0]["file_path"] == "backend/app/services/auth_service.py"
    assert why["evidence"][0]["start_line"] == 81


@pytest.mark.asyncio
async def test_explain_component_deterministic_grounding(sample_graph):
    kg, files = sample_graph
    service = TraceService(kg, files)

    # Feature 5: Explain without external LLM (deterministic grounded brief)
    exp = await service.explain_component("svc_auth")
    assert exp["component_name"] == "AuthService"
    assert "AuthAPI" in exp["explanation"] or "AuthAPI" in exp["deterministic_brief"]
    assert "UserRepository" in exp["explanation"] or "UserRepository" in exp["deterministic_brief"]
    assert exp["confidence"] in ("deterministic", "high")


def test_calculate_impact_dependents(sample_graph):
    kg, files = sample_graph
    service = TraceService(kg, files)

    # Feature 6: Show what depends on PostgreSQL (everything upstream)
    impact = service.calculate_impact("db_postgres")
    assert impact["total_dependents_count"] == 4
    assert len(impact["direct_dependents"]) == 1
    assert impact["direct_dependents"][0]["name"] == "UserRepository"
    assert len(impact["indirect_dependents"]) == 3
    assert impact["dependency_depth"] == 4


def test_change_impact_propagation(sample_graph):
    kg, files = sample_graph
    service = TraceService(kg, files)

    # Feature 7: Change user_repo.py
    change = service.change_impact(file_path="backend/app/db/repositories/user_repo.py")
    assert "backend/app/services/auth_service.py" in change["affected_files"]
    assert "backend/app/api/auth.py" in change["affected_files"]
    assert "AuthAPI" in change["affected_apis"]
    assert "AuthService" in change["affected_services"]
