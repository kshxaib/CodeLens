# 04. Frontend Architecture — React 19, ReactFlow & Zustand

> **Document Type:** Frontend Design System & Component Blueprint  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented  

---

## 1. Overview & Technology Stack

The CodeLens frontend is an interactive Single Page Application (SPA) designed for responsive, fluid exploration of multi-thousand node codebase graphs.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CODELENS FRONTEND STACK                         │
│                                                                        │
│  • Framework: React 19 (Modern Hooks, Concurrent Rendering)            │
│  • Bundler: Vite 8 (Ultra-fast HMR & ES Modules)                       │
│  • Styling: TailwindCSS v4 with custom dark slate design tokens        │
│  • Graph Engine: @xyflow/react v12 (ReactFlow) with Dagre Layout       │
│  • State Management: Zustand v5 (Persisted, Atomic Multi-Stores)       │
│  • Icons & Typography: Lucide React & JetBrains Mono / Inter           │
│  • Markdown & Math: react-markdown, Prism / Syntax Highlighting        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory & Component Organization

The frontend codebase is located in [`frontend/src/`](file:///d:/Shoaib/CodeLens/frontend/src):

```
frontend/src/
├── api/
│   └── client.ts             # Axios HTTP client with Bearer auth interceptors & typed API methods
├── components/
│   ├── architecture/         # ReactFlow Canvas Subsystems
│   │   ├── ArchitectureEdge.tsx     # Custom animated edge with relationship pill & confidence badge
│   │   ├── ArchitectureInspector.tsx# Slide-over drawer with symbols, dependencies & callers
│   │   ├── ArchitectureNode.tsx     # Clean layer-themed card node with symbol count
│   │   ├── ArchitectureToolbar.tsx  # View switcher, layer filters, search, zoom & fit
│   │   ├── CanvasExportMenu.tsx     # PNG 2x, SVG, JSON & Standalone HTML export dropdown
│   │   ├── CanvasSidebar.tsx        # Left drawer with component hierarchy tree & layers
│   │   ├── CanvasStatusBar.tsx      # Bottom status bar with node/edge counts & FPS tracker
│   │   ├── constants.ts             # Layer colors, entity badge definitions & default styles
│   │   └── layout.ts                # Dagre hierarchical layout coordinator
│   ├── auth/
│   │   └── AuthModal.tsx            # GitHub OAuth login trigger modal
│   ├── chat/
│   │   └── ChatMessageMarkdown.tsx  # Markdown renderer with syntax highlighted code blocks & citations
│   ├── code/
│   │   └── CodeViewerModal.tsx      # Modal displaying repository source files with line highlighting
│   ├── common/
│   │   └── Navbar.tsx               # Top navigation bar, repository switcher & user profile menu
│   ├── dataflow/                    # Data Flow View Engine
│   │   ├── DataFlowEdge.tsx         # Data transfer edge with payload format tag
│   │   ├── DataFlowInspector.tsx    # Schema & DTO inspector
│   │   ├── DataFlowNode.tsx         # Inbound/Outbound/Storage schema node
│   │   ├── DataFlowToolbar.tsx      # Data flow search & layout controls
│   │   └── DataFlowView.tsx         # ReactFlow canvas for Data Flow projection
│   ├── layout/
│   │   └── WorkspaceLayout.tsx      # Main application shell with collapsible navigation
│   ├── lifecycle/                   # Lifecycle View Engine
│   │   ├── LifecycleInspector.tsx   # State transition & event handler inspector
│   │   ├── LifecycleStateNode.tsx   # FSM state bubble (Initial, Intermediate, Terminal)
│   │   ├── LifecycleToolbar.tsx     # Entity selector & layout controls
│   │   ├── LifecycleTransitionEdge.tsx# State transition arrow with trigger label
│   │   └── LifecycleView.tsx        # ReactFlow canvas for FSM state machine projection
│   ├── repositories/
│   │   └── RepositoryList.tsx       # Repository grid with sync status & indexing actions
│   ├── sequence/                    # Sequence View Engine
│   │   ├── SequenceInspector.tsx    # Participant & message call inspector
│   │   ├── SequenceMessageRow.tsx   # Synchronous / Asynchronous message arrow row
│   │   ├── SequenceParticipantHeader.tsx # Top participant header lifeline bar
│   │   ├── SequenceToolbar.tsx      # Sequence view zoom & message filter controls
│   │   └── SequenceView.tsx         # Chronological interaction sequence diagram canvas
│   ├── trace/                       # Trace, Evidence & Impact System
│   │   ├── ChangeImpactModal.tsx    # Blast radius refactoring simulation modal
│   │   ├── EvidencePanel.tsx        # Verbatim AST snippet viewer with line ranges
│   │   ├── ExplainModal.tsx         # AI component explanation dialog
│   │   ├── TracePanel.tsx           # Floating bottom dock with BFS/A* pathfinder
│   │   └── WhyModal.tsx             # "Why Relationship" AST proof dialog
│   ├── ui/                          # Atomic UI Components (Buttons, Badges, Inputs, Dialogs)
│   └── workflow/                    # Workflow View Engine
│       ├── WorkflowEdge.tsx         # Step progression edge
│       ├── WorkflowInspector.tsx    # Step metadata & branch inspector
│       ├── WorkflowNode.tsx         # Numbered workflow step card
│       ├── WorkflowToolbar.tsx      # Workflow transaction selector & layout controls
│       └── WorkflowView.tsx         # ReactFlow canvas for workflow execution projection
├── pages/                           # Top-Level Page Views
│   ├── ArchitectureMapPage.tsx      # Main canvas host with active view coordinator
│   ├── CodeLensChatPage.tsx         # Grounded RAG Copilot conversation page
│   ├── DashboardPage.tsx            # Repository overview & indexing status dashboard
│   ├── LandingPage.tsx              # Public hero page with 3D canvas preview
│   ├── ProfileSettingsPage.tsx      # OpenAI BYOK key management page
│   ├── RepositoriesPage.tsx         # GitHub repository import & listing page
│   └── RepositoryOverviewPage.tsx   # Individual repository detail & metrics page
├── store/                           # Zustand Global State Stores
│   ├── useAuthStore.ts              # Session, JWT token & user profile
│   ├── useTraceStore.tsx            # Selected nodes, trace path, evidence modal states
│   └── useWorkspaceStore.ts         # Active repository, indexing status & repo list
├── types/                           # TypeScript Interfaces & API Types
├── App.tsx                          # App router & global modal provider
├── index.css                        # TailwindCSS v4 imports & custom design tokens
└── main.tsx                         # React 19 root bootstrap
```

---

## 3. Interactive Canvas Architecture (`@xyflow/react`)

The core visualization engine utilizes ReactFlow v12 ([`@xyflow/react`](https://reactflow.dev/)).

```
┌────────────────────────────────────────────────────────────────────────┐
│                   CODELENS CANVAS ARCHITECTURE                         │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │  ArchitectureToolbar (View Tabs, Search, Layers, Layout, Export)   │ │
│ ├──────────────┬──────────────────────────────────────┬──────────────┤ │
│ │              │                                      │              │ │
│ │ CanvasSidebar│        ReactFlow Infinite Canvas     │  Inspector   │ │
│ │ (Component   │    - Custom Node Components          │ (Slide-over  │ │
│ │  Hierarchy   │    - Custom Edge Curves with Badges  │  drawer for  │ │
│ │  Tree &      │    - Minimap & Controls              │  selected    │ │
│ │  Filters)    │    - Background Dot Grid             │  component)  │ │
│ │              │                                      │              │ │
│ ├──────────────┴──────────────────────────────────────┴──────────────┤ │
│ │  Floating TracePanel Dock (A* Pathfinder, Blast Radius, Evidence)  │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │  CanvasStatusBar (Node / Edge Count, Layout Algorithm, Status)     │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 Automated Hierarchical Layout (Dagre)
Nodes are arranged automatically using [`frontend/src/components/architecture/layout.ts`](file:///d:/Shoaib/CodeLens/frontend/src/components/architecture/layout.ts):
- Builds a `dagre.graphlib.Graph`.
- Configures rank separation (`ranksep: 80`) and node separation (`nodesep: 50`).
- Supports both **Top-to-Bottom (`TB`)** and **Left-to-Right (`LR`)** orientations.
- Coordinates smooth animated transitions when toggling views.

### 3.2 Canvas Performance Optimizations
- **Memoized Node & Edge Renderers:** Node components are wrapped in `React.memo` to eliminate redundant redraws during canvas panning.
- **Viewport Culling:** Nodes outside the current viewport bounds are skipped during render cycles.
- **Debounced Search & Filtering:** Graph filtering inputs debounce at 150ms to ensure 60fps interaction even with 1,000+ nodes.

---

## 4. State Management with Zustand v5

CodeLens uses 3 specialized, atomic Zustand stores:

### 4.1 `useAuthStore` ([`frontend/src/store/useAuthStore.ts`](file:///d:/Shoaib/CodeLens/frontend/src/store/useAuthStore.ts))
- Manages authentication state (`isAuthenticated`, `user`, `token`).
- Automatically persists the JWT token to `localStorage('codelens_token')`.
- Handles session recovery on application boot (`fetchMe()`).

### 4.2 `useWorkspaceStore` ([`frontend/src/store/useWorkspaceStore.ts`](file:///d:/Shoaib/CodeLens/frontend/src/store/useWorkspaceStore.ts))
- Tracks the currently active repository (`activeRepository`).
- Manages the user's accessible repository list (`repositories`).
- Polls indexing progress when a repository is actively running the 5-step pipeline.

### 4.3 `useTraceStore` ([`frontend/src/store/useTraceStore.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/store/useTraceStore.tsx))
- Tracks highlighted nodes and edges during pathfinding operations.
- Stores active blast radius results and calculated upstream/downstream trees.
- Controls visibility of modal overlays: `WhyModal`, `ExplainModal`, `ChangeImpactModal`, `EvidencePanel`, and `CodeViewerModal`.

---

## 5. Multi-Format Export System

The [`CanvasExportMenu.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/architecture/CanvasExportMenu.tsx) component enables 1-click export of any architectural view:

1. **High-Resolution PNG (2x Retina):**
   - Renders the full graph canvas offscreen at 200% scale using `html-to-image`.
   - Includes watermark and generation timestamp.
2. **Scalable Vector Graphics (SVG):**
   - Exports crisp vector graphics ideal for technical documentation and print.
3. **Raw Knowledge Graph JSON:**
   - Dumps the complete `KnowledgeGraph` payload including all nodes, edges, layers, and line-level evidence for external tool processing.
4. **Standalone Interactive HTML:**
   - Bundles the active view into a single, zero-dependency `.html` file that includes an embedded SVG/interactive canvas. Engineers can attach this file to GitHub Pull Requests or Confluence pages for team review.
