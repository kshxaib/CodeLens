# 07. Codebase RAG Copilot & Real-Time Streaming

> **Document Type:** AI Copilot & Grounded RAG Specification  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented  

---

## 1. Overview & Anti-Hallucination Philosophy

Standard LLM chat assistants frequently hallucinate when asked about proprietary codebases: they invent non-existent file names, imagine legacy libraries, or write fantasy code that does not match the actual repository architecture.

**CodeLens eliminates hallucinations using a 4-Stage Grounded Retrieval-Augmented Generation (RAG) pipeline:**
1. **AST-Aware Symbol Chunking:** Code is partitioned along semantic AST boundaries (functions, classes, schemas) rather than arbitrary character splits.
2. **Dense Semantic Retrieval:** Retrieves the top matching code chunks from Qdrant vector database filtered strictly to the active repository.
3. **Architectural System Prompt:** Enforces strict line-level file citations (`[filename#L10-L25]`).
4. **Real-Time SSE Streaming:** Streams tokens back to the developer with immediate source citation payload events.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CODELENS RAG PIPELINE                           │
│                                                                        │
│ 1. Developer Prompt ──────► "How does OAuth token exchange work?"     │
│ 2. Dense Vector Search ───► OpenAI text-embedding-3-small in Qdrant    │
│ 3. Context Grounding ─────► Top 5 AST-aware Code Chunks + AKG Context  │
│ 4. GPT-4o Inference ──────► System Prompt enforcing verbatim citations│
│ 5. SSE Event Stream ──────► Emits 'sources' event then token stream    │
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
4. VERBATIM ACCURACY: When suggesting code changes, preserve existing types and imports.
```

---

## 4. Real-Time Server-Sent Events (SSE) Streaming

CodeLens streams answers token-by-token to provide sub-second time-to-first-token (TTFT):

```
Client                                  FastAPI (api/chats.py)                     OpenAI / Qdrant
  │                                                │                                       │
  ├─── POST /api/repositories/{id}/chats/stream ──►│                                       │
  │    (with user question)                        ├─── Query Embedding & Vector Search ──►│
  │                                                │◄── Top K Code Chunks + Metadata ──────┘
  │                                                │
  │◄── SSE: {"event": "sources", "sources": [...]} │ (Emitted immediately so UI shows citations)
  │                                                │
  │◄── SSE: {"event": "chunk", "text": "In "} ─────┤ (Streaming tokens from GPT-4o)
  │◄── SSE: {"event": "chunk", "text": "CodeLens"}─┤
  │◄── SSE: {"event": "chunk", "text": ", ..."} ───┤
  │                                                │
  │◄── SSE: {"event": "done", "message_id": 42} ───┤ (Stream completed and persisted in DB)
```

---

## 5. Frontend Interactive Citation Jumping

When a developer reads an answer in the chat interface ([`frontend/src/pages/CodeLensChatPage.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/pages/CodeLensChatPage.tsx)):
- File citations rendered as badges (e.g. `backend/app/api/auth.py:45-60`).
- Clicking the citation triggers [`CodeViewerModal.tsx`](file:///d:/Shoaib/CodeLens/frontend/src/components/code/CodeViewerModal.tsx).
- The modal downloads the file content from `/api/repositories/{id}/files/{file_id}`, renders syntax-highlighted code, and scrolls to highlight the referenced line range.
