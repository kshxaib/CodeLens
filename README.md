# 🔍 CodeLens
### Intelligent Architecture Knowledge Graph, 5 Interactive Architectural Views, Blast Radius Simulator & Grounded Codebase Copilot

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React 19](https://img.shields.io/badge/React-19.2+-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4.3+-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![ReactFlow](https://img.shields.io/badge/ReactFlow-v12-FF0072?style=flat)](https://reactflow.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-4169E1?style=flat&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Qdrant](https://img.shields.io/badge/Qdrant-Vector_Store-DC2626?style=flat)](https://qdrant.tech/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🔗 Quick Links & Repositories

| Resource | Link | Description |
|---|---|---|
| 🌐 **Live Web Workspace** | [http://localhost:5173](http://localhost:5173) | Interactive React 19 SPA running locally on Vite |
| ⚙️ **Backend REST API** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive Swagger/OpenAPI documentation for FastAPI |
| 📖 **Master Technical Docs** | [`docs/README.md`](docs/README.md) | Modular system blueprint, schemas, algorithms & runbooks |
| 📦 **GitHub Repository** | [github.com/kshxaib/CodeLens](https://github.com/kshxaib/CodeLens) | Source code repository and issue tracker |

---

## 🌟 Overview

**CodeLens** is an AI-powered codebase intelligence, architecture visualization, and contextual exploration copilot designed for modern software engineering teams, system architects, and open-source developers.

Instead of spending weeks manually deciphering thousands of source files, tracing obscure cross-module dependencies, or generating outdated static UML diagrams that rot the moment a pull request merges, **CodeLens** automatically parses repository ASTs (Abstract Syntax Trees), builds a unified **Architecture Knowledge Graph (AKG)**, and provides:

1. **Deterministic Architecture Knowledge Graph (AKG):** A single canonical graph capturing every architectural component (presentation, API gateways, services, domain models, databases, background workers) and typed relationship (`CALLS`, `IMPORTS`, `READS`, `WRITES`, `PERSISTS`, `EMITS`).
2. **5 Adaptive Architectural Views:** Switch perspectives on demand without re-parsing:
   - **System Architecture View:** Macro-level component topology and clean-architecture layer hierarchy with Dagre layout.
   - **Workflow View:** Step-by-step transaction journeys, decision branching, and error handling paths.
   - **Sequence View:** Chronological participant lifelines and synchronous/asynchronous message exchanges.
   - **Data Flow View:** Lineage of data from inbound HTTP request bodies through DTO validation to database persistence.
   - **Lifecycle View:** Finite-state machine (FSM) diagrams representing domain entity lifecycle transitions and event triggers.
3. **Refactoring Blast Radius & Change Impact Simulator:** Traverses the Knowledge Graph via BFS/A* to calculate direct callers, transitive dependents, and an objective risk score (`Low`, `Medium`, `High`) before code changes are made.
4. **Verifiable Source Evidence with In-App Code Viewing:** Every node classification and edge link is grounded in real AST code snippets with 1-click line-level file inspection.
5. **Anti-Hallucination Codebase RAG Copilot:** Conversational AI grounded strictly in AST symbols and dense Qdrant vector retrieval with line citations (`[file#L10-L25]`) streamed in real-time via Server-Sent Events (SSE).
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
- **Step 5: Interactive Visualization & Refactoring:** Switch between System Architecture, Workflow, Sequence, Data Flow, and Lifecycle views, simulate blast radius impact, and chat with the codebase copilot.

---

## 🏗️ Architecture & Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Frontend SPA** | React 19, Vite 8, TypeScript | High-performance single page application with modern hooks |
| **Interactive Graph Canvas**| `@xyflow/react` (ReactFlow v12) | Interactive infinite canvas with pan, zoom, custom nodes & edges |
| **Graph Layout Engine** | Dagre Graphlib | Automated hierarchical DAG layout (`TB` top-to-bottom & `LR`) |
| **Styling & Design System** | TailwindCSS v4, CSS Custom Properties | Sleek dark slate developer aesthetic with layer-coded badges |
| **State Management** | Zustand v5 (Persisted) | Atomic multi-stores (`useAuthStore`, `useWorkspaceStore`, `useTraceStore`) |
| **Backend REST API** | FastAPI, Python 3.11+, Uvicorn | Asynchronous ASGI framework with microsecond health checks |
| **AST Parser** | Tree-Sitter (Python, JS, TS) | Multi-language concrete syntax tree parser & symbol extractor |
| **Database & ORM** | PostgreSQL 16 / SQLite, SQLAlchemy 2.0 | Relational schema with cascade rules and unique constraints |
| **Vector Database** | Qdrant Cloud / Local Docker | High-dimensional vector storage with Cosine similarity retrieval |
| **Embeddings & LLM** | OpenAI `text-embedding-3-small`, GPT-4o | Dense vector retrieval and grounded conversational code copilot |
| **Graph Algorithms** | BFS, Dijkstra & A* Pathfinder | Shortest path, reachability, circularity & refactoring blast radius |
| **Security & BYOK** | AES-256 Fernet, PBKDF2, JWT | Client-side encrypted Bring-Your-Own-Key architecture & GitHub OAuth |
| **Streaming Engine** | Server-Sent Events (SSE) | Real-time token streaming with immediate source citation emission |

---

## 📂 Project Directory Structure

```
CodeLens/
├── backend/                       # FastAPI Python REST Backend
│   ├── app/
│   │   ├── api/                   # REST Route Controllers
│   │   │   ├── auth.py            # GitHub OAuth2 & JWT issuance
│   │   │   ├── chats.py           # RAG conversation threads & SSE streaming
│   │   │   ├── health.py          # Microsecond DB & Qdrant health probes
│   │   │   ├── repositories.py    # Repo CRUD, 5 views, traces, files & blast radius
│   │   │   └── user.py            # User profile & encrypted OpenAI BYOK management
│   │   ├── core/                  # Core Configuration & Security
│   │   │   ├── config.py          # Environment settings loader
│   │   │   └── security.py        # JWT encoding & AES-256 Fernet key encryption
│   │   ├── db/                    # Database Persistence Layer
│   │   │   ├── models.py          # SQLAlchemy 2.0 relational schemas
│   │   │   └── session.py         # Database engine & session generator
│   │   ├── parser/                # Deterministic AST & Graph Analysis
│   │   │   ├── architecture.py    # System topology builder
│   │   │   ├── ast_parser.py      # Tree-Sitter multi-language parser
│   │   │   ├── blast_radius.py    # Refactoring impact calculation
│   │   │   ├── data_flow_extractor.py # Data lineage & DTO schema analysis
│   │   │   ├── dependency_resolver.py# Cross-file import & call site resolver
│   │   │   ├── entity_classifier.py # 5-tier clean architecture classifier
│   │   │   ├── graph_schema.py    # Canonical AKG schemas (Node, Edge, Evidence)
│   │   │   ├── knowledge_graph.py # AKG construction orchestrator
│   │   │   ├── lifecycle_extractor.py# Entity finite-state machine (FSM) extractor
│   │   │   ├── sequence_extractor.py# Participant lifeline & message ordering
│   │   │   ├── symbols.py         # Symbol extraction (classes, functions, decorators)
│   │   │   └── workflow_extractor.py# Step progression & decision path extractor
│   │   ├── rag/                   # Contextual Vector Search & LLM Inference
│   │   │   ├── embeddings.py      # OpenAI text-embedding-3-small interface
│   │   │   ├── prompts.py         # Strict architectural system prompts
│   │   │   ├── retriever.py       # Context retriever with repo tenant filtering
│   │   │   ├── service.py         # OpenAI GPT-4o completion service
│   │   │   └── vector_store.py    # Qdrant client connection & collection setup
│   │   ├── schemas/               # Pydantic Request & Response Data Contracts
│   │   │   ├── chat.py            # Conversation schemas
│   │   │   ├── repository.py      # Repository, files & trace schemas
│   │   │   └── user.py            # Auth & profile schemas
│   │   ├── services/              # Background Services
│   │   │   ├── chunker.py         # AST-aware intelligent code chunking
│   │   │   ├── evidence_service.py# AST snippet location & claim verification
│   │   │   ├── git_service.py     # Git cloning & repository file discovery
│   │   │   ├── indexer.py         # Asynchronous 5-step indexing pipeline runner
│   │   │   └── trace_service.py   # BFS/Dijkstra graph traversal & pathfinder
│   │   └── main.py                # ASGI application entrypoint & CORS middleware
│   ├── docker-compose.yml         # Container orchestration specification
│   ├── Dockerfile                 # Backend container Dockerfile
│   └── requirements.txt           # Python dependencies
│
├── frontend/                      # React 19 Single Page Application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Axios HTTP client with Bearer auth interceptors
│   │   ├── components/
│   │   │   ├── architecture/      # ReactFlow Canvas Subsystems
│   │   │   │   ├── ArchitectureEdge.tsx     # Animated custom edge with badge
│   │   │   │   ├── ArchitectureInspector.tsx# Component slide-over drawer
│   │   │   │   ├── ArchitectureNode.tsx     # Layer-themed node card
│   │   │   │   ├── ArchitectureToolbar.tsx  # View switcher, search & layout controls
│   │   │   │   ├── CanvasExportMenu.tsx     # PNG 2x, SVG, JSON & HTML export dropdown
│   │   │   │   ├── CanvasSidebar.tsx        # Left drawer hierarchy tree
│   │   │   │   ├── CanvasStatusBar.tsx      # Bottom status bar with node/edge stats
│   │   │   │   ├── constants.ts             # Layer colors & entity definitions
│   │   │   │   └── layout.ts                # Dagre hierarchical layout coordinator
│   │   │   ├── auth/
│   │   │   │   └── AuthModal.tsx            # GitHub OAuth login modal
│   │   │   ├── chat/
│   │   │   │   └── ChatMessageMarkdown.tsx  # Markdown renderer with code line citations
│   │   │   ├── code/
│   │   │   │   └── CodeViewerModal.tsx      # In-app code viewer with line highlighting
│   │   │   ├── common/
│   │   │   │   └── Navbar.tsx               # Top navigation & repo switcher
│   │   │   ├── dataflow/                    # Data Flow View Engine
│   │   │   │   ├── DataFlowEdge.tsx         # Data transfer edge
│   │   │   │   ├── DataFlowInspector.tsx    # Schema & DTO inspector
│   │   │   │   ├── DataFlowNode.tsx         # Inbound/Outbound schema node
│   │   │   │   └── DataFlowView.tsx         # Data flow canvas view
│   │   │   ├── lifecycle/                   # Lifecycle View Engine
│   │   │   │   ├── LifecycleInspector.tsx   # FSM state transition inspector
│   │   │   │   ├── LifecycleStateNode.tsx   # State bubble node
│   │   │   │   ├── LifecycleTransitionEdge.tsx # Transition trigger edge
│   │   │   │   └── LifecycleView.tsx        # FSM state machine canvas
│   │   │   ├── sequence/                    # Sequence View Engine
│   │   │   │   ├── SequenceInspector.tsx    # Participant & message inspector
│   │   │   │   ├── SequenceMessageRow.tsx   # Message call arrow row
│   │   │   │   ├── SequenceParticipantHeader.tsx # Top participant lifeline header
│   │   │   │   └── SequenceView.tsx         # Chronological sequence canvas
│   │   │   ├── trace/                       # Trace, Evidence & Impact Tools
│   │   │   │   ├── ChangeImpactModal.tsx    # Blast radius simulation modal
│   │   │   │   ├── EvidencePanel.tsx        # Verbatim AST snippet viewer
│   │   │   │   ├── ExplainModal.tsx         # Component explanation dialog
│   │   │   │   ├── TracePanel.tsx           # Floating bottom dock with A* pathfinder
│   │   │   │   └── WhyModal.tsx             # Relationship explanation dialog
│   │   │   └── workflow/                    # Workflow View Engine
│   │   │       ├── WorkflowEdge.tsx         # Step progression edge
│   │   │       ├── WorkflowInspector.tsx    # Step metadata & branch inspector
│   │   │       ├── WorkflowNode.tsx         # Numbered workflow step card
│   │   │       └── WorkflowView.tsx         # Workflow execution canvas
│   │   ├── pages/                           # Application Pages
│   │   │   ├── ArchitectureMapPage.tsx      # Main canvas host with active view coordinator
│   │   │   ├── CodeLensChatPage.tsx         # Grounded RAG Copilot chat page
│   │   │   ├── DashboardPage.tsx            # Repository overview & indexing status
│   │   │   ├── LandingPage.tsx              # Public hero page with 3D canvas preview
│   │   │   ├── ProfileSettingsPage.tsx      # OpenAI BYOK key management page
│   │   │   └── RepositoriesPage.tsx         # GitHub repository import & listing page
│   │   ├── store/                           # Zustand Stores
│   │   │   ├── useAuthStore.ts              # Session, JWT token & user profile
│   │   │   ├── useTraceStore.tsx            # Selected nodes, trace path, evidence modals
│   │   │   └── useWorkspaceStore.ts         # Active repository & repo list
│   │   ├── App.tsx                          # App router & modal coordinator
│   │   └── index.css                        # TailwindCSS v4 imports & custom tokens
│   ├── package.json                         # Frontend dependencies
│   └── vite.config.ts                       # Vite build configuration
│
├── docs/                                  # 📖 Modular Technical Documentation Hub
│   ├── 01-project-overview.md               # Vision, problem, 5 pillars & audience
│   ├── 02-architecture-knowledge-graph.md   # AKG schema, nodes, edges & 5 view extractors
│   ├── 03-backend-architecture.md           # FastAPI, Tree-Sitter AST & 5-step indexer
│   ├── 04-frontend-architecture.md          # React 19, ReactFlow canvas & Zustand stores
│   ├── 05-api-documentation.md              # Complete REST API specifications & schemas
│   ├── 06-database-and-vector-store.md      # PostgreSQL schemas, ER diagram & Qdrant setup
│   ├── 07-rag-and-chat-copilot.md           # RAG pipeline, chunking, prompts & SSE stream
│   ├── 08-setup-and-deployment.md           # Local setup, Docker, env vars & production
│   └── README.md                            # Master documentation hub & reading paths
│
└── README.md                              # This file
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js:** v18.0.0 or higher & npm
- **Python:** v3.11 or higher
- **PostgreSQL 16:** Local instance or cloud database (SQLite fallback supported)
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
# Edit .env with your credentials (DATABASE_URL, SECRET_KEY, GITHUB_*, QDRANT_*)

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

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)

```ini
APP_NAME=CodeLens
DEBUG=True
ENVIRONMENT=development

# Database (PostgreSQL 16 recommended)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/codelens
# SQLite Local Fallback:
# DATABASE_URL=sqlite:///./codelens.db

# Security & JWT Session
SECRET_KEY=your_secure_random_64_character_jwt_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# GitHub OAuth Application Credentials
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret
FRONTEND_URL=http://localhost:5173

# Qdrant Vector Store
QDRANT_HOST=http://localhost:6333
# Or Qdrant Cloud Cluster:
# QDRANT_HOST=https://your-cluster.qdrant.tech
# QDRANT_API_KEY=your_qdrant_api_key

# OpenAI API Key (Fallback key for public demo queries)
OPENAI_API_KEY=sk-proj-your_openai_api_key_here
```

### Frontend (`frontend/.env`)

```ini
VITE_API_URL=http://localhost:8000/api
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
| **Chat / RAG** | `POST` | `/api/repositories/{id}/chats/{chat_id}/stream` | Real-time SSE streaming copilot completion |
| **Health** | `GET` | `/api/health` | Comprehensive system & keep-alive health check |

For the complete endpoint specifications, see [`docs/05-api-documentation.md`](docs/05-api-documentation.md).

---

## 📖 Complete Documentation Hub

The project documentation has been broken down into dedicated modular sub-files in the [`docs/`](docs/) directory:

- 📑 [**01. Project Overview & Vision**](docs/01-project-overview.md) — System vision, problem statement, 5 pillars & user personas.
- 📐 [**02. Architecture Knowledge Graph (AKG)**](docs/02-architecture-knowledge-graph.md) — Graph schemas, node types, edges, confidence levels & 5 view extractors.
- ⚙️ [**03. Backend Architecture**](docs/03-backend-architecture.md) — FastAPI server, Tree-Sitter AST parser, 5-step indexing pipeline & TraceService.
- 🎨 [**04. Frontend Architecture**](docs/04-frontend-architecture.md) — React 19, ReactFlow canvas engine, Zustand v5 stores & multi-format export.
- 📡 [**05. Complete API Documentation**](docs/05-api-documentation.md) — Exhaustive REST endpoints, schemas, request bodies & status codes.
- 🗄️ [**06. Database Schema & Vector Store**](docs/06-database-and-vector-store.md) — PostgreSQL 16 ER diagram, SQLAlchemy models & Qdrant vector configuration.
- 🤖 [**07. Codebase RAG Copilot**](docs/07-rag-and-chat-copilot.md) — Grounded vector retrieval, AST chunking, system prompts & SSE streaming.
- 🚀 [**08. Setup, Installation & Deployment**](docs/08-setup-and-deployment.md) — Local runbook, Docker, environment variables & production deployment.
- 🗺️ [**Master Technical Docs Index**](docs/README.md) — Central documentation sitemap and reading guide.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
