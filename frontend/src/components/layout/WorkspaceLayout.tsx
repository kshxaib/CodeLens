import React, { useState, useRef, useEffect } from 'react';
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
  UserRound,
  UserRoundCog,
  Shield,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { AddRepositoryModal } from '../repositories/AddRepositoryModal';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const { user } = useAuthStore();
  const { repositories, selectedRepo, setSelectedRepo } = useWorkspaceStore();
  const [isRepoDropdownOpen, setIsRepoDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const repoMenuRef = useRef<HTMLDivElement>(null);

  const activeRepo = selectedRepo || repositories[0] || null;

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
      if (repoMenuRef.current && !repoMenuRef.current.contains(e.target as Node)) {
        setIsRepoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    <div data-appearance="dark" className="min-h-screen bg-[#000000] text-[#f4f4f5]">
      {/* Top Header */}
      <header className="bg-[#050505] text-foreground flex sticky z-30 top-0 px-6 items-center h-16 border-b border-[#1f1f23]">
        {/* Left Brand */}
        <Link to="/dashboard" className="flex items-center shrink-0 gap-3 w-64">
          <ScanLine className="text-amber-400 size-6" />
          <span className="font-semibold text-lg tracking-tight text-white">
            CodeLens
          </span>
        </Link>

        {/* Center Repository Selector Dropdown */}
        <div className="-translate-x-1/2 flex absolute left-1/2 items-center" ref={repoMenuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRepoDropdownOpen(!isRepoDropdownOpen)}
              className="rounded-lg bg-[#121214] text-[#f4f4f5] text-sm border border-[#1f1f23] hover:border-amber-500/40 flex py-2 px-3 items-center gap-2 transition cursor-pointer"
            >
              <GitBranch className="text-slate-400 size-4" />
              <span className="font-mono text-xs">{activeRepo ? activeRepo.name : 'Select Repository'}</span>
              <ChevronDown className="text-slate-400 size-4" />
            </button>

            {isRepoDropdownOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-64 rounded-xl bg-[#09090b] border border-[#1f1f23] shadow-2xl p-2 z-50 animate-fadeIn">
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
                    className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer hover:bg-[#18181b] transition ${
                      repo.id === activeRepo?.id ? 'bg-[#18181b] text-amber-400 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span className="truncate">{repo.name}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {repo.file_count || 0} files
                    </span>
                  </div>
                ))}
                <div className="pt-2 mt-1 border-t border-[#1f1f23]">
                  <button
                    onClick={() => {
                      setIsRepoDropdownOpen(false);
                      setIsAddModalOpen(true);
                    }}
                    className="w-full text-left text-xs text-amber-400 font-semibold px-2 py-1.5 rounded hover:bg-[#18181b] transition cursor-pointer"
                  >
                    + Connect New Repository
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Only Profile Avatar */}
        <div className="flex ml-auto items-center relative" ref={profileMenuRef}>
          <button
            type="button"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-amber-500/40 transition cursor-pointer focus:outline-none"
            aria-label="User menu"
          >
            <div className="font-medium rounded-full bg-[#121214] text-foreground text-sm flex justify-center items-center size-9 border border-[#1f1f23] overflow-hidden">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
              ) : (
                <UserRound className="size-4 text-amber-400" />
              )}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile Dropdown Popover */}
          {isProfileMenuOpen && (
            <div className="absolute right-0 top-12 w-64 rounded-2xl bg-[#09090b] border border-[#1f1f23] shadow-2xl p-2 z-50 animate-fadeIn">
              {/* User Details Header */}
              <div className="p-3 border-b border-[#1f1f23]">
                <div className="flex items-center gap-3">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="size-9 rounded-full border border-amber-500/30 object-cover" />
                  ) : (
                    <div className="size-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                      {(user?.username || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-white truncate">{user?.username || 'Developer'}</p>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email || 'GitHub User'}</p>
                  </div>
                </div>

                {/* BYOK Status Pill */}
                <div className="mt-2.5 pt-2 border-t border-[#18181b] flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    Gemini Key:
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                    user?.has_gemini_key
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {user?.has_gemini_key ? 'Configured ✓' : 'Required ⚠'}
                  </span>
                </div>
              </div>

              {/* Menu Links */}
              <div className="py-1 space-y-0.5">
                <Link
                  to="/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-300 hover:text-white hover:bg-[#18181b] transition font-medium"
                >
                  <UserRoundCog className="w-4 h-4 text-slate-400" />
                  <span>Profile & Settings</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setIsLogoutModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition font-medium cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Sidebar Fixed */}
      <aside className="bg-[#050505] border-r border-[#1f1f23] fixed z-20 top-16 bottom-0 left-0 pt-5 px-3 pb-5 w-64">
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
                    ? 'bg-[#18181b] text-white border-l-2 border-l-amber-400 font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-[#121214] border-l-2 border-l-transparent'
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
          onSuccess={(newId) => {
            navigate(`/repository/${newId}`);
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
};
