"""
Automated test suite for CodeLens Data Flow Extraction Engine.

Tests data lineage, transformations, schemas, DTOs, database models,
and evidence-backed data flow edges using realistic application fixtures.
"""
import pytest
from app.parser.graph_schema import KnowledgeGraph
from app.parser.knowledge_graph import build_knowledge_graph
from app.parser.data_flow_extractor import (
    DataFlowExtractor,
    DataClassification,
    DataFormat,
    DataPipeline,
    DataNode,
    DataFlowEdge,
)


PAYMENT_CHECKOUT_FIXTURES = [
    {
        "file_path": "backend/controllers/checkout.controller.js",
        "language": "javascript",
        "line_count": 60,
        "content": """
import { db } from "../utils/db.js";
import { razorpayInstance } from "../utils/razorpay.js";
import bcrypt from "bcryptjs";

export const processCheckout = async (req, res) => {
    const { cartId, customerEmail, shippingAddress, items, rawPassword } = req.body;

    if (!cartId || !customerEmail || !items || items.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid payload" });
    }

    try {
        const hashedPassword = await bcrypt.hash(rawPassword, 10);
        
        const subtotal = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        const tax = subtotal * 0.08;
        const totalAmount = subtotal + tax;

        const order = await razorpayInstance.orders.create({
            amount: totalAmount * 100,
            currency: "USD",
            receipt: `order_${cartId}`,
        });

        const newOrder = await db.order.create({
            data: {
                cartId,
                customerEmail,
                totalAmount,
                shippingAddress,
                status: "PENDING_PAYMENT",
            }
        });

        return res.status(200).json({
            success: true,
            orderId: newOrder.id,
            totalAmount,
            razorpayOrderId: order.id,
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};
""",
    },
    {
        "file_path": "backend/prisma/schema.prisma",
        "language": "prisma",
        "line_count": 25,
        "content": """
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Order {
  id              String   @id @default(uuid())
  cartId          String
  customerEmail   String
  totalAmount     Float
  shippingAddress String
  status          String
  createdAt       DateTime @default(now())
}
""",
    },
    {
        "file_path": "backend/app/api/videos.py",
        "language": "python",
        "line_count": 45,
        "content": """
from fastapi import APIRouter, Depends, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

router = APIRouter()

class VideoMetadataPayload(BaseModel):
    title: str
    description: str
    category: str

class VideoUploadResponse(BaseModel):
    video_id: str
    status: str
    streaming_url: str

@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(
    payload: VideoMetadataPayload,
    video_file: UploadFile = File(...),
    db: Session = Depends(),
):
    # Validation and transcoding
    transcoded_data = {"format": "1080p_h264", "bitrate": "4500k"}
    db_record = VideoModel(title=payload.title, status="READY")
    db.add(db_record)
    db.commit()
    return VideoUploadResponse(video_id="vid_123", status="SUCCESS", streaming_url="https://cdn.example.com/v.mp4")
""",
    },
]


@pytest.fixture(scope="module")
def knowledge_graph():
    return build_knowledge_graph(PAYMENT_CHECKOUT_FIXTURES)


@pytest.fixture(scope="module")
def extractor(knowledge_graph):
    return DataFlowExtractor(PAYMENT_CHECKOUT_FIXTURES, knowledge_graph)


@pytest.fixture(scope="module")
def pipelines(extractor):
    return extractor.extract_all_pipelines()


class TestDataFlowExtraction:
    """Verifies that the data flow engine extracts schemas, models, and transformations."""

    def test_pipelines_discovered(self, pipelines):
        assert len(pipelines) >= 2
        names = [p.name for p in pipelines]
        assert any("Checkout" in n for n in names)
        assert any("Video" in n or "Upload" in n for n in names)

    def test_inbound_request_payload_extracted(self, pipelines):
        checkout_pipeline = next((p for p in pipelines if "checkout" in p.id), None)
        assert checkout_pipeline is not None

        req_node = next(
            (n for n in checkout_pipeline.nodes if n.data_classification == DataClassification.REQUEST_PAYLOAD),
            None,
        )
        assert req_node is not None
        assert "cartId" in req_node.fields
        assert "customerEmail" in req_node.fields
        assert req_node.evidence is not None
        assert req_node.evidence["file_path"] == "backend/controllers/checkout.controller.js"

    def test_explicit_transformation_steps_present(self, pipelines):
        checkout_pipeline = next((p for p in pipelines if "checkout" in p.id), None)
        assert checkout_pipeline is not None

        transform_nodes = [n for n in checkout_pipeline.nodes if n.is_transformation]
        assert len(transform_nodes) >= 2  # Validation and calculations or hashing

        trans_names = [t.name.lower() for t in transform_nodes]
        assert any("validation" in t for t in trans_names)
        assert any("hashing" in t or "calculation" in t for t in trans_names)

    def test_cryptographic_and_calculation_transformations(self, pipelines):
        checkout_pipeline = next((p for p in pipelines if "checkout" in p.id), None)
        assert checkout_pipeline is not None

        hash_node = next((n for n in checkout_pipeline.nodes if "bcrypt" in n.id), None)
        assert hash_node is not None
        assert hash_node.data_classification == DataClassification.TRANSFORMATION_STEP

        calc_node = next((n for n in checkout_pipeline.nodes if "calculation" in n.id), None)
        assert calc_node is not None

    def test_database_model_storage_destination(self, pipelines):
        checkout_pipeline = next((p for p in pipelines if "checkout" in p.id), None)
        assert checkout_pipeline is not None

        db_node = next(
            (n for n in checkout_pipeline.nodes if n.data_classification == DataClassification.DATABASE_MODEL),
            None,
        )
        assert db_node is not None
        assert "PostgreSQL" in (db_node.storage or "")
        assert "Order" in db_node.name

    def test_outbound_response_payload(self, pipelines):
        checkout_pipeline = next((p for p in pipelines if "checkout" in p.id), None)
        assert checkout_pipeline is not None

        res_node = next(
            (n for n in checkout_pipeline.nodes if n.data_classification == DataClassification.RESPONSE_PAYLOAD),
            None,
        )
        assert res_node is not None
        assert "Response Payload" in res_node.name
        assert "HTTP 200" in (res_node.storage or "")

    def test_data_flow_edges_have_evidence_and_types(self, pipelines):
        checkout_pipeline = next((p for p in pipelines if "checkout" in p.id), None)
        assert checkout_pipeline is not None

        assert len(checkout_pipeline.edges) >= 4
        for edge in checkout_pipeline.edges:
            assert edge.data_type != ""
            assert edge.transformation != ""
            assert edge.confidence > 0.0
            assert edge.evidence is not None
            assert "start_line" in edge.evidence

    def test_python_pydantic_to_sqlalchemy_pipeline(self, pipelines):
        video_pipeline = next((p for p in pipelines if "upload" in p.id), None)
        assert video_pipeline is not None

        req_node = next(
            (n for n in video_pipeline.nodes if n.data_classification == DataClassification.REQUEST_PAYLOAD),
            None,
        )
        assert req_node is not None

        db_node = next(
            (n for n in video_pipeline.nodes if n.data_classification == DataClassification.DATABASE_MODEL),
            None,
        )
        assert db_node is not None
        assert "SQLAlchemy" in db_node.name or "PostgreSQL" in (db_node.storage or "")

    def test_consolidated_global_data_graph(self, extractor, pipelines):
        global_graph = extractor.extract_consolidated_graph(pipelines)
        assert "nodes" in global_graph
        assert "edges" in global_graph
        assert global_graph["total_entities"] > 0
        assert global_graph["total_transitions"] > 0
