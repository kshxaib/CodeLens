# 05. Complete API Documentation

> **Document Type:** REST API Specification & Data Contracts  
> **Target Version:** 1.0.0  
> **Status:** Active & Implemented  

---

## 1. Authentication & Global Headers

All protected endpoints require a valid JSON Web Token (JWT) transmitted via the standard HTTP `Authorization` header:

```http
Authorization: Bearer <your_jwt_access_token>
Content-Type: application/json
```

If the token is expired or invalid, the API returns `401 Unauthorized`:
```json
{
  "detail": "Could not validate credentials"
}
```

---

## 2. API Endpoints Master Table

| Category | Method | Endpoint | Auth | Purpose |
|---|---|---|---|---|
| **Auth** | `GET` | `/api/auth/github` | No | Fetch GitHub OAuth authorization redirect URL |
| **Auth** | `GET` | `/api/auth/callback` | No | Exchange OAuth code for JWT & user profile |
| **Auth** | `GET` | `/api/auth/me` | Yes | Get active authenticated user profile |
| **Auth** | `POST` | `/api/auth/logout` | Yes | Invalidate user session |
| **User** | `GET` | `/api/user/profile` | Yes | Get user profile & OpenAI key configuration status |
| **User** | `PUT` | `/api/user/openai-key` | Yes | Store encrypted personal OpenAI API key (AES-256) |
| **User** | `DELETE` | `/api/user/openai-key` | Yes | Delete stored OpenAI API key |
| **Repositories**| `GET` | `/api/repositories/github/user-repos` | Yes | List user's available repositories on GitHub |
| **Repositories**| `GET` | `/api/repositories` | Yes | List repositories imported into CodeLens |
| **Repositories**| `POST` | `/api/repositories` | Yes | Import repository by GitHub URL |
| **Repositories**| `GET` | `/api/repositories/{id}` | Yes | Get details of a single repository |
| **Repositories**| `POST` | `/api/repositories/{id}/index` | Yes | Trigger 5-step background AST & vector indexing |
| **Files** | `GET` | `/api/repositories/{id}/files` | Yes | List all indexed source files in repository |
| **Files** | `GET` | `/api/repositories/{id}/files/{file_id}` | Yes | Fetch source code content for in-app code viewer |
| **Views** | `GET` | `/api/repositories/{id}/architecture` | Yes | Fetch System Architecture topology graph |
| **Views** | `GET` | `/api/repositories/{id}/knowledge-graph` | Yes | Fetch complete Architecture Knowledge Graph (AKG) |
| **Views** | `POST` | `/api/repositories/{id}/knowledge-graph/build`| Yes | Rebuild AKG on demand |
| **Views** | `GET` | `/api/repositories/{id}/workflows` | Yes | Fetch extracted execution workflows |
| **Views** | `POST` | `/api/repositories/{id}/workflows/build` | Yes | Rebuild execution workflows on demand |
| **Views** | `GET` | `/api/repositories/{id}/data-flows` | Yes | Fetch extracted data lineage & DTO flows |
| **Views** | `POST` | `/api/repositories/{id}/data-flows/build` | Yes | Rebuild data flows on demand |
| **Views** | `GET` | `/api/repositories/{id}/sequences` | Yes | Fetch extracted runtime sequence diagrams |
| **Views** | `POST` | `/api/repositories/{id}/sequences/build` | Yes | Rebuild runtime sequence diagrams on demand |
| **Views** | `GET` | `/api/repositories/{id}/lifecycles` | Yes | Fetch entity finite-state machine (FSM) lifecycles |
| **Views** | `POST` | `/api/repositories/{id}/lifecycles/build` | Yes | Rebuild entity lifecycles on demand |
| **Trace** | `GET` | `/api/repositories/{id}/trace/node` | Yes | Trace upstream callers & downstream callees |
| **Trace** | `GET` | `/api/repositories/{id}/trace/path` | Yes | Find shortest path between two nodes (BFS/Dijkstra) |
| **Trace** | `GET` | `/api/repositories/{id}/trace/why` | Yes | Explain why a relationship exists with AST evidence |
| **Trace** | `POST` | `/api/repositories/{id}/trace/explain` | Yes | AI architectural explanation of a specific component |
| **Trace** | `GET` | `/api/repositories/{id}/trace/impact` | Yes | Calculate cascade impact of modifying a node |
| **Trace** | `GET` | `/api/repositories/{id}/trace/change-impact` | Yes | Calculate blast radius for a file or symbol change |
| **Blast Radius**| `GET` | `/api/repositories/{id}/blast-radius` | Yes | Compute symbol blast radius & risk score |
| **Evidence** | `GET` | `/api/repositories/{id}/evidence/node` | Yes | Get verbatim AST evidence for a node classification |
| **Evidence** | `GET` | `/api/repositories/{id}/evidence/edge` | Yes | Get verbatim AST code snippet for an edge |
| **Evidence** | `GET` | `/api/repositories/{id}/evidence/stats` | Yes | Get repository evidence quality & confidence metrics |
| **Evidence** | `GET` | `/api/repositories/{id}/evidence/verify` | Yes | Verify an architectural relationship claim |
| **Chat / RAG** | `GET` | `/api/repositories/{id}/chats` | Yes | List conversation threads for repository |
| **Chat / RAG** | `POST` | `/api/repositories/{id}/chats` | Yes | Create new conversation thread |
| **Chat / RAG** | `GET` | `/api/repositories/{id}/chats/{chat_id}` | Yes | Get chat thread history & source citations |
| **Chat / RAG** | `DELETE`| `/api/repositories/{id}/chats/{chat_id}` | Yes | Delete conversation thread |
| **Chat / RAG** | `POST` | `/api/repositories/{id}/chats/{chat_id}/stream`| Yes | Real-time SSE streaming RAG copilot completion |
| **Health** | `GET/HEAD` | `/api/health` | No | Comprehensive system & keep-alive health probe |
| **Health** | `GET/HEAD` | `/api/health/db` | No | PostgreSQL database connection health probe |
| **Health** | `GET/HEAD` | `/api/health/qdrant` | No | Qdrant vector database health probe |

