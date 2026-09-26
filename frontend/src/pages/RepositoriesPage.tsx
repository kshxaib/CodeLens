import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  Loader2,
  Network,
  MessageSquare,
  ChevronRight,
  GitBranch,
  RefreshCw,
  FileCode,
  Code2,
} from 'lucide-react';
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

  // Always fetch fresh repository list on mount
  useEffect(() => {
    fetchRepositories(true);
  }, [fetchRepositories]);

  // Auto-poll when any repository is in indexing state
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
          <Loader2 className="size-3 animate-spin text-primary" />
          Indexing...
        </span>
      );
    }
    if (status === 'indexed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-primary/10 text-primary border border-primary/20 shrink-0">
          <span className="rounded-full bg-primary size-1.5" />
          Indexed
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
          <span className="rounded-full bg-destructive size-1.5" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-secondary text-muted-foreground border border-border shrink-0">
        <span className="rounded-full bg-muted-foreground size-1.5" />
        Not Indexed
      </span>
    );
  };

  return (
    <WorkspaceLayout>
      {/* Header */}
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
          className="rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 shadow-md cursor-pointer h-9 px-3.5"
        >
          <Plus className="mr-1.5 size-4" />
          Add Repository
        </Button>
      </div>

      {/* Search Bar */}
      {repositories.length > 0 && (
        <div className="relative max-w-md">
          <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories..."
            className="w-full bg-card border border-border focus:border-ring rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground outline-none transition font-sans"
          />
        </div>
      )}

      {/* Repositories Grid */}
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
                className="rounded-xl bg-card border-border hover:border-primary/40 transition-all duration-200 cursor-pointer p-5 flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Top Row: Icon, Title & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="size-9 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground group-hover:text-primary transition shrink-0">
                        <FolderGit2 className="size-4" />
                      </div>
                      <div className="min-w-0">
                        {owner && (
                          <span className="block text-[11px] font-mono text-muted-foreground truncate leading-none mb-1">
                            {owner}
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition truncate tracking-tight">
                          {repoName}
                        </h3>
                      </div>
                    </div>
                    {getStatusBadge(repo.index_status, isLocalIndexing)}
                  </div>

                  {/* Description / Repo Details */}
                  {repo.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.25rem] leading-relaxed mt-2.5">
                      {repo.description}
                    </p>
                  ) : (
                    <div className="min-h-[2.25rem] flex items-center mt-2.5">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-secondary border border-border text-[11px]">
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

                  {/* Metadata Chips */}
                  <div className="flex flex-wrap items-center gap-2 mt-4 text-[11px] font-mono">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary border border-border text-muted-foreground">
                      <GitBranch className="size-3 text-primary" />
                      <span>{repo.default_branch || 'main'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary/60 border border-border text-muted-foreground">
                      <FileCode className="size-3" />
                      <span>{(repo.file_count || 0).toLocaleString()} files</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-secondary/60 border border-border text-muted-foreground">
                      <Code2 className="size-3" />
                      <span>{(repo.symbol_count || 0).toLocaleString()} symbols</span>
                    </span>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-5 pt-3.5 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-1 -ml-1">
                    <Link
                      to={`/repository/${repo.id}/architecture`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepo(repo);
                      }}
                      title="View Architecture Map"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
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
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition cursor-pointer"
                    >
                      <MessageSquare className="size-3.5" />
                    </Link>
                    <button
                      onClick={(e) => handleIndexClick(e, repo.id)}
                      disabled={isLocalIndexing || repo.index_status === 'indexing'}
                      title="Re-Index Repository"
                      className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className={`size-3.5 ${isLocalIndexing ? 'animate-spin text-primary' : ''}`} />
                    </button>
                  </div>

                  <div className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-primary transition">
                    <span>Open</span>
                    <ChevronRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Repository Modal */}
      {isAddModalOpen && (
        <AddRepositoryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(newId) => {
            navigate(`/repository/${newId}`);
          }}
        />
      )}

      {/* Add OpenAI Key Modal */}
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
