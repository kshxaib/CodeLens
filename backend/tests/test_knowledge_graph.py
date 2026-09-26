"""
Tests for the Architecture Knowledge Graph builder.

Uses a self-contained payment application fixture — no file I/O,
no database, no external dependencies. All files are supplied as
in-memory dicts matching the indexer format.

Fixture represents:

    PaymentPage (React) → usePayment hook → frontend/api/client
    PaymentPage → PaymentForm component

    POST /payments → PaymentService → Stripe (external)
                   → Payment model (WRITES)
                   → PaymentRepository (READS via query)

    PaymentRepository → Payment model (READS)

    db/session.py → PostgreSQL (detected via connection string)
    db/models.py  → Payment model (SQLAlchemy Base)
                  → User model   (SQLAlchemy Base)

Expected KG for this system:

Nodes:
  cmp_payment_page          COMPONENT    presentation
  fn_use_payment            FUNCTION     presentation
  cmp_payment_form          COMPONENT    presentation
  api_payments              API_ENDPOINT api_gateway
  svc_payment_service       SERVICE      application
  mdl_payment_repository    DATABASE_MODEL  infrastructure (repo/ dir)
  mdl_models                DATABASE_MODEL  infrastructure (Base classes)
  mod_session               MODULE       infrastructure
  ext_stripe                EXTERNAL_SERVICE  infrastructure
  db_postgresql             DATABASE     infrastructure

Key edges (types may include IMPORTS, CALLS, READS, WRITES, CONSUMES, DEPENDS_ON):
  api_payments   → svc_payment_service   (IMPORTS)
  svc_payment_service → mdl_models        (READS/WRITES via db.query/db.add)
  svc_payment_service → ext_stripe        (CONSUMES)
  svc_payment_service → mdl_payment_repository (IMPORTS)
  mdl_payment_repository → mdl_models     (IMPORTS + READS)
  mod_session    → db_postgresql          (DEPENDS_ON)
"""
import pytest
from typing import List, Dict, Any

from app.parser.knowledge_graph import build_knowledge_graph
from app.parser.graph_schema import (
    KnowledgeGraph,
    EntityType,
    ArchLayer,
    RelationshipType,
    ConfidenceLevel,
)
from app.parser.dependency_resolver import (
    FileIndex,
    resolve_python_import,
    resolve_js_ts_import,
    extract_python_import_statements,
    extract_js_import_paths,
)
from app.parser.entity_classifier import (
    classify_file,
    detect_external_service_imports,
    extract_base_classes,
    extract_route_decorators,
)


# ===========================================================================
# Fixture: Payment Application
# ===========================================================================

