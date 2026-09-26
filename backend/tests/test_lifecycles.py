"""
Automated Test Suite for Lifecycle Extraction Engine.

Verifies:
1. Extraction of Repository Indexing finite state machine (NOT_INDEXED -> INDEXING -> INDEXED, FAILED, Retry).
2. Extraction of Prisma enums and state models (WithdrawalStatus, BookingStatus).
3. State classification into initial, intermediate, terminal_success, terminal_failure.
4. Failure states and alternative rejection paths.
5. Retry loops (e.g. FAILED -> INDEXING).
6. Transition triggering events, conditions, and actions.
7. Python Enum state machine extraction.
8. Line-level traceable source evidence and serialization.
"""
import pytest
from app.parser.lifecycle_extractor import (
    LifecycleExtractor,
    StateType,
    EntityLifecycle,
    LifecycleState,
    LifecycleTransition,
)
from app.parser.knowledge_graph import build_knowledge_graph

CODELENS_INDEXING_FIXTURE = [
    {
        "file_path": "app/db/models.py",
        "language": "python",
        "line_count": 50,
        "content": '''
from sqlalchemy import Column, Integer, String
from app.db.base_class import Base

class Repository(Base):
    __tablename__ = "repositories"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    index_status = Column(String(50), default="not_indexed", nullable=False)
''',
    },
    {
        "file_path": "app/services/indexer.py",
        "language": "python",
        "line_count": 80,
        "content": '''
def index_repository(repo_id: int):
    repo = db.query(Repository).get(repo_id)
    repo.index_status = "indexing"
    db.commit()
    try:
        build_graph()
        repo.index_status = "indexed"
        db.commit()
    except Exception as e:
        repo.index_status = "failed"
        db.commit()
''',
    }
]

PRISMA_WITHDRAWAL_FIXTURE = [
    {
        "file_path": "prisma/schema.prisma",
        "language": "text",
        "line_count": 30,
        "content": '''
enum WithdrawalStatus {
  PENDING
  APPROVED
  REJECTED
}

model Withdrawal {
  id        String           @id @default(uuid())
  amount    Float
  status    WithdrawalStatus @default(PENDING)
  userId    String
  createdAt DateTime         @default(now())
}
''',
    },
    {
        "file_path": "controllers/admin.controllers.js",
        "language": "javascript",
        "line_count": 40,
        "content": '''
export const processWithdrawal = async (req, res) => {
    const { id, action } = req.body;
    if (action === 'approve') {
        await prisma.withdrawal.update({
            where: { id },
            data: { status: 'APPROVED' }
        });
        return res.status(200).json({ success: true, status: 'APPROVED' });
    } else {
        await prisma.withdrawal.update({
            where: { id },
            data: { status: 'REJECTED' }
        });
        return res.status(200).json({ success: true, status: 'REJECTED' });
    }
};
''',
    }
]

PYTHON_ORDER_ENUM_FIXTURE = [
    {
        "file_path": "models/order.py",
        "language": "python",
        "line_count": 30,
        "content": '''
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
''',
    }
]


