import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FolderGit2, Plus, Search, Loader2, Network, MessageSquare, ChevronRight, GitBranch, RefreshCw, FileCode, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import { AddRepositoryModal } from '../components/repositories/AddRepositoryModal';
import { AddGeminiKeyModal } from '../components/common/AddGeminiKeyModal';
import { EmptyState } from '../components/common/EmptyState';
import type { RepositoryItem } from '../types';

export const RepositoriesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { repositories, loading, setSelectedRepo, fetchRepositories, triggerIndexing } = useWorkspaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [indexingId, setIndexingId] = useState<number | null>(null);
  const navigate = useNavigate();

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

  const filteredRepos = repositories.filter((r) =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const hasKey = Boolean(user?.has_openai_key ?? user?.has_gemini_key);

  const handleAddRepoClick = () => {
    if (!hasKey) {
      setIsKeyModalOpen(true);
      return;
    }
    setIsAddModalOpen(true);
  };

  const handleIndexClick = async (e: React.MouseEvent, repoId: number) => {
    e.stopPropagation();
    e.preventDefault();
    if (!hasKey) {
      setIsKeyModalOpen(true);
      return;
    }
    try {
      setIndexingId(repoId);
      await triggerIndexing(repoId);
    } catch (err) {
      console.error('Indexing trigger failed', err);
    } finally {
      setIndexingId(null);
    }
  };

  const getStatusBadge = (status: RepositoryItem['index_status'], isLocalIndexing: boolean) => {
    if (isLocalIndexing || status === 'indexing') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#FEF7EC] text-amber-800 border border-amber-200 shrink-0">
          <Loader2 className="size-3 animate-spin text-amber-600" />
          Indexing...
        </span>
      );
    }
    if (status === 'indexed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
          <span className="rounded-full bg-emerald-600 size-1.5" />
          Indexed
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-rose-50 text-rose-800 border border-rose-200 shrink-0">
          <span className="rounded-full bg-rose-500 size-1.5" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[#F0EEE9] text-[#526078] border border-[#E2E0D9] shrink-0">
        <span className="rounded-full bg-[#687184] size-1.5" />
        Not Indexed
      </span>
    );
  };

  return (
    <WorkspaceLayout>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="text-muted-foreground text-xs font-mono mb-1">
            Repositories
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Connected Repositories</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your synchronized GitHub repositories, inspect AST symbols, and query architecture.
          </p>
        </div>

        <Button
          onClick={handleAddRepoClick}
          className="rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 shadow-xs cursor-pointer h-9 px-4"
        >
          <Plus className="mr-1.5 size-4" />
          Add Repository
        </Button>
      </div>

      {repositories.length > 0 && (
        <div className="relative max-w-md">
          <Search className="size-4 text-[#8C96A5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories..."
            className="w-full bg-[#FFFFFF] border border-[#E2E0D9] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-[#19243B] placeholder-[#8C96A5] outline-none shadow-2xs transition font-sans"
          />
        </div>
      )}

      {repositories.length === 0 && !loading ? (
        <EmptyState
          type="repositories"
          onAction={handleAddRepoClick}
        />
      ) : filteredRepos.length === 0 ? (
        <EmptyState
          type="search"
          description={`No repositories match "${searchQuery}".`}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRepos.map((repo) => {
            const isLocalIndexing = indexingId === repo.id;
            const fullName = repo.full_name || '';
            const parts = fullName.split('/');
            const owner = parts.length > 1 ? parts[0] : '';
            const repoName = parts.length > 1 ? parts.slice(1).join('/') : fullName;

            return (
              <Card
                key={repo.id}
                onClick={() => {
                  setSelectedRepo(repo);
                  navigate(`/repository/${repo.id}`);
                }}
                className="rounded-2xl bg-[#FFFFFF] border border-[#E2E0D9] hover:border-amber-300 hover:shadow-md transition-all duration-200 cursor-pointer p-5 flex flex-col justify-between group shadow-xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-[#526078] group-hover:text-amber-700 transition shrink-0">
                        <FolderGit2 className="size-4" />
                      </div>
                      <div className="min-w-0">
                        {owner && (
                          <span className="block text-[11px] font-mono text-[#687184] truncate leading-none mb-1">
                            {owner}
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-[#19243B] group-hover:text-amber-800 transition truncate tracking-tight">
                          {repoName}
                        </h3>
                      </div>
                    </div>
                    {getStatusBadge(repo.index_status, isLocalIndexing)}
                  </div>

                  {repo.description ? (
                    <p className="text-xs text-[#526078] line-clamp-2 min-h-[2.25rem] leading-relaxed mt-2.5">
                      {repo.description}
                    </p>
                  ) : (
                    <div className="min-h-[2.25rem] flex items-center mt-2.5">
                      <div className="flex items-center gap-2 text-xs text-[#687184] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E2E0D9] text-[11px]">
                          {repo.private ? 'Private' : 'Public'}
                        </span>
                        {repo.last_indexed_commit ? (
                          <span className="text-[11px]">
                            commit {repo.last_indexed_commit.slice(0, 7)}
                          </span>
                        ) : (
                          <span className="text-[11px]">Ready to index</span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E2E0D9] text-[#526078]">
                      <GitBranch className="size-3 text-amber-700" />
                      <span>{repo.default_branch || 'main'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E2E0D9] text-[#526078]">
                      <FileCode className="size-3 text-[#687184]" />
                      <span>{(repo.file_count || 0).toLocaleString()} files</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E2E0D9] text-[#526078]">
                      <Code2 className="size-3 text-[#687184]" />
                      <span>{(repo.symbol_count || 0).toLocaleString()} symbols</span>
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-[#E2E0D9] flex items-center justify-between">
                  <div className="flex items-center gap-1 -ml-1">
                    <Link
                      to={`/repository/${repo.id}/architecture`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepo(repo);
                      }}
                      title="View Architecture Map"
                      className="p-1.5 rounded-md text-[#687184] hover:text-[#19243B] hover:bg-[#FAF9F5] transition cursor-pointer"
                    >
                      <Network className="size-3.5" />
                    </Link>
                    <Link
                      to={`/chat?repository=${repo.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepo(repo);
                      }}
                      title="Open AI Copilot Chat"
                      className="p-1.5 rounded-md text-[#687184] hover:text-[#19243B] hover:bg-[#FAF9F5] transition cursor-pointer"
                    >
                      <MessageSquare className="size-3.5" />
                    </Link>
                    <button
                      onClick={(e) => handleIndexClick(e, repo.id)}
                      disabled={isLocalIndexing || repo.index_status === 'indexing'}
                      title="Re-Index Repository"
                      className="p-1.5 rounded-md text-[#687184] hover:text-[#19243B] hover:bg-[#FAF9F5] transition disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className={`size-3.5 ${isLocalIndexing ? 'animate-spin text-amber-700' : ''}`} />
                    </button>
                  </div>

                  <div className="inline-flex items-center gap-1 text-xs font-semibold text-[#526078] group-hover:text-amber-800 transition">
                    <span>Open</span>
                    <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

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
            setIsKeyModalOpen(false);
          }}
        />
      )}
    </WorkspaceLayout>
  );
};
