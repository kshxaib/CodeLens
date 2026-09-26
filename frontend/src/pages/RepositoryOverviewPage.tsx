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
  ExternalLink,
  ChevronRight,
  Layers,
  AlertCircle,
  X,
} from 'lucide-react';
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
      <Card className="rounded-xl p-6 sm:p-7 bg-card border-border shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 min-w-0">
            <div className="size-12 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground shrink-0 shadow-sm">
              <FolderGit2 className="size-6 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight truncate">{repo.full_name}</h1>
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-foreground transition p-1 cursor-pointer"
                  title="Open on GitHub"
                >
                  <ExternalLink className="size-3.5" />
                </a>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl line-clamp-2">
                {repo.description || 'GitHub repository synchronized for CodeLens intelligence.'}
              </p>

              {/* Status & Metadata Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3.5 text-xs font-mono">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                  <GitBranch className="size-3 text-primary" />
                  {repo.default_branch || 'main'}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                  <Layers className="size-3" />
                  {(repo.symbol_count || 0).toLocaleString()} Symbols
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border">
                  <FileCode2 className="size-3" />
                  {files.length.toLocaleString()} Files
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <span className="rounded-full bg-primary size-1.5" />
                  {repo.index_status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link to={`/repository/${repo.id}/architecture`}>
              <Button
                variant="outline"
                className="h-9 px-3.5 text-xs font-medium rounded-lg border-border hover:bg-accent cursor-pointer"
              >
                <Network className="mr-1.5 size-3.5" />
                Architecture Map
              </Button>
            </Link>
            <Link to={`/chat?repository=${repo.id}`}>
              <Button
                className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-md cursor-pointer"
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
              className="h-9 w-9 rounded-lg border-border hover:bg-accent cursor-pointer disabled:opacity-40"
              title="Re-Index Codebase"
            >
              <RefreshCw className={`size-3.5 ${indexing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Ingested Files Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">Ingested Source Files ({files.length.toLocaleString()})</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Click any file to view source code and inspected AST tokens</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="size-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              placeholder="Filter files by path or extension..."
              className="w-full bg-card border border-border focus:border-ring rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground outline-none transition font-sans"
            />
          </div>
        </div>

        {/* Files Grid */}
        {filteredFiles.length === 0 ? (
          <div className="rounded-xl p-8 text-center text-xs text-muted-foreground bg-card border border-border">
            {files.length === 0 ? "No source files found or indexed yet." : "No files matched your filter query."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredFiles.map((file) => (
              <Card
                key={file.id}
                onClick={() => setSelectedFileId(file.id)}
                className="rounded-xl p-3 bg-card border-border hover:border-primary/40 hover:bg-card/90 transition-all duration-150 cursor-pointer flex items-center justify-between gap-3 group shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-secondary border border-border flex items-center justify-center text-muted-foreground group-hover:text-foreground transition shrink-0">
                    <FileCode2 className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-mono font-medium text-foreground group-hover:text-primary truncate transition-colors">
                      {file.file_path}
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                      {file.line_count.toLocaleString()} lines • {file.language || 'text'}
                    </div>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition shrink-0" />
              </Card>
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
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 bg-black border border-border text-foreground px-3.5 py-2.5 rounded-lg animate-fadeIn shadow-lg">
          <AlertCircle className="size-4 text-destructive shrink-0" />
          <span className="text-xs text-foreground pr-2">{indexError}</span>
          <button
            onClick={() => setIndexError(null)}
            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-accent transition cursor-pointer"
          >
            <X className="size-3.5" />
          </button>
        </div>
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
