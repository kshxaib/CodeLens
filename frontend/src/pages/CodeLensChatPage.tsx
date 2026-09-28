import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Plus, Send, Sparkles, Trash2, FileCode2, Loader2, User as UserIcon } from 'lucide-react';
import { api, API_BASE_URL } from '../api/client';
import { useAuthStore } from '../store/useAuthStore';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import type { ConversationItem, ConversationDetail, MessageItem, Citation } from '../types';
import { CodeViewerModal } from '../components/code/CodeViewerModal';
import { AddGeminiKeyModal } from '../components/common/AddGeminiKeyModal';
import { DeleteChatConfirmModal } from '../components/common/DeleteChatConfirmModal';
import { CreateChatModal } from '../components/common/CreateChatModal';
import { ChatMessageMarkdown } from '../components/chat/ChatMessageMarkdown';
import ThoughtLine from '../components/chat/ThoughtLine';
import { Button } from '@/components/ui/button';

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
  const [isThinking, setIsThinking] = useState(false);
  const [streamStatus, setStreamStatus] = useState<string | null>(null);
  const [streamingTokens, setStreamingTokens] = useState<string>('');
  const [thoughtSteps, setThoughtSteps] = useState<string[]>([
    'Reading the question',
    'Searching repository symbols',
    'Drafting an answer',
  ]);
  const settledDurationRef = useRef<number | null>(null);

  const [viewerModalOpen, setViewerModalOpen] = useState(false);
  const [viewerTarget, setViewerTarget] = useState<{ filePath: string; lines?: { start: number; end: number } } | null>(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const [chatToDelete, setChatToDelete] = useState<ConversationItem | null>(null);
  const [isDeletingChat, setIsDeletingChat] = useState(false);

  const [isCreateChatModalOpen, setIsCreateChatModalOpen] = useState(false);
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (repositories.length > 0 && !activeRepoId) {
      setActiveRepoId(repositories[0].id);
    }
  }, [repositories, activeRepoId]);

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

  const handleNewChat = () => {
    if (!activeRepoId) return;
    setPendingMessage(null);
    setIsCreateChatModalOpen(true);
  };

  const handleCreateChat = async (title: string) => {
    if (!activeRepoId) return;
    try {
      setIsCreatingChat(true);
      const newChat = await api.createConversation(activeRepoId, title);
      await fetchConversations(activeRepoId);
      await loadChatDetail(activeRepoId, newChat.id);
      setIsCreateChatModalOpen(false);

      if (pendingMessage) {
        const msg = pendingMessage;
        setPendingMessage(null);
        setTimeout(() => {
          handleSendMessage(msg, newChat.id);
        }, 100);
      }
    } catch (err) {
      console.error('Create conversation error:', err);
      throw err;
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleConfirmDeleteChat = async () => {
    if (!activeRepoId || !chatToDelete) return;
    try {
      setIsDeletingChat(true);
      await api.deleteConversation(activeRepoId, chatToDelete.id);
      if (activeChatId === chatToDelete.id) {
        setActiveChatId(null);
        setCurrentConversation(null);
      }
      await fetchConversations(activeRepoId);
      setChatToDelete(null);
    } catch (err) {
      console.error('Delete conversation error:', err);
    } finally {
      setIsDeletingChat(false);
    }
  };

  const handleSendMessage = async (customPrompt?: string, overrideChatId?: number) => {
    const question = (customPrompt || inputQuery).trim();
    if (!question || !activeRepoId || isStreaming) return;

    if (!user?.has_openai_key && !user?.has_gemini_key) {
      setIsKeyModalOpen(true);
      return;
    }

    let targetChatId = overrideChatId || activeChatId;

    if (!targetChatId) {
      setPendingMessage(question);
      setIsCreateChatModalOpen(true);
      return;
    }

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
    setIsThinking(true);
    setStreamingTokens('');
    setStreamStatus('Thinking…');
    setThoughtSteps([
      'Reading the question',
      'Searching repository symbols',
      'Drafting an answer',
    ]);
    settledDurationRef.current = null;

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
      let completedCitations: Citation[] = [];

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          sseBuffer = sseBuffer.replace(/\r\n/g, '\n');

          const blocks = sseBuffer.split('\n\n');
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
                const msg = data.message || data.status;
                setStreamStatus(msg);
                if (msg) {
                  setThoughtSteps((prev) => {
                    if (prev.includes(msg)) return prev;
                    const next = [...prev];
                    next.splice(Math.max(0, next.length - 1), 0, msg);
                    return next;
                  });
                }
              } else if (eventType === 'token') {
                accumulatedText += data.token;
                setStreamingTokens(accumulatedText);
                setIsThinking(false);
              } else if (eventType === 'done') {
                setStreamStatus(null);
                setIsThinking(false);
                if (data.full_response) {
                  accumulatedText = data.full_response;
                }
                if (data.citations) {
                  completedCitations = data.citations;
                }
              } else if (eventType === 'error') {
                setStreamStatus(null);
                setIsThinking(false);
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
                setIsStreaming(false);
                setStreamingTokens('');
              }
            } catch {
            }
          }
        }
      }

      // Stream finished: reload authoritative conversation from DB or fallback
      let loadedDetail: ConversationDetail | null = null;
      if (targetChatId) {
        try {
          loadedDetail = await api.getConversation(activeRepoId, targetChatId);
        } catch (err) {
          console.error('Failed to reload conversation after stream:', err);
        }
      }

      if (loadedDetail && loadedDetail.messages.length > 0) {
        if (settledDurationRef.current != null) {
          const lastIdx = loadedDetail.messages.length - 1;
          if (loadedDetail.messages[lastIdx].role === 'assistant') {
            loadedDetail.messages[lastIdx].thought_time = settledDurationRef.current;
          }
        }
        setCurrentConversation(loadedDetail);
      } else if (accumulatedText) {
        const assistantMsg: MessageItem = {
          id: Date.now(),
          conversation_id: targetChatId!,
          role: 'assistant',
          content: accumulatedText,
          sources: completedCitations,
          thought_time: settledDurationRef.current ?? undefined,
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
      }

      setIsStreaming(false);
      setStreamingTokens('');
      await fetchConversations(activeRepoId);
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
      <div className="relative w-full flex-1 h-full min-h-0 flex rounded-2xl border border-[#E2E0D9] overflow-hidden bg-[#F8F7F4] shadow-sm">
        <div className="w-52 sm:w-56 h-full bg-[#FFFFFF] border-r border-[#E2E0D9] flex flex-col shrink-0 overflow-hidden">
          <div className="p-2.5 space-y-2.5 flex-1 flex flex-col min-h-0">
            <div>
              <label className="text-[10px] uppercase font-mono font-semibold text-[#526078] block mb-1">
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
                className="w-full bg-[#FAF9F5] border border-[#E2E0D9] rounded-lg px-2 py-1.5 text-xs font-mono text-[#19243B] outline-none cursor-pointer focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 transition truncate"
              >
                {repositories.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.full_name}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleNewChat}
              className="w-full h-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold text-xs transition cursor-pointer shadow-xs px-2"
            >
              <Plus className="mr-1 size-3.5 shrink-0" />
              <span className="truncate">New Chat Thread</span>
            </Button>

            <div className="space-y-1 overflow-y-auto flex-1 min-h-0 pr-0.5">
              <span className="text-[10px] font-mono uppercase text-[#687184] font-semibold block mb-1 px-1">
                Conversations ({conversations.length})
              </span>
              {conversations.length === 0 ? (
                <div className="text-xs text-[#687184] p-3 text-center">No past threads yet.</div>
              ) : (
                conversations.map((c) => {
                  const isActive = c.id === activeChatId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => loadChatDetail(activeRepoId, c.id)}
                      className={`flex items-center justify-between p-2 rounded-xl cursor-pointer text-xs group transition ${isActive
                          ? 'bg-orange-50/80 text-orange-950 font-semibold border border-orange-200/90 shadow-2xs'
                          : 'text-[#526078] hover:text-[#19243B] hover:bg-[#FAF9F5] border border-transparent'
                        }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isActive ? (
                          <span className="size-2 rounded-full bg-orange-500 shrink-0" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#687184]" />
                        )}
                        <span className="truncate font-medium">{c.title}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatToDelete(c);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-50 hover:text-rose-600 text-[#687184] transition cursor-pointer"
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

        <div className="flex-1 h-full flex flex-col justify-between overflow-hidden bg-[#F8F7F4]">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {(!currentConversation || currentConversation.messages.length === 0) && !isStreaming ? (
              <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto text-center py-10">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 border border-orange-200/80 flex items-center justify-center text-orange-500 mb-4 shadow-2xs">
                  <Sparkles className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-xl font-bold text-[#19243B] mb-2 tracking-tight">CodeLens Codebase Intelligence Copilot</h3>
                <p className="text-xs sm:text-sm text-[#526078] mb-8 max-w-md">
                  Ask architectural questions about <span className="text-orange-950 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200/70 font-mono font-medium">{currentRepoObj?.name}</span>. Answers include verifiable file citations.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
                  {promptSuggestions.map((prompt, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSendMessage(prompt)}
                      className="rounded-xl p-3.5 bg-[#FFFFFF] border border-[#E2E0D9] hover:border-orange-300 hover:bg-orange-50/30 shadow-2xs cursor-pointer text-xs text-[#526078] hover:text-[#19243B] transition group"
                    >
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                        <span>{prompt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {(currentConversation?.messages || [])
                  .filter((msg, idx, arr) => {
                    if (idx === 0) return true;
                    const prev = arr[idx - 1];
                    if (msg.role === 'assistant' && prev.role === 'assistant' && msg.content.trim() === prev.content.trim()) {
                      return false;
                    }
                    return true;
                  })
                  .map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {msg.role === 'user' ? (
                      user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.username || 'User profile'}
                          className="size-7 rounded-full object-cover shrink-0 mt-0.5 shadow-2xs border border-[#E2E0D9]"
                        />
                      ) : (
                        <div className="size-7 rounded-full bg-[#19243B] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs text-xs font-bold uppercase">
                          {user?.username ? user.username.charAt(0) : <UserIcon className="size-3.5" />}
                        </div>
                      )
                    ) : (
                      <div className="size-7 rounded-full bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Sparkles className="size-3.5 text-orange-600" />
                      </div>
                    )}

                    <div className="space-y-3 min-w-0 flex-1">
                      {msg.role === 'assistant' && msg.thought_time != null && (
                        <div className="p-2 sm:p-2.5 rounded-xl bg-white border border-[#E2E0D9] shadow-2xs inline-block max-w-full">
                          <ThoughtLine
                            working={false}
                            elapsed={msg.thought_time}
                            label="Thinking…"
                            doneLabel="Thought for"
                            glyph="sparkle"
                            fontSize={12}
                            color="#526078"
                            glyphColor="#EA580C"
                            collapsible={false}
                            collapseOnSettle={true}
                            showTimer={true}
                          />
                        </div>
                      )}

                      <div
                        className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${msg.role === 'user'
                            ? 'bg-[#19243B] text-white font-normal rounded-tr-none ml-auto max-w-2xl shadow-xs'
                            : 'bg-[#FFFFFF] border border-[#E2E0D9] text-[#19243B] rounded-tl-none shadow-xs'
                          }`}
                      >
                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{msg.content}</div>
                        ) : (
                          <ChatMessageMarkdown content={msg.content} />
                        )}
                      </div>

                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          <span className="text-[10px] font-mono text-[#687184] font-medium self-center">Citations:</span>
                          {msg.sources.map((cite, cIdx) => (
                            <button
                              key={cIdx}
                              onClick={() => handleCitationClick(cite)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100/70 border border-orange-200/80 text-orange-950 text-[11px] font-mono font-medium transition cursor-pointer shadow-2xs"
                            >
                              <FileCode2 className="w-3 h-3 text-orange-600" />
                              <span>
                                {cite.file_path}:{cite.start_line}-{cite.end_line}
                              </span>
                              {cite.symbol && <span className="text-[#526078]">({cite.symbol})</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {isStreaming && (
                  <div className="flex gap-3 max-w-3xl">
                    <div className="size-7 rounded-full bg-orange-50 border border-orange-200/80 text-orange-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Sparkles className="size-3.5 text-orange-600 animate-pulse" />
                    </div>
                    <div className="space-y-3 min-w-0 flex-1">
                      <div className="p-3 sm:p-3.5 rounded-2xl bg-white border border-[#E2E0D9] shadow-2xs inline-block max-w-full">
                        <ThoughtLine
                          working={isThinking}
                          steps={thoughtSteps}
                          label={streamStatus || 'Thinking…'}
                          doneLabel="Thought for"
                          glyph="sparkle"
                          fontSize={13}
                          breathPeriod={1.6}
                          breathDepth={0.45}
                          settleDuration={350}
                          settleBlur={2}
                          collapsible={true}
                          collapseOnSettle={true}
                          showTimer={true}
                          color="#19243B"
                          glyphColor="#EA580C"
                          onSettle={(sec) => {
                            settledDurationRef.current = sec;
                          }}
                        />
                      </div>

                      {streamingTokens && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFFFF] border border-[#E2E0D9] text-xs sm:text-sm text-[#19243B] rounded-tl-none leading-relaxed shadow-xs">
                          <ChatMessageMarkdown content={streamingTokens} />
                          <span className="inline-block w-1.5 h-4 bg-orange-500 ml-1 animate-pulse" />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 sm:px-6 pb-3.5 pt-1.5 bg-[#F8F7F4] shrink-0">
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
                className="w-full bg-[#FFFFFF] border border-[#E2E0D9] hover:border-[#D0CDC4] focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 rounded-2xl pl-4.5 pr-14 py-3.5 text-xs sm:text-sm text-[#19243B] placeholder-[#8C96A5] outline-none shadow-sm transition"
              />
              <button
                type="submit"
                disabled={isStreaming || !inputQuery.trim()}
                className="absolute right-2.5 p-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white shadow-xs transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>

        {viewerTarget && (
          <CodeViewerModal
            isOpen={viewerModalOpen}
            onClose={() => setViewerModalOpen(false)}
            repositoryId={activeRepoId}
            filePath={viewerTarget.filePath}
            highlightLines={viewerTarget.lines}
          />
        )}

        {isKeyModalOpen && (
          <AddGeminiKeyModal
            isOpen={isKeyModalOpen}
            onClose={() => setIsKeyModalOpen(false)}
            onSuccess={() => {
              setIsKeyModalOpen(false);
            }}
          />
        )}

        <DeleteChatConfirmModal
          isOpen={chatToDelete !== null}
          onClose={() => setChatToDelete(null)}
          onConfirm={handleConfirmDeleteChat}
          chatTitle={chatToDelete?.title}
          isLoading={isDeletingChat}
        />

        <CreateChatModal
          isOpen={isCreateChatModalOpen}
          onClose={() => {
            setIsCreateChatModalOpen(false);
            setPendingMessage(null);
          }}
          onCreate={handleCreateChat}
          isLoading={isCreatingChat}
        />
      </div>
    </WorkspaceLayout>
  );
};
