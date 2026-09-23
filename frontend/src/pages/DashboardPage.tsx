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
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { AddRepositoryModal } from "@/components/repositories/AddRepositoryModal";

export const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    repositories,
    selectedRepo,
    setSelectedRepo,
    fetchRepositories,
    triggerIndexing,
  } = useWorkspace();
  const navigate = useNavigate();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
    <div data-appearance="dark">
      <div className="bg-background text-foreground w-full min-h-screen">
        {/* Top Sticky Header */}
        <header className="bg-sidebar text-foreground flex sticky z-30 top-0 pr-6 pl-6 items-center h-16 border-b border-border">
          {/* Left Brand */}
          <Link to="/dashboard" className="flex items-center shrink-0 gap-3 w-64">
            <ScanLine className="text-primary size-6" />
            <span className="font-semibold text-lg tracking-tight text-white">
              CodeLens
            </span>
          </Link>

          {/* Center Repository Selector Dropdown */}
          <div className="-translate-x-1/2 flex absolute left-1/2 items-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
                className="rounded-lg bg-muted text-foreground text-sm border border-border flex pt-2 pr-3 pb-2 pl-3 items-center gap-2 hover:bg-accent transition cursor-pointer"
              >
                <GitBranch className="text-muted-foreground size-4" />
                <span>{activeRepo ? activeRepo.name : "Select Repository"}</span>
                <ChevronDown className="text-muted-foreground size-4" />
              </button>

              {isRepoDropdownOpen && repositories.length > 0 && (
                <div className="absolute left-0 mt-2 w-64 rounded-xl bg-card border border-border shadow-2xl p-2 z-50 animate-fadeIn">
                  <div className="text-[10px] uppercase font-mono text-muted-foreground px-2 py-1">
                    Your Repositories
                  </div>
                  {repositories.map((repo) => (
                    <div
                      key={repo.id}
                      onClick={() => {
                        setSelectedRepo(repo);
                        setIsRepoDropdownOpen(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer hover:bg-accent ${
                        repo.id === activeRepo?.id ? "bg-accent text-foreground font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      <span className="truncate">{repo.name}</span>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {repo.file_count} files
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 mt-1 border-t border-border">
                    <button
                      onClick={() => {
                        setIsRepoDropdownOpen(false);
                        setIsAddModalOpen(true);
                      }}
                      className="w-full text-left text-xs text-primary font-medium px-2 py-1.5 rounded hover:bg-accent"
                    >
                      + Connect New Repository
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex ml-auto items-center gap-5">
            <Link
              to="/profile"
              className="text-muted-foreground text-sm flex items-center gap-2 hover:text-foreground transition"
            >
              <KeyRound className="size-4 text-primary" />
              <span>{user?.has_gemini_key ? "Key Configured ✓" : "Key Required ⚠"}</span>
            </Link>

            <Link
              to="/profile"
              className="font-medium rounded-full bg-muted text-foreground text-sm flex justify-center items-center size-9 border border-border overflow-hidden"
              aria-label="User avatar"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <UserRound className="size-4" />
              )}
            </Link>

            <Link
              to="/profile"
              className="text-muted-foreground text-sm flex items-center gap-2 hover:text-foreground transition"
            >
              <Settings className="size-4" />
              <span>Settings</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="text-muted-foreground text-sm flex items-center gap-2 hover:text-destructive transition cursor-pointer"
            >
              <LogOut className="size-4" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Sidebar Fixed */}
        <aside className="bg-sidebar border-r border-border fixed z-20 top-16 bottom-0 left-0 pt-5 pr-3 pb-5 pl-3 w-64">
          <nav aria-label="Primary navigation" className="space-y-1">
            <Link
              to="/dashboard"
              className="rounded-lg bg-accent text-foreground text-sm border-l-2 border-l-primary flex pt-2.5 pr-3 pb-2.5 pl-3 items-center gap-3 font-medium"
            >
              <LayoutDashboard className="size-5 text-primary" />
              <span>Dashboard</span>
            </Link>
            <Link
              to="/repositories"
              className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-sm border-l-2 border-l-transparent flex pt-2.5 pr-3 pb-2.5 pl-3 items-center gap-3 transition"
            >
              <GitBranch className="size-5" />
              <span>Repositories</span>
            </Link>
            {activeRepo && (
              <Link
                to={`/repository/${activeRepo.id}`}
                className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-sm border-l-2 border-l-transparent flex pt-2.5 pr-3 pb-2.5 pl-3 items-center gap-3 transition"
              >
                <FolderGit2 className="text-muted-foreground size-4" />
                <span className="truncate">{activeRepo.name}</span>
              </Link>
            )}
            <Link
              to={activeRepo ? `/chat?repository=${activeRepo.id}` : "/repositories"}
              className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-sm border-l-2 border-l-transparent flex pt-2.5 pr-3 pb-2.5 pl-3 items-center gap-3 transition"
            >
              <MessageCircle className="text-muted-foreground size-4" />
              <span>Chat</span>
            </Link>
            <Link
              to={activeRepo ? `/repository/${activeRepo.id}/architecture` : "/repositories"}
              className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-sm border-l-2 border-l-transparent flex pt-2.5 pr-3 pb-2.5 pl-3 items-center gap-3 transition"
            >
              <Network className="text-muted-foreground size-4" />
              <span>Architecture</span>
            </Link>
            <Link
              to="/profile"
              className="rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent text-sm border-l-2 border-l-transparent flex pt-2.5 pr-3 pb-2.5 pl-3 items-center gap-3 transition"
            >
              <UserRoundCog className="size-5" />
              <span>Profile / Settings</span>
            </Link>
          </nav>
        </aside>

        {/* Main Workspace Body */}
        <main className="ml-64 pt-8 pr-8 pb-10 pl-8 min-h-[calc(100vh_-_4rem)]">
          <div className="flex mr-auto ml-auto flex-col gap-6 max-w-[1440px]">
            {/* Page Header */}
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
                  className="rounded-lg bg-primary text-primary-foreground text-sm pr-3 pl-3 h-9 font-semibold hover:bg-primary/90 shadow-md"
                >
                  + Add Repository
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleRefreshAll}
                  disabled={refreshing}
                  className="rounded-lg text-foreground text-sm border border-border pr-3 pl-3 h-9 hover:bg-accent"
                >
                  <RefreshCw className={`mr-2 size-4 ${refreshing ? "animate-spin text-primary" : ""}`} />
                  Refresh index
                </Button>
              </div>
            </section>

            {/* 4 Metrics Cards */}
            <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="rounded-xl bg-card border-border pt-4 pr-4 pb-4 pl-4 gap-3">
                <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    Repositories
                  </span>
                  <GitBranch className="text-muted-foreground size-4" />
                </CardHeader>
                <CardContent className="flex pt-0 pr-0 pb-0 pl-0 justify-between items-end gap-2">
                  <span className="font-semibold text-2xl">{repositories.length.toString().padStart(2, "0")}</span>
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <span className="rounded-full bg-blue-400 size-2" />
                    {indexedCount} indexed · {failedCount} needs attention
                  </span>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card border-border pt-4 pr-4 pb-4 pl-4 gap-3">
                <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    Indexed Files
                  </span>
                  <Files className="text-green-400 size-4" />
                </CardHeader>
                <CardContent className="flex pt-0 pr-0 pb-0 pl-0 justify-between items-end gap-2">
                  <span className="font-semibold text-2xl">{totalFiles.toLocaleString()}</span>
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <span className="rounded-full bg-emerald-400 size-2" />
                    Multi-language AST
                  </span>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card border-border pt-4 pr-4 pb-4 pl-4 gap-3">
                <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    Indexing
                  </span>
                  <LoaderCircle className={`text-blue-400 size-4 ${indexingCount > 0 ? "animate-spin" : ""}`} />
                </CardHeader>
                <CardContent className="flex pt-0 pr-0 pb-0 pl-0 justify-between items-end gap-2">
                  <span className="font-semibold text-2xl">{indexingCount.toString().padStart(2, "0")}</span>
                  <span className="text-muted-foreground text-xs flex items-center gap-1 truncate max-w-[180px]">
                    <span className="rounded-full bg-blue-400 size-2 shrink-0" />
                    {indexingCount > 0 ? "Indexing in progress" : "All queues idle"}
                  </span>
                </CardContent>
              </Card>

              <Card className="rounded-xl bg-card border-border pt-4 pr-4 pb-4 pl-4 gap-3">
                <CardHeader className="flex pt-0 pr-0 pb-0 pl-0 flex-row justify-between items-center gap-2">
                  <span className="text-muted-foreground text-sm">
                    Needs attention
                  </span>
                  <TriangleAlert className="text-red-400 size-4" />
                </CardHeader>
                <CardContent className="flex pt-0 pr-0 pb-0 pl-0 justify-between items-end gap-2">
                  <span className="font-semibold text-2xl">{failedCount.toString().padStart(2, "0")}</span>
                  <span className="text-muted-foreground text-xs flex items-center gap-1">
                    <span className="rounded-full bg-red-400 size-2" />
                    {failedCount > 0 ? `${failedCount} repositories failed` : "No active errors"}
                  </span>
                </CardContent>
              </Card>
            </section>

            {/* Gemini API Key Status Banner */}
            <section className="rounded-xl bg-card border border-border flex pt-4 pr-4 pb-4 pl-4 justify-between items-center">
              <div className="flex items-center gap-3">
                <span className={`rounded-full size-2.5 ${user?.has_gemini_key ? "bg-green-400" : "bg-amber-400 animate-pulse"}`} />
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs">
                    Gemini API Key
                  </span>
                  <span className="font-medium text-sm">
                    {user?.has_gemini_key ? "Active & Verified ✓" : "Key Not Configured ⚠"}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {user?.has_gemini_key
                      ? "Repository indexing and grounded AI chat are enabled."
                      : "Add your free Google AI Studio key to unlock code indexing & Copilot."}
                  </span>
                </div>
              </div>
              <Link to="/profile">
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground text-xs h-8 border border-border"
                >
                  Manage key
                </Button>
              </Link>
            </section>

            {/* Main Content Grid: Recent Repositories & Quick Actions */}
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
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No repositories connected yet. Click "+ Add Repository" to get started.
                    </div>
                  ) : (
                    <>
                      <div className="uppercase text-muted-foreground text-[10px] tracking-wide border-b border-border grid pt-3 pr-3 pb-3 pl-3 gap-2 grid-cols-[1.6fr_0.7fr_0.9fr_0.8fr_0.8fr_0.9fr_1fr_1.2fr]">
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
                            className="text-xs border-b border-border grid pt-4 pr-3 pb-4 pl-3 items-center gap-2 grid-cols-[1.6fr_0.7fr_0.9fr_0.8fr_0.8fr_0.9fr_1fr_1.2fr] hover:bg-accent/40 transition"
                          >
                            <span className="font-medium text-sm truncate text-foreground">
                              {repo.full_name}
                            </span>
                            <span className="text-muted-foreground">
                              {repo.private ? "Private" : "Public"}
                            </span>
                            <span
                              className={`flex items-center gap-1 ${
                                isIndexed
                                  ? "text-green-400"
                                  : isIndexing
                                  ? "text-blue-400"
                                  : isFailed
                                  ? "text-red-400"
                                  : "text-muted-foreground"
                              }`}
                            >
                              <span
                                className={`rounded-full size-2 ${
                                  isIndexed
                                    ? "bg-green-400"
                                    : isIndexing
                                    ? "bg-blue-400 animate-spin"
                                    : isFailed
                                    ? "bg-red-400"
                                    : "bg-slate-500"
                                }`}
                              />
                              {repo.index_status}
                            </span>
                            <span className="text-muted-foreground font-mono">
                              {repo.file_count} files
                            </span>
                            <span className="text-muted-foreground font-mono">
                              {repo.symbol_count} syms
                            </span>
                            <span className="font-mono text-muted-foreground truncate">
                              {repo.default_branch}
                            </span>
                            <span className="text-muted-foreground">
                              {repo.last_indexed_at
                                ? new Date(repo.last_indexed_at).toLocaleDateString()
                                : "Not indexed"}
                            </span>
                            <span className="flex flex-wrap gap-1">
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setSelectedRepo(repo);
                                  navigate(`/repository/${repo.id}`);
                                }}
                                className="text-xs pr-2 pl-2 h-7 hover:bg-accent"
                              >
                                Open repo
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => {
                                  setSelectedRepo(repo);
                                  navigate(`/chat?repository=${repo.id}`);
                                }}
                                className="text-xs pr-2 pl-2 h-7 hover:bg-accent"
                              >
                                Open Chat
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() => handleReindex(repo.id)}
                                className="text-xs pr-2 pl-2 h-7 text-primary hover:bg-accent"
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

              {/* Right Column: Quick Actions & Workspace Health */}
              <div className="flex flex-col gap-6">
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
                          <strong className="font-medium text-sm block text-foreground">
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
                      onClick={() => {
                        if (activeRepo) navigate(`/chat?repository=${activeRepo.id}`);
                        else navigate("/repositories");
                      }}
                      className="text-left rounded-lg flex pt-3 pr-3 pb-3 pl-3 justify-between items-center gap-3 hover:bg-accent transition cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <MessageCircle className="text-muted-foreground size-4" />
                        <span>
                          <strong className="font-medium text-sm block text-foreground">
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
                      onClick={() => {
                        if (activeRepo) navigate(`/repository/${activeRepo.id}/architecture`);
                        else navigate("/repositories");
                      }}
                      className="text-left rounded-lg flex pt-3 pr-3 pb-3 pl-3 justify-between items-center gap-3 hover:bg-accent transition cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Network className="text-muted-foreground size-4" />
                        <span>
                          <strong className="font-medium text-sm block text-foreground">
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

                {/* Workspace Health Card */}
                <Card className="rounded-xl bg-card border-border pt-6 pr-6 pb-6 pl-6 gap-4">
                  <CardHeader className="pt-0 pr-0 pb-0 pl-0">
                    <CardTitle className="text-base">
                      Workspace health
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex pt-0 pr-0 pb-0 pl-0 flex-col gap-3">
                    <div className="text-xs flex justify-between">
                      <span className="text-green-400">{indexedCount} indexed</span>
                      <span className="text-blue-400">{indexingCount} indexing</span>
                      <span className="text-red-400">{failedCount} needs attention</span>
                    </div>
                    <div className="rounded-full bg-muted flex h-2 overflow-hidden">
                      <span
                        className="bg-green-400 transition-all"
                        style={{
                          width: `${repositories.length ? (indexedCount / repositories.length) * 100 : 0}%`,
                        }}
                      />
                      <span
                        className="bg-blue-400 transition-all"
                        style={{
                          width: `${repositories.length ? (indexingCount / repositories.length) * 100 : 0}%`,
                        }}
                      />
                      <span
                        className="bg-red-400 transition-all"
                        style={{
                          width: `${repositories.length ? (failedCount / repositories.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <Button
                      onClick={handleRefreshAll}
                      disabled={refreshing}
                      className="rounded-lg bg-muted text-muted-foreground text-xs border border-border w-fit h-8 hover:bg-accent hover:text-foreground"
                    >
                      <RefreshCw className={`mr-2 size-3 ${refreshing ? "animate-spin text-primary" : ""}`} />
                      Refresh workspace
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Recent Activity Feed */}
            <section className="rounded-xl bg-card border border-border pt-6 pr-6 pb-6 pl-6 gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-base text-foreground">Recent activity</h2>
                <p className="text-muted-foreground text-xs">
                  Quiet updates from your workspace.
                </p>
              </div>
              <div className="flex flex-col mt-3">
                {repositories.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-3">No recent indexing activity recorded.</div>
                ) : (
                  repositories.slice(0, 3).map((r, idx) => (
                    <div
                      key={r.id}
                      className={`text-sm flex pt-3 pb-3 justify-between items-center ${
                        idx < 2 ? "border-b border-border" : ""
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`rounded-full size-2 ${
                            r.index_status === "indexed"
                              ? "bg-green-400"
                              : r.index_status === "indexing"
                              ? "bg-blue-400"
                              : "bg-red-400"
                          }`}
                        />
                        <span className="text-foreground">{r.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {r.index_status === "indexed"
                            ? "indexed successfully"
                            : r.index_status === "indexing"
                            ? "indexing in progress"
                            : "needs attention"}
                        </span>
                      </span>
                      <span className="text-muted-foreground text-xs font-mono">
                        {r.file_count} files · {r.symbol_count} symbols
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
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

export default DashboardPage;
