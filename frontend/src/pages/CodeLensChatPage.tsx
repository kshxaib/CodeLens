import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  FileCode2,
  Loader2,
  Bot,
  User as UserIcon,
} from 'lucide-react';
import { api, API_BASE_URL } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import type { ConversationItem, ConversationDetail, MessageItem, Citation } from '../types';
import { CodeViewerModal } from '../components/code/CodeViewerModal';
import { AddGeminiKeyModal } from '../components/common/AddGeminiKeyModal';

export const CodeLensChatPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const repoIdParam = searchParams.get('repository');
  const repoId = parseInt(repoIdParam || '0', 10);

  const { user } = useAuthStore();
  const { repositories, setSelectedRepo } = useWorkspaceStore();

  const [activeRepoId, setActiveRepoId] = useState<number>(repoId || (repositories[0]?.id ?? 0));
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [currentConversation, setCurrentConversation] = useState<ConversationDetail | null>(null);

  const [inputQuery, setInputQuery] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamingTokens, setStreamingTokens] = useState<string>('');

  // Code Viewer state
  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerTarget, setViewerTarget] = useState<{ filePath: string; lines?: { start: number; end: number } } | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (repositories.length > 0 && !activeRepoId) {
      setActiveRepoId(repositories[0].id);
    }
  }, [repositories, activeRepoId]);

  // Load conversations when active repository changes
  const fetchConversations = async (targetRepoId: number) => {
    if (!targetRepoId) return;
    try {
      const data = await api.getConversations(targetRepoId);
      setConversations(data.conversations);
      if (data.conversations.length > 0 && !activeChatId) {
        loadChatDetail(targetRepoId, data.conversations[0].id);
      } else if (data.conversations.length === 0) {
        setCurrentConversation(null);
        setActiveChatId(null);
      }
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const loadChatDetail = async (targetRepoId: number, chatId: number) => {
    try {
      const detail = await api.getConversation(targetRepoId, chatId);
      setCurrentConversation(detail);
      setActiveChatId(chatId);
    } catch (err) {
      console.error('Failed to load chat details:', err);
    }
  };

  useEffect(() => {
    if (activeRepoId) {
      fetchConversations(activeRepoId);
    }
  }, [activeRepoId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, streamingTokens]);

  const handleNewChat = async () => {
    if (!activeRepoId) return;
    try {
      const newChat = await api.createConversation(activeRepoId, 'New Chat');
      await fetchConversations(activeRepoId);
      await loadChatDetail(activeRepoId, newChat.id);
    } catch (err) {
      console.error('Create conversation error:', err);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: number) => {
    e.stopPropagation();
    if (!activeRepoId) return;
    try {
      await api.deleteConversation(activeRepoId, chatId);
      await fetchConversations(activeRepoId);
    } catch (err) {
      console.error('Delete conversation error:', err);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const question = (customPrompt || inputQuery).trim();
    if (!question || !activeRepoId || isStreaming) return;

    if (!user?.has_openai_key && !user?.has_gemini_key) {
      setIsKeyModalOpen(true);
      return;
    }

    let targetChatId = activeChatId;

    // Auto-create chat if none active
    if (!targetChatId) {
      const newChat = await api.createConversation(activeRepoId, question.slice(0, 30));
      targetChatId = newChat.id;
      setActiveChatId(targetChatId);
    }

    // Optimistically push user message
    const tempUserMsg: MessageItem = {
      id: Date.now(),
      conversation_id: targetChatId,
      role: 'user',
      content: question,
      created_at: new Date().toISOString(),
    };

    setCurrentConversation((prev) => ({
      ...(prev || {
        id: targetChatId!,
        repository_id: activeRepoId,
        user_id: user.id,
        title: question.slice(0, 30),
        message_count: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        messages: [],
      }),
      messages: [...(prev?.messages || []), tempUserMsg],
    }));

    setInputQuery('');
    setIsStreaming(true);
    setStreamingTokens('');
    setStreamStatus('Connecting...');

    try {
      const token = localStorage.getItem('codelens_token');
      const response = await fetch(
        `${API_BASE_URL}/repositories/${activeRepoId}/chats/${targetChatId}/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
          body: JSON.stringify({ content: question }),
        }
      );

      if (!response.ok) {
        throw new Error(`Chat stream request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      let sseBuffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          // Normalize line breaks
          sseBuffer = sseBuffer.replace(/\r\n/g, '\n');

          // SSE blocks are separated by double newlines
          const blocks = sseBuffer.split('\n\n');
          // Keep the last (potentially incomplete) block in the buffer
          sseBuffer = blocks.pop() || '';

          for (const block of blocks) {
            const trimmedBlock = block.trim();
            if (!trimmedBlock) continue;

            let eventType = '';
            let dataStr = '';

            for (const line of trimmedBlock.split('\n')) {
              const trimmedLine = line.trim();
              if (trimmedLine.startsWith('event:')) {
                eventType = trimmedLine.slice(6).trim();
              } else if (trimmedLine.startsWith('data:')) {
                dataStr = trimmedLine.slice(5).trim();
              }
            }

            if (!eventType || !dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (eventType === 'status') {
                setStreamStatus(data.message || data.status);
              } else if (eventType === 'token') {
                accumulatedText += data.token;
                setStreamingTokens(accumulatedText);
              } else if (eventType === 'done') {
                setStreamStatus(null);
                const assistantMsg: MessageItem = {
                  id: Date.now(),
                  conversation_id: targetChatId!,
                  role: 'assistant',
                  content: data.full_response || accumulatedText,
                  sources: data.citations || [],
                  created_at: new Date().toISOString(),
                };
                setCurrentConversation((prev) =>
                  prev
                    ? {
                        ...prev,
                        messages: [...prev.messages, assistantMsg],
                      }
                    : null
                );
              } else if (eventType === 'error') {
                setStreamStatus(null);
                const errorMsg: MessageItem = {
                  id: Date.now(),
                  conversation_id: targetChatId!,
                  role: 'assistant',
                  content: `⚠️ ${data.message || data.error || 'An error occurred during generation.'}`,
                  sources: [],
                  created_at: new Date().toISOString(),
                };
                setCurrentConversation((prev) =>
                  prev
                    ? {
                        ...prev,
                        messages: [...prev.messages, errorMsg],
                      }
                    : null
                );
              }
            } catch {
              // JSON parse error — skip
            }
          }
        }
      }

      // Reload full conversation history from DB to sync authoritative database IDs
      await fetchConversations(activeRepoId);
      if (targetChatId) {
        await loadChatDetail(activeRepoId, targetChatId);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errMsg = err?.message || 'Error occurred during streaming.';
      setStreamStatus(null);
      const errorMsg: MessageItem = {
        id: Date.now(),
        conversation_id: targetChatId!,
        role: 'assistant',
        content: `⚠️ ${errMsg}`,
        sources: [],
        created_at: new Date().toISOString(),
      };
      setCurrentConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, errorMsg],
            }
          : null
      );
    } finally {
      setIsStreaming(false);
      setStreamStatus(null);
      setStreamingTokens('');
    }
  };

  const handleCitationClick = (citation: Citation) => {
    setViewerTarget({
      filePath: citation.file_path,
      lines: { start: citation.start_line, end: citation.end_line },
    });
    setViewerModalOpen(true);
  };

  const currentRepoObj = repositories.find((r) => r.id === activeRepoId);

  const promptSuggestions = [
    'How does the authentication and session flow work in this codebase?',
    'Explain the high-level architecture and data flow between layers.',
    'Where are the API endpoints registered and how are requests routed?',
    'What are the core domain models and database relationships?',
  ];

  return (
    <WorkspaceLayout>
      <div className="relative w-full h-[calc(100vh-10rem)] flex rounded-2xl border border-[#1f1f23] overflow-hidden bg-[#000000]">
        {/* Left Sidebar: Threads History */}
        <div className="w-72 sm:w-80 h-full bg-[#050505] border-r border-[#1f1f23] flex flex-col justify-between shrink-0">
          <div className="p-4 space-y-4">
            {/* Repository Selector */}
            <div>
              <label className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1.5">
                Active Repository
              </label>
              <select
                value={activeRepoId}
                onChange={(e) => {
                  const nextId = parseInt(e.target.value, 10);
                  setActiveRepoId(nextId);
                  const r = repositories.find((x) => x.id === nextId);
                  if (r) setSelectedRepo(r);
                }}
                className="w-full bg-[#121214] border border-[#1f1f23] rounded-xl px-3 py-2 text-xs font-mono text-white outline-none cursor-pointer"
              >
                {repositories.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* New Chat Button */}
            <button
              onClick={handleNewChat}
              className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-amber-500/10 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat Thread</span>
            </button>

            {/* Thread List */}
            <div className="space-y-1.5 overflow-y-auto max-h-[calc(100vh-22rem)] pr-1">
              <span className="text-[10px] font-mono uppercase text-slate-500 block mb-1 px-1">
                Conversations ({conversations.length})
              </span>
              {conversations.length === 0 ? (
                <div className="text-xs text-slate-500 p-3 text-center">No past threads yet.</div>
              ) : (
                conversations.map((c) => {
                  const isActive = c.id === activeChatId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => loadChatDetail(activeRepoId, c.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer text-xs group transition ${
                        isActive
                          ? 'bg-[#18181b] text-amber-400 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white hover:bg-[#121214]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                        <span className="truncate font-medium">{c.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteChat(e, c.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-500/20 hover:text-rose-400 transition cursor-pointer"
                        title="Delete thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>


        </div>

        {/* Main Chat Center Pane */}
        <div className="flex-1 h-full flex flex-col justify-between overflow-hidden bg-[#000000]">
          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {(!currentConversation || currentConversation.messages.length === 0) && !isStreaming ? (
              /* Empty Chat State */
              <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-2xl mb-5">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">CodeLens Codebase Intelligence Copilot</h3>
                <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-md">
                  Ask architectural questions about <span className="text-amber-400 font-mono">{currentRepoObj?.name}</span>. Answers include verifiable file citations.
                </p>

                {/* Prompt Suggestions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                  {promptSuggestions.map((prompt, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="rounded-xl p-3.5 bg-[#09090b] border border-[#1f1f23] hover:border-amber-500/40 cursor-pointer text-xs text-slate-300 hover:text-white transition group"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{prompt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Message Thread */
              <>
                {currentConversation?.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                        msg.role === 'user' ? 'bg-[#18181b] border border-[#1f1f23] text-amber-400' : 'bg-amber-500 text-[#0d1017]'
                      }`}
                    >
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>

                    {/* Message Bubble */}
                    <div className="space-y-3 min-w-0">
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? 'bg-[#121214] border border-amber-500/30 text-white font-medium rounded-tr-none'
                            : 'bg-[#09090b] border border-[#1f1f23] text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>

                      {/* Verifiable Citations Pills */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="text-[10px] font-mono text-slate-500 self-center">Citations:</span>
                          {msg.sources.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleCitationClick(cite)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 text-[11px] font-mono transition cursor-pointer"
                            >
                              <FileCode2 className="w-3 h-3 text-amber-400" />
                              <span>
                                {cite.file_path}:{cite.start_line}-{cite.end_line}
                              </span>
                              {cite.symbol && <span className="text-slate-400">({cite.symbol})</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Streaming Assistant In-Progress Bubble */}
                {isStreaming && (
                  <div className="flex gap-3 max-w-3xl">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-[#0d1017] flex items-center justify-center shrink-0 shadow-md">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="space-y-3 min-w-0 flex-1">
                      {streamStatus && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#121214] border border-[#1f1f23] text-slate-300 text-xs font-mono">
                          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
                          <span>{streamStatus}</span>
                        </div>
                      )}

                      {streamingTokens && (
                        <div className="p-4 rounded-2xl bg-[#09090b] border border-[#1f1f23] text-xs sm:text-sm text-slate-200 rounded-tl-none whitespace-pre-wrap leading-relaxed">
                          {streamingTokens}
                          <span className="inline-block w-1.5 h-4 bg-amber-400 ml-1 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Query Input Bar */}
          <div className="p-4 bg-[#050505] border-t border-[#1f1f23]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="max-w-4xl mx-auto relative flex items-center"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask CodeLens anything about your codebase architecture, symbols, or functions..."
                disabled={isStreaming}
                className="w-full bg-[#121214] border border-[#1f1f23] focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/60 rounded-2xl pl-4 pr-14 py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
              />
              <button
                type="submit"
                disabled={isStreaming || !inputQuery.trim()}
                className="absolute right-2.5 p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0d1017] shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

        {/* Code Viewer Modal for Citation Clicks */}
        {viewerTarget && (
          <CodeViewerModal
            isOpen={viewerModalOpen}
            onClose={() => setViewerModalOpen(false)}
            repositoryId={activeRepoId}
            filePath={viewerTarget.filePath}
            highlightLines={viewerTarget.lines}
          />
        )}

        {/* Add Gemini Key Modal */}
        {isKeyModalOpen && (
          <AddGeminiKeyModal
            isOpen={isKeyModalOpen}
            onClose={() => setIsKeyModalOpen(false)}
            onSuccess={() => {
              setIsKeyModalOpen(false);
            }}
          />
        )}
      </div>
    </WorkspaceLayout>
  );
};
