"""
Entity classifier for the Architecture Knowledge Graph.

Determines the semantic EntityType and ArchLayer for files, classes,
and functions using a hierarchy of deterministic and inferred signals:

Priority (highest to lowest):
1. AST decorators (@router.get, @celery.task) — DETERMINISTIC
2. Base class analysis (Base, SQLModel, BaseModel) — HIGH
3. Class/file naming conventions (*Service, *Repository) — HIGH/MEDIUM
4. File path directory patterns (api/, services/, models/) — HIGH
5. Heuristic fallback — LOW

Uses NO external LLM calls. All classification is deterministic or
rule-based, with explicit confidence scores.
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

from app.parser.graph_schema import (
    EntityType,
    ArchLayer,
    ConfidenceLevel,
    CONFIDENCE_VALUES,
    ENTITY_DEFAULT_LAYER,
)


# ---------------------------------------------------------------------------
# Known external service packages
# ---------------------------------------------------------------------------

# Maps python package name / npm package name → (display_name, category)
# category drives the RelationshipType assigned to the edge
EXTERNAL_SERVICE_PACKAGES: Dict[str, Optional[Tuple[str, str]]] = {
    # Payment
    "stripe": ("Stripe", "payment"),
    "braintree": ("Braintree", "payment"),
    "paypalrestsdk": ("PayPal", "payment"),
    # Email
    "sendgrid": ("SendGrid", "email"),
    "mailgun": ("Mailgun", "email"),
    "postmark": ("Postmark", "email"),
    "resend": ("Resend", "email"),
    # Cloud / Storage
    "boto3": ("AWS S3", "storage"),
    "botocore": ("AWS", "cloud"),
    "cloudinary": ("Cloudinary", "storage"),
    # Auth
    "firebase_admin": ("Firebase Auth", "auth"),
    "python_jose": ("JWT", "auth"),
    "jose": ("JWT", "auth"),
    # Communication
    "twilio": ("Twilio", "communication"),
    "vonage": ("Vonage", "communication"),
    # Observability
    "sentry_sdk": ("Sentry", "monitoring"),
    "datadog": ("Datadog", "monitoring"),
    "opentelemetry": ("OpenTelemetry", "tracing"),
    # Queues / Workers
    "celery": ("Celery", "queue"),
    "dramatiq": ("Dramatiq", "queue"),
    "rq": ("Redis Queue", "queue"),
    "pika": ("RabbitMQ", "queue"),
    "confluent_kafka": ("Kafka", "queue"),
    # Databases (external client packages, not the DB itself)
    "pymongo": ("MongoDB", "database"),
    "elasticsearch": ("Elasticsearch", "search"),
    "qdrant_client": ("Qdrant", "vector_db"),
    "pinecone": ("Pinecone", "vector_db"),
    # Not external services (just HTTP clients — skip)
    "httpx": None,
    "requests": None,
    "aiohttp": None,
    "urllib3": None,
    # NPM equivalents
    "@stripe/stripe-js": ("Stripe", "payment"),
    "stripe": ("Stripe", "payment"),
    "@sendgrid/mail": ("SendGrid", "email"),
    "twilio": ("Twilio", "communication"),
    "firebase": ("Firebase", "auth"),
    "@firebase/app": ("Firebase", "auth"),
    "aws-sdk": ("AWS", "cloud"),
    "@aws-sdk/client-s3": ("AWS S3", "storage"),
    "sentry": ("Sentry", "monitoring"),
    "@sentry/react": ("Sentry", "monitoring"),
    "datadog-browser-rum": ("Datadog", "monitoring"),
}

# ---------------------------------------------------------------------------
# Naming pattern rules
# ---------------------------------------------------------------------------

# (compiled regex, entity_type, confidence_level)
CLASS_NAME_RULES: List[Tuple[re.Pattern, EntityType, ConfidenceLevel]] = [
    (re.compile(r".*Service$"),       EntityType.SERVICE,        ConfidenceLevel.HIGH),
    (re.compile(r".*Manager$"),       EntityType.SERVICE,        ConfidenceLevel.MEDIUM),
    (re.compile(r".*Handler$"),       EntityType.SERVICE,        ConfidenceLevel.MEDIUM),
    (re.compile(r".*UseCase$"),       EntityType.SERVICE,        ConfidenceLevel.HIGH),
    (re.compile(r".*Interactor$"),    EntityType.SERVICE,        ConfidenceLevel.HIGH),
    (re.compile(r".*Controller$"),    EntityType.API_ENDPOINT,   ConfidenceLevel.HIGH),
    (re.compile(r".*Router$"),        EntityType.API_ENDPOINT,   ConfidenceLevel.HIGH),
    (re.compile(r".*View$"),          EntityType.API_ENDPOINT,   ConfidenceLevel.MEDIUM),
    (re.compile(r".*Repository$"),    EntityType.DATABASE_MODEL, ConfidenceLevel.HIGH),
    (re.compile(r".*Repo$"),          EntityType.DATABASE_MODEL, ConfidenceLevel.HIGH),
    (re.compile(r".*DAO$"),           EntityType.DATABASE_MODEL, ConfidenceLevel.HIGH),
    (re.compile(r".*Store$"),         EntityType.DATABASE_MODEL, ConfidenceLevel.MEDIUM),
    (re.compile(r".*Model$"),         EntityType.DATABASE_MODEL, ConfidenceLevel.MEDIUM),
    (re.compile(r".*Schema$"),        EntityType.DATABASE_MODEL, ConfidenceLevel.MEDIUM),
    (re.compile(r".*Entity$"),        EntityType.DATABASE_MODEL, ConfidenceLevel.HIGH),
    (re.compile(r".*Table$"),         EntityType.DATABASE_MODEL, ConfidenceLevel.HIGH),
    (re.compile(r".*Worker$"),        EntityType.WORKER,         ConfidenceLevel.HIGH),
    (re.compile(r".*Task$"),          EntityType.WORKER,         ConfidenceLevel.HIGH),
    (re.compile(r".*Job$"),           EntityType.WORKER,         ConfidenceLevel.MEDIUM),
    (re.compile(r".*Consumer$"),      EntityType.WORKER,         ConfidenceLevel.HIGH),
    (re.compile(r".*Client$"),        EntityType.EXTERNAL_SERVICE, ConfidenceLevel.MEDIUM),
    (re.compile(r".*Middleware$"),    EntityType.MODULE,         ConfidenceLevel.MEDIUM),
    # React component heuristic: capitalized, ends in Page/Component/Widget/Layout
    (re.compile(r"[A-Z][a-zA-Z]+Page$"),      EntityType.COMPONENT, ConfidenceLevel.HIGH),
    (re.compile(r"[A-Z][a-zA-Z]+Component$"), EntityType.COMPONENT, ConfidenceLevel.HIGH),
    (re.compile(r"[A-Z][a-zA-Z]+Widget$"),    EntityType.COMPONENT, ConfidenceLevel.MEDIUM),
    (re.compile(r"[A-Z][a-zA-Z]+Layout$"),    EntityType.COMPONENT, ConfidenceLevel.HIGH),
    (re.compile(r"[A-Z][a-zA-Z]+Modal$"),     EntityType.COMPONENT, ConfidenceLevel.HIGH),
]

# File path directory → (entity_type, layer, confidence_level)
# Checked in order — first match wins
FILE_PATH_RULES: List[Tuple[str, EntityType, ArchLayer, ConfidenceLevel]] = [
    # Frontend
    ("pages/",             EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("components/",        EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("views/",             EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.MEDIUM),
    ("screens/",           EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("layouts/",           EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    # API / Routes
    ("api/",               EntityType.API_ENDPOINT,  ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("routes/",            EntityType.API_ENDPOINT,  ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("controllers/",       EntityType.API_ENDPOINT,  ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("endpoints/",         EntityType.API_ENDPOINT,  ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    # Application / Business Logic
    ("services/",          EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("usecases/",          EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("use_cases/",         EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("handlers/",          EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.MEDIUM),
    # Workers
    ("workers/",           EntityType.WORKER,        ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("tasks/",             EntityType.WORKER,        ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("jobs/",              EntityType.WORKER,        ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    # Domain models
    ("models/",            EntityType.DATABASE_MODEL,ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("schemas/",           EntityType.DATABASE_MODEL,ArchLayer.DOMAIN,        ConfidenceLevel.MEDIUM),
    ("entities/",          EntityType.DATABASE_MODEL,ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("domain/",            EntityType.MODULE,        ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    # Infrastructure
    ("repositories/",      EntityType.DATABASE_MODEL,ArchLayer.INFRASTRUCTURE,ConfidenceLevel.HIGH),
    ("db/",                EntityType.MODULE,        ArchLayer.INFRASTRUCTURE, ConfidenceLevel.HIGH),
    ("database/",          EntityType.MODULE,        ArchLayer.INFRASTRUCTURE, ConfidenceLevel.HIGH),
    ("rag/",               EntityType.SERVICE,       ArchLayer.INFRASTRUCTURE, ConfidenceLevel.MEDIUM),
    # Utilities / Config
    ("utils/",             EntityType.FUNCTION,      ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("helpers/",           EntityType.FUNCTION,      ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("core/",              EntityType.MODULE,        ArchLayer.APPLICATION,   ConfidenceLevel.MEDIUM),
    ("config/",            EntityType.MODULE,        ArchLayer.INFRASTRUCTURE, ConfidenceLevel.HIGH),
    ("middleware/",        EntityType.MODULE,        ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("hooks/",             EntityType.FUNCTION,      ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("store/",             EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.MEDIUM),
    ("context/",           EntityType.MODULE,        ArchLayer.PRESENTATION,  ConfidenceLevel.MEDIUM),
]

# Python decorator text → (entity_type, layer)
DECORATOR_RULES: Dict[str, Tuple[EntityType, ArchLayer]] = {
    "router.get":       (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "router.post":      (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "router.put":       (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "router.delete":    (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "router.patch":     (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "app.get":          (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "app.post":         (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "app.put":          (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "app.delete":       (EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY),
    "celery.task":      (EntityType.WORKER, ArchLayer.APPLICATION),
    "shared_task":      (EntityType.WORKER, ArchLayer.APPLICATION),
    "app.task":         (EntityType.WORKER, ArchLayer.APPLICATION),
    "dramatiq.actor":   (EntityType.WORKER, ArchLayer.APPLICATION),
    "rq.job":           (EntityType.WORKER, ArchLayer.APPLICATION),
}

# Python base class name → (entity_type, layer)
BASE_CLASS_RULES: Dict[str, Tuple[EntityType, ArchLayer]] = {
    "Base":             (EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE),
    "DeclarativeBase":  (EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE),
    "DeclarativeMeta":  (EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE),
    "SQLModel":         (EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE),
    "BaseModel":        (EntityType.DATABASE_MODEL, ArchLayer.DOMAIN),   # Pydantic
    "Schema":           (EntityType.DATABASE_MODEL, ArchLayer.DOMAIN),
    "TypedDict":        (EntityType.DATABASE_MODEL, ArchLayer.DOMAIN),
    "ABC":              (EntityType.CLASS_DEF,       ArchLayer.DOMAIN),
    "AbstractModel":    (EntityType.DATABASE_MODEL,  ArchLayer.DOMAIN),
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

ClassifyResult = Tuple[EntityType, ArchLayer, float, ConfidenceLevel]


def classify_file(
    file_path: str,
    symbols: List[Any],
    content: str,
    language: str,
) -> ClassifyResult:
    """
    Classify a source file into an EntityType and ArchLayer.

    Returns (entity_type, layer, confidence_score, confidence_level).

    Decision priority:
    1. File extension (React files are always COMPONENT)
    2. AST decorator patterns (FastAPI routes, Celery tasks)
    3. ORM base class patterns (SQLAlchemy, Pydantic)
    4. Class naming conventions
    5. Directory path patterns
    6. Fallback: MODULE / UNKNOWN
    """
    path = file_path.replace("\\", "/")
    path_lower = path.lower()
    ext = Path(path).suffix.lower()
    stem = Path(path).stem

    # 1. Frontend by extension — DETERMINISTIC
    if ext in (".jsx", ".tsx"):
        return EntityType.COMPONENT, ArchLayer.PRESENTATION, 1.0, ConfidenceLevel.DETERMINISTIC
    if ext in (".html", ".css", ".scss", ".sass", ".vue", ".svelte"):
        return EntityType.COMPONENT, ArchLayer.PRESENTATION, 1.0, ConfidenceLevel.DETERMINISTIC

    # 2. Main entry point detection — DETERMINISTIC
    if stem in ("main", "app", "index", "server") and language == "python":
        if re.search(r"FastAPI\(|Flask\(|uvicorn|django", content):
            return EntityType.APPLICATION, ArchLayer.API_GATEWAY, 1.0, ConfidenceLevel.DETERMINISTIC

    # 3. Python: decorator-based detection — DETERMINISTIC (decorator is explicit)
    if language == "python":
        for decorator_text, (etype, elayer) in DECORATOR_RULES.items():
            pattern = rf"@(?:{re.escape(decorator_text)})\s*[\(\s]"
            if re.search(pattern, content):
                return etype, elayer, CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH

        # 4. ORM base class detection — HIGH
        # Pattern 1: class Foo(Base): style inheritance
        if re.search(
            r"class\s+\w+\s*\(\s*(?:Base|DeclarativeBase|SQLModel)\s*\)", content
        ):
            return (
                EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )

        # Pattern 2: Base = declarative_base() style (functional declaration)
        if re.search(r"declarative_base\(\)|DeclarativeBase\(\)", content):
            return (
                EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )

        # Pydantic
        if re.search(r"class\s+\w+\s*\(\s*(?:BaseModel|Schema)\s*\)", content):
            return (
                EntityType.DATABASE_MODEL, ArchLayer.DOMAIN,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )

        # 5. Class naming rules — HIGH/MEDIUM
        for sym in symbols:
            if sym.kind == "class":
                for pattern, etype, conf_level in CLASS_NAME_RULES:
                    if pattern.match(sym.name):
                        layer = ENTITY_DEFAULT_LAYER.get(etype, ArchLayer.UNKNOWN)
                        return etype, layer, CONFIDENCE_VALUES[conf_level], conf_level

    # 6. JS/TS: detect React components — HIGH
    if language in ("javascript", "typescript", "tsx"):
        # React component: capitalized export
        if re.search(
            r"export\s+(?:default\s+)?(?:function|const)\s+[A-Z][a-zA-Z]+", content
        ):
            return (
                EntityType.COMPONENT, ArchLayer.PRESENTATION,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )
        # Express/Koa router
        if re.search(r"(?:router|app)\.(get|post|put|delete|patch)\s*\(", content, re.I):
            return (
                EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )
        # Custom React hooks
        if re.search(r"export\s+(?:const|function)\s+use[A-Z]", content):
            return (
                EntityType.FUNCTION, ArchLayer.PRESENTATION,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )

    # 7. Directory path patterns — MEDIUM/HIGH
    for dir_pattern, etype, elayer, conf_level in FILE_PATH_RULES:
        if dir_pattern in path_lower:
            return etype, elayer, CONFIDENCE_VALUES[conf_level], conf_level

    # 8. Fallback
    return EntityType.MODULE, ArchLayer.UNKNOWN, CONFIDENCE_VALUES[ConfidenceLevel.LOW], ConfidenceLevel.LOW


def classify_class(
    class_name: str,
    base_classes: List[str],
    content: str,
    file_context_type: EntityType,
) -> ClassifyResult:
    """
    Classify a specific class within a file.

    Checks base classes first (highest confidence), then naming patterns.
    Falls back to the file's context type.
    """
    # Base class rules — HIGH confidence
    for base in base_classes:
        # Handle qualified names: "sqlalchemy.orm.DeclarativeBase" → "DeclarativeBase"
        base_clean = base.strip().split(".")[-1]
        if base_clean in BASE_CLASS_RULES:
            etype, elayer = BASE_CLASS_RULES[base_clean]
            return etype, elayer, CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH

    # Naming convention rules
    for pattern, etype, conf_level in CLASS_NAME_RULES:
        if pattern.match(class_name):
            layer = ENTITY_DEFAULT_LAYER.get(etype, ArchLayer.UNKNOWN)
            return etype, layer, CONFIDENCE_VALUES[conf_level], conf_level

    # Fall back to file context
    layer = ENTITY_DEFAULT_LAYER.get(file_context_type, ArchLayer.UNKNOWN)
    return EntityType.CLASS_DEF, layer, CONFIDENCE_VALUES[ConfidenceLevel.LOW], ConfidenceLevel.LOW


def detect_external_service_imports(
    content: str,
    language: str,
) -> List[Tuple[str, str, str]]:
    """
    Detect imports of known external service packages.

    Returns list of (package_key, display_name, category) tuples.
    Only returns packages that have a non-None entry in EXTERNAL_SERVICE_PACKAGES.
    """
    detected: Dict[str, Tuple[str, str, str]] = {}

    if language == "python":
        # Match: `import stripe` or `from stripe import ...`
        pattern = re.compile(r"^(?:import|from)\s+([\w]+)", re.MULTILINE)
        for m in pattern.finditer(content):
            pkg = m.group(1)
            if pkg in EXTERNAL_SERVICE_PACKAGES and EXTERNAL_SERVICE_PACKAGES[pkg]:
                display, category = EXTERNAL_SERVICE_PACKAGES[pkg]
                detected[pkg] = (pkg, display, category)

    elif language in ("javascript", "typescript", "tsx", "jsx"):
        # Match: `import X from 'stripe'` or `require('stripe')`
        pattern = re.compile(
            r"""(?:import\b[^'"]*?from\s+|require\s*\(\s*)['"]([^'"./][^'"]*)['"]"""
        )
        for m in pattern.finditer(content):
            raw_pkg = m.group(1)
            # Handle scoped packages: @stripe/stripe-js → check full name first
            pkg_key = raw_pkg
            if pkg_key not in EXTERNAL_SERVICE_PACKAGES:
                # Try just the base name
                pkg_key = raw_pkg.split("/")[0]
            if pkg_key in EXTERNAL_SERVICE_PACKAGES and EXTERNAL_SERVICE_PACKAGES[pkg_key]:
                display, category = EXTERNAL_SERVICE_PACKAGES[pkg_key]
                detected[pkg_key] = (pkg_key, display, category)

    return list(detected.values())


def extract_base_classes(content: str, class_name: str) -> List[str]:
    """
    Extract the list of base class names for a given class from source.
    Handles single and multi-inheritance, module-qualified names, and multiline.
    """
    pattern = re.compile(
        rf"class\s+{re.escape(class_name)}\s*\(([^)]*)\)",
        re.DOTALL,
    )
    m = pattern.search(content)
    if m:
        raw = m.group(1)
        bases = []
        for part in raw.split(","):
            # Normalize whitespace
            part = re.sub(r"\s+", " ", part).strip()
            if not part or "=" in part:
                continue
            # Strip module qualifiers: sqlalchemy.orm.DeclarativeBase → DeclarativeBase
            base_clean = part.split(".")[-1].strip()
            if base_clean:
                bases.append(base_clean)
        return bases
    return []


def extract_route_decorators(content: str) -> List[Dict[str, Any]]:
    """
    Extract FastAPI/Flask route decorator metadata.
    Returns list of dicts: {method, path, line, function_name}.
    """
    results = []
    # Match: @router.get("/path") or @app.post("/path", ...)
    dec_pattern = re.compile(
        r"@(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]",
        re.IGNORECASE,
    )
    fn_pattern = re.compile(r"async\s+def\s+(\w+)|def\s+(\w+)", re.MULTILINE)

    for m in dec_pattern.finditer(content):
        line_no = content[: m.start()].count("\n") + 1
        # Find the immediately following function name
        fn_match = fn_pattern.search(content, m.end())
        fn_name = ""
        if fn_match and content[m.end(): fn_match.start()].count("\n") <= 2:
            fn_name = fn_match.group(1) or fn_match.group(2)

        results.append({
            "method": m.group(1).upper(),
            "path": m.group(2),
            "line": line_no,
            "function_name": fn_name,
        })

    return results
