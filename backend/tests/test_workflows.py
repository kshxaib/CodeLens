"""
Tests for Workflow Extraction Engine.

Uses a realistic checkout & payment application fixture with:
- Start node (HTTP POST /checkout)
- Validation decision step
- Failure branch (invalid cart/address)
- Payment processing step with Stripe external call
- Exception handling & retry loop
- Failure branch (payment failed -> cancel order)
- Database persistence (Order creation)
- Async operation (background confirmation email)
- End node (Order Confirmed 200 OK)
"""
import pytest
from app.parser.workflow_extractor import (
    WorkflowExtractor,
    Workflow,
    StepType,
    TransitionType,
)
from app.parser.knowledge_graph import build_knowledge_graph

CHECKOUT_APP_FILES = [
    {
        "file_path": "api/checkout_api.py",
        "language": "python",
        "line_count": 85,
        "content": '''
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from services.payment_service import PaymentService
from services.inventory_service import InventoryService
from services.notification_service import send_order_confirmation

router = APIRouter(prefix="/checkout")

class CheckoutRequest(BaseModel):
    user_id: str
    cart_id: str
    shipping_address: str
    payment_token: str

@router.post("/process")
async def process_checkout(req: CheckoutRequest, background_tasks: BackgroundTasks):
    """
    Executes the complete customer checkout workflow.
    """
    # 1. Validate shipping address and cart
    if not req.shipping_address or len(req.shipping_address) < 5:
        raise HTTPException(status_code=400, detail="Invalid shipping address")

    # 2. Reserve inventory
    inventory = InventoryService()
    reserved = inventory.reserve_items(req.cart_id)
    if not reserved:
        raise HTTPException(status_code=409, detail="Inventory unavailable")

    # 3. Process payment with retry handling
    payment_svc = PaymentService()
    try:
        charge = payment_svc.charge_card(req.payment_token, amount=199.99)
    except Exception as e:
        # Retry loop or fail
        for attempt in range(3):
            try:
                charge = payment_svc.retry_payment(req.payment_token)
                break
            except Exception:
                continue
        else:
            inventory.release_items(req.cart_id)
            raise HTTPException(status_code=402, detail="Payment failed")

    # 4. Save order to database
    order = payment_svc.create_order(req.user_id, req.cart_id, charge["id"])

    # 5. Dispatch async confirmation email
    background_tasks.add_task(send_order_confirmation, req.user_id, order["id"])

    return {"status": "success", "order_id": order["id"]}
''',
    },
    {
        "file_path": "services/payment_service.py",
        "language": "python",
        "line_count": 60,
        "content": '''
import stripe
from db.models import Order

class PaymentService:
    def charge_card(self, token: str, amount: float):
        # Call Stripe external API
        charge = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency="usd",
            payment_method=token,
        )
        return charge

    def retry_payment(self, token: str):
        return stripe.PaymentIntent.confirm(token)

    def create_order(self, user_id: str, cart_id: str, transaction_id: str):
        from db.session import get_db
        db = get_db()
        order = Order(user_id=user_id, cart_id=cart_id, transaction_id=transaction_id)
        db.add(order)
        db.commit()
        return {"id": "ord_12345", "user_id": user_id}
''',
    },
    {
        "file_path": "services/inventory_service.py",
        "language": "python",
        "line_count": 25,
        "content": '''
class InventoryService:
    def reserve_items(self, cart_id: str) -> bool:
        return True

    def release_items(self, cart_id: str):
        pass
''',
    },
    {
        "file_path": "services/notification_service.py",
        "language": "python",
        "line_count": 20,
        "content": '''
import sendgrid

def send_order_confirmation(user_id: str, order_id: str):
    sg = sendgrid.SendGridAPIClient()
    sg.send_mail(to=user_id, subject="Order Confirmed", body=order_id)
''',
    },
]


@pytest.fixture
def workflow_extractor():
    kg = build_knowledge_graph(CHECKOUT_APP_FILES)
    return WorkflowExtractor(CHECKOUT_APP_FILES, kg)


class TestWorkflowExtraction:
    def test_workflow_extraction_discovers_workflows(self, workflow_extractor):
        workflows = workflow_extractor.extract_all_workflows()
        assert len(workflows) >= 1
        wf = workflows[0]
        assert "Process Checkout" in wf.name
        assert "HTTP POST" in wf.trigger

    def test_workflow_has_start_and_end_nodes(self, workflow_extractor):
        workflows = workflow_extractor.extract_all_workflows()
        wf = workflows[0]

        step_types = [s.step_type for s in wf.steps]
        assert StepType.START in step_types
        assert StepType.END in step_types

        start_step = next(s for s in wf.steps if s.step_type == StepType.START)
        assert "req" in start_step.inputs or "background_tasks" in start_step.inputs

        end_step = next(s for s in wf.steps if s.step_type == StepType.END)
        assert "Complete" in end_step.name or "Response" in end_step.name

    def test_workflow_has_decision_and_failure_branches(self, workflow_extractor):
        workflows = workflow_extractor.extract_all_workflows()
        wf = workflows[0]

        decision_steps = [s for s in wf.steps if s.step_type == StepType.DECISION]
        failure_steps = [s for s in wf.steps if s.step_type == StepType.FAILURE]

        assert len(decision_steps) >= 1
        assert len(failure_steps) >= 1

        # Check that a failure transition exists connecting decision or step to failure
        failure_transitions = [t for t in wf.transitions if t.transition_type == TransitionType.FAILURE]
        assert len(failure_transitions) >= 1

    def test_workflow_has_retry_logic(self, workflow_extractor):
        workflows = workflow_extractor.extract_all_workflows()
        wf = workflows[0]

        retry_steps = [s for s in wf.steps if s.step_type == StepType.RETRY]
        assert len(retry_steps) >= 1

    def test_workflow_has_async_background_task(self, workflow_extractor):
        workflows = workflow_extractor.extract_all_workflows()
        wf = workflows[0]

        async_steps = [s for s in wf.steps if s.step_type == StepType.ASYNC_OP]
        assert len(async_steps) >= 1
        assert "Async" in async_steps[0].name

    def test_workflow_steps_have_traceable_source_evidence(self, workflow_extractor):
        workflows = workflow_extractor.extract_all_workflows()
        wf = workflows[0]

        for step in wf.steps:
            if step.evidence:
                assert step.evidence.file_path == "api/checkout_api.py"
                assert step.evidence.start_line > 0
                assert step.evidence.end_line >= step.evidence.start_line

    def test_workflow_transitions_connect_valid_nodes(self, workflow_extractor):
        workflows = workflow_extractor.extract_all_workflows()
        wf = workflows[0]

        step_ids = {s.id for s in wf.steps}
        for trans in wf.transitions:
            assert trans.source in step_ids, f"Source {trans.source} not in steps"
            assert trans.target in step_ids, f"Target {trans.target} not in steps"
