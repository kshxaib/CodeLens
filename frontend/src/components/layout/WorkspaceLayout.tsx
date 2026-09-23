import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  FolderGit2,
  GitBranch,
  KeyRound,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Network,
  ScanLine,
  Settings,
  UserRound,
  UserRoundCog,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { AddRepositoryModal } from '../repositories/AddRepositoryModal';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const { user, logout } = useAuthStore();
  const { repositories, selectedRepo, setSelectedRepo } = useWorkspaceStore();
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const activeRepo = selectedRepo || repositories[0] || null;

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Repositories', path: '/repositories', icon: GitBranch },
    ...(activeRepo
      ? [{ label: activeRepo.name, path: `/repository/${activeRepo.id}`, icon: FolderGit2 }]
      : []),
    {
      label: 'Chat',
      path: activeRepo ? `/chat?repository=${activeRepo.id}` : '/repositories',
      icon: MessageCircle,
    },
    {
      label: 'Architecture',
      path: activeRepo ? `/repository/${activeRepo.id}/architecture` : '/repositories',
      icon: Network,
    },
    { label: 'Profile / Settings', path: '/profile', icon: UserRoundCog },
  ];

  return (
    <div data-appearance="dark" className="min-h-screen bg-[#0d1017] text-[#f0f3f6]">
      {/* Top Header */}
      <header className="bg-[#0e111a] text-foreground flex sticky z-30 top-0 px-6 items-center h-16 border-b border-[#22283a]">
        {/* Left Brand */}
        <Link to="/dashboard" className="flex items-center shrink-0 gap-3 w-64">
          <ScanLine className="text-amber-400 size-6" />
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
              className="rounded-lg bg-[#1c2130] text-[#f0f3f6] text-sm border border-[#22283a] hover:border-amber-500/40 flex py-2 px-3 items-center gap-2 transition cursor-pointer"
            >
              <GitBranch className="text-slate-400 size-4" />
              <span className="font-mono text-xs">{activeRepo ? activeRepo.name : 'Select Repository'}</span>
              <ChevronDown className="text-slate-400 size-4" />
            </button>

            {isRepoDropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl bg-[#131722] border border-[#22283a] shadow-2xl p-2 z-50 animate-fadeIn">
                <div className="text-[10px] uppercase font-mono text-slate-400 px-2 py-1">
                  Your Repositories
                </div>
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => {
                      setSelectedRepo(repo);
                      setIsRepoDropdownOpen(false);
                      navigate(`/repository/${repo.id}`);
                    }}
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer hover:bg-[#202637] transition ${
                      repo.id === activeRepo?.id ? 'bg-[#202637] text-amber-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{repo.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {repo.file_count || 0} files
                    </span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t border-[#22283a]">
                  <button
                    onClick={() => {
                      setIsRepoDropdownOpen(false);
                      setIsAddModalOpen(true);
                    }}
                    className="w-full text-left text-xs text-amber-400 font-semibold px-2 py-1.5 rounded hover:bg-[#202637] transition cursor-pointer"
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
            className="text-slate-400 text-sm flex items-center gap-2 hover:text-amber-400 transition"
          >
            <KeyRound className="size-4 text-amber-400" />
            <span className="text-xs font-mono">{user?.has_gemini_key ? 'Key Configured ✓' : 'Key Required ⚠'}</span>
          </Link>

          <Link
            to="/profile"
            className="font-medium rounded-full bg-[#1c2130] text-foreground text-sm flex justify-center items-center size-9 border border-[#22283a] overflow-hidden"
            aria-label="User avatar"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
            ) : (
              <UserRound className="size-4 text-amber-400" />
            )}
          </Link>

          <Link
            to="/profile"
            className="text-slate-400 text-sm flex items-center gap-2 hover:text-white transition"
          >
            <Settings className="size-4" />
            <span className="text-xs">Settings</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="text-slate-400 text-sm flex items-center gap-2 hover:text-rose-400 transition cursor-pointer"
          >
            <LogOut className="size-4" />
            <span className="text-xs">Logout</span>
          </button>
        </div>
      </header>

      {/* Sidebar Fixed */}
      <aside className="bg-[#0e111a] border-r border-[#22283a] fixed z-20 top-16 bottom-0 left-0 pt-5 px-3 pb-5 w-64">
        <nav aria-label="Primary navigation" className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`rounded-lg text-sm flex py-2.5 px-3 items-center gap-3 transition font-medium ${
                  isActive
                    ? 'bg-[#202637] text-white border-l-2 border-l-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-[#1a202c] border-l-2 border-l-transparent'
                }`}
              >
                <Icon className={`size-5 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Workspace Content */}
      <main className="ml-64 pt-8 px-8 pb-10 min-h-[calc(100vh-4rem)]">
        <div className="mx-auto flex flex-col gap-6 max-w-[1440px]">
          {children}
        </div>
      </main>

      {/* Add Repository Modal */}
      {isAddModalOpen && (
        <AddRepositoryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
};
