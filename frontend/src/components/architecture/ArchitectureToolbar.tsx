import React, { useState } from 'react';
import {
  Search,
  Filter,
  Maximize2,
  Minimize2,
  RefreshCw,
  Compass,
  ArrowUpDown,
  ArrowLeftRight,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { ARCH_TIERS, RELATIONSHIP_CONFIG } from './constants';

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
}

const NODE_TYPES: { id: string; label: string }[] = [
  { id: 'all', label: 'All Node Types' },
  { id: 'service', label: 'Services' },
  { id: 'api_endpoint', label: 'API Endpoints' },
  { id: 'component', label: 'Components' },
  { id: 'database', label: 'Databases' },
  { id: 'database_model', label: 'DB Models' },
  { id: 'external_service', label: 'External Services' },
  { id: 'queue', label: 'Queues & Workers' },
  { id: 'storage', label: 'Storage' },
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
}) => {
  const [showFiltersModal, setShowFiltersModal] = useState(false);

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

  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* LEFT: Search & Filter Controls */}
      <div className="flex items-center gap-2 pointer-events-auto bg-[#09090b]/90 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-2xl flex-wrap">
        {/* VIEW SELECTOR */}
        {onViewChange && (
          <div className="flex items-center bg-[#141416] p-0.5 rounded-xl border border-[#27272a] text-[11px] font-mono">
            <button
              onClick={() => onViewChange('architecture')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                currentView === 'architecture'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Architecture
            </button>
            <button
              onClick={() => onViewChange('workflow')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                currentView === 'workflow'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Workflow
            </button>
            <button
              onClick={() => onViewChange('sequence')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                currentView === 'sequence'
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sequence
            </button>
            <button
              onClick={() => onViewChange('dataflow')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                currentView === 'dataflow'
                  ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Data Flow
            </button>
            <button
              disabled
              title="Coming Soon"
              className="px-2 py-1 rounded-lg text-zinc-600 cursor-not-allowed hidden sm:inline"
            >
              Lifecycle
            </button>
          </div>
        )}

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search architecture..."
            className="w-40 sm:w-56 bg-[#121214] text-xs text-white placeholder-zinc-500 rounded-xl pl-8 pr-7 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-400/80 font-mono transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Mode Toggle (System vs Full) */}
        <div className="flex items-center bg-[#141416] p-0.5 rounded-xl border border-[#27272a] text-[11px] font-mono">
          <button
            onClick={() => onViewModeChange('system')}
            title="Show system components, services, and APIs"
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'system'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            System
          </button>
          <button
            onClick={() => onViewModeChange('full')}
            title="Show full code topology including utility modules"
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              viewMode === 'full'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Modules
          </button>
        </div>

        {/* Tier Quick Select */}
        <select
          value={selectedTier}
          onChange={(e) => onTierChange(e.target.value)}
          className="bg-[#121214] text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 border border-[#27272a] font-mono focus:outline-none focus:border-amber-400/80 cursor-pointer hidden md:block"
        >
          <option value="all">All Layers</option>
          {Object.entries(ARCH_TIERS).map(([key, cfg]) => (
            <option key={key} value={key}>
              {cfg.label}
            </option>
          ))}
        </select>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFiltersModal((v) => !v)}
          className={`p-1.5 rounded-xl border transition cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
            hasActiveFilters
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-bold'
              : 'bg-[#121214] border-[#27272a] text-zinc-400 hover:text-white'
          }`}
          title="More Filters"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-[10px] font-mono text-zinc-400 hover:text-rose-400 px-1.5 py-1 transition cursor-pointer"
            title="Reset Filters"
          >
            Reset
          </button>
        )}
      </div>

      {/* RIGHT: Actions (Layout Direction, Fit, Rebuild, Fullscreen) */}
      <div className="flex items-center gap-2 pointer-events-auto bg-[#09090b]/90 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-2xl">
        {/* Layout direction */}
        <button
          onClick={onToggleLayoutDirection}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer flex items-center gap-1 text-xs font-mono"
          title={`Switch to ${layoutDirection === 'TB' ? 'Left-to-Right' : 'Top-to-Bottom'} Layout`}
        >
          {layoutDirection === 'TB' ? (
            <>
              <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xl:inline">Vertical</span>
            </>
          ) : (
            <>
              <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden xl:inline">Horizontal</span>
            </>
          )}
        </button>

        {/* Fit to View */}
        <button
          onClick={onFitView}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer"
          title="Fit Graph to Screen"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Rebuild Knowledge Graph */}
        <button
          onClick={onRebuildGraph}
          disabled={isRebuilding}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer flex items-center gap-1.5 text-xs font-mono disabled:opacity-50"
          title="Rebuild Knowledge Graph"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRebuilding ? 'animate-spin' : ''}`} />
          <span className="hidden lg:inline">{isRebuilding ? 'Rebuilding...' : 'Refresh'}</span>
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Filter Popover */}
      {showFiltersModal && (
        <div className="absolute top-14 left-4 z-40 bg-[#0c0c0e] border border-[#27272a] rounded-2xl p-4 shadow-2xl w-80 space-y-3.5 pointer-events-auto text-xs font-mono animate-fadeIn">
          <div className="flex items-center justify-between pb-2 border-b border-[#1f1f23]">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-amber-400" /> Filter Knowledge Graph
            </span>
            <button
              onClick={() => setShowFiltersModal(false)}
              className="text-zinc-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Layer Filter */}
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-semibold block mb-1">
              Architectural Layer
            </label>
            <select
              value={selectedTier}
              onChange={(e) => onTierChange(e.target.value)}
              className="w-full bg-[#141416] text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-400/80 cursor-pointer"
            >
              <option value="all">All Layers</option>
              {Object.entries(ARCH_TIERS).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.label} ({cfg.sub})
                </option>
              ))}
            </select>
          </div>

          {/* Node Type Filter */}
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-semibold block mb-1">
              Entity Type
            </label>
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full bg-[#141416] text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-400/80 cursor-pointer"
            >
              {NODE_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Relationship Filter */}
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-semibold block mb-1">
              Relationship Type
            </label>
            <select
              value={selectedRel}
              onChange={(e) => onRelChange(e.target.value)}
              className="w-full bg-[#141416] text-zinc-200 text-xs rounded-xl px-2.5 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-400/80 cursor-pointer"
            >
              <option value="all">All Relationships</option>
              {Object.keys(RELATIONSHIP_CONFIG).map((rel) => (
                <option key={rel} value={rel}>
                  {rel}
                </option>
              ))}
            </select>
          </div>

          {/* Internal vs External */}
          <div>
            <label className="text-[10px] text-zinc-400 uppercase font-semibold block mb-1">
              Component Scope
            </label>
            <div className="grid grid-cols-3 gap-1 bg-[#141416] p-1 rounded-xl border border-[#27272a]">
              {(['all', 'internal', 'external'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => onScopeChange(s)}
                  className={`py-1 rounded-lg text-center capitalize transition cursor-pointer ${
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

          {/* Active summary */}
          <div className="pt-2 border-t border-[#1f1f23] flex items-center justify-between text-[11px] text-zinc-400">
            <span>Showing {filteredNodesCount} of {totalNodes} nodes ({totalEdges} edges)</span>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-amber-400 hover:text-amber-300 font-bold cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
