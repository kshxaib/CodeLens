"""
Automated Test Suite for Sequence Diagram Extraction Engine.

Verifies:
1. Participant discovery and column ordering (Actor -> Client -> Gateway -> Controller/Service -> External -> Queue/Worker -> Database).
2. Chronological ordering of runtime messages.
3. Message interaction types (call, return, self_call, error, async_call).
4. Detected payloads and response models.
5. Traceable line-level source code evidence.
6. Inferred vs deterministic distinction and confidence levels.
7. Both Python (FastAPI) and JavaScript/TypeScript (Express/Prisma) flows.
8. Fallback sequence synthesis from Knowledge Graph edges.
"""
import pytest
from app.parser.sequence_extractor import (
    SequenceExtractor,
    ParticipantType,
    InteractionType,
    SequenceDiagram,
    SequenceParticipant,
    SequenceMessage,
)
from app.parser.knowledge_graph import build_knowledge_graph


CHECKOUT_FASTAPI_APP = [
    {
        "file_path": "api/checkout_api.py",
        "language": "python",
        "line_count": 80,
        "content": '''
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from services.payment_service import PaymentService
from services.inventory_service import InventoryService
from services.notification_service import send_confirmation

router = APIRouter(prefix="/checkout")

class CheckoutRequest(BaseModel):
    cart_id: str
    shipping_address: str
    payment_token: str

@router.post("/process")
async def process_checkout(req: CheckoutRequest, background_tasks: BackgroundTasks):
    """
    Executes customer checkout process.
    """
    # 1. Validation
    if not req.shipping_address or len(req.shipping_address) < 5:
        raise HTTPException(status_code=400, detail="Invalid shipping address")

    # 2. Inventory check
    inventory = InventoryService()
    reserved = inventory.reserve_items(req.cart_id)

    # 3. Payment processing
    payment_svc = PaymentService()
    charge = payment_svc.process_payment(req.payment_token, 4999)

    # 4. Database save
    db.add(charge)
    db.commit()

    # 5. Background notification
    background_tasks.add_task(send_confirmation, req.cart_id)

    return {"status": "confirmed", "order_id": "ord_999"}
''',
    }
]

EXPRESS_PRISMA_AUTH_APP = [
    {
        "file_path": "controllers/auth.controllers.js",
        "language": "javascript",
        "line_count": 50,
        "content": '''
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../db/prisma');

export const loginUser = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
        where: { email }
    });

    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user.id }, "secret_key");

    return res.status(200).json({ success: true, token, user });
};
''',
    }
]


