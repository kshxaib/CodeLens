from app.parser.blast_radius import compute_blast_radius


def test_compute_blast_radius_high_impact():
    sample_files = [
        {
            "file_path": "services/auth.py",
            "content": "def verify_token(token):\n    return check_jwt(token)\n",
            "language": "python",
        },
        {
            "file_path": "api/users.py",
            "content": "def get_user_profile():\n    verify_token('xyz')\n",
            "language": "python",
        },
        {
            "file_path": "api/repos.py",
            "content": "def list_repos():\n    verify_token('abc')\n",
            "language": "python",
        },
        {
            "file_path": "api/chat.py",
            "content": "def send_chat():\n    verify_token('123')\n",
            "language": "python",
        },
    ]

    blast = compute_blast_radius("verify_token", sample_files)
    assert blast is not None
    assert blast["target_symbol"] == "verify_token"
    assert blast["upstream_count"] >= 3
    assert blast["downstream_count"] >= 1  # check_jwt
    assert blast["risk_level"] in ("medium", "high")

    # Check node structure
    target_node = next(n for n in blast["nodes"] if n["id"] == "target_node")
    assert target_node["data"]["label"] == "verify_token"
    assert target_node["data"]["isTarget"] is True


def test_compute_blast_radius_isolated_symbol():
    sample_files = [
        {
            "file_path": "utils/format.py",
            "content": "def format_date(dt):\n    return dt\n",
            "language": "python",
        }
    ]

    blast = compute_blast_radius("format_date", sample_files)
    assert blast["target_symbol"] == "format_date"
    assert blast["upstream_count"] == 0
    assert blast["downstream_count"] == 0
    assert blast["risk_level"] == "low"
    assert len(blast["nodes"]) == 1


def test_compute_blast_radius_empty():
    blast = compute_blast_radius("", [])
    assert blast["risk_level"] == "low"
    assert len(blast["nodes"]) == 0
