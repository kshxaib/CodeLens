import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FolderGit2, GitBranch, LayoutDashboard, LogOut, MessageCircle, Network, UserRoundCog } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { AddRepositoryModal } from '../repositories/AddRepositoryModal';
import { LogoutConfirmModal } from '../common/LogoutConfirmModal';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const { repositories, selectedRepo } = useWorkspaceStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const location = useLocation();
  const navigate = useNavigate();

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
    hoverTimeoutRef.current = setTimeout(() => {
      setIsSidebarHovered(false);
    }, 180);
  };

  useEffect(() => {
    return () => {
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
    <div className="min-h-screen bg-[#F8F7F4] text-[#19243B]">
      <aside
        onMouseEnter={handleMouseEnterSidebar}
        onMouseLeave={handleMouseLeaveSidebar}
        className={`bg-white border-r border-[#E2E0D9] fixed z-40 top-0 bottom-0 left-0 flex flex-col transition-all duration-300 ease-in-out ${
          isSidebarHovered ? 'w-64 shadow-[0_4px_30px_rgba(25,36,59,0.08)]' : 'w-16 shadow-sm'
        }`}
      >
        <div className="h-16 flex items-center px-4 border-b border-[#E2E0D9] shrink-0 overflow-hidden">
          <Link
            to="/dashboard"
            onClick={() => setIsSidebarHovered(false)}
            className="flex items-center overflow-hidden group cursor-pointer"
            title="CodeLens Dashboard"
          >
            <span
              className="font-bold text-base tracking-tight text-[#19243B] whitespace-nowrap transition-all duration-300 font-mono"
            >
              {isSidebarHovered ? 'CodeLens' : 'CL'}
            </span>
          </Link>
        </div>

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
                    ? 'bg-[#FEF7EC] text-[#B45309] font-semibold border border-amber-200/80 shadow-xs'
                    : 'text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9]'
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r" />
                )}

                <div className="w-7 h-7 flex items-center justify-center shrink-0">
                  <Icon
                    className={`size-4.5 transition-colors ${
                      isActive ? 'text-amber-600' : 'text-[#687184] group-hover/item:text-[#19243B]'
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

        <div className="p-2 border-t border-[#E2E0D9] shrink-0">
          <button
            type="button"
            onClick={() => setIsLogoutModalOpen(true)}
            title={!isSidebarHovered ? 'Log Out' : undefined}
            className="w-full rounded-xl text-xs sm:text-sm flex py-2.5 px-2.5 items-center gap-3 text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
          >
            <div className="w-7 h-7 flex items-center justify-center shrink-0">
              <LogOut className="size-4.5 text-rose-500" />
            </div>
            <span
              className={`truncate whitespace-nowrap transition-all duration-300 origin-left ${
                isSidebarHovered
                  ? 'opacity-100 max-w-[180px] translate-x-0'
                  : 'opacity-0 max-w-0 -translate-x-3 pointer-events-none'
              }`}
            >
              Log Out
            </span>
          </button>
        </div>
      </aside>

      <main className="ml-16 pt-5 px-6 pb-10 min-h-screen bg-[#F8F7F4]">
        <div className="mx-auto flex flex-col gap-6 max-w-[1600px]">
          {children}
        </div>
      </main>

      {isAddModalOpen && (
        <AddRepositoryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(newId) => {
            navigate(`/repository/${newId}`);
          }}
        />
      )}

      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
      />
    </div>
  );
};
