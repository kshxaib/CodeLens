# 02. Architecture Knowledge Graph (AKG)

> **Document Type:** Graph Schema & Multi-View Extraction Specification  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented  

---

## 1. What is the Architecture Knowledge Graph (AKG)?

The **Architecture Knowledge Graph (AKG)** is CodeLens's foundational internal data structure. Rather than generating ad-hoc, disconnected diagrams that fall out of sync with code changes, CodeLens builds a single, unified semantic graph representing every architectural entity in a repository and the directed, typed relationships between them.

From this single canonical graph, CodeLens projects **5 specialized architectural views**:
1. **System Architecture View** (Hierarchical system topology & cross-layer dependencies)
2. **Workflow View** (End-to-end execution paths, decision branching, and error handlers)
3. **Sequence View** (Chronological participant lifelines and message exchanges)
4. **Data Flow View** (Request payloads, DTO schemas, mutations, and database persistence)
5. **Lifecycle View** (Entity state machines, transition triggers, and guard conditions)

```
                            ┌──────────────────────────────────────────────┐
                            │      Repository Source Code (AST Trees)      │
                            └──────────────────────┬───────────────────────┘
                                                   │
                                                   ▼
                            ┌──────────────────────────────────────────────┐
                            │    Unified Architecture Knowledge Graph      │
                            │      (Nodes, Edges, Evidence, Layers)        │
                            └──────┬───────┬────────┬────────┬───────┬─────┘
                                   │       │        │        │       │
              ┌────────────────────┘       │        │        │       └──────────────────┐
              ▼                            ▼        ▼        ▼                          ▼
     ┌─────────────────┐ ┌───────────────┐ ┌─────────────────┐ ┌────────────────┐ ┌────────────────┐
     │ 1. Architecture │ │  2. Workflow  │ │   3. Sequence   │ │  4. Data Flow  │ │  5. Lifecycle  │
     │      View       │ │     View      │ │      View       │ │      View      │ │      View      │
     └─────────────────┘ └───────────────┘ └─────────────────┘ └────────────────┘ └────────────────┘
```

---

## 2. Canonical Graph Schema & Data Models