---

## 3. Selected Detailed Endpoint Contracts

### 3.1 Trigger Indexing
`POST /api/repositories/{id}/index`

Initiates the 5-step background AST extraction and vector embedding pipeline.

**Response (`202 Accepted` / `200 OK`):**
```json
{
  "status": "indexing",
  "task_id": "index-repo-42-1727424000",
  "message": "Repository indexing started in background"
}
```

---

### 3.2 Compute Symbol Blast Radius
`GET /api/repositories/{id}/blast-radius?symbol=UserService.create_user`

Computes the upstream and downstream call hierarchy and assigns a refactoring risk score.

**Response (`200 OK`):**
```json
{
  "symbol": "UserService.create_user",
  "risk_score": 12.5,
  "risk_level": "high",
  "direct_callers": [
    {
      "node_id": "api_auth_register",
      "symbol": "register_user",
      "file_path": "backend/app/api/auth.py",
      "line": 45
    }
  ],
  "transitive_callers": [
    {
      "node_id": "frontend_auth_modal",
      "symbol": "handleSubmit",
      "file_path": "frontend/src/components/auth/AuthModal.tsx",
      "line": 32
    }
  ],
  "dependencies": [
    {
      "node_id": "model_user",
      "symbol": "User",
      "file_path": "backend/app/db/models.py",
      "line": 6
    },
    {
      "node_id": "core_security_hash",
      "symbol": "get_password_hash",
      "file_path": "backend/app/core/security.py",
      "line": 18
    }
  ],
  "summary": "Modifying UserService.create_user impacts 1 direct route and 1 upstream UI component with 2 critical dependencies."
}
```

---

### 3.3 Find Path Between Two Nodes
`GET /api/repositories/{id}/trace/path?start_node=component_navbar&end_node=model_user&max_hops=8`

Discovers how two components interact across layers.

**Response (`200 OK`):**
```json
{
  "start_node": "component_navbar",
  "end_node": "model_user",
  "path_found": true,
  "hop_count": 3,
  "nodes": [
    { "id": "component_navbar", "name": "Navbar", "layer": "presentation" },
    { "id": "api_auth_me", "name": "get_current_user", "layer": "api_gateway" },
    { "id": "model_user", "name": "User", "layer": "domain" }
  ],
  "edges": [
    { "source": "component_navbar", "target": "api_auth_me", "type": "CALLS" },
    { "source": "api_auth_me", "target": "model_user", "type": "READS" }
  ]
}
```

---

### 3.4 Stream Real-Time SSE Chat Response
`POST /api/repositories/{id}/chats/{chat_id}/stream`

**Request Body:**
```json
{
  "content": "Where is the password hashing implemented and which routes call it?"
}
```

**Response (`text/event-stream`):**
```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

data: {"event": "sources", "sources": [{"file_path": "backend/app/core/security.py", "start_line": 15, "end_line": 25, "symbol": "get_password_hash"}]}

data: {"event": "chunk", "text": "Password hashing in CodeLens is implemented in `backend/app/core/security.py` using bcrypt..."}

data: {"event": "chunk", "text": " It is invoked during user registration in `backend/app/api/auth.py#L52`."}

data: {"event": "done", "message_id": 104}
```
