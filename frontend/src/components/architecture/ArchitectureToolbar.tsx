
import React, { useState, useRef, useEffect } from 'react';
import { Search, Maximize2, Minimize2, RefreshCw, Compass, ArrowUpDown, ArrowLeftRight, X, GitBranch, Sparkles, SlidersHorizontal, LayoutGrid, Activity, Database, Globe, Cpu } from 'lucide-react';
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
  onOpenTrace?: () => void;
  onOpenExplain?: () => void;
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

      <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-sm">

        {onOpenSidebar && (
          <button
            onClick={onOpenSidebar}
            title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            className={`p-1.5 rounded-xl border transition cursor-pointer ${
              isSidebarOpen
                ? 'bg-amber-50 border-amber-300 text-amber-700'
                : 'bg-[#F8F7F4] border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#19243B]/30'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        )}

        {onViewChange && (
          <div className="relative" ref={viewPickerRef}>
            <button
              onClick={() => setShowViewPicker(v => !v)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold transition cursor-pointer ${
                showViewPicker
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-[#F8F7F4] border-[#E2E0D9] text-[#19243B] hover:border-[#19243B]/30'
              }`}
            >
              <span className="px-1 py-0.5 rounded text-[9px] bg-white border border-[#E2E0D9] text-[#15181B] font-bold">
                {currentViewCfg.code}
              </span>
              <CurrentViewIcon className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden md:inline">{currentViewCfg.label}</span>
            </button>

            {showViewPicker && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-[#E2E0D9] rounded-xl shadow-xl overflow-hidden z-50 p-1.5 space-y-1">
                <div className="px-2 py-1 text-[9.5px] uppercase font-mono font-bold text-[#A19D94] border-b border-[#F0EEE9] mb-1">
                  Diagram Archetypes
                </div>
                {VIEW_CONFIG.map(({ id, code, label, summary, icon: Icon }) => (
                  <button
                    key={id}
                    onClick={() => { onViewChange(id); setShowViewPicker(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-mono transition cursor-pointer text-left ${
                      currentView === id
                        ? 'bg-amber-50 text-amber-900 font-bold border border-amber-200'
                        : 'text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <div>
                        <div className="font-bold leading-tight">{label}</div>
                        <div className="text-[9px] text-[#A19D94] leading-tight font-normal">{summary}</div>
                      </div>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-[#F0EEE9] text-[#60686D]">
                      {code}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <span className="w-px h-4 bg-[#E2E0D9]" />

        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#687184] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-36 sm:w-48 bg-[#F8F7F4] text-xs text-[#19243B] placeholder-[#687184] rounded-xl pl-8 pr-7 py-1.5 border border-[#E2E0D9] focus:outline-none focus:border-amber-500 font-mono transition"
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

        <div className="flex items-center bg-[#F0EEE9] p-0.5 rounded-xl border border-[#E2E0D9]">
          {(['system', 'full'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer capitalize ${
                viewMode === mode
                  ? 'bg-white text-amber-800 border border-amber-300/80 shadow-xs'
                  : 'text-[#526078] hover:text-[#19243B]'
              }`}
            >
              {mode === 'system' ? 'System' : 'Full'}
            </button>
          ))}
        </div>

        <div className="relative" ref={filterRef}>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono transition cursor-pointer ${
              hasActiveFilters
                ? 'bg-amber-50 border-amber-300 text-amber-700 font-bold'
                : 'bg-[#F8F7F4] border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#19243B]/30'
            }`}
            title="Filters"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filter</span>
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />}
          </button>

          {showFilters && (
            <div className="absolute top-full left-0 mt-2 z-50 bg-white border border-[#E2E0D9] rounded-2xl shadow-xl w-72 font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E0D9]">
                <span className="font-bold text-[#19243B] text-[11px] uppercase tracking-wider">Filters</span>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="text-amber-700 hover:text-amber-800 text-[10px] cursor-pointer">
                    Clear all
                  </button>
                )}
              </div>
              <div className="p-3 space-y-3">
                <div>
                  <label className="text-[9px] text-[#526078] uppercase tracking-wider font-bold block mb-1.5">
                    Architectural Layer
                  </label>
                  <select
                    value={selectedTier}
                    onChange={e => onTierChange(e.target.value)}
                    className="w-full bg-[#F8F7F4] text-[#19243B] text-xs rounded-xl px-2.5 py-1.5 border border-[#E2E0D9] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">All Layers</option>
                    {Object.entries(ARCH_TIERS).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-[#526078] uppercase tracking-wider font-bold block mb-1.5">
                    Node Type
                  </label>
                  <select
                    value={selectedType}
                    onChange={e => onTypeChange(e.target.value)}
                    className="w-full bg-[#F8F7F4] text-[#19243B] text-xs rounded-xl px-2.5 py-1.5 border border-[#E2E0D9] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {NODE_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-[#526078] uppercase tracking-wider font-bold block mb-1.5">
                    Relationship Type
                  </label>
                  <select
                    value={selectedRel}
                    onChange={e => onRelChange(e.target.value)}
                    className="w-full bg-[#F8F7F4] text-[#19243B] text-xs rounded-xl px-2.5 py-1.5 border border-[#E2E0D9] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">All Relationships</option>
                    {Object.keys(RELATIONSHIP_CONFIG).map(rel => (
                      <option key={rel} value={rel}>{rel}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-[#526078] uppercase tracking-wider font-bold block mb-1.5">
                    Scope
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[#F0EEE9] p-1 rounded-xl border border-[#E2E0D9]">
                    {(['all', 'internal', 'external'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => onScopeChange(s)}
                        className={`py-1 rounded-lg text-center capitalize transition cursor-pointer text-[10px] ${
                          scopeFilter === s
                            ? 'bg-white text-amber-800 font-bold border border-amber-300 shadow-xs'
                            : 'text-[#526078] hover:text-[#19243B]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="px-4 py-2.5 border-t border-[#E2E0D9] text-[10px] text-[#687184]">
                Showing {filteredNodesCount}/{totalNodes} nodes
                {filteredEdgesCount !== undefined && `, ${filteredEdgesCount}/${totalEdges} edges`}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-sm">
        {onOpenTrace && (
          <button
            onClick={onOpenTrace}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F8F7F4] border border-[#E2E0D9] text-[#526078] hover:text-sky-700 hover:border-sky-300 transition cursor-pointer text-xs font-mono"
            title="Open Trace Panel"
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Trace</span>
          </button>
        )}

        {onOpenExplain && (
          <button
            onClick={onOpenExplain}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#F8F7F4] border border-[#E2E0D9] text-[#526078] hover:text-amber-700 hover:border-amber-300 transition cursor-pointer text-xs font-mono"
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