The graph schema is defined in [`backend/app/parser/graph_schema.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/graph_schema.py).

### 2.1 Entity Types (`EntityType`)

Every node in the AKG is categorized into an explicit domain entity type:

| `EntityType` | Description | Typical Layer |
|---|---|---|
| `application` | Top-level application entrypoint or module package | `application` |
| `service` | Business logic service or workflow coordinator | `application` |
| `module` | Core domain logic, utilities, or algorithmic libraries | `domain` |
| `component` | Frontend UI element, template, or visual view | `presentation` |
| `api_endpoint` | HTTP/REST route, GraphQL resolver, or RPC handler | `api_gateway` |
| `database` | Physical database instance or storage engine | `infrastructure` |
| `database_model` | ORM model, entity schema, or table definition | `domain` |
| `external_service` | Third-party REST API, OAuth provider, or webhook | `infrastructure` |
| `queue` | Asynchronous message broker, Redis pub/sub, or Celery queue | `infrastructure` |
| `worker` | Background task worker, cron scheduler, or queue consumer | `application` |
| `storage` | Blob storage, S3 bucket, Cloudinary, or local disk store | `infrastructure` |
| `function` | Standalone utility, pure algorithm, or helper function | `domain` |
| `class_def` | Domain class, design pattern implementation, or interface | `domain` |
| `lifecycle_entity` | Domain object undergoing state transitions (e.g., Order, IndexJob) | `domain` |

### 2.2 Architectural Layers (`ArchLayer`)

Entities are mapped to standard clean-architecture tiers:

```
┌────────────────────────────────────────────────────────┐
│  1. PRESENTATION       (UI components, views, styles)  │
├────────────────────────────────────────────────────────┤
│  2. API GATEWAY        (Routes, controllers, middleware)│
├────────────────────────────────────────────────────────┤
│  3. APPLICATION        (Services, workflows, workers)  │
├────────────────────────────────────────────────────────┤
│  4. DOMAIN             (Entities, models, business rules)│
├────────────────────────────────────────────────────────┤
│  5. INFRASTRUCTURE     (Databases, queues, external APIs)│
└────────────────────────────────────────────────────────┘
```

### 2.3 Relationship Types (`RelationshipType`)

Edges represent semantic interactions between components:

| Relationship | Semantics | Direction |
|---|---|---|
| `IMPORTS` | Static code dependency or module import | Source imports Target |
| `CALLS` | Runtime synchronous function or method invocation | Caller $\to$ Callee |
| `DEPENDS_ON` | Structural dependency or initialization requirement | Dependent $\to$ Provider |
| `EXPOSES` | API gateway or controller exposing a domain service | Gateway $\to$ Service |
| `CONSUMES` | Worker or client consuming an API or message queue | Consumer $\to$ Producer |
| `READS` | Service reading from database table or model | Service $\to$ Model |
| `WRITES` | Service creating or updating records in database | Service $\to$ Model |
| `PERSISTS` | ORM model saving state to underlying physical database | Model $\to$ Database |
| `AUTHENTICATES` | Middleware validating user session or JWT token | Auth $\to$ Endpoint |
| `EMITS` | Publisher broadcasting an asynchronous event | Publisher $\to$ Queue |
| `LISTENS` | Subscriber reacting to an event stream | Subscriber $\to$ Queue |
| `TRIGGERS` | Background task or webhook initiating a workflow | Trigger $\to$ Workflow |
| `TRANSFORMS` | Pipeline transforming one DTO/schema into another | Input $\to$ Output |
| `CONTAINS` | Parent module containing child functions or classes | Parent $\to$ Child |
| `IMPLEMENTS` | Concrete class implementing an abstract interface | Concrete $\to$ Interface |

### 2.4 Evidence & Confidence Levels

Unlike generic diagram generators that guess relationships, CodeLens grounds every node and edge in deterministic AST evidence:

```python
class ConfidenceLevel(str, Enum):
    DETERMINISTIC = "deterministic"  # 1.0  - Explicit AST parse match (import, direct call)
    HIGH          = "high"           # 0.85 - Clear route decorator or ORM mapping
    MEDIUM        = "medium"         # 0.55 - Inferred from naming convention & signature
    LOW           = "low"            # 0.30 - Speculative pattern match
```

Each edge and node retains an array of `SourceEvidence` objects containing:
- `file_path`: Relative repository path (e.g., `backend/app/api/repositories.py`)
- `start_line` / `end_line`: Precise 1-indexed line numbers
- `snippet`: Verbatim 1–5 line code block
- `evidence_type`: `ast`, `import`, `function_call`, `route`, `db_access`, `configuration`, or `inferred`

---

## 3. The 5 Adaptive Architectural Views

CodeLens extracts 5 views from the repository AST. Each view satisfies a distinct engineering question.

### 3.1 View 1: System Architecture View

- **Purpose:** Macro-level overview of the entire repository structure and clean-architecture layer hierarchy.
- **Extractor:** [`backend/app/parser/knowledge_graph.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/knowledge_graph.py)
- **Frontend Components:** [`ArchitectureNode.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/architecture/ArchitectureNode.tsx), [`ArchitectureEdge.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/architecture/ArchitectureEdge.tsx), [`ArchitectureToolbar.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/architecture/ArchitectureToolbar.tsx), [`ArchitectureInspector.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/architecture/ArchitectureInspector.tsx)
- **Visual Structure:**
  - Nodes represent components, API routers, database models, and external services.
  - Nodes are styled with layer-specific badge colors (Blue for API Gateway, Emerald for Services, Amber for Domain, Purple for Infrastructure).
  - Graph layout is computed using the **Dagre** hierarchical tree algorithm (`TB` top-to-bottom or `LR` left-to-right).
