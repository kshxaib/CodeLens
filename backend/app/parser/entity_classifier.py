from __future__ import annotations

import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

from app.parser.graph_schema import EntityType, ArchLayer, ConfidenceLevel, CONFIDENCE_VALUES, ENTITY_DEFAULT_LAYER

EXTERNAL_SERVICE_PACKAGES: Dict[str, Optional[Tuple[str, str]]] = {
    "stripe": ("Stripe", "payment"),
    "braintree": ("Braintree", "payment"),
    "paypalrestsdk": ("PayPal", "payment"),
    "sendgrid": ("SendGrid", "email"),
    "mailgun": ("Mailgun", "email"),
    "postmark": ("Postmark", "email"),
    "resend": ("Resend", "email"),
    "boto3": ("AWS S3", "storage"),
    "botocore": ("AWS", "cloud"),
    "cloudinary": ("Cloudinary", "storage"),
    "firebase_admin": ("Firebase Auth", "auth"),
    "python_jose": ("JWT", "auth"),
    "jose": ("JWT", "auth"),
    "twilio": ("Twilio", "communication"),
    "vonage": ("Vonage", "communication"),
    "sentry_sdk": ("Sentry", "monitoring"),
    "datadog": ("Datadog", "monitoring"),
    "opentelemetry": ("OpenTelemetry", "tracing"),
    "celery": ("Celery", "queue"),
    "dramatiq": ("Dramatiq", "queue"),
    "rq": ("Redis Queue", "queue"),
    "pika": ("RabbitMQ", "queue"),
    "confluent_kafka": ("Kafka", "queue"),
    "pymongo": ("MongoDB", "database"),
    "elasticsearch": ("Elasticsearch", "search"),
    "qdrant_client": ("Qdrant", "vector_db"),
    "pinecone": ("Pinecone", "vector_db"),
    "httpx": None,
    "requests": None,
    "aiohttp": None,
    "urllib3": None,
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
    (re.compile(r"[A-Z][a-zA-Z]+Page$"),      EntityType.COMPONENT, ConfidenceLevel.HIGH),
    (re.compile(r"[A-Z][a-zA-Z]+Component$"), EntityType.COMPONENT, ConfidenceLevel.HIGH),
    (re.compile(r"[A-Z][a-zA-Z]+Widget$"),    EntityType.COMPONENT, ConfidenceLevel.MEDIUM),
    (re.compile(r"[A-Z][a-zA-Z]+Layout$"),    EntityType.COMPONENT, ConfidenceLevel.HIGH),
    (re.compile(r"[A-Z][a-zA-Z]+Modal$"),     EntityType.COMPONENT, ConfidenceLevel.HIGH),
]

