from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import (
    PROJECT_NAME,
    ENVIRONMENT,
    BACKEND_CORS_ORIGINS,
    API_V1_STR,
)
from app.api.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle event handler."""
    print(f"[*] Starting {PROJECT_NAME} in {ENVIRONMENT} mode...")
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


@app.get("/", summary="Root Welcome Endpoint")
async def root():
    return {
        "app": PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0",
    }
