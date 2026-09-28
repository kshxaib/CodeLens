import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Layers, UserRoundCog, ChevronDown, ChevronUp } from 'lucide-react';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { useAuthStore } from '../../store/useAuthStore';
import { AddRepositoryModal } from '../repositories/AddRepositoryModal';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
}

const ARCHITECTURE_VIEWS = [
  { id: 'architecture', label: 'Architecture', code: 'T·01' },
  { id: 'workflow', label: 'Workflow', code: 'T·02' },
  { id: 'sequence', label: 'Sequence', code: 'T·03' },
  { id: 'dataflow', label: 'Data Flow', code: 'T·04' },
  { id: 'lifecycle', label: 'Lifecycle', code: 'T·05' },
];

export const WorkspaceLayout: React.FC<WorkspaceLayoutProps> = ({ children }) => {
  const { repositories, selectedRepo } = useWorkspaceStore();
  const { user } = useAuthStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const activeRepo = selectedRepo || repositories[0] || null;
  const isArchitectureRoute = location.pathname.includes('/architecture');
  const isChatRoute = location.pathname.startsWith('/chat');
  const searchParams = new URLSearchParams(location.search);
  const currentSubView = searchParams.get('view') || 'architecture';
  const [isViewsExpanded, setIsViewsExpanded] = useState(true);

  return (
    <div className="min-h-screen bg-[#F8F7F4] text-[#19243B]">
      {/* Auto Hover Sidebar */}
      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`bg-white border-r border-[#E2E0D9] fixed z-40 top-0 bottom-0 left-0 flex flex-col transition-all duration-300 ease-in-out ${
          isHovered
            ? 'w-72 shadow-[0_8px_38px_rgba(25,36,59,0.18)]'
            : 'w-16 shadow-[0_2px_10px_rgba(25,36,59,0.04)]'
        }`}
      >
        {/* Header Logo */}
        <div className="h-16 flex items-center px-4 border-b border-[#E2E0D9] shrink-0 overflow-hidden">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5 group cursor-pointer"
            title="CodeLens Dashboard"
          >
            <div className="w-8 h-8 rounded-xl bg-[#111419] flex items-center justify-center text-white font-mono font-bold text-xs shadow-xs shrink-0">
              CL
            </div>
            <span
              className={`font-bold text-base tracking-tight text-[#19243B] font-mono whitespace-nowrap transition-all duration-200 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
              }`}
            >
              CodeLens
            </span>
          </Link>
        </div>

        {/* Primary Navigation */}
        <nav aria-label="Primary navigation" className="flex-1 py-4 px-2 space-y-1.5 overflow-y-auto overflow-x-hidden">
          {/* Dashboard Item */}
          <Link
            to="/dashboard"
            title={!isHovered ? 'Dashboard' : undefined}
            className={`rounded-xl text-xs sm:text-sm flex py-2 px-2 items-center gap-2.5 transition-colors font-medium relative group/item ${
              location.pathname === '/dashboard'
                ? 'bg-[#FEF7EC] text-[#B45309] font-semibold border border-amber-200/80 shadow-xs'
                : 'text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9]'
            }`}
          >
            {location.pathname === '/dashboard' && (
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r" />
            )}

            <div className="w-8 h-7 flex items-center justify-center shrink-0">
              <LayoutDashboard
                className={`size-4.5 transition-colors ${
                  location.pathname === '/dashboard' ? 'text-amber-600' : 'text-[#687184] group-hover/item:text-[#19243B]'
                }`}
              />
            </div>

            <span
              className={`whitespace-nowrap transition-all duration-200 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
              }`}
            >
              Dashboard
            </span>
          </Link>

          {/* Views Collapsible Group */}
          <div>
            <div
              title={!isHovered ? 'Views' : undefined}
              className={`rounded-xl text-xs sm:text-sm flex py-2 px-2 items-center justify-between transition-colors font-medium relative group/item cursor-pointer select-none ${
                isArchitectureRoute
                  ? 'bg-[#FEF7EC] text-[#B45309] font-semibold border border-amber-200/80 shadow-xs'
                  : 'text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9]'
              }`}
              onClick={() => {
                if (isHovered) {
                  setIsViewsExpanded((prev) => !prev);
                }
              }}
            >
              {isArchitectureRoute && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r" />
              )}

              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-7 flex items-center justify-center shrink-0">
                  <Layers
                    className={`size-4.5 transition-colors ${
                      isArchitectureRoute ? 'text-amber-600' : 'text-[#687184] group-hover/item:text-[#19243B]'
                    }`}
                  />
                </div>

                <span
                  className={`whitespace-nowrap transition-all duration-200 ${
                    isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
                  }`}
                >
                  Views
                </span>
              </div>

              {isHovered && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsViewsExpanded((prev) => !prev);
                  }}
                  className="p-1 rounded-md text-[#687184] hover:text-[#19243B] transition cursor-pointer"
                  title={isViewsExpanded ? 'Collapse views' : 'Expand views'}
                >
                  {isViewsExpanded ? (
                    <ChevronUp className="size-3.5" />
                  ) : (
                    <ChevronDown className="size-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Tree Branch Sub-Items */}
            {isHovered && isViewsExpanded && (
              <div className="ml-4 pl-3 my-1.5 relative border-l border-[#E2E0D9] space-y-1 transition-all duration-200">
                {ARCHITECTURE_VIEWS.map((sub) => {
                  const isSubActive = isArchitectureRoute && currentSubView === sub.id;
                  const targetPath = sub.id === 'architecture'
                    ? (activeRepo ? `/repository/${activeRepo.id}/architecture` : '/architecture')
                    : (activeRepo ? `/repository/${activeRepo.id}/architecture?view=${sub.id}` : `/architecture?view=${sub.id}`);

                  return (
                    <div key={sub.id} className="relative group/tree">
                      {/* Branch connector curve from vertical tree line to item */}
                      <div className="absolute -left-[13px] top-[14px] w-2.5 h-2.5 border-b border-l border-[#E2E0D9] rounded-bl-md pointer-events-none group-hover/tree:border-[#19243B]/40 transition-colors" />

                      <Link
                        to={targetPath}
                        className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer ${
                          isSubActive
                            ? 'bg-white text-[#19243B] font-bold shadow-xs border border-[#E2E0D9]'
                            : 'text-[#526078] hover:text-[#19243B] hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <span className="whitespace-nowrap font-medium">{sub.label}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ml-2 ${
                            isSubActive
                              ? 'bg-[#111419] text-white'
                              : 'bg-[#F0EEE9] text-[#687184]'
                          }`}
                        >
                          {sub.code}
                        </span>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* Bottom Profile & Settings Link */}
        <div className="p-2 border-t border-[#E2E0D9] shrink-0 overflow-hidden">
          <Link
            to="/profile"
            title={!isHovered ? (user?.username ? `@${user.username}` : 'Profile') : undefined}
            className={`w-full rounded-xl text-xs sm:text-sm flex py-2 px-2 items-center gap-2.5 transition-colors font-medium cursor-pointer relative group/profile ${
              location.pathname === '/profile'
                ? 'bg-[#FEF7EC] text-[#B45309] font-semibold border border-amber-200/80 shadow-xs'
                : 'text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9]'
            }`}
          >
            {location.pathname === '/profile' && (
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-amber-500 rounded-r" />
            )}

            <div className="w-8 h-7 flex items-center justify-center shrink-0">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.username || 'User avatar'}
                  className="size-6.5 rounded-full object-cover border border-[#E2E0D9]"
                />
              ) : (
                <div className="size-6.5 rounded-full bg-[#FAF9F5] border border-[#E2E0D9] flex items-center justify-center text-[#526078]">
                  <UserRoundCog className="size-4" />
                </div>
              )}
            </div>

            <div
              className={`flex flex-col min-w-0 transition-all duration-200 ${
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3 pointer-events-none'
              }`}
            >
              <span className="text-xs font-semibold text-[#19243B] truncate leading-tight">
                {user?.username ? `@${user.username}` : 'Profile'}
              </span>
              <span className="text-[10px] text-[#687184] truncate leading-tight font-mono">
                Settings
              </span>
            </div>
          </Link>
        </div>
      </aside>

      <main
        className={
          isArchitectureRoute || isChatRoute
            ? 'p-2.5 sm:p-3 h-screen flex flex-col bg-[#F8F7F4] ml-16 overflow-hidden'
            : 'pt-5 px-6 pb-10 min-h-screen bg-[#F8F7F4] ml-16'
        }
      >
        <div
          className={
            isArchitectureRoute || isChatRoute
              ? 'flex-1 min-h-0 w-full flex flex-col'
              : 'mx-auto flex flex-col gap-6 max-w-[1600px]'
          }
        >
          {children}
        </div>
      </main>

      {isAddModalOpen && (
        <AddRepositoryModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={(newId) => {
            navigate(`/repository/${newId}/architecture`);
          }}
        />
      )}
    </div>
  );
};