- **Key Interactivity:**
  - Double-click any node to open the in-app code inspector with exact line jumping.
  - Hover on edges to see the relationship type pill and confidence rating.
  - Click any edge to reveal the verbatim AST code snippet backing that link.
  - 1-Click Canvas Export as Retina PNG (2x), Scalable Vector Graphics (SVG), or Knowledge Graph JSON.

### 3.2 View 2: Workflow View

- **Purpose:** Visualize transaction execution paths, API request lifecycles, and failure branches.
- **Extractor:** [`backend/app/parser/workflow_extractor.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/workflow_extractor.py)
- **Frontend Components:** [`WorkflowView.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/workflow/WorkflowView.tsx), [`WorkflowNode.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/workflow/WorkflowNode.tsx), [`WorkflowEdge.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/workflow/WorkflowEdge.tsx), [`WorkflowInspector.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/workflow/WorkflowInspector.tsx)
- **Visual Structure:**
  - Identifies top-level execution triggers (e.g., `POST /repositories/{id}/index`, `loginUser`, `checkoutCart`).
  - Follows call chains through services, intermediate helper functions, and database writes.
  - Identifies conditional branches (`if`/`else`), try/catch blocks, and asynchronous background dispatches.
  - Step numbering ($1, 2, 3 \dots$) displays execution sequence.

### 3.3 View 3: Sequence View

- **Purpose:** Understand chronological message ordering between system actors and subsystems.
- **Extractor:** [`backend/app/parser/sequence_extractor.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/sequence_extractor.py)
- **Frontend Components:** [`SequenceView.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/sequence/SequenceView.tsx), [`SequenceParticipantHeader.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/sequence/SequenceParticipantHeader.tsx), [`SequenceMessageRow.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/sequence/SequenceMessageRow.tsx), [`SequenceInspector.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/sequence/SequenceInspector.tsx)
- **Visual Structure:**
  - Horizontal participant header displaying system actors: `Client / Frontend`, `API Gateway`, `Core Service`, `Database / Cache`, `External Cloud`.
  - Vertical lifelines with dashed drop lines.
  - Chronological message rows with call arrows, parameter names, and return values.
  - Distinguishes synchronous calls (`solid arrow`) from asynchronous events (`dashed arrow`).
- **Key Interactivity:**
  - **Interactive Playback Simulation:** Step-by-step playback controls (Play, Pause, Step Next, Step Back) with active animated caller-callee message highlighting.
  - **Message Deep Inspection:** Click any message row to inspect parameter payloads, return types, and jump directly to source code.

### 3.4 View 4: Data Flow View

- **Purpose:** Trace the transformation of data from inbound request payloads to storage.
- **Extractor:** [`backend/app/parser/data_flow_extractor.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/data_flow_extractor.py)
- **Frontend Components:** [`DataFlowView.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/dataflow/DataFlowView.tsx), [`DataFlowNode.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/dataflow/DataFlowNode.tsx), [`DataFlowEdge.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/dataflow/DataFlowEdge.tsx), [`DataFlowInspector.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/dataflow/DataFlowInspector.tsx)
- **Visual Structure:**
  - Traces schema input DTOs (e.g., Pydantic models, TypeScript interfaces).
  - Highlights data sanitization, hashing (e.g., bcrypt password hashing), and encryption steps (AES-256).
  - Shows database column persistence and final outbound HTTP JSON response schemas.
- **Key Interactivity:**
  - Data Classification Badges (`Confidential`, `PII`, `Financial`, `Public`).
  - Source-to-Sink lineage tracing with schema validation details.

### 3.5 View 5: Lifecycle View

- **Purpose:** Model domain entity state transitions, status fields, and event handlers.
- **Extractor:** [`backend/app/parser/lifecycle_extractor.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/lifecycle_extractor.py)
- **Frontend Components:** [`LifecycleView.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/lifecycle/LifecycleView.tsx), [`LifecycleStateNode.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/lifecycle/LifecycleStateNode.tsx), [`LifecycleTransitionEdge.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/lifecycle/LifecycleTransitionEdge.tsx), [`LifecycleInspector.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/lifecycle/LifecycleInspector.tsx)
- **Visual Structure:**
  - Detects state enums or string status columns (e.g., `not_indexed` $\to$ `indexing` $\to$ `indexed` / `failed`).
  - Renders finite-state machine (FSM) diagrams with initial state nodes, intermediate state bubbles, and terminal state rings.
  - Annotates transition edges with the triggering method and guard conditions.

