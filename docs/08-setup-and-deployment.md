# 08. Setup, Installation & Production Deployment

> **Document Type:** DevOps & Deployment Runbook  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented  

---

## 1. Prerequisites

Before installing CodeLens, ensure your workstation or server environment meets the following requirements:

| Component | Minimum Version | Recommended | Notes |
|---|---|---|---|
| **Python** | 3.11 | 3.12+ | Required for backend FastAPI & Tree-Sitter |
| **Node.js** | 18.0.0 | 20.x LTS | Required for frontend Vite build |
| **PostgreSQL**| 14.0 | 16.x | SQLite supported for local dev |
| **Qdrant** | 1.8.0 | 1.11+ | Qdrant Cloud or local Docker |
| **Git** | 2.30+ | Latest | Required for repo cloning |
| **GitHub App**| N/A | OAuth App | Client ID & Secret for login |

---

## 2. Local Development Setup

### 2.1 Backend Setup

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a Python virtual environment
python -m venv venv

# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On macOS / Linux:
source venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. Create and configure environment variables
cp .env.example .env
# Edit .env with your credentials (see section 4 below)

# 5. Start the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The interactive OpenAPI Swagger documentation will be available at:  
👉 **`http://127.0.0.1:8000/docs`**

---

### 2.2 Frontend Setup

```bash
# 1. In a separate terminal, navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Create .env file
echo "VITE_API_URL=http://localhost:8000/api" > .env

# 4. Start the Vite development server
npm run dev
```

The React 19 application will boot at:  
👉 **`http://localhost:5173`**

---

## 3. Docker Compose Orchestration (Alternative)

To spin up the full stack (FastAPI backend + PostgreSQL 16 + Qdrant Vector Store) with a single command:

```bash
# From workspace root:
docker-compose up --build
```

---

## 4. Environment Variables Reference

### Backend Configuration (`backend/.env`)

```ini
# Application
APP_NAME=CodeLens
DEBUG=True
ENVIRONMENT=development

# Database Configuration (PostgreSQL 16 recommended)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codelens
# Or SQLite local fallback:
# DATABASE_URL=sqlite:///./codelens.db

# Security & Session
SECRET_KEY=generate_a_secure_random_64_char_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# GitHub OAuth2 Application Credentials
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
FRONTEND_URL=http://localhost:5173

# Qdrant Vector Store
QDRANT_HOST=http://localhost:6333
# Or Qdrant Cloud:
# QDRANT_HOST=https://your-cluster-url.qdrant.tech
# QDRANT_API_KEY=your_qdrant_api_key

# OpenAI API Key (Fallback key for public demo queries)
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

### Frontend Configuration (`frontend/.env`)

```ini
VITE_API_URL=http://localhost:8000/api
```

---

## 5. Production Deployment Guide

### 5.1 Backend Deployment (Render / Railway / AWS ECS)
1. **Dockerfile:** Use the included multi-stage [`backend/Dockerfile`](file:///d:/Shoaib/CodeLens/backend/Dockerfile).
2. **Build Command:** `pip install -r requirements.txt`
3. **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Health Probe:** Configure HTTP health check at `/api/health`.

### 5.2 Frontend Deployment (Vercel / Cloudflare Pages)
1. **Root Directory:** `frontend`
2. **Framework Preset:** `Vite`
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. **Environment Variable:** `VITE_API_URL=https://api.yourdomain.com/api`

### 5.3 Managed Databases
- **PostgreSQL:** Provision on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
- **Vector DB:** Provision a free cluster on [Qdrant Cloud](https://cloud.qdrant.io).

---

## 6. Verification & Health Probes

Verify the deployed environment using the built-in microsecond health endpoints:

```bash
# 1. Full Stack Health Probe
curl -i http://localhost:8000/api/health

# 2. Database Connection Probe
curl -i http://localhost:8000/api/health/db

# 3. Qdrant Vector DB Probe
curl -i http://localhost:8000/api/health/qdrant
```
