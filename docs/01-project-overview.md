# 01. Project Overview — CodeLens

> **Document Type:** System Blueprint & Architectural Overview  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented  

---

## 1. What is CodeLens?

**CodeLens** is an AI-powered codebase intelligence, architecture visualization, and contextual exploration copilot for modern software engineering teams, architects, and open-source developers.

Modern software repositories consist of thousands of intertwined files, obscure cross-module dependencies, implicit runtime workflows, distributed microservices, and asynchronous event pipelines. Developers joining new codebases or maintaining large legacy repositories face significant cognitive overhead trying to mentally model how data flows, where execution entrypoints begin, and how individual code changes propagate across the system.

Instead of manually reading through thousands of lines of code or relying on static, quickly outdated documentation diagrams, **CodeLens** automatically parses repository ASTs (Abstract Syntax Trees), builds a unified **Architecture Knowledge Graph (AKG)**, and renders **5 dynamic visual projections** coupled with a strictly grounded **AI Copilot** and an **Impact Blast Radius Simulator**.

---

## 2. The Core Problem It Solves

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                    THE MODERN SOFTWARE DEVELOPER STRUGGLE                    │
│                                                                              │
│  1. Inscrutable Monoliths & Microservices: Onboarding takes 4+ weeks.        │
│  2. Fragmented Architecture Docs: UML diagrams rot as soon as PRs are merged. │
│  3. Fear of Refactoring: Modifying a function breaks 12 unknown call-sites. │
│  4. Hallucinating AI Copilots: Standard LLMs hallucinate non-existent files. │
│  5. Disconnected Mental Models: Architecture diagrams don't link to code.    │
└──────────────────────────────────────────────────────────────────────────────┘
                                      ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            THE CODELENS SOLUTION                             │
│                                                                              │
│  1. 1-Click GitHub Repository Sync ──► AST Parsing & Vector Indexing in min. │
│  2. Unified Architecture Knowledge Graph ──► Single source of truth.        │
│  3. 5 Adaptive Interactive Views ───► Architecture, Workflow, Sequence, etc. │
│  4. Deterministic Trace & Blast Radius ──► Trace exact upstream & downstream. │
│  5. Grounded RAG AI Copilot ────────► Every answer links to real file lines. │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. The 5 Pillars of CodeLens

### Pillar 1: Unified Architecture Knowledge Graph (AKG)
Rather than maintaining separate, competing graph models for different diagram types, CodeLens constructs a single, canonical graph schema containing all semantic components (presentation, API gateways, services, database models, background queues) and typed relationships (sync calls, imports, event emissions, state mutations).

### Pillar 2: 5 Adaptive Architectural Views
A single codebase needs different perspectives depending on the task:
1. **System Architecture View**: Macro-level hierarchical layout of layers, modules, and cross-tier dependencies with automatic Dagre layout.
2. **Workflow View**: Step-by-step business transaction journeys, service executions, conditional decision branching, and failure paths.
3. **Sequence View**: Chronological interaction lifelines between actors, gateways, microservices, and database layers.
4. **Data Flow View**: Lineage of data from inbound HTTP request bodies, through DTO validation schemas, intermediate mutations, to database persistence and outbound response payloads.
5. **Lifecycle View**: Formal finite-state machine (FSM) diagrams representing domain entity lifecycle transitions (e.g. `NOT_INDEXED` $\to$ `INDEXING` $\to$ `INDEXED` / `FAILED`), guard conditions, and event handlers.

### Pillar 3: Deterministic Blast Radius & Change Impact Simulation
Before changing a function signature or deleting a database model, developers select the symbol in CodeLens. The engine traverses the Knowledge Graph to compute:
- **Upstream Callers (Direct & Transitive)**: What breaks if this symbol changes.
- **Downstream Callees**: What dependencies this symbol relies on.
- **Risk Assessment Level**: `Low`, `Medium`, or `High` impact metrics based on fan-in and fan-out centrality.

### Pillar 4: Grounded Codebase RAG & AI Copilot
CodeLens features an integrated conversational assistant that combines dense vector retrieval (OpenAI `text-embedding-3-small` in Qdrant) with symbol-level AST metadata. When a user asks an architectural or implementation question, CodeLens retrieves the exact relevant code blocks and provides answers with clickable source code line citations.

### Pillar 5: Traceable Source Evidence & In-App Code Inspection
Every node and edge rendered in CodeLens is backed by real source evidence. Clicking an edge displays the exact file, line number range, and code snippet where the import or function invocation occurs, with 1-click in-app modal navigation to view the full file.

---

## 4. Target Audience

- **Staff & Principal Architects**: Performing architectural governance, auditing coupling, identifying circular dependencies, and verifying layering rules.
- **New Hires & Onboarding Engineers**: Rapidly building a mental map of system workflows, data models, and entrypoints within days instead of months.
- **Full-Stack & Backend Developers**: Predicting refactoring blast radius before submitting pull requests.
- **Security & Compliance Teams**: Verifying where sensitive tokens, credentials, and PII data flow across layers and external APIs.
- **Open-Source Maintainers**: Providing interactive, self-documenting visual architecture diagrams that export directly to standalone HTML, SVG, PNG, and JSON.

---

## 5. Next Steps

- Proceed to [02. Architecture Knowledge Graph (AKG)](02-architecture-knowledge-graph.md) to explore the graph schemas, node classifications, and 5 interactive view engines.