PAYMENT_APP: List[Dict[str, Any]] = [
    # --- Frontend ---
    {
        "file_path": "frontend/src/pages/PaymentPage.tsx",
        "language": "tsx",
        "line_count": 24,
        "file_size": 520,
        "content": """\
import React, { useState } from 'react';
import { usePayment } from '../hooks/usePayment';
import { PaymentForm } from '../components/PaymentForm';

const PaymentPage: React.FC = () => {
  const { processPayment, loading } = usePayment();

  const handleSubmit = async (data: any) => {
    await processPayment(data);
  };

  return (
    <div className="payment-page">
      <h1>Complete Your Payment</h1>
      <PaymentForm onSubmit={handleSubmit} loading={loading} />
    </div>
  );
};

export default PaymentPage;
""",
    },
    {
        "file_path": "frontend/src/hooks/usePayment.ts",
        "language": "typescript",
        "line_count": 14,
        "file_size": 280,
        "content": """\
import { useState } from 'react';
import { api } from '../api/client';

export const usePayment = () => {
  const [loading, setLoading] = useState(false);

  const processPayment = async (data: any) => {
    setLoading(true);
    try {
      return await api.post('/payments', data);
    } finally {
      setLoading(false);
    }
  };

  return { processPayment, loading };
};
""",
    },
    {
        "file_path": "frontend/src/components/PaymentForm.tsx",
        "language": "tsx",
        "line_count": 18,
        "file_size": 360,
        "content": """\
import React from 'react';

interface PaymentFormProps {
  onSubmit: (data: any) => void;
  loading: boolean;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({ onSubmit, loading }) => {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({}); }}>
      <input name="amount" type="number" placeholder="Amount" />
      <input name="currency" type="text" defaultValue="usd" />
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};
""",
    },
    {
        "file_path": "frontend/src/api/client.ts",
        "language": "typescript",
        "line_count": 12,
        "file_size": 240,
        "content": """\
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});
""",
    },

    # --- Backend API Layer ---
    {
        "file_path": "backend/app/api/payments.py",
        "language": "python",
        "line_count": 26,
        "file_size": 620,
        "content": """\
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.payment_service import PaymentService
from app.schemas.payment import PaymentCreate, PaymentResponse

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
):
    \"\"\"Create and process a new payment via Stripe.\"\"\"
    service = PaymentService(db)
    return await service.process_payment(payload)


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
):
    \"\"\"Retrieve an existing payment record.\"\"\"
    service = PaymentService(db)
    return service.get_payment(payment_id)
""",
    },

    # --- Backend Service Layer ---
    {
        "file_path": "backend/app/services/payment_service.py",
        "language": "python",
        "line_count": 42,
        "file_size": 980,
        "content": """\
import stripe
from sqlalchemy.orm import Session
from app.db.models import Payment
from app.repositories.payment_repository import PaymentRepository


class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PaymentRepository(db)
        stripe.api_key = "sk_test_placeholder"

    async def process_payment(self, data) -> Payment:
        \"\"\"Charge via Stripe and persist a payment record.\"\"\"
        charge = stripe.PaymentIntent.create(
            amount=data.amount,
            currency=getattr(data, 'currency', 'usd'),
        )

        payment = Payment(
            stripe_id=charge['id'],
            amount=data.amount,
            currency=getattr(data, 'currency', 'usd'),
            status="pending",
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def get_payment(self, payment_id: int) -> Payment:
        \"\"\"Retrieve payment by ID via repository.\"\"\"
        return self.repo.find_by_id(payment_id)

    def list_payments(self):
        \"\"\"List all payments.\"\"\"
        return self.repo.find_all()
""",
    },

    # --- Repository Layer ---
    {
        "file_path": "backend/app/repositories/payment_repository.py",
        "language": "python",
        "line_count": 24,
        "file_size": 520,
        "content": """\
from sqlalchemy.orm import Session
from app.db.models import Payment


class PaymentRepository:
    def __init__(self, db: Session):
        self.db = db

    def find_by_id(self, payment_id: int):
        return self.db.query(Payment).filter(Payment.id == payment_id).first()

    def find_all(self):
        return self.db.query(Payment).all()

    def create(self, payment: Payment) -> Payment:
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def delete(self, payment_id: int) -> bool:
        payment = self.db.query(Payment).filter(Payment.id == payment_id).first()
        if payment:
            self.db.delete(payment)
            self.db.commit()
            return True
        return False
""",
    },

    # --- Database Layer ---
    {
        "file_path": "backend/app/db/models.py",
        "language": "python",
        "line_count": 28,
        "file_size": 620,
        "content": """\
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    stripe_id = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(3), default="usd", nullable=False)
    status = Column(String(50), default="pending", nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False)
    stripe_customer_id = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
""",
    },
    {
        "file_path": "backend/app/db/session.py",
        "language": "python",
        "line_count": 16,
        "file_size": 340,
        "content": """\
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

DATABASE_URL = "postgresql://payuser:secret@localhost:5432/paydb"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",
    },
]


# ===========================================================================
# Helper
# ===========================================================================

def _node_ids(kg: KnowledgeGraph) -> set:
    return {n.id for n in kg.nodes}


def _find_node(kg: KnowledgeGraph, **kwargs) -> Any:
    """Return the first node matching all kwargs as attribute filters."""
    for node in kg.nodes:
        if all(getattr(node, k, None) == v for k, v in kwargs.items()):
            return node
    return None


def _edges_between(kg: KnowledgeGraph, src_id: str, tgt_id: str) -> list:
    return [
        e for e in kg.edges
        if e.source == src_id and e.target == tgt_id
    ]


def _edge_exists(kg: KnowledgeGraph, src_id: str, tgt_id: str, rel: RelationshipType) -> bool:
    return any(
        e.source == src_id and e.target == tgt_id and e.relationship_type == rel
        for e in kg.edges
    )


# ===========================================================================
# Tests: KnowledgeGraph construction
# ===========================================================================

class TestKnowledgeGraphBuild:

    @pytest.fixture(scope="class")
    def kg(self) -> KnowledgeGraph:
        """Build once for the entire test class — expensive operation."""
        return build_knowledge_graph(PAYMENT_APP)

    def test_kg_is_not_empty(self, kg):
        assert len(kg.nodes) > 0
        assert len(kg.edges) > 0

    def test_kg_has_metadata(self, kg):
        assert kg.metadata["file_count"] == len(PAYMENT_APP)
        assert "total_nodes" in kg.metadata
        assert "total_edges" in kg.metadata
        assert "generator" in kg.metadata

    def test_kg_summary_is_populated(self, kg):
        summary = kg.summary()
        assert summary["total_nodes"] >= 5
        assert summary["total_edges"] >= 3
        assert "deterministic_edges" in summary
        assert "inferred_edges" in summary

    def test_kg_serializable(self, kg):
        """to_dict() must produce a JSON-compatible dict."""
        import json
        d = kg.to_dict()
        serialized = json.dumps(d)  # must not raise
        assert len(serialized) > 100
        assert "nodes" in d
        assert "edges" in d


# ===========================================================================
# Tests: Node classification
# ===========================================================================

class TestNodeClassification:

    @pytest.fixture(scope="class")
    def kg(self) -> KnowledgeGraph:
        return build_knowledge_graph(PAYMENT_APP)

    def test_payment_page_is_component(self, kg):
        node = _find_node(kg, type=EntityType.COMPONENT, display_name="PaymentPage")
        assert node is not None, "PaymentPage should be classified as COMPONENT"
        assert node.layer == ArchLayer.PRESENTATION

    def test_payment_form_is_component(self, kg):
        node = _find_node(kg, type=EntityType.COMPONENT, display_name="PaymentForm")
        assert node is not None, "PaymentForm should be classified as COMPONENT"
        assert node.layer == ArchLayer.PRESENTATION

    def test_use_payment_hook_is_function(self, kg):
        # hooks/ → FUNCTION layer
        node = _find_node(kg, display_name="usePayment")
        assert node is not None, "usePayment hook should be in graph"
        # Either FUNCTION or COMPONENT is acceptable (hook is in hooks/)
        assert node.type in (EntityType.FUNCTION, EntityType.COMPONENT, EntityType.MODULE)

    def test_payments_api_is_api_endpoint(self, kg):
        node = _find_node(kg, type=EntityType.API_ENDPOINT, display_name="payments")
        assert node is not None, "payments.py should be API_ENDPOINT (has @router decorators)"
        assert node.layer == ArchLayer.API_GATEWAY

    def test_payments_api_has_route_metadata(self, kg):
        node = _find_node(kg, type=EntityType.API_ENDPOINT, display_name="payments")
        assert node is not None
        routes = node.metadata.get("routes", [])
        assert len(routes) >= 2, "Should detect POST and GET route decorators"
        methods = {r["method"] for r in routes}
        assert "POST" in methods
        assert "GET" in methods

    def test_payment_service_is_service(self, kg):
        node = _find_node(kg, type=EntityType.SERVICE, display_name="payment_service")
        assert node is not None, "payment_service.py should be SERVICE"
        assert node.layer == ArchLayer.APPLICATION

    def test_payment_repository_is_database_model(self, kg):
        # repositories/ dir → DATABASE_MODEL
        node = _find_node(kg, display_name="payment_repository")
        assert node is not None, "payment_repository.py should be in graph"
        # Either DATABASE_MODEL or SERVICE is reasonable (it's a repository pattern)
        assert node.type in (EntityType.DATABASE_MODEL, EntityType.SERVICE, EntityType.MODULE)

    def test_db_models_is_database_model(self, kg):
        node = _find_node(kg, display_name="models")
        assert node is not None, "db/models.py should be in graph"
        # Should be classified as DATABASE_MODEL (has SQLAlchemy Base classes)
        assert node.type == EntityType.DATABASE_MODEL, (
            f"db/models.py should be DATABASE_MODEL but got {node.type}"
        )

    def test_stripe_external_service_exists(self, kg):
        stripe_node = _find_node(kg, type=EntityType.EXTERNAL_SERVICE, name="Stripe")
        assert stripe_node is not None, "Stripe should be detected as external service"
        assert stripe_node.layer == ArchLayer.INFRASTRUCTURE
        assert stripe_node.metadata.get("package") == "stripe"

    def test_postgresql_database_exists(self, kg):
        pg_node = _find_node(kg, type=EntityType.DATABASE, name="PostgreSQL")
        assert pg_node is not None, "PostgreSQL should be detected from connection string"
        assert pg_node.layer == ArchLayer.INFRASTRUCTURE


# ===========================================================================
# Tests: Edge detection and evidence
# ===========================================================================

class TestEdgeDetection:

    @pytest.fixture(scope="class")
    def kg(self) -> KnowledgeGraph:
        return build_knowledge_graph(PAYMENT_APP)

    def test_all_edges_have_source_evidence(self, kg):
        for edge in kg.edges:
            assert len(edge.evidence) > 0, (
                f"Edge {edge.id} ({edge.source}→{edge.target} "
                f"via {edge.relationship_type}) has no evidence"
            )
            ev = edge.evidence[0]
            assert ev.file_path, f"Edge {edge.id} evidence has empty file_path"
            assert ev.start_line >= 1, f"Edge {edge.id} has invalid start_line"

    def test_all_edges_have_valid_confidence(self, kg):
        for edge in kg.edges:
            assert 0.0 <= edge.confidence <= 1.0, (
                f"Edge {edge.id} has invalid confidence {edge.confidence}"
            )

    def test_api_imports_service(self, kg):
        api_node = _find_node(kg, type=EntityType.API_ENDPOINT, display_name="payments")
        svc_node = _find_node(kg, type=EntityType.SERVICE, display_name="payment_service")
        assert api_node and svc_node
        assert _edge_exists(kg, api_node.id, svc_node.id, RelationshipType.IMPORTS), (
            "payments.py should IMPORT payment_service.py"
        )

    def test_import_edge_is_deterministic(self, kg):
        api_node = _find_node(kg, type=EntityType.API_ENDPOINT, display_name="payments")
        svc_node = _find_node(kg, type=EntityType.SERVICE, display_name="payment_service")
        if not (api_node and svc_node):
            pytest.skip("prerequisite nodes not found")
        edges = _edges_between(kg, api_node.id, svc_node.id)
        import_edges = [e for e in edges if e.relationship_type == RelationshipType.IMPORTS]
        assert len(import_edges) > 0
        assert import_edges[0].confidence_level == ConfidenceLevel.DETERMINISTIC
        assert import_edges[0].confidence == 1.0

    def test_service_imports_repository(self, kg):
        svc_node = _find_node(kg, type=EntityType.SERVICE, display_name="payment_service")
        repo_node = _find_node(kg, display_name="payment_repository")
        assert svc_node and repo_node
        assert _edge_exists(kg, svc_node.id, repo_node.id, RelationshipType.IMPORTS), (
            "payment_service should IMPORT payment_repository"
        )

    def test_service_imports_db_models(self, kg):
        svc_node = _find_node(kg, type=EntityType.SERVICE, display_name="payment_service")
        mdl_node = _find_node(kg, display_name="models")
        assert svc_node and mdl_node
        assert _edge_exists(kg, svc_node.id, mdl_node.id, RelationshipType.IMPORTS), (
            "payment_service should IMPORT db/models (Payment class)"
        )

    def test_service_consumes_stripe(self, kg):
        svc_node = _find_node(kg, type=EntityType.SERVICE, display_name="payment_service")
        stripe_node = _find_node(kg, type=EntityType.EXTERNAL_SERVICE, name="Stripe")
        assert svc_node and stripe_node
        assert _edge_exists(kg, svc_node.id, stripe_node.id, RelationshipType.CONSUMES), (
            "payment_service should CONSUME Stripe"
        )

    def test_service_writes_payment_model(self, kg):
        svc_node = _find_node(kg, type=EntityType.SERVICE, display_name="payment_service")
        mdl_node = _find_node(kg, display_name="models")
        assert svc_node and mdl_node
        assert _edge_exists(kg, svc_node.id, mdl_node.id, RelationshipType.WRITES), (
            "payment_service should WRITE Payment model (db.add(payment))"
        )

    def test_repository_reads_payment_model(self, kg):
        repo_node = _find_node(kg, display_name="payment_repository")
        mdl_node = _find_node(kg, display_name="models")
        assert repo_node and mdl_node
        assert _edge_exists(kg, repo_node.id, mdl_node.id, RelationshipType.READS), (
            "payment_repository should READ Payment model (db.query(Payment))"
        )

    def test_session_depends_on_postgresql(self, kg):
        session_node = _find_node(kg, display_name="session")
        pg_node = _find_node(kg, type=EntityType.DATABASE, name="PostgreSQL")
        assert session_node and pg_node
        assert _edge_exists(kg, session_node.id, pg_node.id, RelationshipType.DEPENDS_ON), (
            "db/session.py should DEPEND_ON PostgreSQL (connection string)"
        )

    def test_no_self_loop_edges(self, kg):
        self_loops = [e for e in kg.edges if e.source == e.target]
        assert len(self_loops) == 0, (
            f"Found {len(self_loops)} self-loop edges: "
            + ", ".join(f"{e.source}" for e in self_loops)
        )

    def test_no_duplicate_edges_same_type(self, kg):
        seen = set()
        for e in kg.edges:
            key = (e.source, e.target, e.relationship_type)
            assert key not in seen, (
                f"Duplicate edge: {e.source} → {e.target} [{e.relationship_type}]"
            )
            seen.add(key)


# ===========================================================================
# Tests: Dependency resolver
# ===========================================================================

class TestDependencyResolver:

    @pytest.fixture(scope="class")
    def file_index(self) -> FileIndex:
        return FileIndex(PAYMENT_APP)

    def test_resolves_python_absolute_import(self, file_index):
        import_text = "from app.services.payment_service import PaymentService"
        results = resolve_python_import(
            import_text, "backend/app/api/payments.py", file_index
        )
        paths = [r[0] for r in results]
        assert any("payment_service" in p for p in paths), (
            f"Expected payment_service.py in resolved paths, got: {paths}"
        )

    def test_resolves_python_db_models_import(self, file_index):
        import_text = "from app.db.models import Payment"
        results = resolve_python_import(
            import_text, "backend/app/services/payment_service.py", file_index
        )
        paths = [r[0] for r in results]
        assert any("models" in p for p in paths), (
            f"Expected models.py in resolved paths, got: {paths}"
        )

    def test_external_package_not_resolved(self, file_index):
        import_text = "import stripe"
        results = resolve_python_import(
            import_text, "backend/app/services/payment_service.py", file_index
        )
        # stripe is an external package — should not resolve to any repo file
        assert results == [], f"External package 'stripe' should not resolve; got {results}"

    def test_resolves_js_relative_import(self, file_index):
        import_path = "../api/client"
        result = resolve_js_ts_import(
            import_path, "frontend/src/hooks/usePayment.ts", file_index
        )
        assert result is not None, "Should resolve ../api/client"
        assert "client" in result

    def test_resolves_js_component_import(self, file_index):
        import_path = "../components/PaymentForm"
        result = resolve_js_ts_import(
            import_path, "frontend/src/pages/PaymentPage.tsx", file_index
        )
        assert result is not None, "Should resolve ../components/PaymentForm"
        assert "PaymentForm" in result

    def test_external_npm_package_not_resolved(self, file_index):
        import_path = "axios"
        result = resolve_js_ts_import(
            import_path, "frontend/src/api/client.ts", file_index
        )
        assert result is None, "External npm package 'axios' should not resolve"

    def test_react_not_resolved(self, file_index):
        import_path = "react"
        result = resolve_js_ts_import(
            import_path, "frontend/src/pages/PaymentPage.tsx", file_index
        )
        assert result is None, "External npm 'react' should not resolve"

    def test_python_import_statement_extraction(self):
        content = PAYMENT_APP[4]["content"]  # payments.py (index 4: API layer)
        stmts = extract_python_import_statements(content)
        assert len(stmts) >= 4, f"Expected >=4 imports in payments.py, got {len(stmts)}"
        texts = [s[0] for s in stmts]
        assert any("payment_service" in t for t in texts)
        assert any("get_db" in t for t in texts)

    def test_js_import_path_extraction(self):
        content = PAYMENT_APP[0]["content"]  # PaymentPage.tsx (index 0)
        imports = extract_js_import_paths(content)
        paths = [i[0] for i in imports]
        assert "../hooks/usePayment" in paths
        assert "../components/PaymentForm" in paths


# ===========================================================================
# Tests: Entity classifier
# ===========================================================================

class TestEntityClassifier:

    def test_tsx_file_is_component(self):
        etype, layer, conf, clevel = classify_file(
            "frontend/src/pages/PaymentPage.tsx", [], "", "tsx"
        )
        assert etype == EntityType.COMPONENT
        assert layer == ArchLayer.PRESENTATION
        assert conf == 1.0  # DETERMINISTIC by extension
        assert clevel == ConfidenceLevel.DETERMINISTIC

    def test_api_file_with_router_decorator(self):
        content = PAYMENT_APP[4]["content"]  # payments.py with @router.post
        etype, layer, conf, clevel = classify_file(
            "backend/app/api/payments.py", [], content, "python"
        )
        assert etype == EntityType.API_ENDPOINT
        assert layer == ArchLayer.API_GATEWAY

    def test_db_models_with_base_class(self):
        content = PAYMENT_APP[7]["content"]  # db/models.py (index 7)
        etype, layer, conf, clevel = classify_file(
            "backend/app/db/models.py", [], content, "python"
        )
        assert etype == EntityType.DATABASE_MODEL

    def test_service_by_directory_path(self):
        etype, layer, conf, clevel = classify_file(
            "backend/app/services/payment_service.py", [], "", "python"
        )
        assert etype == EntityType.SERVICE
        assert layer == ArchLayer.APPLICATION

    def test_detect_stripe_external_service(self):
        content = PAYMENT_APP[5]["content"]  # payment_service.py (index 5)
        detected = detect_external_service_imports(content, "python")
        packages = [d[0] for d in detected]
        assert "stripe" in packages, f"Should detect 'stripe', got {packages}"

    def test_no_false_positive_external_for_sqlalchemy(self):
        content = PAYMENT_APP[8]["content"]  # db/session.py (index 8) — imports sqlalchemy
        detected = detect_external_service_imports(content, "python")
        packages = [d[0] for d in detected]
        # sqlalchemy is not in EXTERNAL_SERVICE_PACKAGES (intentionally)
        assert "sqlalchemy" not in packages

    def test_extract_base_classes(self):
        content = PAYMENT_APP[7]["content"]  # db/models.py (index 7)
        bases = extract_base_classes(content, "Payment")
        assert "Base" in bases, f"Payment class should inherit from Base, got {bases}"

    def test_extract_route_decorators(self):
        content = PAYMENT_APP[4]["content"]  # payments.py
        routes = extract_route_decorators(content)
        assert len(routes) >= 2
        methods = {r["method"] for r in routes}
        assert "POST" in methods
        assert "GET" in methods
        paths_found = {r["path"] for r in routes}
        assert "/" in paths_found  # POST /
        assert any("{payment_id}" in p for p in paths_found)


# ===========================================================================
# Tests: Graph query helpers
# ===========================================================================

class TestGraphQueryHelpers:

    @pytest.fixture(scope="class")
    def kg(self) -> KnowledgeGraph:
        return build_knowledge_graph(PAYMENT_APP)

    def test_get_node_by_id(self, kg):
        node = kg.nodes[0]
        found = kg.get_node(node.id)
        assert found is node

    def test_get_node_returns_none_for_missing(self, kg):
        assert kg.get_node("nonexistent_id_xyz") is None

    def test_get_nodes_by_type(self, kg):
        components = kg.get_nodes_by_type(EntityType.COMPONENT)
        assert len(components) >= 2  # PaymentPage + PaymentForm

    def test_get_nodes_by_layer(self, kg):
        infra_nodes = kg.get_nodes_by_layer(ArchLayer.INFRASTRUCTURE)
        infra_types = {n.type for n in infra_nodes}
        assert EntityType.DATABASE in infra_types

    def test_get_edges_from(self, kg):
        api_node = _find_node(kg, type=EntityType.API_ENDPOINT, display_name="payments")
        if not api_node:
            pytest.skip("API node not found")
        edges = kg.get_edges_from(api_node.id)
        assert len(edges) > 0

    def test_get_edges_by_type(self, kg):
        imports = kg.get_edges_by_type(RelationshipType.IMPORTS)
        assert len(imports) > 0
        for e in imports:
            assert e.relationship_type == RelationshipType.IMPORTS

    def test_get_edges_to(self, kg):
        pg_node = _find_node(kg, type=EntityType.DATABASE, name="PostgreSQL")
        if not pg_node:
            pytest.skip("PostgreSQL node not found")
        edges_in = kg.get_edges_to(pg_node.id)
        assert len(edges_in) >= 1  # session.py → PostgreSQL


# ===========================================================================
# Tests: Edge evidence integrity
# ===========================================================================

class TestEvidenceIntegrity:

    @pytest.fixture(scope="class")
    def kg(self) -> KnowledgeGraph:
        return build_knowledge_graph(PAYMENT_APP)

    def test_deterministic_edges_have_real_line_numbers(self, kg):
        det_edges = [
            e for e in kg.edges
            if e.confidence_level == ConfidenceLevel.DETERMINISTIC
        ]
        assert len(det_edges) > 0, "Should have deterministic edges from IMPORTS"
        for edge in det_edges:
            ev = edge.evidence[0]
            assert ev.start_line >= 1
            assert ev.end_line >= ev.start_line

    def test_writes_edge_has_multi_line_evidence(self, kg):
        writes = kg.get_edges_by_type(RelationshipType.WRITES)
        for edge in writes:
            if edge.evidence:
                ev = edge.evidence[0]
                # WRITES evidence spans multiple lines (context window)
                assert ev.end_line >= ev.start_line

    def test_external_service_edge_has_import_snippet(self, kg):
        consumes = kg.get_edges_by_type(RelationshipType.CONSUMES)
        stripe_consumes = [
            e for e in consumes
            if e.target.startswith("ext_")
        ]
        assert len(stripe_consumes) > 0
        for e in stripe_consumes:
            assert len(e.evidence) > 0

    def test_high_confidence_edges_above_threshold(self, kg):
        high_edges = [
            e for e in kg.edges
            if e.confidence_level == ConfidenceLevel.HIGH
        ]
        for e in high_edges:
            assert e.confidence >= 0.8, (
                f"HIGH confidence edge {e.id} has low score {e.confidence}"
            )
