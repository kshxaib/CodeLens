# 03. Backend Architecture — FastAPI & AST Pipeline

> **Document Type:** Backend Engine Specification  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented  

---

## 1. Overview & Backend Philosophy

The CodeLens backend is built using **Python 3.11+** and **FastAPI**, designed for asynchronous, high-throughput code analysis, deterministic Abstract Syntax Tree (AST) parsing, vector embedding generation, and real-time Server-Sent Events (SSE) AI streaming.

```
                                      ┌─────────────────────────────────┐
                                      │         Client Request          │
                                      │ (React 19 SPA / SSE Stream)     │
                                      └────────────────┬────────────────┘
                                                       │
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │   FastAPI CORS & Auth Gateway   │
                                      │  (JWT Bearer, Depend Injection) │
                                      └────────────────┬────────────────┘
                                                       │
         ┌───────────────────┬─────────────────────────┼─────────────────────────┬───────────────────┐
         ▼                   ▼                         ▼                         ▼                   ▼
┌──────────────────┐┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐┌──────────────────┐
│  Auth & Users    ││ Repository CRUD  │     │ 5-Step Indexer   │     │  AKG & 5 Views   ││ Codebase RAG     │
│  (OAuth & BYOK)  ││  (GitHub Sync)   │     │ (AST + Embeddings│     │(Topology & Trace)││ (SSE Streaming)  │
└────────┬─────────┘└────────┬─────────┘     └────────┬─────────┘     └────────┬─────────┘└────────┬─────────┘
         │                   │                        │                        │                   │
         ▼                   ▼                        ▼                        ▼                   ▼
┌──────────────────────────────────────┐     ┌───────────────────────────────────────────────────────────────┐
│     PostgreSQL 16 Relational DB      │     │                     Qdrant Vector Database                    │
│   (Users, Repos, Files, Messages)    │     │                 (1536-dim Code Embeddings)                    │
└──────────────────────────────────────┘     └───────────────────────────────────────────────────────────────┘
```

---

## 2. Directory & Module Breakdown

