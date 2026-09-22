from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
import httpx
from app.core.config import PROJECT_NAME, ENVIRONMENT, QDRANT_URL
from app.db.session import check_db_connection

router = APIRouter(prefix="/health", tags=["Health Checks"])


@router.get("", summary="General Health Check")
async def health_check():
    """Returns basic service health status."""
    return {
        "status": "healthy",
        "service": PROJECT_NAME,
        "environment": ENVIRONMENT,
        "version": "1.0.0",
    }


@router.get("/db", summary="PostgreSQL Database Health Check")
async def db_health_check():
    """Checks connection to PostgreSQL database."""
    is_connected = check_db_connection()
    if is_connected:
        return {"status": "healthy", "database": "PostgreSQL", "connected": True}
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "unhealthy", "database": "PostgreSQL", "connected": False},
    )


@router.get("/qdrant", summary="Qdrant Vector DB Health Check")
async def qdrant_health_check():
    """Checks connection to Qdrant vector database."""
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{QDRANT_URL}/healthz")
            if resp.status_code == 200:
                return {"status": "healthy", "vector_db": "Qdrant", "connected": True}
    except Exception:
        pass
    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"status": "unhealthy", "vector_db": "Qdrant", "connected": False},
    )
