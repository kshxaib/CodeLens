# 📖 CodeLens Master Technical Documentation Hub

> **Document Type:** Source of Truth & Master Documentation Index  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented  
> **Last Audited:** September 2026  

Welcome to the comprehensive technical documentation for **CodeLens**, the AI-powered codebase intelligence, architecture visualization, and contextual exploration copilot.

This documentation suite is organized modularly to enable deep technical inspection without monolithic document bloat.

---

## 📚 Complete Documentation Index

| Doc # | Document Title | Description | Primary Target Audience |
|---|---|---|---|
| **01** | [**Project Overview**](01-project-overview.md) | Vision, real-world problems solved, 5 core pillars & target personas | All Developers, Architects, Stakeholders |
| **02** | [**Architecture Knowledge Graph (AKG)**](02-architecture-knowledge-graph.md) | Canonical graph schema, node/edge models, layers, and 5 interactive view extractors | Software Architects, System Designers |
| **03** | [**Backend Architecture**](03-backend-architecture.md) | FastAPI async server, Tree-Sitter AST parser, 5-step indexing pipeline & TraceService | Backend Engineers, Language Tooling Devs |
| **04** | [**Frontend Architecture**](04-frontend-architecture.md) | React 19 SPA, Vite 8, ReactFlow v12 canvas engine, Zustand v5 stores & multi-format export | Frontend Engineers, UI/UX Designers |
| **05** | [**Complete API Documentation**](05-api-documentation.md) | REST API endpoints, JWT authentication, query params, schemas & status codes | API Consumers, Full-Stack Engineers |
| **06** | [**Database & Vector Store**](06-database-and-vector-store.md) | PostgreSQL 16 relational ER schemas, SQLAlchemy models & Qdrant vector collection setup | Database Administrators, Data Engineers |
| **07** | [**RAG Copilot & Real-Time Streaming**](07-rag-and-chat-copilot.md) | AST-aware code chunking, vector retrieval, prompt templates & SSE streaming engine | AI Engineers, RAG Developers |
| **08** | [**Setup, Installation & Deployment**](08-setup-and-deployment.md) | Local runbook, Docker Compose, environment variables & production deployment guide | DevOps Engineers, SREs |

---

## 🗺️ Recommended Reading Paths

### 1. For System Architects & Tech Leads
1. [01. Project Overview](01-project-overview.md)
2. [02. Architecture Knowledge Graph (AKG)](02-architecture-knowledge-graph.md)
3. [06. Database & Vector Store](06-database-and-vector-store.md)

### 2. For Backend & AI Engineers
1. [03. Backend Architecture](03-backend-architecture.md)
2. [05. Complete API Documentation](05-api-documentation.md)
3. [07. Codebase RAG Copilot](07-rag-and-chat-copilot.md)

### 3. For Frontend Engineers & UI Developers
1. [04. Frontend Architecture](04-frontend-architecture.md)
2. [02. Architecture Knowledge Graph (AKG)](02-architecture-knowledge-graph.md)
3. [05. Complete API Documentation](05-api-documentation.md)

### 4. For DevOps & Platform Engineers
1. [08. Setup, Installation & Deployment](08-setup-and-deployment.md)
2. [06. Database & Vector Store](06-database-and-vector-store.md)
3. [05. Complete API Documentation](05-api-documentation.md#health--keep-alive-monitoring)

---

## ⚡ Quick Architecture Overview

```
USER (Engineer / Architect)
  │
  ▼
FRONTEND SPA (React 19 + Vite 8 + TailwindCSS v4 + Zustand v5)
  ├── 1. Interactive Graph Canvas (@xyflow/react + Dagre Layout Engine)
  │      ├── [View 1: System Architecture] ──► Macro-level component topology & layers
  │      ├── [View 2: Workflow View]        ──► Execution paths, decision branching & error exits
  │      ├── [View 3: Sequence View]        ──► Participant lifelines & chronological messages
  │      ├── [View 4: Data Flow View]       ──► DTO schemas, data sanitization & DB persistence
  │      └── [View 5: Lifecycle View]       ──► Entity FSM state machines & transition triggers
  ├── 2. Floating Trace & Refactoring Dock (Dijkstra/A* Pathfinder + Blast Radius Simulator)
  ├── 3. In-App Source Code Inspector (Syntax highlighted with precise line jump highlighting)
  └── 4. Grounded RAG Copilot (Real-time SSE token stream + clickable file citations)
  │
  ▼
BACKEND API (FastAPI + Python 3.11+ ASGI)
  ├── Security & Auth: GitHub OAuth2, JWT tokens & AES-256 Fernet BYOK encryption
  ├── Parser Engine: Multi-language Tree-Sitter AST (Python, JS, TS)
  ├── Indexer Service: 5-step async pipeline (Git clone, AST scan, AKG build, Qdrant upsert)
  ├── Graph Analytics: TraceService (BFS/A* search, why relationship, impact simulation)
  └── Evidence Service: Verifiable code snippet extraction & confidence scoring
  │
  ▼
PERSISTENCE LAYER
  ├── Relational DB: PostgreSQL 16 (Users, Repositories, Files, ArchitectureGraphs, Messages)
  └── Vector DB: Qdrant Collections (1536-dim OpenAI text-embedding-3-small vectors)
```

---

## 🔗 Related Resources

- **Main Repository README:** [`../README.md`](../README.md)
- **Live Local Backend Docs:** `http://127.0.0.1:8000/docs`
- **Frontend Dev URL:** `http://localhost:5173`
