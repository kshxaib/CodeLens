import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Code2,
  LayoutDashboard,
  FolderGit2,
  Network,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { GithubIcon } from '../common/Icons';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';

interface NavbarProps {
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, loginWithGitHub, logout } = useAuth();
  const { selectedRepo } = useWorkspace();
  const location = useLocation();

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Repositories', path: '/repositories', icon: FolderGit2 },
    {
      label: 'Architecture',
      path: selectedRepo ? `/repository/${selectedRepo.id}/architecture` : '/repositories',
      icon: Network,
    },
    {
      label: 'AI Copilot',
      path: selectedRepo ? `/chat?repository=${selectedRepo.id}` : '/repositories',
      icon: MessageSquare,
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/[0.08] bg-[#0a0c10]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo & Mobile Sidebar Toggle */}
        <div className="flex items-center gap-4">
          {user && (
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition"
              aria-label="Toggle navigation"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}

          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl gradient-purple-blue flex items-center justify-center text-white shadow-lg glow-purple transition group-hover:scale-105">
              <Code2 className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-1.5">
                CodeLens
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  AI Copilot
                </span>
              </span>
            </div>
          </Link>

          {/* Active Repo Pill (Desktop) */}
          {selectedRepo && user && (
            <div className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-white/[0.08] text-xs">
              <span className="text-slate-500">Active Repo:</span>
              <Link
                to={`/repository/${selectedRepo.id}`}
                className="font-medium text-slate-200 hover:text-purple-300 transition flex items-center gap-1.5 px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06]"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-purple-400" />
                {selectedRepo.name}
              </Link>
            </div>
          )}
        </div>

        {/* Center: Desktop Navigation Links */}
        {user && (
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path || location.pathname.startsWith(link.path + '/');
              return (
                <Link
                  key={link.label}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
                      ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* Right: Auth Controls / User Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <Link
                to="/profile"
                className={`flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-lg border transition ${
                  location.pathname === '/profile'
                    ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                    : 'bg-white/[0.03] border-white/[0.08] hover:border-white/[0.15] text-slate-300'
                }`}
              >
                {user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-7 h-7 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center text-xs font-semibold text-purple-300">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-medium">{user.username}</span>
                <Settings className="w-3.5 h-3.5 text-slate-400 hidden sm:inline" />
              </Link>

              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3.5 py-2 rounded-lg hover:bg-white/[0.05] transition"
              >
                Sign In
              </Link>
              <button
                onClick={loginWithGitHub}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium px-4 py-2 rounded-lg shadow-lg glow-purple transition cursor-pointer"
              >
                <GithubIcon className="w-4 h-4" />
                <span>Connect GitHub</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
