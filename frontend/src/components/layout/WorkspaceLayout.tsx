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
  const { repositories, selectedRepo } = useWorkspaceStore();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const profileMenuRef = useRef<HTMLDivElement>(null);

  const activeRepo = selectedRepo || repositories[0] || null;

  const handleMouseEnterSidebar = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsSidebarHovered(true);
  };

  const handleMouseLeaveSidebar = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    // Smooth delay before collapsing to prevent accidental jump
    hoverTimeoutRef.current = setTimeout(() => {
      setIsSidebarHovered(false);
    }, 180);
  };

  // Close popups on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
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
    { label: 'Profile & Settings', path: '/profile', icon: UserRoundCog },
  ];

  return (
    <div data-appearance="dark" className="min-h-screen bg-[#000000] text-[#f4f4f5]">
      {/* Sidebar Fixed - Collapsed (w-16) by default, smoothly expands (w-64) on hover */}
      <aside
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        className={`bg-[#050505] border-r border-[#1f1f23] fixed z-40 top-0 bottom-0 left-0 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarHovered ? 'w-64 shadow-[0_0_35px_rgba(0,0,0,0.9)]' : 'w-16 shadow-lg'
        }`}
      >
        {/* Top Brand Logo inside Sidebar */}
        <div className="h-16 flex items-center px-3.5 border-b border-[#1f1f23] shrink-0 overflow-hidden">
          <Link
            to="/dashboard"
            onClick={() => setIsSidebarHovered(false)}
            className="flex items-center gap-3 overflow-hidden group cursor-pointer"
            title="CodeLens Dashboard"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 transition-colors group-hover:bg-amber-500/20">
              <ScanLine className="text-amber-400 size-5" />
            </div>
            <span
              className={`font-semibold text-base tracking-tight text-white whitespace-nowrap transition-all duration-300 origin-left ${
                isSidebarHovered
                  ? 'opacity-100 max-w-[160px] translate-x-0'
                  : 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
              }`}
            >
              CodeLens
            </span>
          </Link>
        </div>

        {/* Navigation Items */}
        <nav aria-label="Primary navigation" className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.label}
                to={item.path}
                onClick={() => setIsSidebarHovered(false)}
                title={!isSidebarHovered ? item.label : undefined}
                className={`rounded-xl text-xs sm:text-sm flex py-2.5 px-2.5 items-center gap-3 transition-colors font-medium relative group/item ${
                  isActive
                    ? 'bg-[#18181b] text-white font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-[#121214]'
                }`}
              >
                {/* Active Accent Indicator */}
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-400 rounded-r" />
                )}

                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <Icon
                    className={`size-4.5 transition-colors ${
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover/item:text-white'
                    }`}
                  />
                </div>

                <span
                  className={`truncate whitespace-nowrap transition-all duration-300 origin-left ${
                    isSidebarHovered
                      ? 'opacity-100 max-w-[180px] translate-x-0'
                      : 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Top Header */}
      <header className="bg-[#050505] text-foreground flex sticky z-30 top-0 pl-20 pr-6 items-center h-16 border-b border-[#1f1f23]">
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
                    OpenAI Key:
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-medium ${
                    user?.has_openai_key || user?.has_gemini_key
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {user?.has_openai_key || user?.has_gemini_key ? 'Configured ✓' : 'Required ⚠'}
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

      {/* Workspace Content - Left margin adjusted to match collapsed sidebar (ml-16) */}
      <main className="ml-16 pt-6 px-6 pb-10 min-h-[calc(100vh-4rem)]">
        <div className="mx-auto flex flex-col gap-6 max-w-[1600px]">
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
