# 🔍 CodeLens
### Intelligent Architecture Knowledge Graph, 5 Interactive Architectural Views, Blast Radius Simulator & Grounded Codebase Copilot

[![Live Demo](https://img.shields.io/badge/Live_Website-codelens.kshoeb.in-8A2BE2?style=for-the-badge&logo=vercel&logoColor=white)](https://codelens.kshoeb.in)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3+-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![ReactFlow](https://img.shields.io/badge/ReactFlow-v12-FF0072?style=flat)](https://reactflow.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_Store-DC2626?style=flat)](https://qdrant.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🔗 Quick Links & Live Deployments

| Resource | Link | Description |
|---|---|---|
| 🌐 **Live Production Website** | [**https://codelens.kshoeb.in**](https://codelens.kshoeb.in) | Production SPA deployed on Vercel with GoDaddy Custom Domain |
| 💻 **Local Development App** | [http://localhost:5173](http://localhost:5173) | Interactive React 19 SPA running locally via Vite |
| ⚙️ **Backend REST API** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger/OpenAPI documentation for FastAPI |
| 💓 **Health & Latency Check** | [http://localhost:8000/api/health](http://localhost:8000/api/health) | Real-time PostgreSQL & Qdrant connectivity and latency telemetry |
| 📖 **Master Technical Docs** | [`docs/README.md`](docs/README.md) | 8 modular system blueprints, database ER diagrams & algorithms |
| 📦 **GitHub Repository** | [github.com/kshxaib/CodeLens](https://github.com/kshxaib/CodeLens) | Source code repository and issues tracker |

---

## 🌟 Overview

**CodeLens** is an AI-powered codebase intelligence, architecture visualization, and contextual exploration copilot designed for modern software engineering teams, system architects, and open-source developers.

Instead of spending weeks manually deciphering thousands of source files, tracing obscure cross-module dependencies, or generating outdated static UML diagrams that rot the moment a pull request merges, **CodeLens** automatically parses repository ASTs (Abstract Syntax Trees), builds a unified **Architecture Knowledge Graph (AKG)**, and provides:

1. **Deterministic Architecture Knowledge Graph (AKG):** A single canonical graph capturing every architectural component (presentation, API gateways, services, domain models, databases, background workers) and typed relationship (`CALLS`, `IMPORTS`, `READS`, `WRITES`, `PERSISTS`, `EMITS`).
2. **5 Adaptive Architectural Views:** Switch perspectives on demand without re-parsing:
   - **System Architecture View:** Macro-level component topology and clean-architecture layer hierarchy with Dagre layout.
   - **Workflow View:** Step-by-step transaction journeys, decision branching, and error handling paths.
   - **Sequence View:** Chronological participant lifelines and synchronous/asynchronous message exchanges with step-by-step simulation playback.
   - **Data Flow View:** Lineage of data from inbound HTTP request bodies through DTO validation to database persistence.
   - **Lifecycle View:** Finite-state machine (FSM) diagrams representing domain entity lifecycle transitions and event triggers.
3. **Refactoring Blast Radius & Change Impact Simulator:** Traverses the Knowledge Graph via BFS/A* to calculate direct callers, transitive dependents, and an objective risk score (`Low`, `Medium`, `High`) before code changes are made.
4. **Verifiable Source Evidence with In-App Code Viewing:** Every node classification and edge link is grounded in real AST code snippets with 1-click line-level file inspection.
5. **Anti-Hallucination Codebase RAG Copilot with ThoughtLine:** Conversational AI grounded strictly in AST symbols and dense Qdrant vector retrieval with line citations (`[file#L10-L25]`). Features an interactive breathing **ThoughtLine** indicator that renders live AI reasoning duration, step progression, and auto-settles smoothly.
6. **Multi-Format 1-Click Export:** Download any active architectural view as high-res PNG (2x Retina), Scalable Vector Graphics (SVG), raw Knowledge Graph JSON, or a self-contained zero-dependency standalone interactive HTML page.

---

## 🥊 The Real-World Problem It Solves

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                       THE TRADITIONAL DEVELOPER STRUGGLE                         │
│                                                                                  │
│ 1. Inscrutable Monoliths & Microservices: Onboarding takes 4+ weeks.             │
│ 2. Outdated Architecture Docs: UML diagrams rot as soon as PRs are merged.       │
│ 3. Fear of Refactoring: Modifying a function breaks 12 unknown call-sites.       │
│ 4. Hallucinating AI Copilots: Standard LLMs hallucinate non-existent files.      │
│ 5. Disconnected Mental Models: Architecture diagrams don't link to code.         │
└──────────────────────────────────────────────────────────────────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              THE CODELENS SOLUTION                               │
│                                                                                  │
│ 1. 1-Click GitHub Repository Sync ────► AST Parsing & Vector Indexing in min.    │
│ 2. Canonical Architecture Graph ──────► Single verifiable source of truth.       │
│ 3. 5 Adaptive Interactive Views ──────► Architecture, Workflow, Sequence, etc.   │
│ 4. Deterministic Blast Radius ────────► Trace exact upstream & downstream impact.│
│ 5. Grounded RAG AI Copilot ───────────► Real-time answers with source citations. │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Step-by-Step How It Works (The 5-Step Lifecycle)

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         THE 5-STEP LIFECYCLE PIPELINE                            │
│                                                                                  │
│ Step 1: Connect GitHub Repository ────► Clones repository into temp workspace.   │
│ Step 2: Tree-Sitter AST Parse ────────► Extracts classes, functions, calls.      │
│ Step 3: Canonical AKG Synthesis ──────► Connects layers, modules & dependencies. │
│ Step 4: Vector Store Ingestion ───────► Embeds AST chunks into Qdrant vectors.   │
│ Step 5: Explore, Trace & Chat ────────► 5 interactive views + RAG copilot.       │
└──────────────────────────────────────────────────────────────────────────────────┘
```

- **Step 1: Connect & Ingest Repository:** Enter any public or private GitHub repository URL. The backend executes a shallow clone (`--depth 1`) and discovers all active source files.
- **Step 2: Tree-Sitter AST & Symbol Extraction:** Multi-language Tree-Sitter parsers (Python, JavaScript, TypeScript) extract functions, classes, decorators, routes, imports, and method invocations without runtime execution.
- **Step 3: Canonical AKG Synthesis:** Connects call sites to definitions, assigns components to clean architectural layers (Presentation, API Gateway, Application, Domain, Infrastructure), and attaches verbatim source evidence.
- **Step 4: Vector Indexing into Qdrant:** Code chunks respect AST symbol boundaries and are embedded into 1536-dimensional vectors using OpenAI `text-embedding-3-small`, indexed under a strict `repository_id` tenant filter.
- **Step 5: Interactive Visualization & Refactoring:** Switch between System Architecture, Workflow, Sequence, Data Flow, and Lifecycle views, simulate blast radius impact, and chat with the codebase copilot using live ThoughtLine feedback.

---

## 🏗️ Architecture & Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend SPA** | React 19, Vite 8, TypeScript | High-performance single page application with modern hooks |
| **Interactive Graph Canvas**| `@xyflow/react` (ReactFlow v12) | Interactive infinite canvas with pan, zoom, custom nodes & edges |
| **Layout Engine** | Dagre Graph Layout | Deterministic hierarchical acyclic graph positioning |
| **Design System** | TailwindCSS v4, Lucide Icons | Responsive sleek dark slate UI with micro-animations |
| **Reasoning UI** | Motion (`motion/react`), Hugeicons | Organic breathing `ThoughtLine` live reasoning indicator |
| **State Management** | Zustand v5 | Persistent multi-store reactive state |
| **Backend Framework** | FastAPI (Python 3.11 - 3.14) | High-throughput asynchronous ASGI web server |
| **AST Parser Engine** | Tree-Sitter (Python, JS, TS, Go, Java) | Native concrete syntax tree parser |
| **Database ORM** | SQLAlchemy 2.0, `psycopg` (v3) & `psycopg2` | Relational database mapping with connection pooling |
| **Relational Database** | PostgreSQL 16 (Neon / Render) | Authoritative source of truth for users, repos, and graphs |
| **Vector Database** | Qdrant (Local Docker / Qdrant Cloud) | Dense vector search engine for sub-millisecond retrieval |
| **Security & BYOK** | Fernet AES-256 & Python-Jose JWT | Client-side API key encryption with zero cleartext storage |

---

## 🚀 Quickstart & Local Development

### Prerequisites
- **Node.js:** v18.0.0 or higher & npm
- **Python:** v3.11 or higher
- **PostgreSQL 16:** Local instance or cloud database (Neon / Supabase)
- **Qdrant Vector Database:** Cloud cluster or local Docker container (`localhost:6333`)
- **GitHub OAuth App:** Client ID & Secret for user authentication

---

### 1. Backend Setup

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

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your credentials (DATABASE_URL, JWT_SECRET_KEY, GITHUB_*, QDRANT_*)

# 5. Start the FastAPI development server
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Interactive API documentation will be available at:  
👉 **`http://127.0.0.1:8000/docs`**

---

### 2. Frontend Setup

```bash
# 1. In a separate terminal, navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Configure environment variables
echo "VITE_API_URL=http://localhost:8000/api" > .env

# 4. Start the Vite development server
npm run dev
```

The application will boot at:  
👉 **`http://localhost:5173`**

---

### 3. Docker Compose Setup (Alternative)

To spin up the entire system (FastAPI backend + PostgreSQL 16 + Qdrant Vector Store) with a single command:

```bash
# From workspace root:
docker-compose up --build
```

---

## ☁️ Production Deployment Stack

CodeLens is configured for seamless zero-cost production hosting:

```
[User Browser]
       │
       ▼
 [GoDaddy DNS] (CNAME: codelens.kshoeb.in ──► cname.vercel-dns.com)
       │
       ▼
[Vercel Frontend] (React 19 + Vite 8 SPA with vercel.json SPA rewrites)
       │
       │ API Requests (VITE_API_URL)
       ▼
[Render Backend] (FastAPI ASGI Web Service on Linux / Python 3.14)
       ├── [PostgreSQL] (Neon Serverless Postgres / Render Postgres)
       ├── [Qdrant Cloud] (Free 1GB Cluster for dense vector embeddings)
       └── [UptimeRobot] (Pings /api/health every 5 minutes to prevent sleep)
```

1. **Frontend (Vercel):** Connect GitHub repo, select `frontend` root directory, and set `VITE_API_URL`. Includes [`frontend/vercel.json`](file:///d:/Shoaib/CodeLens/frontend/vercel.json) to handle SPA client-side routing on page refresh.
2. **Backend (Render):** Deploy as Web Service using root directory `backend`, start command `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. **Database (Neon / PostgreSQL 16):** Fully managed serverless Postgres with auto-schema creation.
4. **Vector Store (Qdrant Cloud):** Managed 1GB cluster with `QDRANT_API_KEY` authentication.
5. **Keep-Alive (UptimeRobot):** Continuous 5-minute HTTP GET pings to `https://<backend>.onrender.com/api/health` to keep the free instance warm 24/7.
6. **Custom Domain (GoDaddy):** CNAME record pointing `codelens` to `cname.vercel-dns.com` for [https://codelens.kshoeb.in](https://codelens.kshoeb.in).

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env` & Root `.env`)

```ini
PROJECT_NAME=CodeLens
ENVIRONMENT=production
API_V1_STR=/api

# Database Configuration (PostgreSQL 16)
# Auto-normalizes postgres:// to postgresql:// for SQLAlchemy 2.0
DATABASE_URL=postgresql://user:password@ep-xyz.neon.tech/codelens?sslmode=require

# Qdrant Vector Store
QDRANT_URL=https://xyz-your-cluster.qdrant.tech:6333
QDRANT_API_KEY=your_qdrant_api_key_here

# Security & BYOK Encryption (Fernet 32-byte Base64 key)
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_SECRET_KEY=your_fernet_secret_key_here

# JWT Authentication
JWT_SECRET_KEY=your_jwt_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# GitHub OAuth App Credentials
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here

# Frontend & CORS Configuration
FRONTEND_URL=https://codelens.kshoeb.in
BACKEND_CORS_ORIGINS=["https://codelens.kshoeb.in","http://localhost:5173","http://127.0.0.1:5173"]

# Optional Server-Side Fallback AI API Keys
GEMINI_API_KEY=your_gemini_api_key_optional
OPENAI_API_KEY=your_openai_api_key_optional
```

### Frontend (`frontend/.env`)

```ini
VITE_API_URL=https://<your-render-backend-url>.onrender.com/api
```

---

## 📡 Core API Endpoints

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `GET` | `/api/auth/github` | Fetch GitHub OAuth redirect URL |
| **Auth** | `GET` | `/api/auth/callback` | Exchange OAuth code for Bearer JWT |
| **Auth** | `GET` | `/api/auth/me` | Fetch active user profile & session |
| **Profile** | `GET` | `/api/user/profile` | Check user profile & OpenAI key status |
| **Profile** | `PUT` | `/api/user/openai-key` | Save encrypted personal OpenAI key (AES-256) |
| **Repositories** | `GET` | `/api/repositories` | List accessible imported repositories |
| **Repositories** | `POST` | `/api/repositories` | Import new repository by GitHub URL |
| **Repositories** | `POST` | `/api/repositories/{id}/index` | Trigger 5-step background AST & vector indexing |
| **Files** | `GET` | `/api/repositories/{id}/files` | List all indexed source files |
| **Files** | `GET` | `/api/repositories/{id}/files/{file_id}` | Fetch file contents for in-app code viewer |
| **Views** | `GET` | `/api/repositories/{id}/architecture` | Fetch System Architecture topology graph |
| **Views** | `GET` | `/api/repositories/{id}/workflows` | Fetch extracted execution workflows |
| **Views** | `GET` | `/api/repositories/{id}/sequences` | Fetch extracted runtime sequence diagrams |
| **Views** | `GET` | `/api/repositories/{id}/data-flows` | Fetch extracted DTO data lineage flows |
| **Views** | `GET` | `/api/repositories/{id}/lifecycles` | Fetch entity finite-state machine (FSM) lifecycles |
| **Trace** | `GET` | `/api/repositories/{id}/trace/node` | Trace upstream callers & downstream callees |
| **Trace** | `GET` | `/api/repositories/{id}/trace/path` | Find shortest path between two nodes (A* / Dijkstra) |
| **Trace** | `GET` | `/api/repositories/{id}/trace/why` | Explain why relationship exists with AST snippet |
| **Trace** | `POST` | `/api/repositories/{id}/trace/explain`| AI explanation of component architecture |
| **Blast Radius**| `GET` | `/api/repositories/{id}/blast-radius` | Compute refactoring blast radius & risk score |
| **Chat / RAG** | `POST` | `/api/repositories/{id}/chats` | Create new conversation thread |
| **Chat / RAG** | `POST` | `/api/chat/stream` | Real-time SSE streaming copilot completion |
| **Health** | `GET` | `/api/health` | Comprehensive system & keep-alive health check |

For the complete endpoint specifications, see [`docs/05-api-documentation.md`](docs/05-api-documentation.md).

---

## 📖 Complete Documentation Hub

The project documentation has been broken down into dedicated modular sub-files in the [`docs/`](docs/) directory:

- 📑 [**01. Project Overview & Vision**](docs/01-project-overview.md) — System vision, problem statement, 5 pillars & user personas.
- 📐 [**02. Architecture Knowledge Graph (AKG)**](docs/02-architecture-knowledge-graph.md) — Graph schemas, node types, edges, confidence levels & 5 view extractors.
- ⚙️ [**03. Backend Architecture**](docs/03-backend-architecture.md) — FastAPI server, Tree-Sitter AST parser, 5-step indexing pipeline & TraceService.
- 🎨 [**04. Frontend Architecture**](docs/04-frontend-architecture.md) — React 19, ReactFlow canvas engine, Zustand v5 stores, ThoughtLine UI & multi-format export.
- 📡 [**05. Complete API Documentation**](docs/05-api-documentation.md) — Exhaustive REST endpoints, schemas, request bodies & status codes.
- 🗄️ [**06. Database Schema & Vector Store**](docs/06-database-and-vector-store.md) — PostgreSQL 16 ER diagram, SQLAlchemy models & Qdrant vector configuration.
- 🤖 [**07. Codebase RAG Copilot**](docs/07-rag-and-chat-copilot.md) — Grounded vector retrieval, AST chunking, ThoughtLine reasoning streaming & SSE protocol.
- 🚀 [**08. Setup, Installation & Deployment**](docs/08-setup-and-deployment.md) — Local runbook, Docker, Render, Vercel, UptimeRobot, GoDaddy DNS & environment variables.
- 🗺️ [**Master Technical Docs Index**](docs/README.md) — Central documentation sitemap and reading guide.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
