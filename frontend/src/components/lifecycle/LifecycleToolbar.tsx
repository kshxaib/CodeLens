import React from 'react';
import {
  Search,
  Play,
  Pause,
  RotateCcw,
  Compass,
  ArrowUpDown,
  ArrowLeftRight,
  Maximize2,
  Minimize2,
  Download,
} from 'lucide-react';
import { LIFECYCLE_FILTERS, type LifecycleFilterType } from './constants';
import type { EntityLifecycle } from '../../types';

interface LifecycleToolbarProps {
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  lifecycles: EntityLifecycle[];
  selectedLifecycleId: string;
  onSelectLifecycle: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activeFilter: LifecycleFilterType;
  onFilterChange: (f: LifecycleFilterType) => void;
  // Simulator props
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetSimulator: () => void;
  currentSimIndex: number;
  totalSimSteps: number;
  // Layout & View props
  layoutDirection: 'LR' | 'TB';
  onToggleLayoutDirection: () => void;
  onFitView: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: () => void;
}

export const LifecycleToolbar: React.FC<LifecycleToolbarProps> = ({
  currentView,
  onViewChange,
  lifecycles,
  selectedLifecycleId,
  onSelectLifecycle,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  isPlaying,
  onTogglePlay,
  onResetSimulator,
  currentSimIndex,
  totalSimSteps,
  layoutDirection,
  onToggleLayoutDirection,
  onFitView,
  isFullscreen,
  onToggleFullscreen,
  onExport,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* LEFT: View Selector & Entity Selector */}
      <div className="flex items-center gap-2 pointer-events-auto bg-[#09090b]/90 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-2xl flex-wrap">
        {/* VIEW SELECTOR */}
        <div className="flex items-center bg-[#141416] p-0.5 rounded-xl border border-[#27272a] text-[11px] font-mono">
          <button
            onClick={() => onViewChange('architecture')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'architecture'
                ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => onViewChange('workflow')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'workflow'
                ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Workflow
          </button>
          <button
            onClick={() => onViewChange('sequence')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'sequence'
                ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Sequence
          </button>
          <button
            onClick={() => onViewChange('dataflow')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'dataflow'
                ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Data Flow
          </button>
          <button
            onClick={() => onViewChange('lifecycle')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'lifecycle'
                ? 'bg-indigo-500/25 text-indigo-300 font-bold border border-indigo-500/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Lifecycle
          </button>
        </div>

        {/* ENTITY LIFECYCLE DROPDOWN */}
        {lifecycles.length > 0 && (
          <select
            value={selectedLifecycleId}
            onChange={(e) => onSelectLifecycle(e.target.value)}
            className="bg-[#121214] text-indigo-300 text-xs font-bold rounded-xl px-2.5 py-1.5 border border-indigo-500/30 font-mono focus:outline-none focus:border-indigo-400 cursor-pointer max-w-[240px] truncate"
          >
            {lifecycles.map((lc) => (
              <option key={lc.id} value={lc.id} className="bg-[#121214] text-white">
                {lc.entity_name} ({lc.states?.length || 0} states)
              </option>
            ))}
          </select>
        )}

        {/* SEARCH INPUT */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search states, events..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#121214] text-zinc-200 text-xs pl-8 pr-3 py-1.5 rounded-xl border border-[#27272a] focus:outline-none focus:border-indigo-500/50 w-36 sm:w-48 font-mono placeholder:text-zinc-600"
          />
        </div>

        {/* FILTER CHIPS */}
        <div className="flex items-center gap-1 bg-[#141416] p-0.5 rounded-xl border border-[#27272a] text-[10px] font-mono">
          {LIFECYCLE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT: Simulator Controls, Layout & Action Buttons */}
      <div className="flex items-center gap-2 pointer-events-auto bg-[#09090b]/90 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-2xl">
        {/* SIMULATOR CONTROLS */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#141416] border border-[#27272a]">
          <button
            onClick={onTogglePlay}
            disabled={totalSimSteps <= 1}
            className={`p-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.06]'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isPlaying ? 'Pause Simulation' : 'Play Lifecycle Simulation'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span className="text-[10px] font-mono font-bold pr-0.5">
              {isPlaying ? 'Pause' : 'Simulate'}
            </span>
          </button>

          {totalSimSteps > 1 && (
            <div className="text-[10px] font-mono text-zinc-400 px-1 border-l border-zinc-800">
              <span className="text-indigo-400 font-bold">{currentSimIndex + 1}</span>
              <span className="text-zinc-600"> of </span>
              <span>{totalSimSteps}</span>
            </div>
          )}

          <button
            onClick={onResetSimulator}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* LAYOUT DIRECTION TOGGLE */}
        <button
          onClick={onToggleLayoutDirection}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-[#27272a] transition cursor-pointer"
          title={`Switch to ${layoutDirection === 'LR' ? 'Top-to-Bottom' : 'Left-to-Right'} layout`}
        >
          {layoutDirection === 'LR' ? (
            <ArrowUpDown className="w-4 h-4" />
          ) : (
            <ArrowLeftRight className="w-4 h-4" />
          )}
        </button>

        {/* FIT VIEW */}
        <button
          onClick={onFitView}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-[#27272a] transition cursor-pointer"
          title="Fit to view"
        >
          <Compass className="w-4 h-4" />
        </button>

        {/* EXPORT JSON */}
        <button
          onClick={onExport}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-[#27272a] transition cursor-pointer"
          title="Export Lifecycle State Machine (JSON)"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* FULLSCREEN */}
        <button
          onClick={onToggleFullscreen}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-[#27272a] transition cursor-pointer"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
