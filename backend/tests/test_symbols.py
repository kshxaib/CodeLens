from app.parser.symbols import extract_symbols, Symbol


def test_extract_python_symbols():
    code = """import os
from datetime import datetime

class AuthService:
    def __init__(self, secret: str):
        self.secret = secret

    def authenticate_user(self, token: str) -> bool:
        validate_jwt(token)
        return True

def create_app():
    return FastAPI()
"""
    symbols = extract_symbols(code, "services/auth.py")
    assert len(symbols) > 0

    names = [s.name for s in symbols]
    assert "import os" in names
    assert "AuthService" in names
    assert "__init__" in names
    assert "authenticate_user" in names
    assert "validate_jwt" in names  # Call
    assert "create_app" in names

    # Check class method parent relationship
    auth_method = next(s for s in symbols if s.name == "authenticate_user")
    assert auth_method.parent == "AuthService"
    assert auth_method.kind == "method"

    # Check top level function
    create_app_fn = next(s for s in symbols if s.name == "create_app")
    assert create_app_fn.parent is None
    assert create_app_fn.kind == "function"


def test_extract_javascript_symbols():
    code = """import axios from 'axios';

export class UserService {
    async getUser(id) {
        return axios.get(`/users/${id}`);
    }
}

export const fetchMetrics = (repoId) => {
    return calculateMetrics(repoId);
};
"""
    symbols = extract_symbols(code, "src/services/user.js")
    assert len(symbols) > 0

    names = [s.name for s in symbols]
    assert "import axios from 'axios';" in names
    assert "UserService" in names
    assert "getUser" in names
    assert "fetchMetrics" in names
    assert "calculateMetrics" in names

    # Check arrow function
    arrow_fn = next(s for s in symbols if s.name == "fetchMetrics")
    assert arrow_fn.kind == "function"


def test_extract_empty_or_plain_text():
    assert extract_symbols("", "file.py") == []
    assert extract_symbols("   ", "file.py") == []

    # Markdown file fallback
    symbols_md = extract_symbols("# Heading 1\nSome docs\n", "README.md")
    assert isinstance(symbols_md, list)
