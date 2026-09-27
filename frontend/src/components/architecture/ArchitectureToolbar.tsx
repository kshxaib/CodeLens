
import React from 'react';
import { Search, Maximize2, Minimize2, RefreshCw, Compass, ArrowUpDown, ArrowLeftRight, X, GitBranch, SlidersHorizontal, LayoutGrid, Activity, Database, Globe } from 'lucide-react';
import { CanvasExportMenu } from './CanvasExportMenu';
import type { KnowledgeGraphData } from '../../types';

interface ArchitectureToolbarProps {
  currentView?: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange?: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTier: string;
  onTierChange: (tier: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedRel: string;
  onRelChange: (rel: string) => void;
  scopeFilter: 'all' | 'internal' | 'external';
  onScopeChange: (scope: 'all' | 'internal' | 'external') => void;
  viewMode: 'system' | 'full';
  onViewModeChange: (mode: 'system' | 'full') => void;
  layoutDirection: 'TB' | 'LR';
  onToggleLayoutDirection: () => void;
  onFitView: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onRebuildGraph: () => void;
  isRebuilding?: boolean;
  totalNodes: number;
  totalEdges: number;
  filteredNodesCount: number;
  filteredEdgesCount?: number;
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
  kgData?: KnowledgeGraphData | null;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  repoName?: string;
}

const VIEW_CONFIG = [
  { id: 'architecture' as const, code: 'T·01', label: 'Architecture', icon: LayoutGrid, summary: 'System components & topology' },
  { id: 'workflow' as const, code: 'T·02', label: 'Workflow', icon: Activity, summary: 'Execution lanes & processes' },
  { id: 'sequence' as const, code: 'T·03', label: 'Sequence', icon: GitBranch, summary: 'API call chains & lifelines' },
  { id: 'dataflow' as const, code: 'T·04', label: 'Data Flow', icon: Database, summary: 'Data pipelines & schemas' },
  { id: 'lifecycle' as const, code: 'T·05', label: 'Lifecycle', icon: Globe, summary: 'State machines & outcomes' },
];

export const ArchitectureToolbar: React.FC<ArchitectureToolbarProps> = ({
  currentView = 'architecture',
  searchQuery,
  onSearchChange,
  selectedTier,
  selectedType,
  selectedRel,
  scopeFilter,
  viewMode,
  onViewModeChange,
  layoutDirection,
  onToggleLayoutDirection,
  onFitView,
  isFullscreen,
  onToggleFullscreen,
  onRebuildGraph,
  isRebuilding = false,
  onOpenSidebar,
  isSidebarOpen,
  kgData,
  canvasRef,
  repoName,
}) => {
  const hasActiveFilters =
    selectedTier !== 'all' ||
    selectedType !== 'all' ||
    selectedRel !== 'all' ||
    scopeFilter !== 'all' ||
    searchQuery.trim() !== '';

  const currentViewCfg = VIEW_CONFIG.find(v => v.id === currentView) || VIEW_CONFIG[0];
  const CurrentViewIcon = currentViewCfg.icon;

  return (
    <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none flex-wrap">

      <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-sm">
        {/* Current Active Archetype Badge */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#E2E0D9] text-xs font-mono font-bold shadow-2xs">
          <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#FAF9F5] border border-[#E2E0D9] text-[#19243B] font-bold">
            {currentViewCfg.code}
          </span>
          <CurrentViewIcon className="w-3.5 h-3.5 text-amber-600" />
          <span>{currentViewCfg.label}</span>
        </div>

        <span className="w-px h-4 bg-[#E2E0D9]" />

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#687184] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-32 sm:w-44 bg-[#F8F7F4] text-xs text-[#19243B] placeholder-[#687184] rounded-xl pl-8 pr-7 py-1.5 border border-[#E2E0D9] focus:outline-none focus:border-[#19243B] font-mono transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-[#687184] hover:text-[#19243B] cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* System / Full Mode Toggle */}
        <div className="flex items-center bg-[#F0EEE9] p-0.5 rounded-xl border border-[#E2E0D9]">
          {(['system', 'full'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer capitalize ${
                viewMode === mode
                  ? 'bg-white text-[#19243B] border border-[#E2E0D9] shadow-xs'
                  : 'text-[#526078] hover:text-[#19243B]'
              }`}
            >
              {mode === 'system' ? 'System' : 'Full'}
            </button>
          ))}
        </div>

        {/* Dedicated Filters Drawer Toggle */}
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            title={isSidebarOpen ? 'Close filter & layers panel' : 'Open filter & layers panel'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition cursor-pointer ${
              isSidebarOpen || hasActiveFilters
                ? 'bg-[#111419] text-white border-[#111419] shadow-xs'
                : 'bg-[#F8F7F4] border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#19243B]/30'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-semibold">Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-sm">
        {kgData && (
          <CanvasExportMenu
            kgData={kgData}
            canvasRef={canvasRef!}
            repoName={repoName}
          />
        )}
      </div>

      <div className="flex items-center gap-1 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-sm">
        <button
          onClick={onToggleLayoutDirection}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#F8F7F4] border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#19243B]/30 transition cursor-pointer text-xs font-mono"
          title={`Switch to ${layoutDirection === 'TB' ? 'Horizontal' : 'Vertical'} layout`}
        >
          {layoutDirection === 'TB' ? (
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5 text-sky-600" />
          )}
          <span className="hidden xl:inline text-[10px]">
            {layoutDirection === 'TB' ? 'Vertical' : 'Horizontal'}
          </span>
        </button>

        <button
          onClick={onFitView}
          className="p-1.5 rounded-xl bg-[#F8F7F4] border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#19243B]/30 transition cursor-pointer"
          title="Fit graph to screen"
        >
          <Compass className="w-3.5 h-3.5 text-amber-600" />
        </button>

        <button
          onClick={onRebuildGraph}
          disabled={isRebuilding}
          className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#F8F7F4] border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#19243B]/30 transition cursor-pointer disabled:opacity-40"
          title="Rebuild Knowledge Graph"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-600 ${isRebuilding ? 'animate-spin' : ''}`} />
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl bg-[#F8F7F4] border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#19243B]/30 transition cursor-pointer"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};
