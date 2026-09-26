/**
 * ArchitectureToolbar — Top toolbar for the Architecture Canvas.
 *
 * LEFT GROUP:   View selector · Search · Depth toggle (System / All)
 * CENTER GROUP: Trace · Explain · Export
 * RIGHT GROUP:  Layout direction · Fit view · Rebuild · Fullscreen
 *
 * Active filters shown with subtle amber accent.
 * No flashy decorations — readability first.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Maximize2,
  Minimize2,
  RefreshCw,
  Compass,
  ArrowUpDown,
  ArrowLeftRight,
  X,
  GitBranch,
  Sparkles,
  SlidersHorizontal,
  LayoutGrid,
  Activity,
  Database,
  Globe,
  Cpu,
} from 'lucide-react';
import { ARCH_TIERS, RELATIONSHIP_CONFIG } from './constants';
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
  // Trace & Explain actions
  onOpenTrace?: () => void;
  onOpenExplain?: () => void;
  onOpenSidebar?: () => void;
  isSidebarOpen?: boolean;
  // Export
  kgData?: KnowledgeGraphData | null;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  repoName?: string;
}

const VIEW_CONFIG = [
  { id: 'architecture' as const, label: 'Architecture', icon: LayoutGrid, color: 'amber' },
  { id: 'workflow' as const, label: 'Workflow', icon: Activity, color: 'emerald' },
  { id: 'sequence' as const, label: 'Sequence', icon: GitBranch, color: 'sky' },
  { id: 'dataflow' as const, label: 'Data Flow', icon: Database, color: 'sky' },
  { id: 'lifecycle' as const, label: 'Lifecycle', icon: Globe, color: 'indigo' },
];

const NODE_TYPES = [
  { id: 'all', label: 'All Types' },
  { id: 'service', label: 'Services' },
  { id: 'api_endpoint', label: 'API' },
  { id: 'component', label: 'Components' },
  { id: 'database', label: 'Databases' },
  { id: 'database_model', label: 'Models' },
  { id: 'external_service', label: 'External' },
  { id: 'queue', label: 'Queues' },
  { id: 'module', label: 'Modules' },
];

export const ArchitectureToolbar: React.FC<ArchitectureToolbarProps> = ({
  currentView = 'architecture',
  onViewChange,
  searchQuery,
  onSearchChange,
  selectedTier,
  onTierChange,
  selectedType,
  onTypeChange,
  selectedRel,
  onRelChange,
  scopeFilter,
  onScopeChange,
  viewMode,
  onViewModeChange,
  layoutDirection,
  onToggleLayoutDirection,
  onFitView,
  isFullscreen,
  onToggleFullscreen,
  onRebuildGraph,
  isRebuilding = false,
  totalNodes,
  totalEdges,
  filteredNodesCount,
  filteredEdgesCount,
  onOpenTrace,
  onOpenExplain,
  onOpenSidebar,
  isSidebarOpen,
  kgData,
  canvasRef,
  repoName,
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [showViewPicker, setShowViewPicker] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const viewPickerRef = useRef<HTMLDivElement>(null);

  const hasActiveFilters =
    selectedTier !== 'all' ||
    selectedType !== 'all' ||
    selectedRel !== 'all' ||
    scopeFilter !== 'all' ||
    searchQuery.trim() !== '';

  const clearAllFilters = () => {
    onSearchChange('');
    onTierChange('all');
    onTypeChange('all');
    onRelChange('all');
    onScopeChange('all');
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilters(false);
      }
      if (viewPickerRef.current && !viewPickerRef.current.contains(e.target as Node)) {
        setShowViewPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentViewCfg = VIEW_CONFIG.find(v => v.id === currentView) || VIEW_CONFIG[0];
  const CurrentViewIcon = currentViewCfg.icon;

  return (
    <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between gap-2 pointer-events-none flex-wrap">

      {/* ─── LEFT GROUP ─── */}
      <div className="flex items-center gap-1.5 pointer-events-auto bg-[#09090b]/95 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-xl">

        {/* Sidebar toggle */}
        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isSidebarOpen
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-600'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}

        {/* View Picker Dropdown */}
        {onViewChange && (
          <div className="relative" ref={viewPickerRef}>
            <button
              onClick={() => setShowViewPicker(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                showViewPicker
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-[#121214] border-[#27272a] text-zinc-300 hover:text-white hover:border-zinc-600'
              }`}
            >
              <CurrentViewIcon className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{currentViewCfg.label}</span>
            </button>

            {showViewPicker && (
              <div className="absolute top-full left-0 mt-2 w-44 bg-[#0c0c0e] border border-[#27272a] rounded-xl shadow-2xl overflow-hidden z-50 p-1 space-y-0.5">
                {VIEW_CONFIG.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { onViewChange(id); setShowViewPicker(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition cursor-pointer ${
                      currentView === id
                        ? 'bg-amber-500/15 text-amber-300 font-bold'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <span className="w-px h-4 bg-[#27272a]" />

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-36 sm:w-48 bg-[#121214] text-xs text-white placeholder-zinc-600 rounded-xl pl-8 pr-7 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-400/60 font-mono transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* View mode: System / Full */}
        <div className="flex items-center bg-[#141416] p-0.5 rounded-xl border border-[#27272a]">
          {(['system', 'full'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer capitalize ${
                viewMode === mode
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {mode === 'system' ? 'System' : 'Full'}
            </button>
          ))}
        </div>

        {/* Filter */}
        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition cursor-pointer ${
              hasActiveFilters
                ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 font-bold'
                : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-600'
            }`}
            title="Filters"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
          </button>

          {/* Filter Popover */}
          {showFilters && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-[#0c0c0e] border border-[#27272a] rounded-2xl shadow-2xl w-72 font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f23]">
                <span className="font-bold text-white text-[11px] uppercase tracking-wider">Filters</span>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-amber-400 hover:text-amber-300 text-[10px] cursor-pointer">
                    Clear all
                  </button>
                )}
              </div>
              <div className="p-3 space-y-3">
                {/* Layer */}
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">
                    Architectural Layer
                  </label>
                  <select
                    value={selectedTier}
                    onChange={e => onTierChange(e.target.value)}
                    className="w-full bg-[#141416] text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-400/60 cursor-pointer"
                  >
                    <option value="all">All Layers</option>
                    {Object.entries(ARCH_TIERS).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                {/* Node type */}
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">
                    Node Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={e => onTypeChange(e.target.value)}
                    className="w-full bg-[#141416] text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-400/60 cursor-pointer"
                  >
                    {NODE_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Relationship */}
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">
                    Relationship Type
                  </label>
                  <select
                    value={selectedRel}
                    onChange={e => onRelChange(e.target.value)}
                    className="w-full bg-[#141416] text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-400/60 cursor-pointer"
                  >
                    <option value="all">All Relationships</option>
                    {Object.keys(RELATIONSHIP_CONFIG).map(rel => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>

                {/* Scope */}
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block mb-1.5">
                    Scope
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[#141416] p-1 rounded-xl border border-[#27272a]">
                    {(['all', 'internal', 'external'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => onScopeChange(s)}
                        className={`py-1 rounded-lg text-center capitalize transition cursor-pointer text-[10px] ${
                          scopeFilter === s
                            ? 'bg-amber-400/15 text-amber-300 font-bold border border-amber-400/30'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-[#1f1f23] text-[10px] text-zinc-500">
                Showing {filteredNodesCount}/{totalNodes} nodes
                {filteredEdgesCount !== undefined && `, ${filteredEdgesCount}/${totalEdges} edges`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── CENTER GROUP: Actions ─── */}
      <div className="flex items-center gap-1.5 pointer-events-auto bg-[#09090b]/95 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-xl">
        {onOpenTrace && (
          <button
            onClick={onOpenTrace}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-sky-300 hover:border-sky-500/40 transition cursor-pointer text-xs font-mono"
            title="Open Trace / Explore Panel"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Trace</span>
          </button>
        )}

        {onOpenExplain && (
          <button
            onClick={onOpenExplain}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-amber-300 hover:border-amber-500/40 transition cursor-pointer text-xs font-mono"
            title="Explain selected component"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Explain</span>
          </button>
        )}

        {kgData && (
          <CanvasExportMenu
            kgData={kgData}
            canvasRef={canvasRef!}
            repoName={repoName}
          />
        )}
      </div>

      {/* ─── RIGHT GROUP: Canvas Controls ─── */}
      <div className="flex items-center gap-1 pointer-events-auto bg-[#09090b]/95 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-xl">
        {/* Layout direction */}
        <button
          onClick={onToggleLayoutDirection}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-600 transition cursor-pointer text-xs font-mono"
          title={`Switch to ${layoutDirection === 'TB' ? 'Horizontal' : 'Vertical'} layout`}
        >
          {layoutDirection === 'TB' ? (
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
          )}
          <span className="hidden xl:inline text-[10px]">
            {layoutDirection === 'TB' ? 'Vertical' : 'Horizontal'}
          </span>
        </button>

        {/* Fit view */}
        <button
          onClick={onFitView}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-600 transition cursor-pointer"
          title="Fit graph to screen"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Rebuild */}
        <button
          onClick={onRebuildGraph}
          disabled={isRebuilding}
          className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-600 transition cursor-pointer disabled:opacity-40"
          title="Rebuild Knowledge Graph"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRebuilding ? 'animate-spin' : ''}`} />
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-600 transition cursor-pointer"
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
