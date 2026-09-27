import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FolderGit2, GitBranch, Network, MessageSquare, RefreshCw, Search, FileCode2, ExternalLink, ChevronRight, Layers, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
  const navigate = useNavigate();
  const { repositories, selectedRepo, setSelectedRepo, fetchRepositories } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  useEffect(() => {
    if (repositories.length === 0) {
      fetchRepositories(true);
    }
  }, [repositories.length, fetchRepositories]);

  useEffect(() => {
    if (repositories.length > 0) {
      const exists = repositories.some((r) => r.id === repoId);
      if (!exists) {
        const fallback = selectedRepo && repositories.some((r) => r.id === selectedRepo.id) ? selectedRepo : repositories[0];
        setSelectedRepo(fallback);
        navigate(`/repository/${fallback.id}`, { replace: true });
      }
    }
  }, [repositories, repoId, selectedRepo, setSelectedRepo, navigate]);

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
    if (!user?.has_openai_key && !user?.has_gemini_key) {
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
    return (
      <WorkspaceLayout>
        <LoadingScreen title="Loading Repository" />
      </WorkspaceLayout>
    );
  }

  if (error || !repo) {
    return (
      <WorkspaceLayout>
        <ErrorState type="404" title="Repository Not Found" message={error || 'Could not find repository'} onRetry={fetchRepoData} />
      </WorkspaceLayout>
    );
  }

  const filteredFiles = files.filter((f) =>
    f.file_path.toLowerCase().includes(fileSearch.toLowerCase()) ||
    (f.language && f.language.toLowerCase().includes(fileSearch.toLowerCase()))
  );

  return (
    <WorkspaceLayout>
      <Card className="rounded-2xl p-6 sm:p-7 bg-[#FFFFFF] border border-[#E2E0D9] shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="size-12 rounded-2xl bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-[#526078] shrink-0 shadow-2xs">
              <FolderGit2 className="size-6 text-[#526078]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-[#19243B] tracking-tight truncate">{repo.full_name}</h1>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#687184] hover:text-[#19243B] transition p-1 cursor-pointer"
                  title="Open on GitHub"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
              <p className="text-xs sm:text-sm text-[#526078] max-w-2xl line-clamp-2">
                {repo.description || 'GitHub repository synchronized for CodeLens intelligence.'}
              </p>

              <div className="flex flex-wrap items-center gap-2 mt-3.5 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FAF9F5] text-[#526078] border border-[#E2E0D9]">
                  <GitBranch className="size-3 text-amber-700" />
                  {repo.default_branch || 'main'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FAF9F5] text-[#526078] border border-[#E2E0D9]">
                  <Layers className="size-3 text-[#687184]" />
                  {(repo.symbol_count || 0).toLocaleString()} Symbols
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#FAF9F5] text-[#526078] border border-[#E2E0D9]">
                  <FileCode2 className="size-3 text-[#687184]" />
                  {files.length.toLocaleString()} Files
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium font-mono ${
                  repo.index_status === 'indexed'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : repo.index_status === 'indexing'
                    ? 'bg-[#FEF7EC] text-amber-800 border border-amber-200'
                    : 'bg-[#F0EEE9] text-[#526078] border border-[#E2E0D9]'
                }`}>
                  <span className={`rounded-full size-1.5 ${
                    repo.index_status === 'indexed' ? 'bg-emerald-600' : 'bg-amber-600'
                  }`} />
                  {repo.index_status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to={`/repository/${repo.id}/architecture`}>
              <Button
                variant="outline"
                className="h-9 px-3.5 text-xs font-medium rounded-xl border-[#E2E0D9] bg-[#FFFFFF] hover:bg-[#FAF9F5] text-[#19243B] cursor-pointer shadow-2xs"
              >
                <Network className="mr-1.5 size-3.5 text-[#526078]" />
                Architecture Map
              </Button>
            </Link>
            <Link to={`/chat?repository=${repo.id}`}>
              <Button
                className="h-9 px-4 text-xs font-semibold rounded-xl bg-amber-600 text-white hover:bg-amber-700 shadow-xs cursor-pointer"
              >
                <MessageSquare className="mr-1.5 size-3.5" />
                Ask AI Copilot
              </Button>
            </Link>
            <Button
              variant="outline"
              size="icon"
              onClick={handleTriggerIndex}
              disabled={indexing || repo.index_status === 'indexing'}
              className="h-9 w-9 rounded-xl border-[#E2E0D9] bg-[#FFFFFF] hover:bg-[#FAF9F5] text-[#526078] cursor-pointer disabled:opacity-40 shadow-2xs"
              title="Re-Index Codebase"
            >
              <RefreshCw className={`size-3.5 ${indexing ? 'animate-spin text-amber-700' : 'text-[#687184]'}`} />
            </Button>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#19243B]">Ingested Source Files ({files.length.toLocaleString()})</h2>
            <p className="text-xs text-[#526078] mt-0.5">Click any file to view source code and inspected AST tokens</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="size-3.5 text-[#8C96A5] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Filter files by path or extension..."
              className="w-full bg-[#FFFFFF] border border-[#E2E0D9] focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-[#19243B] placeholder-[#8C96A5] outline-none shadow-2xs transition font-sans"
            />
          </div>
        </div>

        {filteredFiles.length === 0 ? (
          <div className="rounded-2xl p-8 text-center text-xs text-[#526078] bg-[#FFFFFF] border border-[#E2E0D9] shadow-2xs">
            {files.length === 0 ? "No source files found or indexed yet." : "No files matched your filter query."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFiles.map((file) => (
              <Card
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className="rounded-2xl p-3.5 bg-[#FFFFFF] border border-[#E2E0D9] hover:border-amber-300 hover:shadow-xs transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group shadow-2xs"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-xl bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-[#526078] group-hover:text-amber-700 transition shrink-0">
                    <FileCode2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-semibold text-[#19243B] group-hover:text-amber-800 truncate transition-colors">
                      {file.file_path}
                    </div>
                    <div className="text-[11px] font-mono text-[#687184] mt-0.5">
                      {file.line_count.toLocaleString()} lines • {file.language || 'text'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[#8C96A5] group-hover:text-[#19243B] group-hover:translate-x-0.5 transition shrink-0" />
              </Card>
            ))}
          </div>
        )}
      </div>

      <CodeViewerModal
        isOpen={selectedFileId !== null}
        onClose={() => setSelectedFileId(null)}
        repositoryId={repo.id}
        fileId={selectedFileId || undefined}
      />

      {indexError && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-[#FFFFFF] border border-[#E2E0D9] text-[#19243B] px-4 py-3 rounded-xl animate-fadeIn shadow-lg">
          <AlertCircle className="size-4 text-rose-600 shrink-0" />
          <span className="text-xs text-[#19243B] font-medium pr-2">{indexError}</span>
          <button
            onClick={() => setIndexError(null)}
            className="text-[#687184] hover:text-[#19243B] p-1 rounded hover:bg-[#F0EEE9] transition cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
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
