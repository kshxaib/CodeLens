import time
from datetime import datetime, timezone
from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
import httpx
from sqlalchemy import text
from app.core.config import PROJECT_NAME, ENVIRONMENT, QDRANT_URL
from app.db.session import engine

router = APIRouter(prefix="/health", tags=["Health Checks"])

@router.get("", summary="Comprehensive Health & Keep-Alive Check")
async def health_check():
    timestamp = datetime.now(timezone.utc).isoformat()
    db_status = {"status": "unhealthy", "engine": "PostgreSQL", "latency_ms": None}
    qdrant_status = {"status": "unhealthy", "engine": "Qdrant", "latency_ms": None}
    is_healthy = True

    try:
        db_start = time.perf_counter()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_latency = round((time.perf_counter() - db_start) * 1000, 2)
        db_status = {"status": "connected", "engine": "PostgreSQL", "latency_ms": db_latency}
    except Exception as e:
        is_healthy = False
        db_status = {"status": "disconnected", "engine": "PostgreSQL", "error": str(e), "latency_ms": None}

    try:
        qdrant_start = time.perf_counter()
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{QDRANT_URL}/healthz")
            if resp.status_code == 200:
                qdrant_latency = round((time.perf_counter() - qdrant_start) * 1000, 2)
                qdrant_status = {"status": "connected", "engine": "Qdrant", "latency_ms": qdrant_latency}
            else:
                is_healthy = False
                qdrant_status = {"status": "degraded", "engine": "Qdrant", "http_status": resp.status_code, "latency_ms": None}
    except Exception as e:
        is_healthy = False
        qdrant_status = {"status": "disconnected", "engine": "Qdrant", "error": str(e), "latency_ms": None}

    response_payload = {
        "status": "healthy" if is_healthy else "degraded",
        "service": PROJECT_NAME,
        "environment": ENVIRONMENT,
        "version": "1.0.0",
        "timestamp": timestamp,
        "database": db_status,
        "vector_db": qdrant_status,
    }

    if not is_healthy:
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=response_payload)

    return response_payload

@router.get("/db", summary="PostgreSQL Database Keep-Alive Check")
async def db_health_check():
    try:
        start_time = time.perf_counter()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        latency = round((time.perf_counter() - start_time) * 1000, 2)
        return {"status": "connected", "database": "PostgreSQL", "latency_ms": latency}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "disconnected", "database": "PostgreSQL", "error": str(e)},
        )

@router.get("/qdrant", summary="Qdrant Vector DB Keep-Alive Check")
async def qdrant_health_check():
    try:
        start_time = time.perf_counter()
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"{QDRANT_URL}/healthz")
            if resp.status_code == 200:
                latency = round((time.perf_counter() - start_time) * 1000, 2)
                return {"status": "connected", "vector_db": "Qdrant", "latency_ms": latency}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "disconnected", "vector_db": "Qdrant", "error": str(e)},
        )
