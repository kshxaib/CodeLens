import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Plus,
  Search,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  Network,
  MessageSquare,
  ChevronRight,
  GitBranch,
  RefreshCw,
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { AddRepositoryModal } from '../components/repositories/AddRepositoryModal';
import { EmptyState } from '../components/common/EmptyState';
import type { RepositoryItem } from '../types';

export const RepositoriesPage: React.FC = () => {
  const { repositories, loading, setSelectedRepo, triggerIndexing } = useWorkspace();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [indexingId, setIndexingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const filteredRepos = repositories.filter((r) =>
    r.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleIndexClick = async (e: React.MouseEvent, repoId: number) => {
    e.stopPropagation();
    e.preventDefault();
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
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          Indexing...
        </span>
      );
    }
    if (status === 'indexed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
          Indexed
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
          <AlertCircle className="w-3 h-3 text-rose-400" />
          Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
        <Clock className="w-3 h-3 text-slate-400" />
        Not Indexed
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Connected Repositories</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your synchronized GitHub repositories, inspect AST symbols, and query architecture.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg glow-purple transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Repository</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      {repositories.length > 0 && (
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search repositories by name or description..."
            className="w-full bg-[#121620] border border-white/[0.08] focus:border-purple-500/60 focus:ring-1 focus:ring-purple-500/60 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition"
          />
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
      )}

      {/* Repositories Grid */}
      {repositories.length === 0 && !loading ? (
        <EmptyState
          type="repositories"
          onAction={() => setIsAddModalOpen(true)}
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
            return (
              <div
                key={repo.id}
                onClick={() => {
                  setSelectedRepo(repo);
                  navigate(`/repository/${repo.id}`);
                }}
                className="glass-card rounded-2xl p-5 border border-white/[0.08] hover:border-purple-500/40 cursor-pointer flex flex-col justify-between group transition-all"
              >
                <div>
                  {/* Top Row: Icon, Title & Status */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl gradient-purple-blue flex items-center justify-center text-white shadow-md">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    {getStatusBadge(repo.index_status, isLocalIndexing)}
                  </div>

                  {/* Repo Title & Details */}
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition line-clamp-1">
                    {repo.full_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[2rem]">
                    {repo.description || 'No description provided.'}
                  </p>

                  {/* Metadata Tags */}
                  <div className="flex items-center gap-3 mt-4 text-[11px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                      {repo.default_branch}
                    </span>
                    <span>•</span>
                    <span>{repo.file_count} Files</span>
                    <span>•</span>
                    <span>{repo.symbol_count} Symbols</span>
                  </div>
                </div>

                {/* Bottom Actions Bar */}
                <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/repository/${repo.id}/architecture`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepo(repo);
                      }}
                      title="View Architecture Map"
                      className="p-2 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-white/[0.06] transition cursor-pointer"
                    >
                      <Network className="w-4 h-4" />
                    </Link>
                    <Link
                      to={`/chat?repository=${repo.id}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepo(repo);
                      }}
                      title="Open AI Copilot Chat"
                      className="p-2 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-white/[0.06] transition cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={(e) => handleIndexClick(e, repo.id)}
                      disabled={isLocalIndexing || repo.index_status === 'indexing'}
                      title="Re-Index Repository"
                      className="p-2 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/[0.06] transition disabled:opacity-40 cursor-pointer"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLocalIndexing ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  </div>

                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-400 group-hover:text-purple-300">
                    Open <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Repository Modal */}
      <AddRepositoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(newId) => {
          navigate(`/repository/${newId}`);
        }}
      />
    </div>
  );
};
