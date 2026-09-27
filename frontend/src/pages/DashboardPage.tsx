import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Files, FolderGit2, GitBranch, KeyRound, MessageCircle, Network, RefreshCw, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { AddRepositoryModal } from "@/components/repositories/AddRepositoryModal";
import { AddGeminiKeyModal } from "@/components/common/AddGeminiKeyModal";
import { ReindexConfirmModal } from "@/components/common/ReindexConfirmModal";

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    fetchRepositories,
    triggerIndexing,
  } = useWorkspaceStore();
  const navigate = useNavigate();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [reindexTargetRepo, setReindexTargetRepo] = useState<any | null>(null);
  const [isReindexing, setIsReindexing] = useState(false);
  const [confirmationToast, setConfirmationToast] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const hasKey = Boolean(user?.has_openai_key ?? user?.has_gemini_key);

  useEffect(() => {
    if (sessionStorage.getItem('openai_key_just_verified') || sessionStorage.getItem('gemini_key_just_verified')) {
      sessionStorage.removeItem('openai_key_just_verified');
      sessionStorage.removeItem('gemini_key_just_verified');
      setConfirmationToast('OpenAI API Key verified and active! Code indexing and AI Copilot are now ready.');
    }
  }, []);

  useEffect(() => {
    if (confirmationToast) {
      const timer = setTimeout(() => {
        setConfirmationToast(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [confirmationToast]);

  useEffect(() => {
    fetchRepositories(true);
  }, [fetchRepositories]);

  useEffect(() => {
    const isAnyIndexing = repositories.some((r) => r.index_status === 'indexing');
    if (!isAnyIndexing) return;

    const interval = setInterval(() => {
      fetchRepositories(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [repositories, fetchRepositories]);

  const totalRepos = repositories.length;
  const indexedCount = repositories.filter((r) => r.index_status === "indexed").length;
  const indexingCount = repositories.filter((r) => r.index_status === "indexing").length;
  const failedCount = repositories.filter((r) => r.index_status === "failed").length;
  const totalFiles = repositories.reduce((acc, r) => acc + (r.file_count || 0), 0);
  const totalSymbols = repositories.reduce((acc, r) => acc + (r.symbol_count || 0), 0);

  const activeRepo = selectedRepo || repositories[0] || null;

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      await fetchRepositories();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddRepoClick = () => {
    if (!hasKey) {
      setIsKeyModalOpen(true);
      return;
    }
    setIsAddModalOpen(true);
  };

  const handleReindexClick = (repo: any) => {
    if (!hasKey) {
      setIsKeyModalOpen(true);
      return;
    }
    setReindexTargetRepo(repo);
  };

  const handleConfirmReindex = async () => {
    if (!reindexTargetRepo) return;
    const repoId = reindexTargetRepo.id;
    try {
      setIsReindexing(true);
      await triggerIndexing(repoId);
      setReindexTargetRepo(null);
    } catch (err) {
      console.error("Failed to reindex", err);
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <WorkspaceLayout>
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-2xl font-bold text-[#19243B] tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-[#526078] mt-0.5">
            Connected repositories, architecture maps, and codebase intelligence
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={handleRefreshAll}
            disabled={refreshing}
            title="Refresh repositories"
            className="h-9 px-3.5 rounded-xl border border-[#E2E0D9] bg-white hover:bg-[#FAF9F5] text-[#526078] hover:text-[#19243B] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-amber-600" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleAddRepoClick}
            className="h-9 px-4 rounded-xl bg-[#111419] hover:bg-[#23272f] text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer shadow-xs"
          >
            <span className="text-amber-500 font-bold text-sm leading-none">+</span>
            <span>Connect Repository</span>
          </button>
        </div>
      </div>

      {/* API Key Banner if required */}
      {!hasKey && (
        <div className="rounded-2xl bg-[#FEF7EC] border border-amber-200/90 flex flex-col sm:flex-row p-4 sm:p-4.5 justify-between items-start sm:items-center gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-amber-100/70 border border-amber-200/80 flex items-center justify-center shrink-0">
              <KeyRound className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#19243B]">API Key Required</h4>
              <p className="text-[#526078] text-xs mt-0.5">
                Configure your OpenAI API key to enable AST knowledge graph indexing and grounded AI copilot reasoning.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsKeyModalOpen(true)}
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 h-8 transition shadow-xs cursor-pointer shrink-0"
          >
            Configure Key
          </button>
        </div>
      )}

      {/* 2 Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Card 1: Repositories */}
        <div className="rounded-2xl bg-white border border-[#E2E0D9] p-5 shadow-2xs hover:border-[#CDC9BF] transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#687184] uppercase tracking-wider font-mono">Connected Repositories</span>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-extrabold text-[#19243B] tracking-tight font-mono">
                  {totalRepos.toString().padStart(2, "0")}
                </span>
                <span className="text-xs text-[#526078] font-medium">active projects</span>
              </div>
            </div>
            <div className="size-8 rounded-lg bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-[#19243B] shrink-0">
              <GitBranch className="size-4 text-amber-600" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#F0EEE9] text-xs font-mono text-[#526078] flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E2E0D9] text-[#19243B]">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {indexedCount} indexed
            </span>
            {indexingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <RefreshCw className="size-2.5 animate-spin text-amber-600" />
                {indexingCount} indexing
              </span>
            )}
            {failedCount > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                <span className="size-1.5 rounded-full bg-rose-500" />
                {failedCount} failed
              </span>
            )}
            <span className="text-[11px] text-[#8C96A5] ml-auto">
              {totalRepos > 0 ? `${Math.round((indexedCount / totalRepos) * 100)}% ready` : 'No repos'}
            </span>
          </div>
        </div>

        {/* Card 2: Knowledge Graph */}
        <div className="rounded-2xl bg-white border border-[#E2E0D9] p-5 shadow-2xs hover:border-[#CDC9BF] transition-all">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[11px] font-semibold text-[#687184] uppercase tracking-wider font-mono">AST Knowledge Graph</span>
              <div className="flex items-baseline gap-2.5 mt-2">
                <span className="text-3xl font-extrabold text-[#19243B] tracking-tight font-mono">
                  {totalFiles.toLocaleString()}
                </span>
                <span className="text-xs text-[#526078] font-medium">source files indexed</span>
              </div>
            </div>
            <div className="size-8 rounded-lg bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-[#19243B] shrink-0">
              <Files className="size-4 text-sky-600" />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[#F0EEE9] text-xs font-mono text-[#526078] flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E2E0D9] text-[#19243B]">
              <span className="font-semibold text-[#19243B]">{totalSymbols.toLocaleString()}</span> symbols
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E2E0D9]">
              Multi-tier AST
            </span>
            <span className="text-[11px] text-[#8C96A5] ml-auto">
              Grounded Copilot
            </span>
          </div>
        </div>
      </div>

      {/* Quick 5-Views Launcher for Active Repo */}
      {activeRepo && (
        <div className="rounded-2xl bg-white border border-[#E2E0D9] p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5">
            <div>
              <span className="text-[10px] font-bold text-amber-700 font-mono uppercase tracking-wider">Five Ways To See Your Codebase</span>
              <h3 className="text-base font-bold text-[#19243B] flex items-center gap-2 mt-0.5">
                <span>Visual intelligence for {activeRepo.name}</span>
              </h3>
            </div>
            <button
              onClick={() => {
                setSelectedRepo(activeRepo);
                navigate(`/repository/${activeRepo.id}/architecture`);
              }}
              className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
            >
              Open Architecture Map <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {[
              { label: 'Architecture', sub: 'System Topology', icon: Network, color: 'text-amber-700', bg: 'bg-amber-50/60', bdr: 'border-amber-200/60' },
              { label: 'Workflow', sub: 'Execution Lanes', icon: GitBranch, color: 'text-sky-700', bg: 'bg-sky-50/60', bdr: 'border-sky-200/60' },
              { label: 'Sequence', sub: 'Request Traces', icon: ArrowRight, color: 'text-rose-700', bg: 'bg-rose-50/60', bdr: 'border-rose-200/60' },
              { label: 'Data Flow', sub: 'Pipeline Lineage', icon: Files, color: 'text-indigo-700', bg: 'bg-indigo-50/60', bdr: 'border-indigo-200/60' },
              { label: 'Lifecycle', sub: 'State Transitions', icon: RefreshCw, color: 'text-purple-700', bg: 'bg-purple-50/60', bdr: 'border-purple-200/60' },
            ].map((view) => (
              <button
                key={view.label}
                onClick={() => {
                  setSelectedRepo(activeRepo);
                  navigate(`/repository/${activeRepo.id}/architecture`);
                }}
                className={`p-3 rounded-xl border ${view.bdr} ${view.bg} hover:shadow-xs transition text-left flex flex-col gap-1 cursor-pointer group`}
              >
                <div className="flex items-center justify-between">
                  <view.icon className={`w-4 h-4 ${view.color}`} />
                  <ArrowRight className="w-3 h-3 text-[#526078]/40 group-hover:translate-x-0.5 transition-transform" />
                </div>
                <span className="font-semibold text-xs text-[#19243B] mt-1">{view.label}</span>
                <span className="text-[10px] text-[#526078]">{view.sub}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Connected Repositories Section */}
      <div className="rounded-2xl bg-white border border-[#E2E0D9] overflow-hidden shadow-2xs">
        <div className="px-5 py-4 border-b border-[#E2E0D9]">
          <h3 className="font-bold text-base text-[#19243B]">Connected Repositories</h3>
          <p className="text-xs text-[#526078] mt-0.5">Explore diagrams, call graphs, and grounded AI copilot per repository</p>
        </div>

        {repositories.length === 0 ? (
          <div className="py-16 px-4 text-center flex flex-col items-center justify-center">
            <div className="size-12 rounded-2xl bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center mb-3 text-[#526078]">
              <FolderGit2 className="size-6" />
            </div>
            <h4 className="font-bold text-sm text-[#19243B] mb-1">No repositories connected</h4>
            <p className="text-xs text-[#526078] max-w-sm mb-4">
              Connect your GitHub repository to generate multi-tier architecture diagrams and chat with AST-grounded intelligence.
            </p>
            <button
              onClick={handleAddRepoClick}
              className="rounded-xl bg-[#111419] text-white text-xs font-semibold px-4 py-2 hover:bg-[#23272f] transition cursor-pointer"
            >
              + Connect Repository
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E0D9]">
            {repositories.map((repo) => {
              const isIndexed = repo.index_status === 'indexed';
              const isIndexing = repo.index_status === 'indexing';
              const isFailed = repo.index_status === 'failed';

              return (
                <div
                  key={repo.id}
                  className="p-5 hover:bg-[#FAF9F5]/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Left: Info */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="size-10 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center shrink-0 text-[#19243B] mt-0.5">
                      <FolderGit2 className="size-5 text-[#526078]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedRepo(repo);
                            navigate(`/repository/${repo.id}`);
                          }}
                          className="font-bold text-sm sm:text-base text-[#19243B] hover:text-amber-700 transition truncate text-left cursor-pointer"
                        >
                          {repo.full_name}
                        </button>
                        {repo.private ? (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E2E0D9] text-[#526078]">Private</span>
                        ) : (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E2E0D9] text-[#526078]">Public</span>
                        )}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50/70 border border-amber-200/60 text-amber-800">
                          {repo.default_branch || 'main'}
                        </span>
                      </div>
                      {repo.description && (
                        <p className="text-xs text-[#526078] mt-1 line-clamp-1 max-w-xl">{repo.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs font-mono text-[#526078]">
                        <span>{repo.file_count || 0} files</span>
                        <span>·</span>
                        <span>{repo.symbol_count || 0} symbols</span>
                        <span>·</span>
                        <span>
                          {repo.last_indexed_at
                            ? `Synced ${new Date(repo.last_indexed_at).toLocaleDateString()}`
                            : 'Never synced'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex items-center gap-2 flex-wrap lg:shrink-0 justify-end">
                    {/* Status Indicator (Clean, no green gradient / tint) */}
                    <div className="mr-1">
                      {isIndexed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#FAF9F5] text-[#19243B] border border-[#E2E0D9]">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          Ready
                        </span>
                      )}
                      {isIndexing && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          <RefreshCw className="size-3 animate-spin text-amber-600" />
                          Indexing...
                        </span>
                      )}
                      {isFailed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-rose-50 text-rose-800 border border-rose-200">
                          <span className="size-1.5 rounded-full bg-rose-500" />
                          Failed
                        </span>
                      )}
                      {!isIndexed && !isIndexing && !isFailed && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#FAF9F5] text-[#526078] border border-[#E2E0D9]">
                          <span className="size-1.5 rounded-full bg-slate-400" />
                          Not Indexed
                        </span>
                      )}
                    </div>

                    {/* Architecture Map Button (Primary) */}
                    <button
                      onClick={() => {
                        setSelectedRepo(repo);
                        navigate(`/repository/${repo.id}/architecture`);
                      }}
                      className="h-8 px-3.5 rounded-md bg-[#111419] hover:bg-[#23272f] text-white text-xs font-medium flex items-center gap-1.5 transition-all shadow-xs hover:shadow active:scale-[0.98] cursor-pointer"
                    >
                      <Network className="w-3.5 h-3.5 text-amber-400" />
                      <span>Architecture</span>
                    </button>

                    {/* Copilot Chat Button */}
                    <button
                      onClick={() => {
                        setSelectedRepo(repo);
                        navigate(`/chat?repository=${repo.id}`);
                      }}
                      className="h-8 px-3.5 rounded-md border border-[#E2E0D9] bg-white hover:bg-[#FAF9F5] hover:border-[#CDC9BF] text-[#19243B] text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-[#526078]" />
                      <span>AI Copilot</span>
                    </button>

                    {/* Re-index Button */}
                    <button
                      onClick={() => handleReindexClick(repo)}
                      disabled={isIndexing}
                      title="Re-run AST index"
                      className="h-8 w-8 rounded-md border border-[#E2E0D9] bg-white hover:bg-[#FAF9F5] hover:border-[#CDC9BF] text-[#526078] hover:text-[#19243B] transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer flex items-center justify-center disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isIndexing ? 'animate-spin text-amber-600' : ''}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAddModalOpen && (
        <AddRepositoryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(newId) => {
            navigate(`/repository/${newId}`);
          }}
        />
      )}

      {isKeyModalOpen && (
        <AddGeminiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          onSuccess={() => {
            setConfirmationToast("OpenAI API Key verified and active! Code indexing and AI Copilot are now ready.");
          }}
        />
      )}

      <ReindexConfirmModal
        isOpen={Boolean(reindexTargetRepo)}
        onClose={() => setReindexTargetRepo(null)}
        onConfirm={handleConfirmReindex}
        repoName={reindexTargetRepo?.full_name || reindexTargetRepo?.name}
        isIndexing={isReindexing}
      />

      {confirmationToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-[#FFFFFF] border border-[#E2E0D9] text-[#19243B] px-4 py-3 rounded-xl shadow-lg animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-xs text-[#19243B] font-medium pr-2">{confirmationToast}</span>
          <button
            onClick={() => setConfirmationToast(null)}
            className="text-[#687184] hover:text-[#19243B] p-1 rounded hover:bg-[#F0EEE9] transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </WorkspaceLayout>
  );
};
