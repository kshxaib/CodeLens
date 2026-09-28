# 07. Codebase RAG Copilot & Real-Time Streaming

> **Document Type:** AI Copilot & Grounded RAG Specification  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented in Production  
> **Live Production URL:** [https://codelens.kshoeb.in/chat](https://codelens.kshoeb.in/chat)  
> **Last Audited:** September 2026  

---

## 1. Overview & Anti-Hallucination Philosophy

Standard LLM chat assistants frequently hallucinate when asked about proprietary codebases: they invent non-existent file names, imagine legacy libraries, or write fantasy code that does not match the actual repository architecture.

**CodeLens eliminates hallucinations using a 4-Stage Grounded Retrieval-Augmented Generation (RAG) pipeline:**
1. **AST-Aware Symbol Chunking:** Code is partitioned along semantic AST boundaries (functions, classes, schemas) rather than arbitrary character splits.
2. **Dense Semantic Retrieval:** Retrieves the top matching code chunks from Qdrant vector database filtered strictly to the active repository tenant (`repository_id`).
3. **Architectural System Prompt:** Enforces strict line-level file citations (`[filename#L10-L25]`).
4. **Real-Time SSE Streaming with ThoughtLine UI:** Streams tokens back to the developer with immediate source citation payload events and interactive live reasoning visualization.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CODELENS RAG PIPELINE                           │
│                                                                        │
│ 1. Developer Prompt ──────► "How does OAuth token exchange work?"     │
│ 2. Dense Vector Search ───► OpenAI text-embedding-3-small in Qdrant    │
│ 3. Context Grounding ─────► Top 5 AST-aware Code Chunks + AKG Context  │
│ 4. ThoughtLine Stream ────► Emits SSE reasoning stages & status tokens │
│ 5. GPT-4o Inference ──────► System Prompt enforcing verbatim citations│
│ 6. Interactive Citations ─► Clicking citation opens in-app code modal  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. AST-Aware Symbol Chunking (`chunker.py`)

Arbitrary fixed-size character chunking breaks code logic in half—cutting off function signatures from their bodies or splitting SQL queries.

[`backend/app/services/chunker.py`](file:///d:/Shoaib/CodeLens/backend/app/services/chunker.py) leverages the Tree-Sitter AST to chunk code intelligently:

- **Function & Method Chunks:** Keeps entire function declarations intact from decorator to return statement.
- **Class Chunks:** Chunks class definitions along with their method signatures and docstrings.
- **Context Header Injection:** Prepends every chunk with structural context (e.g. `// File: backend/app/api/auth.py | Class: None | Function: github_callback`).
- **Overlap Guarantee:** For oversized functions (> 2,000 tokens), chunks are split with 200-token overlaps at statement boundaries.

---

## 3. Strict Architectural System Prompts (`prompts.py`)

The system prompt ([`backend/app/rag/prompts.py`](file:///d:/Shoaib/CodeLens/backend/app/rag/prompts.py)) instructs the model to act as a Principal Software Architect:

```markdown
You are CodeLens Copilot, an elite Principal Software Architect and codebase intelligence assistant.

Rules for Grounded Codebase Answers:
1. STRICT GROUNDING: Answer questions based ONLY on the provided retrieved code context.
   Do NOT assume or hallucinate functions or files that are not in the context.
2. CITATION ENFORCEMENT: Whenever you reference a function, class, or logic, you MUST
   cite the exact file path and line numbers using the format: `[filepath#Lstart-Lend]`.
3. ARCHITECTURAL PERSPECTIVE: Explain which architectural layer the component belongs to
   (e.g., Presentation, API Gateway, Application Service, Domain Model, Infrastructure).
4. VERIFIABLE EVIDENCE: Provide verbatim code evidence snippets where appropriate.
```

---

## 4. Real-Time SSE Token Streaming & ThoughtLine UI

CodeLens streams completions using standard Server-Sent Events (SSE) from `POST /api/chats/stream`.

### 4.1 SSE Protocol Message Types

During code reasoning, the backend emits structured JSON event objects:

| Event Type | Payload Format | Description |
|---|---|---|
| `status` | `{"type": "status", "message": "Searching repository vectors..."}` | Progress update displayed in ThoughtLine |
| `sources` | `{"type": "sources", "sources": [...]}` | Verifiable code chunks retrieved from Qdrant |
| `token` | `{"type": "token", "token": "The"}` | Next generated text token from the LLM |
| `error` | `{"type": "error", "message": "Error details"}` | Graceful streaming error handler |
| `[DONE]` | Plain string `[DONE]` | Signals stream completion |

### 4.2 ThoughtLine Live Reasoning Component (`ThoughtLine.tsx`)

The chat interface features an interactive reasoning indicator:
- **Breathing Glyph Animation:** Smooth organic oscillation while the agent is searching vector indices and AST symbol tables.
- **Live Elapsed Timer:** Measures exact thought duration in seconds.
- **Dynamic Step Badges:** Shows cumulative steps taken (`"Searching vectors"`, `"Grounding AST context"`, `"Synthesizing architecture answer"`).
- **Auto-Settle & Collapse:** Automatically collapses on stream completion with a clean summary badge (`"Thought for 2.4s"`).
- **Interactive Inspection:** Users can click the settled badge to expand and inspect the thought history and source context anytime.

---

## 5. Conversational Workspace UX

- **Collapsible Sidebar:** Auto-collapsing sidebar with hover expansion to maximize screen space for reading complex code snippets.
- **Zero-Border Floating Prompt Bar:** Minimalist input console with multi-line auto-expand, keyboard shortcuts (`Enter` to send, `Shift+Enter` for newline).
- **User Profile Integration:** Displays authentic GitHub avatar for user prompts and custom branded neon glyph for AI responses.
- **Markdown & Code Highlighting:** Syntax highlighted code blocks with 1-click copy and clickable file line links.
