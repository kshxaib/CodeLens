from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.health import router as health_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle event handler."""
    # Startup actions
    print(f"[*] Starting {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode...")
    yield
    # Shutdown actions
    print(f"[*] Shutting down {settings.PROJECT_NAME}...")


app = FastAPI(
    title=f"{settings.PROJECT_NAME} API",
    description="AI-Powered Codebase Intelligence & Architecture Copilot Backend",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router, prefix=settings.API_V1_STR)


@app.get("/", summary="Root Welcome Endpoint")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0",
    }
