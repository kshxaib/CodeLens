# 08. Setup, Installation & Production Deployment

> **Document Type:** DevOps & Production Deployment Runbook  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented in Production  
> **Live Production URL:** [https://codelens.kshoeb.in](https://codelens.kshoeb.in)  
> **Last Audited:** September 2026  

---

## 1. Prerequisites

Before installing CodeLens, ensure your workstation or server environment meets the following requirements:

| Component | Minimum Version | Recommended | Notes |
|---|---|---|---|
| **Python** | 3.11 | 3.12+ (tested up to 3.14) | Required for backend FastAPI, Tree-Sitter & psycopg |
| **Node.js** | 18.0.0 | 20.x LTS | Required for frontend Vite build |
| **PostgreSQL**| 14.0 | 16.x (Neon / Supabase / Render) | Managed cloud PostgreSQL recommended |
| **Qdrant** | 1.8.0 | 1.11+ / Qdrant Cloud | Free 1GB forever cluster supported |
| **Git** | 2.30+ | Latest | Required for repository cloning and AST indexing |
| **GitHub OAuth App**| N/A | Developer OAuth App | Client ID & Secret for user authentication |

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
# Fill in your database URL, Qdrant URL, and GitHub OAuth keys (see Section 4)

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

To spin up the full local stack (FastAPI backend + PostgreSQL 16 + Qdrant Vector Store) with a single command:

```bash
# From workspace root:
docker-compose up --build
```

---

## 4. Environment Variables Reference

### Backend Configuration (`backend/.env` & Root `.env`)

```ini
# Application
PROJECT_NAME=CodeLens
ENVIRONMENT=production
API_V1_STR=/api

# Database Configuration (PostgreSQL 16 recommended)
# Supports Neon, Supabase, Render, or local PostgreSQL (auto-normalizes postgres:// to postgresql://)
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/codelens?sslmode=require

# Qdrant Vector Store (Local Docker or Qdrant Cloud)
QDRANT_URL=https://xyz-your-cluster.qdrant.tech:6333
QDRANT_API_KEY=your_qdrant_cloud_api_key_here

# Security & BYOK Encryption (Fernet 32-byte Base64 key)
# Generate via: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_SECRET_KEY=your_fernet_secret_key_here

# JWT Authentication
JWT_SECRET_KEY=generate_a_secure_random_64_char_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# GitHub OAuth2 Application Credentials
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

# Frontend & Cross-Origin Resource Sharing (CORS)
FRONTEND_URL=https://codelens.kshoeb.in
BACKEND_CORS_ORIGINS=["https://codelens.kshoeb.in","http://localhost:5173","http://127.0.0.1:5173"]

# Optional Server-Side Fallback AI API Keys
GEMINI_API_KEY=your_gemini_api_key_optional
OPENAI_API_KEY=your_openai_api_key_optional
```

### Frontend Configuration (`frontend/.env`)

```ini
VITE_API_URL=https://<your-render-backend-url>.onrender.com/api
```

---

## 5. Complete Production Deployment Architecture

```
[User Browser]
       │
       ▼
 [GoDaddy DNS] (CNAME: codelens.kshoeb.in ──► cname.vercel-dns.com)
       │
       ▼
[Vercel Frontend] (React 19 + Vite 8 SPA with vercel.json rewrite rules)
       │
       │ API Requests (VITE_API_URL)
       ▼
[Render Backend] (FastAPI ASGI Web Service on Linux / Python 3.14)
       ├── [PostgreSQL] (Neon Serverless Postgres / Render Postgres)
       ├── [Qdrant Cloud] (Free 1GB Cluster for dense vector embeddings)
       └── [UptimeRobot] (Pings /api/health every 5 minutes to prevent sleep)
```

---

### 5.1 Backend Deployment (Render Free Web Service)

1. Sign up on [Render.com](https://render.com) and click **New +** -> **Web Service**.
2. Connect your GitHub repository (`CodeLens`).
3. Configure the service settings:
   - **Name:** `codelens-backend`
   - **Region:** Singapore / Frankfurt
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
4. Add all environment variables from Section 4 into Render's **Environment** tab.
5. Click **Deploy Web Service**. Render will install dependencies and start the uvicorn ASGI server.

---

### 5.2 UptimeRobot Keep-Alive Setup (24/7 Availability)

Render free tier instances sleep after 15 minutes of inactivity. To keep the instance awake and eliminate cold starts:
1. Create a free account on [UptimeRobot.com](https://uptimerobot.com).
2. Click **Add New Monitor**:
   - **Monitor Type:** `HTTP(s)`
   - **Friendly Name:** `CodeLens Backend Keep-Alive`
   - **URL (or IP):** `https://<your-render-backend>.onrender.com/api/health`
   - **Monitoring Interval:** `Every 5 minutes`
3. Save monitor. UptimeRobot will ping `/api/health` continuously, keeping the backend always warm and responsive.

---

### 5.3 Frontend Deployment (Vercel)

1. Sign up on [Vercel.com](https://vercel.com) and click **Add New...** -> **Project**.
2. Import your GitHub repository (`CodeLens`).
3. Configure project build settings:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`
4. Add environment variable:
   - `VITE_API_URL`: `https://<your-render-backend>.onrender.com/api`
5. Note: Single Page App (SPA) deep linking is handled by [`frontend/vercel.json`](file:///d:/Shoaib/CodeLens/frontend/vercel.json):
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/" }
     ]
   }
   ```
   This ensures deep URLs like `/dashboard` and `/chat` do not throw 404 errors on page reload.
6. Click **Deploy**.

---

### 5.4 Custom Domain Setup on GoDaddy (`codelens.kshoeb.in`)

#### In Vercel:
1. Navigate to **Project Settings** -> **Domains**.
2. Enter `codelens.kshoeb.in` and click **Add**.
3. Note the provided CNAME target (`cname.vercel-dns.com` or project-specific hash).

#### In GoDaddy:
1. Log into GoDaddy -> **Domain Portfolio** -> Select `kshoeb.in` -> **Manage DNS**.
2. Add a new DNS record:
   - **Type:** `CNAME`
   - **Name:** `codelens`
   - **Data (Target):** `cname.vercel-dns.com` (or Vercel-provided target)
   - **TTL:** `1/2 Hour` (or Default)
3. Save record. SSL certificate is automatically provisioned by Vercel within minutes.

---

### 5.5 GitHub OAuth App Production Setup

1. In GitHub, go to **Settings** -> **Developer Settings** -> **OAuth Apps** -> Open your `CodeLens` app.
2. Update the URLs:
   - **Homepage URL:** `https://codelens.kshoeb.in`
   - **Authorization callback URL:** `https://codelens.kshoeb.in/`
3. Add `http://localhost:5173/` as an additional redirect URI for local development if supported.
4. Save Changes.

---

## 6. Verification & Health Probes

CodeLens includes microsecond-latency instrumentation for database, vector store, and server metrics:

```bash
# 1. Full Stack Health Probe
curl -i https://<your-backend>.onrender.com/api/health

# Response sample:
# {
#   "status": "healthy",
#   "service": "CodeLens",
#   "database": { "status": "connected", "engine": "PostgreSQL", "latency_ms": 145.41 },
#   "vector_db": { "status": "connected", "engine": "Qdrant", "latency_ms": 871.97 },
#   "hit_count": 42,
#   "last_hit_at": "2026-09-29 01:34:13 AM"
# }

# 2. Interactive OpenAPI Documentation
# https://<your-backend>.onrender.com/docs
```