class TestLifecycleExtractor:

    def test_repository_indexing_lifecycle_extraction(self):
        kg = build_knowledge_graph(CODELENS_INDEXING_FIXTURE)
        extractor = LifecycleExtractor(CODELENS_INDEXING_FIXTURE, kg)
        lifecycles = extractor.extract_all_lifecycles()

        assert len(lifecycles) >= 1
        repo_lc = next((lc for lc in lifecycles if "Repository" in lc.entity_name), None)
        assert repo_lc is not None

        # Check states
        state_names = [s.name for s in repo_lc.states]
        assert "NOT_INDEXED" in state_names
        assert "INDEXING" in state_names
        assert "INDEXED" in state_names
        assert "FAILED" in state_names

        # Check failure & retry properties
        assert repo_lc.has_failure_state is True
        assert repo_lc.has_retry_loop is True

    def test_repository_state_classifications(self):
        kg = build_knowledge_graph(CODELENS_INDEXING_FIXTURE)
        extractor = LifecycleExtractor(CODELENS_INDEXING_FIXTURE, kg)
        lifecycles = extractor.extract_all_lifecycles()
        repo_lc = next(lc for lc in lifecycles if "Repository" in lc.entity_name)

        states_by_name = {s.name: s for s in repo_lc.states}

        # NOT_INDEXED should be INITIAL
        assert states_by_name["NOT_INDEXED"].state_type == StateType.INITIAL
        assert states_by_name["NOT_INDEXED"].is_initial is True

        # INDEXING should be INTERMEDIATE
        assert states_by_name["INDEXING"].state_type == StateType.INTERMEDIATE
        assert states_by_name["INDEXING"].is_terminal is False

        # INDEXED should be TERMINAL_SUCCESS
        assert states_by_name["INDEXED"].state_type == StateType.TERMINAL_SUCCESS
        assert states_by_name["INDEXED"].is_terminal is True
        assert states_by_name["INDEXED"].is_failure is False

        # FAILED should be TERMINAL_FAILURE
        assert states_by_name["FAILED"].state_type == StateType.TERMINAL_FAILURE
        assert states_by_name["FAILED"].is_terminal is True
        assert states_by_name["FAILED"].is_failure is True

    def test_repository_indexing_transitions_and_retry(self):
        kg = build_knowledge_graph(CODELENS_INDEXING_FIXTURE)
        extractor = LifecycleExtractor(CODELENS_INDEXING_FIXTURE, kg)
        lifecycles = extractor.extract_all_lifecycles()
        repo_lc = next(lc for lc in lifecycles if "Repository" in lc.entity_name)

        # Check transitions:
        # NOT_INDEXED -> INDEXING
        # INDEXING -> INDEXED
        # INDEXING -> FAILED
        # FAILED -> INDEXING (retry)
        trans_pairs = [(t.from_state, t.to_state) for t in repo_lc.transitions]
        assert ("state_not_indexed", "state_indexing") in trans_pairs
        assert ("state_indexing", "state_indexed") in trans_pairs
        assert ("state_indexing", "state_failed") in trans_pairs
        assert ("state_failed", "state_indexing") in trans_pairs

        retry_trans = next(t for t in repo_lc.transitions if t.from_state == "state_failed" and t.to_state == "state_indexing")
        assert retry_trans.is_retry is True

        fail_trans = next(t for t in repo_lc.transitions if t.from_state == "state_indexing" and t.to_state == "state_failed")
        assert fail_trans.is_failure is True

    def test_prisma_withdrawal_lifecycle(self):
        kg = build_knowledge_graph(PRISMA_WITHDRAWAL_FIXTURE)
        extractor = LifecycleExtractor(PRISMA_WITHDRAWAL_FIXTURE, kg)
        lifecycles = extractor.extract_all_lifecycles()

        w_lc = next((lc for lc in lifecycles if "Withdrawal" in lc.entity_name), None)
        assert w_lc is not None

        state_names = [s.name for s in w_lc.states]
        assert "PENDING" in state_names
        assert "APPROVED" in state_names
        assert "REJECTED" in state_names

        # PENDING -> APPROVED and PENDING -> REJECTED
        assert w_lc.has_failure_state is True
        assert any(t.to_state.endswith("approved") for t in w_lc.transitions)
        assert any(t.to_state.endswith("rejected") for t in w_lc.transitions)

    def test_python_order_status_enum_extraction(self):
        kg = build_knowledge_graph(PYTHON_ORDER_ENUM_FIXTURE)
        extractor = LifecycleExtractor(PYTHON_ORDER_ENUM_FIXTURE, kg)
        lifecycles = extractor.extract_all_lifecycles()

        order_lc = next((lc for lc in lifecycles if "Order" in lc.entity_name), None)
        assert order_lc is not None

        state_names = [s.name for s in order_lc.states]
        assert "PENDING" in state_names
        assert "PROCESSING" in state_names
        assert "CONFIRMED" in state_names
        assert "CANCELLED" in state_names

        # CANCELLED should be failure
        states_by_name = {s.name: s for s in order_lc.states}
        assert states_by_name["CANCELLED"].is_failure is True

    def test_traceable_source_evidence_integrity(self):
        kg = build_knowledge_graph(CODELENS_INDEXING_FIXTURE)
        extractor = LifecycleExtractor(CODELENS_INDEXING_FIXTURE, kg)
        lifecycles = extractor.extract_all_lifecycles()
        repo_lc = next(lc for lc in lifecycles if "Repository" in lc.entity_name)

        for s in repo_lc.states:
            if s.evidence:
                assert s.evidence.file_path != ""
                assert s.evidence.start_line > 0

        for t in repo_lc.transitions:
            if t.evidence:
                assert t.evidence.file_path != ""
                assert t.evidence.start_line > 0

    def test_serialization_to_dict(self):
        kg = build_knowledge_graph(PRISMA_WITHDRAWAL_FIXTURE)
        extractor = LifecycleExtractor(PRISMA_WITHDRAWAL_FIXTURE, kg)
        lifecycles = extractor.extract_all_lifecycles()
        w_lc = lifecycles[0]
        data = w_lc.to_dict()

        assert "id" in data
        assert "entity_name" in data
        assert "states" in data
        assert "transitions" in data
        assert "total_states" in data
        assert "total_transitions" in data
        assert isinstance(data["states"], list)
        assert isinstance(data["transitions"], list)
        assert data["total_states"] == len(w_lc.states)
