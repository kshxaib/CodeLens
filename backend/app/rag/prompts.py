import re
from typing import List, Dict, Any, Optional


def is_conversational_query(text: str) -> bool:
    """
    Determines if the user query is a greeting, polite pleasantry, identity question,
    or general check-in (e.g. 'hello', 'how are you', 'which model are you using').
    In these cases, the AI should respond naturally and politely instead of dumping code.
    """
    if not text:
        return True

    clean = re.sub(r"[^\w\s]", " ", text.strip().lower())
    words = clean.split()
    if not words:
        return True

    greetings = {
        "hi", "hello", "hey", "heya", "hola", "yo", "sup",
        "kaise", "kya", "haal", "kese", "namaste", "salam", "assalam",
        "good", "morning", "evening", "afternoon", "night",
        "thanks", "thank", "thx", "shukriya", "dhanyawad",
        "bye", "goodbye", "ok", "okay", "alright", "cool", "nice", "great"
    }

    code_specific_words = {
        "file", "files", "function", "functions", "class", "classes",
        "repo", "repository", "bug", "bugs", "error", "errors", "endpoint",
        "endpoints", "schema", "table", "code", "directory", "service",
        "controller", "route", "routes", "database", "query", "syntax"
    }

    casual_phrases = [
        "how are you", "how r u", "how do you do", "how is it going", "hows it going",
        "whats up", "what is up", "who are you", "what are you", "what can you do",
        "which model", "what model", "which ai", "what ai", "are you ai", "are you a bot",
        "kaise ho", "kya haal", "kya chal raha", "kaise chal", "sab theek"
    ]

    cleaned_phrase = " ".join(words)
    for phrase in casual_phrases:
        if phrase in cleaned_phrase:
            if not any(sw in words for sw in code_specific_words):
                return True

    if len(words) <= 4:
        if any(g in greetings for g in words):
            if not any(sw in words for sw in code_specific_words):
                return True

    return False


def build_system_prompt(repo_full_name: str, is_conversational: bool = False) -> str:
    """
    Builds the system prompt for CodeLens Copilot.
    - If conversational: friendly, helpful, polite, answers greetings naturally without dumping code.
    - If technical: strict grounding, exact file & line citations, code snippets.
    """
    if is_conversational:
        return f"""You are **CodeLens**, an intelligent and friendly AI Codebase Intelligence Copilot.
You are assisting a developer working on the repository **`{repo_full_name}`**.

### CONVERSATIONAL INSTRUCTIONS:
1. **NATURAL & CONCISE:** The user has sent a greeting, casual question, or asked about who you are or what model you use. Reply warmly, naturally, and concisely in human conversational tone.
2. **DO NOT DUMP CODE:** Do NOT provide unsolicited source code snippets, repository file lists, or architecture breakdowns unless the user specifically asks for them.
3. **SELF-IDENTIFICATION:** You are CodeLens Copilot, powered by OpenAI (GPT-4o / GPT-4o-mini). You are equipped to analyze repository code, explain architectures, trace functions, and debug issues whenever the user is ready.
4. **LANGUAGE MATCHING:** Reply in the same language or tone the user used (e.g. English, Hinglish, Hindi).
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
    is_conversational: bool = False,
) -> str:
    """
    Builds the user prompt combining conversation history, relevant codebase
    context chunks (if technical), and the user's question.
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

    # 2. If technical question, include retrieved codebase context chunks
    if not is_conversational:
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

    # 3. User Question
    prompt_parts.append(f"### USER QUERY:\n{question.strip()}\n\nProvide your response:")

    return "\n".join(prompt_parts)


def parse_citations_from_response(
    response_text: str,
    context_chunks: List[Dict[str, Any]],
    is_conversational: bool = False,
) -> List[Dict[str, Any]]:
    """
    Extracts `[cite:file_path:start_line-end_line]` tags from the assistant response
    and enriches them with matching symbol information from the retrieved context.
    """
    if not response_text or is_conversational:
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
