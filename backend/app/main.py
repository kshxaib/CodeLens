from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import (
    PROJECT_NAME,
    ENVIRONMENT,
    BACKEND_CORS_ORIGINS,
    API_V1_STR,
)
from app.db.session import engine, Base
import app.db.models  # Import all models to register with Base.metadata
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.user import router as user_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle event handler."""
    print(f"[*] Starting {PROJECT_NAME} in {ENVIRONMENT} mode...")
    try:
        # Automatically create tables in PostgreSQL if not present
        Base.metadata.create_all(bind=engine)
        print("[*] Database schema and tables verified successfully.")
    except Exception as e:
        print(f"[!] Database table initialization error: {e}")
    yield
    print(f"[*] Shutting down {PROJECT_NAME}...")


app = FastAPI(
    title=f"{PROJECT_NAME} API",
    description="AI-Powered Codebase Intelligence & Architecture Copilot Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router, prefix=API_V1_STR)
app.include_router(auth_router, prefix=API_V1_STR)
app.include_router(user_router, prefix=API_V1_STR)


@app.get("/", summary="Root Welcome Endpoint")
async def root():
    return {
        "app": PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0",
    }
