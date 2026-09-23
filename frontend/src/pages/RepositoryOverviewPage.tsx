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
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';
import type { RepositoryItem, FileItem } from '../types';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorState } from '../components/common/ErrorState';
import { CodeViewerModal } from '../components/code/CodeViewerModal';

export const RepositoryOverviewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const repoId = parseInt(id || '0', 10);
  const { setSelectedRepo } = useWorkspace();

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

  const handleTriggerIndex = async () => {
    try {
      setIndexing(true);
      await api.indexRepository(repoId);
      await fetchRepoData();
    } catch (err: any) {
      alert(err.message || 'Indexing failed');
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/[0.08] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-purple-blue flex items-center justify-center text-white shrink-0 shadow-lg glow-purple">
              <FolderGit2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{repo.full_name}</h1>
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
                <span className="flex items-center gap-1 text-slate-300 bg-white/[0.04] px-2.5 py-1 rounded-lg border border-white/[0.06]">
                  <GitBranch className="w-3.5 h-3.5 text-purple-400" />
                  {repo.default_branch}
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  <Layers className="w-3.5 h-3.5" />
                  {repo.symbol_count} Symbols
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                  <FileCode2 className="w-3.5 h-3.5" />
                  {files.length} Files
                </span>
                <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {repo.index_status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to={`/repository/${repo.id}/architecture`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg glow-purple transition cursor-pointer"
            >
              <Network className="w-4 h-4" />
              <span>Architecture Map</span>
            </Link>
            <Link
              to={`/chat?repository=${repo.id}`}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-lg glow-cyan transition cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask AI Copilot</span>
            </Link>
            <button
              onClick={handleTriggerIndex}
              disabled={indexing || repo.index_status === 'indexing'}
              className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition disabled:opacity-40 cursor-pointer"
              title="Re-Index Codebase"
            >
              <RefreshCw className={`w-4 h-4 ${indexing ? 'animate-spin text-purple-400' : ''}`} />
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
              className="w-full bg-[#121620] border border-white/[0.08] focus:border-purple-500/60 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none transition"
            />
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Files Grid / List */}
        {filteredFiles.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-xs text-slate-400 border border-white/[0.08]">
            No files matched your filter query.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className="glass-card rounded-xl p-3.5 border border-white/[0.08] hover:border-purple-500/40 cursor-pointer flex items-center justify-between gap-3 group transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                    <FileCode2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-medium text-slate-200 group-hover:text-purple-300 truncate">
                      {file.file_path}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-0.5">
                      {file.line_count} lines • {file.language || 'code'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition" />
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
    </div>
  );
};