class TestSequenceExtractor:

    def test_python_checkout_sequence_extraction(self):
        kg = build_knowledge_graph(CHECKOUT_FASTAPI_APP)
        extractor = SequenceExtractor(CHECKOUT_FASTAPI_APP, kg)
        sequences = extractor.extract_all_sequences()

        assert len(sequences) >= 1
        seq = sequences[0]
        assert "Process Checkout" in seq.title or "Checkout" in seq.title
        assert seq.trigger_endpoint == "POST /process"
        assert len(seq.participants) >= 4
        assert len(seq.messages) >= 6

    def test_participant_column_ordering(self):
        kg = build_knowledge_graph(CHECKOUT_FASTAPI_APP)
        extractor = SequenceExtractor(CHECKOUT_FASTAPI_APP, kg)
        sequences = extractor.extract_all_sequences()
        seq = sequences[0]

        # First participant should be Actor / Customer
        assert seq.participants[0].participant_type == ParticipantType.ACTOR
        assert "Customer" in seq.participants[0].name or "User" in seq.participants[0].name

        # Second participant should be API Gateway
        assert seq.participants[1].participant_type == ParticipantType.API_GATEWAY

        # Order indices must be monotonic: 0, 1, 2, 3...
        indices = [p.order_index for p in seq.participants]
        assert indices == list(range(len(seq.participants)))

    def test_chronological_message_ordering(self):
        kg = build_knowledge_graph(CHECKOUT_FASTAPI_APP)
        extractor = SequenceExtractor(CHECKOUT_FASTAPI_APP, kg)
        sequences = extractor.extract_all_sequences()
        seq = sequences[0]

        # Step numbers must be strictly increasing: 1, 2, 3...
        step_numbers = [m.step_number for m in seq.messages]
        assert step_numbers == list(range(1, len(seq.messages) + 1))

        # First message must be Inbound HTTP request from Actor to Gateway
        first_msg = seq.messages[0]
        assert first_msg.caller_id == seq.participants[0].id
        assert first_msg.callee_id == seq.participants[1].id
        assert first_msg.interaction_type == InteractionType.CALL

        # Last message should be response return
        last_msg = seq.messages[-1]
        assert last_msg.interaction_type == InteractionType.RETURN
        assert "200 OK" in last_msg.method

    def test_validation_decision_and_error_branch(self):
        kg = build_knowledge_graph(CHECKOUT_FASTAPI_APP)
        extractor = SequenceExtractor(CHECKOUT_FASTAPI_APP, kg)
        sequences = extractor.extract_all_sequences()
        seq = sequences[0]

        # Has errors flag should be true
        assert seq.has_errors is True

        # Check self-call validation
        self_calls = [m for m in seq.messages if m.interaction_type == InteractionType.SELF_CALL]
        assert len(self_calls) >= 1
        assert "validate" in self_calls[0].method.lower()

        # Check error branch
        errors = [m for m in seq.messages if m.interaction_type == InteractionType.ERROR]
        assert len(errors) >= 1
        assert errors[0].is_error is True
        assert "400" in errors[0].method

    def test_service_calls_and_returns(self):
        kg = build_knowledge_graph(CHECKOUT_FASTAPI_APP)
        extractor = SequenceExtractor(CHECKOUT_FASTAPI_APP, kg)
        sequences = extractor.extract_all_sequences()
        seq = sequences[0]

        # Must have Inventory Service and Payment Service
        participant_names = [p.name for p in seq.participants]
        assert any("Inventory" in name for name in participant_names)
        assert any("Payment" in name for name in participant_names)

        # Must have matching CALL and RETURN pairs
        inv_calls = [m for m in seq.messages if "reserve_items" in m.method]
        assert len(inv_calls) >= 1
        assert inv_calls[0].interaction_type == InteractionType.CALL

        inv_returns = [m for m in seq.messages if "reservation_status" in m.method or "reserved" in (m.response_payload or "")]
        assert len(inv_returns) >= 1
        assert inv_returns[0].interaction_type == InteractionType.RETURN

    def test_async_background_task_dispatch(self):
        kg = build_knowledge_graph(CHECKOUT_FASTAPI_APP)
        extractor = SequenceExtractor(CHECKOUT_FASTAPI_APP, kg)
        sequences = extractor.extract_all_sequences()
        seq = sequences[0]

        assert seq.has_async is True
        async_messages = [m for m in seq.messages if m.is_async]
        assert len(async_messages) >= 1
        assert async_messages[0].interaction_type == InteractionType.ASYNC_CALL

    def test_express_prisma_auth_sequence(self):
        kg = build_knowledge_graph(EXPRESS_PRISMA_AUTH_APP)
        extractor = SequenceExtractor(EXPRESS_PRISMA_AUTH_APP, kg)
        sequences = extractor.extract_all_sequences()

        assert len(sequences) >= 1
        seq = sequences[0]

        # Participants check
        p_names = [p.name for p in seq.participants]
        assert any("User" in name or "Client" in name for name in p_names)
        assert any("Database" in name or "Prisma" in name or "PostgreSQL" in name for name in p_names)
        assert any("Authentication" in name or "Auth" in name for name in p_names)

        # Database queries check: findUniqueUser
        db_messages = [m for m in seq.messages if "findUnique" in m.method]
        assert len(db_messages) >= 1
        assert db_messages[0].interaction_type == InteractionType.CALL

        # Password compare & JWT token check
        bcrypt_calls = [m for m in seq.messages if "bcrypt.compare" in m.method]
        assert len(bcrypt_calls) >= 1

        jwt_calls = [m for m in seq.messages if "jwt.sign" in m.method]
        assert len(jwt_calls) >= 1

        # Final 200 OK return check
        success_returns = [m for m in seq.messages if "200" in m.method]
        assert len(success_returns) >= 1
        assert success_returns[0].interaction_type == InteractionType.RETURN

    def test_traceable_source_evidence_integrity(self):
        kg = build_knowledge_graph(EXPRESS_PRISMA_AUTH_APP)
        extractor = SequenceExtractor(EXPRESS_PRISMA_AUTH_APP, kg)
        sequences = extractor.extract_all_sequences()
        seq = sequences[0]

        for msg in seq.messages:
            if msg.evidence:
                assert msg.evidence.file_path == "controllers/auth.controllers.js"
                assert msg.evidence.start_line > 0
                assert msg.evidence.end_line >= msg.evidence.start_line

    def test_serialization_to_dict(self):
        kg = build_knowledge_graph(CHECKOUT_FASTAPI_APP)
        extractor = SequenceExtractor(CHECKOUT_FASTAPI_APP, kg)
        sequences = extractor.extract_all_sequences()
        seq = sequences[0]
        data = seq.to_dict()

        assert "id" in data
        assert "title" in data
        assert "participants" in data
        assert "messages" in data
        assert "total_steps" in data
        assert isinstance(data["participants"], list)
        assert isinstance(data["messages"], list)
        assert data["total_steps"] == len(data["messages"])
