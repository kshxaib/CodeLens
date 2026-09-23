import re
from typing import List, Dict, Any, Optional


def build_system_prompt(repo_full_name: str) -> str:
    """
    Builds the strict grounding system prompt for CodeLens Copilot.
    Enforces truthfulness, exact file & line citations, and code formatting.
    """
    return f"""You are **CodeLens**, an expert AI Codebase Intelligence Copilot.
You are assisting a developer working on the repository **`{repo_full_name}`**.

### CRITICAL GROUNDING & ACCURACY INSTRUCTIONS:
1. **STRICT GROUNDING:** Base your answers EXCLUSIVELY on the provided source code context chunks. Do NOT invent files, classes, endpoints, or implementation details that are not in the context.
2. **CITATION SYNTAX:** Whenever you explain, reference, or quote any code from the codebase, you MUST attach an inline citation tag using the exact format: `[cite:file_path:start_line-end_line]` (e.g. `[cite:src/services/auth.js:24-45]`).
3. **CODE SNIPPETS:** Use syntax-highlighted markdown code blocks with the appropriate language identifier.
4. **UNKNOWN CONTEXT:** If the provided code snippets do not contain enough information to answer with 100% certainty, clearly state what is known from the context and what files might need further inspection. Do not hallucinate.
5. **TONE:** Concise, precise, helpful, and highly professional engineering tone.
"""


def build_user_prompt(
    question: str,
    context_chunks: List[Dict[str, Any]],
    conversation_history: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """
    Builds the user prompt combining conversation history, relevant codebase
    context chunks, and the developer's question.
    """
    prompt_parts: List[str] = []

    # 1. Include recent conversation history (if any)
    if conversation_history:
        prompt_parts.append("### PREVIOUS CONVERSATION HISTORY:")
        for msg in conversation_history[-6:]:
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "").strip()
            prompt_parts.append(f"**{role}:** {content}\n")
        prompt_parts.append("---\n")

    # 2. Include retrieved codebase context chunks
    prompt_parts.append("### RELEVANT CODEBASE CONTEXT CHUNKS:\n")
    if not context_chunks:
        prompt_parts.append("_No directly matching code chunks found for this query._\n")
    else:
        for idx, chunk in enumerate(context_chunks, start=1):
            file_path = chunk.get("file_path", "")
            start_line = chunk.get("start_line", 1)
            end_line = chunk.get("end_line", 1)
            language = chunk.get("language", "")
            content = chunk.get("content", "").strip()
            symbols = chunk.get("symbols", [])
            sym_names = ", ".join([f"{s.get('kind','')}:{s.get('name','')}" for s in symbols if isinstance(s, dict)])

            prompt_parts.append(f"#### [CHUNK {idx}] File: `{file_path}` (Lines {start_line}-{end_line}) | Symbols: {sym_names or 'none'}")
            prompt_parts.append(f"```{language}\n{content}\n```\n")

    prompt_parts.append("---\n")
    # 3. Developer Question
    prompt_parts.append(f"### DEVELOPER QUESTION:\n{question.strip()}\n\nProvide a comprehensive, accurately cited answer:")

    return "\n".join(prompt_parts)


def parse_citations_from_response(
    response_text: str,
    context_chunks: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Extracts `[cite:file_path:start_line-end_line]` tags from the assistant response
    and enriches them with matching symbol information from the retrieved context.
    """
    if not response_text:
        return []

    # Pattern: [cite:src/api/auth.py:10-25] or [cite:src/auth.js:15]
    pattern = r"\[cite:([^:\]]+):(\d+)(?:-(\d+))?\]"
    matches = re.findall(pattern, response_text)

    citations: List[Dict[str, Any]] = []
    seen: set = set()

    for match in matches:
        file_path = match[0].strip()
        start_line = int(match[1])
        end_line = int(match[2]) if match[2] else start_line

        key = (file_path, start_line, end_line)
        if key in seen:
            continue
        seen.add(key)

        # Match with context chunks to extract symbol/snippet
        matched_symbol = None
        snippet = None

        for chunk in context_chunks:
            if chunk.get("file_path") == file_path:
                for sym in chunk.get("symbols", []):
                    if isinstance(sym, dict) and sym.get("name"):
                        matched_symbol = sym.get("name")
                        break
                snippet = chunk.get("content", "")[:200]
                break

        citations.append({
            "file_path": file_path,
            "start_line": start_line,
            "end_line": end_line,
            "symbol": matched_symbol,
            "snippet": snippet,
        })

    # If no explicit tags were generated, fallback to top context chunk sources
    if not citations and context_chunks:
        for chunk in context_chunks[:3]:
            file_path = chunk.get("file_path", "")
            start_line = chunk.get("start_line", 1)
            end_line = chunk.get("end_line", 1)
            key = (file_path, start_line, end_line)
            if key not in seen and file_path:
                seen.add(key)
                citations.append({
                    "file_path": file_path,
                    "start_line": start_line,
                    "end_line": end_line,
                    "symbol": chunk.get("symbols", [{}])[0].get("name") if chunk.get("symbols") else None,
                    "snippet": chunk.get("content", "")[:200],
                })

    return citations
