import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderGit2,
  Network,
  MessageSquare,
  Sparkles,
  Plus,
  KeyRound,
  CheckCircle2,
  ChevronRight,
  Layers,
  FileCode2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWorkspace } from '../context/WorkspaceContext';
import { AddRepositoryModal } from '../components/repositories/AddRepositoryModal';
import { EmptyState } from '../components/common/EmptyState';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { repositories, setSelectedRepo } = useWorkspace();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const navigate = useNavigate();

  const totalFiles = repositories.reduce((acc, r) => acc + (r.file_count || 0), 0);
  const totalSymbols = repositories.reduce((acc, r) => acc + (r.symbol_count || 0), 0);
  const indexedRepos = repositories.filter((r) => r.index_status === 'indexed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/[0.08] relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-gradient-to-l from-purple-600/15 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Workspace Copilot Ready</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="gradient-text">{user?.username}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl leading-relaxed">
              Explore your connected GitHub architectures, trace symbol blast radiuses, and run real-time grounded code queries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg glow-purple transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Repository</span>
            </button>
            {!user?.has_gemini_key && (
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-medium px-4 py-2.5 rounded-xl transition cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Configure Key</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Repositories</span>
            <FolderGit2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{repositories.length}</div>
          <div className="text-[11px] text-purple-400 mt-1 font-medium">{indexedRepos} Fully Indexed</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>AST Symbols</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{totalSymbols.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Extracted via Tree-sitter</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>Code Files</span>
            <FileCode2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-white">{totalFiles.toLocaleString()}</div>
          <div className="text-[11px] text-slate-400 mt-1">Multi-language code chunks</div>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/[0.08]">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium mb-3">
            <span>AI Copilot</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
            {user?.has_gemini_key ? (
              <span className="text-emerald-400 flex items-center gap-1.5 text-base">
                <CheckCircle2 className="w-5 h-5" /> BYOK Active
              </span>
            ) : (
              <span className="text-amber-400 text-base">Key Required</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Gemini 2.0 Flash SSE</div>
        </div>
      </div>

      {/* Main Content Grid: Recent Repos & Quick Launchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Recent Repositories */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Recent Repositories</h2>
            <Link to="/repositories" className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 cursor-pointer">
              View All ({repositories.length}) <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {repositories.length === 0 ? (
            <EmptyState type="repositories" onAction={() => setIsAddModalOpen(true)} />
          ) : (
            <div className="space-y-3">
              {repositories.slice(0, 4).map((repo) => (
                <div
                  key={repo.id}
                  onClick={() => {
                    setSelectedRepo(repo);
                    navigate(`/repository/${repo.id}`);
                  }}
                  className="glass-card rounded-2xl p-4 sm:p-5 border border-white/[0.08] hover:border-purple-500/40 cursor-pointer flex items-center justify-between gap-4 transition group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl gradient-purple-blue flex items-center justify-center text-white shrink-0 shadow-md">
                      <FolderGit2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-purple-300 transition truncate">
                        {repo.full_name}
                      </h4>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono mt-0.5">
                        <span>{repo.default_branch}</span>
                        <span>•</span>
                        <span>{repo.file_count} files</span>
                        <span>•</span>
                        <span className={repo.index_status === 'indexed' ? 'text-emerald-400' : 'text-slate-400'}>
                          {repo.index_status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to={`/repository/${repo.id}/architecture`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRepo(repo);
                      }}
                      title="Architecture Map"
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
                      title="AI Chat"
                      className="p-2 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-white/[0.06] transition cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right 1 Col: Quick Action Cards */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white">Quick Launchpad</h2>

          <div className="space-y-3">
            {/* Quick Architecture */}
            <div
              onClick={() => {
                if (repositories.length > 0) {
                  navigate(`/repository/${repositories[0].id}/architecture`);
                } else {
                  setIsAddModalOpen(true);
                }
              }}
              className="glass-card rounded-2xl p-5 border border-white/[0.08] hover:border-purple-500/40 cursor-pointer transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                <Network className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition">
                Interactive Architecture Map
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Visualize presentation, application, domain, and infrastructure layers.
              </p>
            </div>

            {/* Quick AI Copilot */}
            <div
              onClick={() => {
                if (repositories.length > 0) {
                  navigate(`/chat?repository=${repositories[0].id}`);
                } else {
                  setIsAddModalOpen(true);
                }
              }}
              className="glass-card rounded-2xl p-5 border border-white/[0.08] hover:border-cyan-500/40 cursor-pointer transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                CodeLens AI Copilot
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ask architectural questions with real-time SSE token streaming and citations.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Repository Modal */}
      <AddRepositoryModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(id) => navigate(`/repository/${id}`)}
      />
    </div>
  );
};
