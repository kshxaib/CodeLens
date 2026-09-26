import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  FolderGit2,
  GitBranch,
  Network,
  MessageSquare,
  RefreshCw,
  Search,
  FileCode2,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Layers,
  AlertCircle,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import type { RepositoryItem, FileItem } from '../types';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorState } from '../components/common/ErrorState';
import { CodeViewerModal } from '../components/code/CodeViewerModal';
import { AddGeminiKeyModal } from '../components/common/AddGeminiKeyModal';

export const RepositoryOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const repoId = parseInt(id || '0', 10);
  const { setSelectedRepo } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const [repo, setRepo] = useState<RepositoryItem | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [indexing, setIndexing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<number | null>(null);

  const fetchRepoData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [repoData, filesData] = await Promise.all([
        api.getRepository(repoId),
        api.getFiles(repoId),
      ]);
      setRepo(repoData);
      setSelectedRepo(repoData);
      setFiles(filesData);
    } catch (err: any) {
      setError(err.message || 'Failed to load repository workspace.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoId) fetchRepoData();
  }, [repoId]);

  const [indexError, setIndexError] = useState<string | null>(null);

  useEffect(() => {
    if (indexError) {
      const timer = setTimeout(() => setIndexError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [indexError]);

  const handleTriggerIndex = async () => {
    if (!user?.has_gemini_key) {
      setIsKeyModalOpen(true);
      return;
    }
    try {
      setIndexing(true);
      await api.indexRepository(repoId);
      await fetchRepoData();
    } catch (err: any) {
      setIndexError(err?.response?.data?.detail || err.message || 'Indexing failed');
    } finally {
      setIndexing(false);
    }
  };

  if (loading) {
    return <LoadingScreen title="Loading Repository" message="Fetching AST symbol indices and file tree..." />;
  }

  if (error || !repo) {
    return <ErrorState type="404" title="Repository Not Found" message={error || 'Could not find repository'} onRetry={fetchRepoData} />;
  }

  const filteredFiles = files.filter((f) =>
    f.file_path.toLowerCase().includes(fileSearch.toLowerCase()) ||
    (f.language && f.language.toLowerCase().includes(fileSearch.toLowerCase()))
  );

  return (
    <WorkspaceLayout>
      {/* Header Card */}
      <div className="rounded-2xl p-6 sm:p-8 bg-[#09090b] border border-[#1f1f23] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#141416] border border-[#27272a] flex items-center justify-center text-slate-200 shrink-0 shadow-lg">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{repo.full_name}</h1>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white transition p-1 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                {repo.description || 'GitHub repository configured for CodeLens intelligence.'}
              </p>

              {/* Status & Metadata Pills */}
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs font-mono">
                <span className="flex items-center gap-1 text-slate-300 bg-[#121214] px-2.5 py-1 rounded-lg border border-[#1f1f23]">
                  <GitBranch className="w-3.5 h-3.5 text-amber-400" />
                  {repo.default_branch || 'main'}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121214] text-slate-300 border border-[#1f1f23]">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  {repo.symbol_count || 0} Symbols
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#121214] text-slate-300 border border-[#1f1f23]">
                  <FileCode2 className="w-3.5 h-3.5 text-amber-400" />
                  {files.length} Files
                </span>
                <span className="flex items-center gap-1 text-slate-300 bg-[#121214] px-2.5 py-1 rounded-lg border border-[#1f1f23]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  {repo.index_status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/repository/${repo.id}/architecture`}
              className="inline-flex items-center gap-2 bg-[#121214] hover:bg-[#1c1c20] text-white border border-[#1f1f23] text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg transition cursor-pointer"
            >
              <Network className="w-4 h-4 text-amber-400" />
              <span>Architecture Map</span>
            </Link>
            <Link
              to={`/chat?repository=${repo.id}`}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-[#0d1017] text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask AI Copilot</span>
            </Link>
            <button
              onClick={handleTriggerIndex}
              disabled={indexing || repo.index_status === 'indexing'}
              className="p-2.5 rounded-xl bg-[#121214] hover:bg-[#1c1c20] border border-[#1f1f23] text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer"
              title="Re-Index Codebase"
            >
              <RefreshCw className={`w-4 h-4 ${indexing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Ingested Files Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Ingested Source Files ({files.length})</h2>
            <p className="text-xs text-slate-400">Click any file to view source code and inspected AST tokens</p>
          </div>

          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Filter files by path or extension..."
              className="w-full bg-[#121214] border border-[#1f1f23] focus:border-amber-500/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition font-mono"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Files Grid / List */}
        {filteredFiles.length === 0 ? (
          <div className="rounded-2xl p-8 text-center text-xs text-slate-400 bg-[#09090b] border border-[#1f1f23]">
            {files.length === 0 ? "No source files found or indexed yet." : "No files matched your filter query."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className="rounded-xl p-3.5 bg-[#09090b] border border-[#1f1f23] hover:border-amber-500/40 cursor-pointer flex items-center justify-between gap-3 group transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-medium text-slate-200 group-hover:text-amber-400 truncate">
                      {file.file_path}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {file.line_count} lines • {file.language || 'code'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Code Viewer Modal */}
      <CodeViewerModal
        isOpen={selectedFileId !== null}
        onClose={() => setSelectedFileId(null)}
        repositoryId={repo.id}
        fileId={selectedFileId || undefined}
      />

      {/* Floating Error Toast */}
      {indexError && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-black border border-[#27272a] text-white px-3.5 py-2.5 rounded-lg animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-xs text-zinc-200 pr-2">{indexError}</span>
          <button
            onClick={() => setIndexError(null)}
            className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
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
    </WorkspaceLayout>
  );
};
