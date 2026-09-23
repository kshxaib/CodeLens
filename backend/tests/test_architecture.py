from app.parser.architecture import classify_layer, generate_architecture_graph


def test_classify_layer():
    assert classify_layer("frontend/src/App.jsx", []) == "frontend"
    assert classify_layer("frontend/src/components/Header.tsx", []) == "frontend"
    assert classify_layer("backend/app/api/auth.py", []) == "api_gateway"
    assert classify_layer("backend/app/main.py", []) == "api_gateway"
    assert classify_layer("backend/app/db/models.py", []) == "data"
    assert classify_layer("backend/app/db/session.py", []) == "data"
    assert classify_layer("backend/app/services/indexer.py", []) == "service"
    assert classify_layer("backend/app/core/security.py", []) == "service"


def test_generate_architecture_graph():
    sample_files = [
        {
            "file_path": "frontend/src/App.jsx",
            "content": "import { fetchUser } from './api'; export default function App() {}",
            "language": "javascript",
            "line_count": 10,
        },
        {
            "file_path": "backend/app/api/auth.py",
            "content": "from app.services.auth_service import verify_user\n@router.get('/me')\ndef me(): pass",
            "language": "python",
            "line_count": 25,
        },
        {
            "file_path": "backend/app/services/auth_service.py",
            "content": "from app.db.models import User\ndef verify_user(): pass",
            "language": "python",
            "line_count": 30,
        },
        {
            "file_path": "backend/app/db/models.py",
            "content": "class User(Base): id = Column(Integer)",
            "language": "python",
            "line_count": 50,
        },
    ]

    graph = generate_architecture_graph(sample_files)
    assert graph is not None
    assert "nodes" in graph
    assert "edges" in graph
    assert "summary" in graph

    assert len(graph["nodes"]) == 4
    assert graph["summary"]["total_nodes"] == 4
    assert graph["summary"]["layer_distribution"]["frontend"] == 1
    assert graph["summary"]["layer_distribution"]["api_gateway"] == 1
    assert graph["summary"]["layer_distribution"]["service"] == 1
    assert graph["summary"]["layer_distribution"]["data"] == 1

    # Check that edges exist between imported modules
    assert len(graph["edges"]) > 0
    edge_sources = [e["source"] for e in graph["edges"]]
    assert len(edge_sources) > 0