The backend codebase resides inside [`backend/app/`](file:///d:/Shoaib/CodeLens/backend/app):

```
backend/
├── app/
│   ├── api/                     # REST API Route Controllers
│   │   ├── auth.py              # GitHub OAuth2 authentication & JWT issuance
│   │   ├── chats.py             # Conversation management & SSE streaming RAG
│   │   ├── health.py            # Microsecond DB, Qdrant & system health probes
│   │   ├── repositories.py      # Repo management, 5 views, traces, and file viewing
│   │   └── user.py              # User profile & encrypted OpenAI BYOK management
│   ├── core/                    # Core Configuration & Security
│   │   ├── config.py            # Pydantic BaseSettings loading .env configuration
│   │   └── security.py          # JWT encoding/decoding & Fernet / AES-256 encryption
│   ├── db/                      # Database Layer
│   │   ├── models.py            # SQLAlchemy 2.0 ORM schemas & cascade constraints
│   │   └── session.py           # Engine initialization & session dependency factory
│   ├── parser/                  # Deterministic AST & Graph Analysis Engine
│   │   ├── architecture.py      # System topology extraction
│   │   ├── ast_parser.py        # Tree-Sitter AST multi-language parsing
│   │   ├── blast_radius.py      # Refactoring impact calculation
│   │   ├── data_flow_extractor.py # DTO & data lineage analysis
│   │   ├── dependency_resolver.py# Import, call site, and cross-file resolution
│   │   ├── entity_classifier.py # 5-tier clean architecture entity classification
│   │   ├── graph_schema.py      # Canonical AKG schemas (Node, Edge, Evidence)
│   │   ├── knowledge_graph.py   # AKG builder orchestrator
│   │   ├── lifecycle_extractor.py# Entity finite-state machine (FSM) extractor
│   │   ├── sequence_extractor.py# Participant lifeline & runtime message ordering
│   │   ├── symbols.py           # Symbol extraction (classes, functions, decorators)
│   │   └── workflow_extractor.py# Execution step & decision path extractor
│   ├── rag/                     # Vector Search & AI Inference
│   │   ├── embeddings.py        # OpenAI text-embedding-3-small interface
│   │   ├── prompts.py           # Strict architectural system prompts with line citations
│   │   ├── retriever.py         # Qdrant context retriever with repo filtering
│   │   ├── service.py           # OpenAI GPT-4o / GPT-4o-mini completion router
│   │   └── vector_store.py      # Qdrant client connection & collection setup
│   ├── schemas/                 # Pydantic Request & Response Data Contracts
│   │   ├── chat.py              # Chat payload schemas
│   │   ├── repository.py        # Repository, files, and trace schemas
│   │   └── user.py              # Auth & profile schemas
│   ├── services/                # Background Business Services
│   │   ├── chunker.py           # AST-aware intelligent code chunking
│   │   ├── evidence_service.py  # Code snippet location & claim verification
│   │   ├── git_service.py       # Git cloning, commit discovery, and file scanning
│   │   ├── indexer.py           # Asynchronous 5-step indexing pipeline runner
│   │   └── trace_service.py     # BFS/Dijkstra graph traversal, pathfinding & impact
│   └── main.py                  # ASGI entrypoint, CORS configuration & router registration
├── docker-compose.yml           # Local multi-container development orchestration
├── Dockerfile                   # Production container definition
└── requirements.txt             # Python package dependencies
```

---

## 3. Tree-Sitter AST Parsing & Symbol Resolution

Generic tools use regular expressions or basic lexical analyzers to guess code structure. CodeLens implements concrete syntax tree analysis using **Tree-Sitter** ([`backend/app/parser/ast_parser.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/ast_parser.py)), supporting Python, JavaScript, and TypeScript.

### 3.1 Extraction Pipeline
1. **Source Parsing:** Tree-Sitter parses source files into concrete syntax trees without executing runtime code.
2. **Symbol Extraction:** [`symbols.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/symbols.py) navigates AST nodes to extract:
   - Function & Method declarations (name, parameters, return types, line range)
   - Class declarations (superclasses, methods, class attributes)
   - Function invocations (`CallExpression` / `call`)
   - Module imports (`import`, `from ... import`, `require`, `import ... from`)
   - Decorators / Annotations (e.g. `@router.get`, `@staticmethod`, `@property`)
3. **Entity Classification:** [`entity_classifier.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/entity_classifier.py) maps symbols to clean architecture layers based on structural cues (e.g., class inheritance from `BaseModel` $\to$ Domain Model, use of `@router` $\to$ API Gateway).
4. **Dependency Resolution:** [`dependency_resolver.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/dependency_resolver.py) resolves local module imports to absolute file paths and connects caller call sites to target function definitions.

---

## 4. The 5-Step Indexing Pipeline

When a developer clicks **"Index Repository"** in the UI, FastAPI invokes [`backend/app/services/indexer.py`](file:///d:/Shoaib/CodeLens/backend/app/services/indexer.py) inside a background task worker.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      THE 5-STEP INDEXING PIPELINE                      │
│                                                                        │
│ 1. Git Clone / Pull ───────► Clones repo to isolated temp workspace.   │
│ 2. File & AST Scan ────────► Parses every source file with Tree-Sitter.│
│ 3. Canonical AKG Build ────► Links nodes, calls, imports, and layers.  │
│ 4. Vector Embedding ───────► Chunks code & upserts to Qdrant Vector DB.│
│ 5. DB Status Update ───────► Sets status to 'indexed', records commit. │
└────────────────────────────────────────────────────────────────────────┘
```

1. **Step 1: Git Synchronization**
   - The repository is cloned using a shallow clone (`--depth 1`) via `GitService`.
   - Captures the latest commit SHA and active branch name.
2. **Step 2: Source File Ingestion & AST Parsing**
   - Discovers all source files (`.py`, `.js`, `.ts`, `.tsx`, `.jsx`, `.json`).
   - Ignores binary files, vendor directories (`node_modules`, `venv`, `.git`), and minified bundles.
   - Saves file metadata, sizes, line counts, and text contents into the `files` PostgreSQL table.
3. **Step 3: Canonical AKG Synthesis**
   - Builds the full Architecture Knowledge Graph (`ArchNode`, `ArchEdge`, `SourceEvidence`).
   - Serializes the graph structure into JSON and stores it in the `architecture_graphs` table, keyed by `(repository_id, commit_sha)`.
4. **Step 4: Vector Store Ingestion (Qdrant)**
   - [`chunker.py`](file:///d:/Shoaib/CodeLens/backend/app/services/chunker.py) splits source files into semantic chunks respecting AST function and class boundaries.
   - Generates 1536-dimensional embeddings using OpenAI `text-embedding-3-small`.
   - Upserts chunk vectors to Qdrant collection `codelens_chunks` with metadata payload (`repository_id`, `file_path`, `symbol_name`, `start_line`, `end_line`).
5. **Step 5: Completion & Status Notification**
   - Sets `index_status = 'indexed'`.
   - Records `file_count`, `symbol_count`, and `last_indexed_at` timestamp in the database.

---

## 5. TraceService & Graph Intelligence

[`backend/app/services/trace_service.py`](file:///d:/Shoaib/CodeLens/backend/app/services/trace_service.py) provides advanced graph algorithms over the AKG:

- **Upstream / Downstream Node Tracing:**
  - Given a target node ID and depth $N$, traverses incoming edges (`callers`, `dependents`) and outgoing edges (`dependencies`, `callees`).
- **Shortest Path Finding:**
  - Implements Breadth-First Search (BFS) and Dijkstra shortest path to discover how two disconnected components interact (e.g. how `Frontend Navbar` communicates with `Database User Table`).
- **"Why Relationship" Explanation:**
  - Explains why an edge exists between Node A and Node B by querying the source evidence and rendering the exact code lines where the call occurs.
- **Change Impact Simulation:**
  - Evaluates modifications to a specific file or symbol, calculating the total upstream dependency tree that requires regression testing.

---

## 6. EvidenceService & Verifiable Grounding

[`backend/app/services/evidence_service.py`](file:///d:/Shoaib/CodeLens/backend/app/services/evidence_service.py) ensures complete transparency:

- **Node Evidence Inspection:** Retrieves the exact declaration line numbers and docstrings proving why a node was classified into a specific layer.
- **Edge Evidence Inspection:** Retrieves the exact line numbers and code snippets showing why an edge was established.
- **Repository Evidence Quality Statistics:** Computes the percentage of deterministic vs. inferred edges, average confidence score, and AST coverage ratio across the repository.
- **Claim Verification:** Allows the frontend or user to test a hypothesis (e.g. *"Does PaymentService call StripeGateway directly?"*) and returns deterministic AST verification with line numbers.

---

## 7. Authentication, BYOK & Security

### 7.1 GitHub OAuth2 Workflow
- Users authenticate via their personal GitHub account.
- The backend exchanges the OAuth code for a GitHub personal access token to allow seamless browsing of the user's private and public repositories.
- Issues a signed JSON Web Token (JWT) with HS256 encryption stored client-side in `localStorage`.

### 7.2 Bring Your Own Key (BYOK) Encryption
- Users can provide their own OpenAI API key for AI chat and embedding generation.
- Keys are encrypted at rest using **AES-256 Fernet** ([`backend/app/core/security.py`](file:///d:/Shoaib/CodeLens/backend/app/core/security.py)).
- Keys are decrypted strictly in-memory during LLM execution and are masked (`sk-proj-••••••••••••••••`) in all API responses.
