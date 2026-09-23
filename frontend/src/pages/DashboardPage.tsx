import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  Files,
  FolderGit2,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageCircle,
  MoreHorizontal,
  Network,
  RefreshCw,
  ScanLine,
  Settings,
  TriangleAlert,
  UserRound,
  UserRoundCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/useAuthStore";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { WorkspaceLayout } from "@/components/layout/WorkspaceLayout";
import { AddRepositoryModal } from "@/components/repositories/AddRepositoryModal";

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    fetchRepositories,
    triggerIndexing,
  } = useWorkspaceStore();
  const navigate = useNavigate();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const totalRepos = repositories.length;
  const indexedCount = repositories.filter((r) => r.index_status === "indexed").length;
  const indexingCount = repositories.filter((r) => r.index_status === "indexing").length;
  const failedCount = repositories.filter((r) => r.index_status === "failed").length;
  const totalFiles = repositories.reduce((acc, r) => acc + (r.file_count || 0), 0);

  const activeRepo = selectedRepo || repositories[0] || null;

  const handleRefreshAll = async () => {
    try {
      setRefreshing(true);
      await fetchRepositories();
    } finally {
      setRefreshing(false);
    }
  };

  const handleReindex = async (repoId: number) => {
    try {
      await triggerIndexing(repoId);
    } catch (err) {
      console.error("Failed to reindex", err);
    }
  };

  return (
    <WorkspaceLayout>
      {/* Workspace Overview Header */}
              <section className="flex justify-between items-end">
                <div className="flex flex-col gap-2">
                  <div className="text-muted-foreground text-xs font-mono">
                    Workspace / Overview
                  </div>
                  <h1 className="font-bold text-3xl leading-tight text-foreground">
                    Dashboard
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    Your codebase intelligence workspace.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setIsAddModalOpen(true)}
                    className="rounded-lg bg-primary text-primary-foreground text-sm pr-3 pl-3 h-9 font-semibold hover:bg-primary/90 shadow-md cursor-pointer"
                  >
                    + Add Repository
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleRefreshAll}
                    disabled={refreshing}
                    className="rounded-lg text-foreground text-sm border-t border-t-border border-r border-r-border border-b border-b-border border-l border-l-border pr-3 pl-3 h-9 hover:bg-accent cursor-pointer"
                  >
                    <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
                    Refresh index
                  </Button>
                </div>
              </section>

              {/* 4 Metric Cards */}
              <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                {/* Repositories Card */}
                <Card className="rounded-xl bg-card border-border pt-4 pr-4 pb-4 pl-4 gap-3">
                  <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Repositories
                    </span>
                    <GitBranch className="text-muted-foreground size-4" />
                  </CardHeader>
                  <CardContent className="flex pt-0 pr-0 pb-0 pl-0 justify-between items-end gap-2">
                    <span className="font-semibold text-2xl">
                      {totalRepos.toString().padStart(2, "0")}
                    </span>
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <span className="rounded-full bg-primary size-2" />
                      {indexedCount} indexed · {failedCount} needs attention
                    </span>
                  </CardContent>
                </Card>

                {/* Indexed Files Card */}
                <Card className="rounded-xl bg-card border-border pt-4 pr-4 pb-4 pl-4 gap-3">
                  <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Indexed Files
                    </span>
                    <Files className="text-primary size-4" />
                  </CardHeader>
                  <CardContent className="flex pt-0 pr-0 pb-0 pl-0 justify-between items-end gap-2">
                    <span className="font-semibold text-2xl">
                      {totalFiles.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <span className="rounded-full bg-primary size-2" />
                      {totalFiles > 0 ? "Multi-language AST parsed" : "No indexed files"}
                    </span>
                  </CardContent>
                </Card>

                {/* Indexing Queues Card */}
                <Card className="rounded-xl bg-card border-border pt-4 pr-4 pb-4 pl-4 gap-3">
                  <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Indexing
                    </span>
                    <LoaderCircle className={`text-primary size-4 ${indexingCount > 0 ? "animate-spin" : ""}`} />
                  </CardHeader>
                  <CardContent className="flex pt-0 pr-0 pb-0 pl-0 justify-between items-end gap-2">
                    <span className="font-semibold text-2xl">
                      {indexingCount.toString().padStart(2, "0")}
                    </span>
                    <span className="text-muted-foreground text-xs flex items-center gap-1 truncate max-w-[180px]">
                      <span className="rounded-full bg-primary size-2 shrink-0" />
                      {indexingCount > 0 ? `${indexingCount} indexing in progress` : "All queues idle"}
                    </span>
                  </CardContent>
                </Card>

                {/* Needs Attention Card */}
                <Card className="rounded-xl bg-card border-border pt-4 pr-4 pb-4 pl-4 gap-3">
                  <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-center gap-2">
                    <span className="text-muted-foreground text-sm">
                      Needs attention
                    </span>
                    <TriangleAlert className="text-destructive size-4" />
                  </CardHeader>
                  <CardContent className="flex pt-0 pr-0 pb-0 pl-0 justify-between items-end gap-2">
                    <span className="font-semibold text-2xl">
                      {failedCount.toString().padStart(2, "0")}
                    </span>
                    <span className="text-muted-foreground text-xs flex items-center gap-1">
                      <span className={`rounded-full size-2 ${failedCount > 0 ? "bg-destructive" : "bg-primary"}`} />
                      {failedCount > 0 ? `${failedCount} repositories failed` : "No active errors"}
                    </span>
                  </CardContent>
                </Card>
              </section>

              {/* Gemini API Key Status Banner */}
              <section className="rounded-xl bg-card border-t border-t-border border-r border-r-border border-b border-b-border border-l border-l-border flex pt-4 pr-4 pb-4 pl-4 justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full size-2.5 ${user?.has_gemini_key ? "bg-primary" : "bg-destructive animate-pulse"}`} />
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs">
                      Gemini API Key
                    </span>
                    <span className="font-medium text-sm">
                      {user?.has_gemini_key ? "Active & Verified ✓" : "Key Required ⚠"}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {user?.has_gemini_key
                        ? "Repository indexing and grounded AI chat are enabled."
                        : "Configure your free Google AI Studio key to unlock code indexing & Copilot."}
                    </span>
                  </div>
                </div>
                <Link to="/profile">
                  <Button
                    variant="ghost"
                    className="text-muted-foreground text-xs h-8 hover:text-foreground hover:bg-accent"
                  >
                    Manage key
                  </Button>
                </Link>
              </section>

              {/* Main Content Split: Recent Repositories & Quick Actions */}
              <section className="grid gap-6 grid-cols-1 lg:grid-cols-[1.65fr_1fr]">
                {/* Recent Repositories Table */}
                <Card className="rounded-xl bg-card border-border pt-6 pr-6 pb-6 pl-6 gap-4">
                  <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-start gap-2">
                    <div className="flex flex-col gap-1">
                      <CardTitle className="text-base">
                        Recent repositories
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-xs">
                        Continue where you left off.
                      </CardDescription>
                    </div>
                    <MoreHorizontal className="text-muted-foreground size-4" />
                  </CardHeader>
                  <CardContent className="flex pt-0 pr-0 pb-0 pl-0 flex-col">
                    {repositories.length === 0 ? (
                      <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                        <FolderGit2 className="size-8 text-muted-foreground mb-3" />
                        <h4 className="font-medium text-sm text-foreground mb-1">No repositories connected</h4>
                        <p className="text-xs text-muted-foreground max-w-sm mb-4">
                          Connect your first GitHub repository to generate 4-layer architecture maps and query with AI.
                        </p>
                        <Button
                          onClick={() => setIsAddModalOpen(true)}
                          className="rounded-lg bg-primary text-primary-foreground text-xs font-semibold px-4 h-8"
                        >
                          + Connect Repository
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="uppercase text-muted-foreground text-[10px] tracking-wide border-t-border border-r-border border-b border-b-border border-l-border grid pt-3 pr-3 pb-3 pl-3 gap-2 grid-cols-[1.6fr_0.7fr_0.9fr_0.8fr_0.8fr_0.9fr_1fr_1.2fr]">
                          <span>Repository</span>
                          <span>Access</span>
                          <span>Status</span>
                          <span>Files</span>
                          <span>Symbols</span>
                          <span>Branch</span>
                          <span>Last indexed</span>
                          <span>Actions</span>
                        </div>

                        {repositories.slice(0, 5).map((repo) => {
                          const isIndexed = repo.index_status === "indexed";
                          const isIndexing = repo.index_status === "indexing";
                          const isFailed = repo.index_status === "failed";

                          return (
                            <div
                              key={repo.id}
                              className="text-xs border-t-border border-r-border border-b border-b-border border-l-border grid pt-4 pr-3 pb-4 pl-3 items-center gap-2 grid-cols-[1.6fr_0.7fr_0.9fr_0.8fr_0.8fr_1fr_0.9fr_1.2fr] hover:bg-accent/40 transition"
                            >
                              <span className="font-medium text-sm text-foreground truncate">
                                {repo.full_name}
                              </span>
                              <span className="text-muted-foreground">
                                {repo.private ? "Private" : "Public"}
                              </span>
                              <span
                                className={`flex items-center gap-1 font-mono text-[11px] ${
                                  isIndexed
                                    ? "text-primary"
                                    : isIndexing
                                    ? "text-primary"
                                    : isFailed
                                    ? "text-destructive"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <span
                                  className={`rounded-full size-2 ${
                                    isIndexed
                                      ? "bg-primary"
                                      : isIndexing
                                      ? "bg-primary animate-pulse"
                                      : isFailed
                                      ? "bg-destructive"
                                      : "bg-muted-foreground"
                                  }`}
                                />
                                {repo.index_status}
                              </span>
                              <span className="text-muted-foreground font-mono">
                                {repo.file_count || 0} files
                              </span>
                              <span className="text-muted-foreground font-mono">
                                {repo.symbol_count || 0} symbols
                              </span>
                              <span className="font-mono text-muted-foreground truncate">
                                {repo.default_branch || "main"}
                              </span>
                              <span className="text-muted-foreground">
                                {repo.last_indexed_at
                                  ? new Date(repo.last_indexed_at).toLocaleDateString()
                                  : "Never"}
                              </span>
                              <span className="flex flex-wrap gap-1">
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRepo(repo);
                                    navigate(`/repository/${repo.id}`);
                                  }}
                                  className="text-xs pr-2 pl-2 h-7 hover:bg-accent cursor-pointer"
                                >
                                  Open
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedRepo(repo);
                                    navigate(`/chat?repository=${repo.id}`);
                                  }}
                                  className="text-xs pr-2 pl-2 h-7 hover:bg-accent cursor-pointer"
                                >
                                  Chat
                                </Button>
                                <Button
                                  variant="ghost"
                                  onClick={() => handleReindex(repo.id)}
                                  className="text-xs pr-2 pl-2 h-7 text-primary hover:bg-accent cursor-pointer"
                                >
                                  Re-index
                                </Button>
                              </span>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Right Side Cards */}
                <div className="flex flex-col gap-6">
                  {/* Continue working Card */}
                  <Card className="rounded-xl bg-card border-border pt-6 pr-6 pb-6 pl-6 gap-4">
                    <CardHeader className="pt-0 pr-0 pb-0 pl-0 gap-1">
                      <CardTitle className="text-base">
                        Continue working
                      </CardTitle>
                      <CardDescription className="text-muted-foreground text-xs">
                        Quick actions for your indexed repositories.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex pt-0 pr-0 pb-0 pl-0 flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => navigate("/repositories")}
                        className="text-left rounded-lg flex pt-3 pr-3 pb-3 pl-3 justify-between items-center gap-3 hover:bg-accent transition cursor-pointer"
                      >
                        <span className="flex items-center gap-3">
                          <FolderGit2 className="text-muted-foreground size-4" />
                          <span>
                            <strong className="font-medium text-sm block">
                              Browse Repositories
                            </strong>
                            <small className="text-muted-foreground text-xs">
                              Inspect connected codebases
                            </small>
                          </span>
                        </span>
                        <ArrowRight className="text-muted-foreground size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(activeRepo ? `/chat?repository=${activeRepo.id}` : "/repositories")}
                        className="text-left rounded-lg flex pt-3 pr-3 pb-3 pl-3 justify-between items-center gap-3 hover:bg-accent transition cursor-pointer"
                      >
                        <span className="flex items-center gap-3">
                          <MessageCircle className="text-muted-foreground size-4" />
                          <span>
                            <strong className="font-medium text-sm block">
                              Open Chat
                            </strong>
                            <small className="text-muted-foreground text-xs">
                              Ask grounded questions
                            </small>
                          </span>
                        </span>
                        <ArrowRight className="text-muted-foreground size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => navigate(activeRepo ? `/repository/${activeRepo.id}/architecture` : "/repositories")}
                        className="text-left rounded-lg flex pt-3 pr-3 pb-3 pl-3 justify-between items-center gap-3 hover:bg-accent transition cursor-pointer"
                      >
                        <span className="flex items-center gap-3">
                          <Network className="text-muted-foreground size-4" />
                          <span>
                            <strong className="font-medium text-sm block">
                              View Architecture
                            </strong>
                            <small className="text-muted-foreground text-xs">
                              Explore dependencies
                            </small>
                          </span>
                        </span>
                        <ArrowRight className="text-muted-foreground size-4" />
                      </button>
                    </CardContent>
                  </Card>

                  {/* Workspace health Card */}
                  <Card className="rounded-xl bg-card border-border pt-6 pr-6 pb-6 pl-6 gap-4">
                    <CardHeader className="pt-0 pr-0 pb-0 pl-0">
                      <CardTitle className="text-base">
                        Workspace health
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex pt-0 pr-0 pb-0 pl-0 flex-col gap-3">
                      <div className="text-xs flex justify-between">
                        <span className="text-primary">{indexedCount} indexed</span>
                        <span className="text-primary">{indexingCount} indexing</span>
                        <span className="text-destructive">{failedCount} needs attention</span>
                      </div>
                      <div className="rounded-full bg-muted flex h-2 overflow-hidden">
                        {totalRepos === 0 ? (
                          <span className="bg-muted w-full" />
                        ) : (
                          <>
                            <span
                              className="bg-primary transition-all duration-500"
                              style={{ width: `${(indexedCount / totalRepos) * 100}%` }}
                            />
                            <span
                              className="bg-primary/50 transition-all duration-500"
                              style={{ width: `${(indexingCount / totalRepos) * 100}%` }}
                            />
                            <span
                              className="bg-destructive transition-all duration-500"
                              style={{ width: `${(failedCount / totalRepos) * 100}%` }}
                            />
                          </>
                        )}
                      </div>
                      <Button
                        onClick={handleRefreshAll}
                        disabled={refreshing}
                        className="rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-accent text-xs border-t border-t-border border-r border-r-border border-b border-b-border border-l border-l-border w-fit h-8 cursor-pointer"
                      >
                        <RefreshCw className={`mr-2 size-3 ${refreshing ? "animate-spin text-primary" : ""}`} />
                        {refreshing ? "Refreshing index..." : "Refresh health"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </section>

              {/* Recent Activity Card */}
              <section className="rounded-xl bg-card border-t border-t-border border-r border-r-border border-b border-b-border border-l border-l-border pt-6 pr-6 pb-6 pl-6 gap-4">
                <div className="flex flex-col gap-1">
                  <h2 className="font-semibold text-base">Recent activity</h2>
                  <p className="text-muted-foreground text-xs">
                    Quiet updates from your workspace.
                  </p>
                </div>
                <div className="flex flex-col">
                  {repositories.length === 0 ? (
                    <div className="py-4 text-xs text-muted-foreground">
                      No recent activity recorded. Connected repositories will report indexing updates here.
                    </div>
                  ) : (
                    repositories.slice(0, 4).map((repo) => (
                      <div
                        key={repo.id}
                        className="text-sm border-t border-border flex py-3 justify-between items-center"
                      >
                        <span className="flex items-center gap-3">
                          <span
                            className={`rounded-full size-2 ${
                              repo.index_status === "indexed"
                                ? "bg-primary"
                                : repo.index_status === "indexing"
                                ? "bg-primary animate-pulse"
                                : repo.index_status === "failed"
                                ? "bg-destructive"
                                : "bg-muted-foreground"
                            }`}
                          />
                          <span className="text-foreground">{repo.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {repo.index_status === "indexed"
                              ? "indexed successfully"
                              : repo.index_status === "indexing"
                              ? "indexing in progress"
                              : repo.index_status === "failed"
                              ? "indexing failed"
                              : "queued for indexing"}
                          </span>
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {repo.last_indexed_at
                            ? new Date(repo.last_indexed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : "Never indexed"} ·{" "}
                          <span className="font-mono text-[11px]">{repo.default_branch || "main"}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

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
    </WorkspaceLayout>
  );
};
