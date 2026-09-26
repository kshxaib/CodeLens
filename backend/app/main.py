from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import PROJECT_NAME, ENVIRONMENT, BACKEND_CORS_ORIGINS, API_V1_STR
from app.db.session import engine, Base
import app.db.models
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.user import router as user_router
from app.api.repositories import router as repositories_router
from app.api.chats import router as chats_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print(f"[*] Starting {PROJECT_NAME} in {ENVIRONMENT} mode...")
    try:
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=BACKEND_CORS_ORIGINS,
    allow_origin_regex=r"https?://.*(kshoeb\.in|vercel\.app|onrender\.com|localhost|127\.0\.0\.1).*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=API_V1_STR)
app.include_router(auth_router, prefix=API_V1_STR)
app.include_router(user_router, prefix=API_V1_STR)
app.include_router(repositories_router, prefix=API_V1_STR)
app.include_router(chats_router, prefix=API_V1_STR)

@app.api_route("/", methods=["GET", "HEAD"], summary="Root Welcome Endpoint")
async def root():
    return {
        "app": PROJECT_NAME,
        "status": "online",
        "docs": "/docs",
        "version": "1.0.0",
    }

@app.api_route("/health", methods=["GET", "HEAD"], summary="Health Check Alias")
async def health_alias():
    from app.api.health import health_check
    return await health_check()