FILE_PATH_RULES: List[Tuple[str, EntityType, ArchLayer, ConfidenceLevel]] = [
    ("pages/",             EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("components/",        EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("views/",             EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.MEDIUM),
    ("screens/",           EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("layouts/",           EntityType.COMPONENT,     ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("api/",               EntityType.API_ENDPOINT,  ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("routes/",            EntityType.API_ENDPOINT,  ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("controllers/",       EntityType.API_ENDPOINT,  ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("endpoints/",         EntityType.API_ENDPOINT,  ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("services/",          EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("usecases/",          EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("use_cases/",         EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("handlers/",          EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.MEDIUM),
    ("workers/",           EntityType.WORKER,        ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("tasks/",             EntityType.WORKER,        ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("jobs/",              EntityType.WORKER,        ArchLayer.APPLICATION,   ConfidenceLevel.HIGH),
    ("models/",            EntityType.DATABASE_MODEL,ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("schemas/",           EntityType.DATABASE_MODEL,ArchLayer.DOMAIN,        ConfidenceLevel.MEDIUM),
    ("entities/",          EntityType.DATABASE_MODEL,ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("domain/",            EntityType.MODULE,        ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("repositories/",      EntityType.DATABASE_MODEL,ArchLayer.INFRASTRUCTURE,ConfidenceLevel.HIGH),
    ("db/",                EntityType.MODULE,        ArchLayer.INFRASTRUCTURE, ConfidenceLevel.HIGH),
    ("database/",          EntityType.MODULE,        ArchLayer.INFRASTRUCTURE, ConfidenceLevel.HIGH),
    ("rag/",               EntityType.SERVICE,       ArchLayer.INFRASTRUCTURE, ConfidenceLevel.MEDIUM),
    ("utils/",             EntityType.FUNCTION,      ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("helpers/",           EntityType.FUNCTION,      ArchLayer.DOMAIN,        ConfidenceLevel.HIGH),
    ("core/",              EntityType.MODULE,        ArchLayer.APPLICATION,   ConfidenceLevel.MEDIUM),
    ("config/",            EntityType.MODULE,        ArchLayer.INFRASTRUCTURE, ConfidenceLevel.HIGH),
    ("middleware/",        EntityType.MODULE,        ArchLayer.API_GATEWAY,   ConfidenceLevel.HIGH),
    ("hooks/",             EntityType.FUNCTION,      ArchLayer.PRESENTATION,  ConfidenceLevel.HIGH),
    ("store/",             EntityType.SERVICE,       ArchLayer.APPLICATION,   ConfidenceLevel.MEDIUM),
    ("context/",           EntityType.MODULE,        ArchLayer.PRESENTATION,  ConfidenceLevel.MEDIUM),
]

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

BASE_CLASS_RULES: Dict[str, Tuple[EntityType, ArchLayer]] = {
    "Base":             (EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE),
    "DeclarativeBase":  (EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE),
    "DeclarativeMeta":  (EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE),
    "SQLModel":         (EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE),
    "BaseModel":        (EntityType.DATABASE_MODEL, ArchLayer.DOMAIN),
    "Schema":           (EntityType.DATABASE_MODEL, ArchLayer.DOMAIN),
    "TypedDict":        (EntityType.DATABASE_MODEL, ArchLayer.DOMAIN),
    "ABC":              (EntityType.CLASS_DEF,       ArchLayer.DOMAIN),
    "AbstractModel":    (EntityType.DATABASE_MODEL,  ArchLayer.DOMAIN),
}

ClassifyResult = Tuple[EntityType, ArchLayer, float, ConfidenceLevel]

def classify_file(
    file_path: str,
    symbols: List[Any],
    content: str,
    language: str,
) -> ClassifyResult:
    path = file_path.replace("\\", "/")
    path_lower = path.lower()
    ext = Path(path).suffix.lower()
    stem = Path(path).stem

    if ext in (".jsx", ".tsx"):
        return EntityType.COMPONENT, ArchLayer.PRESENTATION, 1.0, ConfidenceLevel.DETERMINISTIC
    if ext in (".html", ".css", ".scss", ".sass", ".vue", ".svelte"):
        return EntityType.COMPONENT, ArchLayer.PRESENTATION, 1.0, ConfidenceLevel.DETERMINISTIC

    if stem in ("main", "app", "index", "server") and (language == "python" or ext in (".py", ".js", ".ts")):
        if not content or re.search(r"FastAPI\(|Flask\(|uvicorn|django|express|createServer", content):
            return EntityType.APPLICATION, ArchLayer.API_GATEWAY, 1.0, ConfidenceLevel.DETERMINISTIC
        return EntityType.APPLICATION, ArchLayer.API_GATEWAY, CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH

    if language == "python":
        for decorator_text, (etype, elayer) in DECORATOR_RULES.items():
            pattern = rf"@(?:{re.escape(decorator_text)})\s*[\(\s]"
            if re.search(pattern, content):
                return etype, elayer, CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH

        if re.search(
            r"class\s+\w+\s*\(\s*(?:Base|DeclarativeBase|SQLModel)\s*\)", content
        ):
            return (
                EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )

        if re.search(r"declarative_base\(\)|DeclarativeBase\(\)", content):
            return (
                EntityType.DATABASE_MODEL, ArchLayer.INFRASTRUCTURE,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )

        if re.search(r"class\s+\w+\s*\(\s*(?:BaseModel|Schema)\s*\)", content):
            return (
                EntityType.DATABASE_MODEL, ArchLayer.DOMAIN,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )

        for sym in symbols:
            if sym.kind == "class":
                for pattern, etype, conf_level in CLASS_NAME_RULES:
                    if pattern.match(sym.name):
                        layer = ENTITY_DEFAULT_LAYER.get(etype, ArchLayer.UNKNOWN)
                        return etype, layer, CONFIDENCE_VALUES[conf_level], conf_level

    if language in ("javascript", "typescript", "tsx"):
        if re.search(
            r"export\s+(?:default\s+)?(?:function|const)\s+[A-Z][a-zA-Z]+", content
        ):
            return (
                EntityType.COMPONENT, ArchLayer.PRESENTATION,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )
        if re.search(r"(?:router|app)\.(get|post|put|delete|patch)\s*\(", content, re.I):
            return (
                EntityType.API_ENDPOINT, ArchLayer.API_GATEWAY,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )
        if re.search(r"export\s+(?:const|function)\s+use[A-Z]", content):
            return (
                EntityType.FUNCTION, ArchLayer.PRESENTATION,
                CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH,
            )

    for dir_pattern, etype, elayer, conf_level in FILE_PATH_RULES:
        if dir_pattern in path_lower:
            return etype, elayer, CONFIDENCE_VALUES[conf_level], conf_level

    return EntityType.MODULE, ArchLayer.UNKNOWN, CONFIDENCE_VALUES[ConfidenceLevel.LOW], ConfidenceLevel.LOW

def classify_class(
    class_name: str,
    base_classes: List[str],
    content: str,
    file_context_type: EntityType,
) -> ClassifyResult:
    for base in base_classes:
        base_clean = base.strip().split(".")[-1]
        if base_clean in BASE_CLASS_RULES:
            etype, elayer = BASE_CLASS_RULES[base_clean]
            return etype, elayer, CONFIDENCE_VALUES[ConfidenceLevel.HIGH], ConfidenceLevel.HIGH

    for pattern, etype, conf_level in CLASS_NAME_RULES:
        if pattern.match(class_name):
            layer = ENTITY_DEFAULT_LAYER.get(etype, ArchLayer.UNKNOWN)
            return etype, layer, CONFIDENCE_VALUES[conf_level], conf_level

    layer = ENTITY_DEFAULT_LAYER.get(file_context_type, ArchLayer.UNKNOWN)
    return EntityType.CLASS_DEF, layer, CONFIDENCE_VALUES[ConfidenceLevel.LOW], ConfidenceLevel.LOW

def detect_external_service_imports(
    content: str,
    language: str,
) -> List[Tuple[str, str, str]]:
    detected: Dict[str, Tuple[str, str, str]] = {}

    if language == "python":
        pattern = re.compile(r"^(?:import|from)\s+([\w]+)", re.MULTILINE)
        for m in pattern.finditer(content):
            pkg = m.group(1)
            if pkg in EXTERNAL_SERVICE_PACKAGES and EXTERNAL_SERVICE_PACKAGES[pkg]:
                display, category = EXTERNAL_SERVICE_PACKAGES[pkg]
                detected[pkg] = (pkg, display, category)

    elif language in ("javascript", "typescript", "tsx", "jsx"):
        pattern = re.compile(
            r"""(?:import\b[^'"]*?from\s+|require\s*\(\s*)['"]([^'"./][^'"]*)['"]"""
        )
        for m in pattern.finditer(content):
            raw_pkg = m.group(1)
            pkg_key = raw_pkg
            if pkg_key not in EXTERNAL_SERVICE_PACKAGES:
                pkg_key = raw_pkg.split("/")[0]
            if pkg_key in EXTERNAL_SERVICE_PACKAGES and EXTERNAL_SERVICE_PACKAGES[pkg_key]:
                display, category = EXTERNAL_SERVICE_PACKAGES[pkg_key]
                detected[pkg_key] = (pkg_key, display, category)

    return list(detected.values())

def extract_base_classes(content: str, class_name: str) -> List[str]:
    pattern = re.compile(
        rf"class\s+{re.escape(class_name)}\s*\(([^)]*)\)",
        re.DOTALL,
    )
    m = pattern.search(content)
    if m:
        raw = m.group(1)
        bases = []
        for part in raw.split(","):
            part = re.sub(r"\s+", " ", part).strip()
            if not part or "=" in part:
                continue
            base_clean = part.split(".")[-1].strip()
            if base_clean:
                bases.append(base_clean)
        return bases
    return []

def extract_route_decorators(content: str) -> List[Dict[str, Any]]:
    results = []
    dec_pattern = re.compile(
        r"@(?:router|app)\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]",
        re.IGNORECASE,
    )
    fn_pattern = re.compile(r"async\s+def\s+(\w+)|def\s+(\w+)", re.MULTILINE)

    for m in dec_pattern.finditer(content):
        line_no = content[: m.start()].count("\n") + 1
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