---

### 3.6 The 5 Views Comparison Matrix

| View | Target Persona | Question Answered | Core Visual Element | Layout Algorithm |
|---|---|---|---|---|
| **1. System Architecture** | Tech Leads & Architects | *"What are the system tiers and how do modules connect?"* | Layered cards, typed relationship badges | Hierarchical Dagre (TB/LR) |
| **2. Workflow View** | Full-Stack Engineers | *"What happens step-by-step when an endpoint is invoked?"* | Ordered transaction steps, decision diamonds | Sequential Flow |
| **3. Sequence View** | Backend & Integration Devs | *"What is the chronological call order across services?"* | Actor lifelines, sync/async message arrows | UML Sequence Grid + Playback |
| **4. Data Flow View** | Security & Data Engineers | *"How is user data transformed, sanitized, and stored?"* | DTO nodes, cryptographic pipelines, DB sinks | Source-to-Sink Lineage |
| **5. Lifecycle View** | Product & Domain Engineers | *"What states can a business entity exist in and what triggers changes?"* | FSM state bubbles, transition arrows, terminal states | State Machine Layout |

---

## 4. Blast Radius & Change Impact Simulation

When maintaining large applications, developers need to know: *"If I alter this function or change this database schema, what will break?"*

The blast radius engine ([`backend/app/parser/blast_radius.py`](file:///d:/Shoaib/CodeLens/backend/app/parser/blast_radius.py) & [`backend/app/services/trace_service.py`](file:///d:/Shoaib/CodeLens/backend/app/services/trace_service.py)) traverses the AKG using breadth-first search (BFS) with depth controls:

```
                                  ┌──────────────────┐
                                  │   Target Symbol  │
                                  │  (Changed Node)  │
                                  └─────────┬────────┘
                         ▲                  │                  ▼
                         │ Upstream         │ Downstream       │
             ┌───────────┴───────────┐      │      ┌───────────┴───────────┐
             │    Direct Callers     │      │      │  Direct Dependencies  │
             │   (Immediate Break)   │      │      │   (Required Callees)  │
             └───────────┬───────────┘      │      └───────────┬───────────┘
                         ▲                  │                  ▼
             ┌───────────┴───────────┐      │      ┌───────────┴───────────┐
             │  Transitive Callers   │      │      │ Transitive Dependents │
             │  (Cascading Impact)   │      │      │ (Downstream Systems)  │
             └───────────────────────┘      ▼      └───────────────────────┘
                                     [Risk Score: HIGH]
                                  Fan-in: 14 | Fan-out: 6
```

### Risk Calculation Formula

$$\text{Impact Score} = (\text{Direct Callers} \times 2.0) + (\text{Transitive Callers} \times 1.0) + (\text{Direct Dependencies} \times 0.5)$$

- **Low Risk ($\text{Score} < 4$):** Isolated helper function or leaf component with few consumers.
- **Medium Risk ($4 \le \text{Score} < 10$):** Module used across multiple service boundaries.
- **High Risk ($\text{Score} \ge 10$):** Foundational entity, authentication middleware, or central database model whose modification requires coordinated testing.

---

## 5. Summary

The Architecture Knowledge Graph forms the deterministic backbone of CodeLens. By representing code structure as a strongly typed, verifiable knowledge graph, CodeLens provides interactive visualization, refactoring safety, and grounded RAG answers without speculative guesswork.
