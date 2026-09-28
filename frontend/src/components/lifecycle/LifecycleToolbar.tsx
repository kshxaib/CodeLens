import React from 'react';
import { Play, Pause, RotateCcw, Compass, ArrowUpDown, ArrowLeftRight, Maximize2, Minimize2, Download } from 'lucide-react';
import { LIFECYCLE_FILTERS, type LifecycleFilterType } from './constants';
import type { EntityLifecycle } from '../../types';

interface LifecycleToolbarProps {
  currentView?: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange?: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  lifecycles: EntityLifecycle[];
  selectedLifecycleId: string;
  onSelectLifecycle: (id: string) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  activeFilter: LifecycleFilterType;
  onFilterChange: (f: LifecycleFilterType) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetSimulator: () => void;
  currentSimIndex: number;
  totalSimSteps: number;
  layoutDirection: 'LR' | 'TB';
  onToggleLayoutDirection: () => void;
  onFitView: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: () => void;
}

export const LifecycleToolbar: React.FC<LifecycleToolbarProps> = ({
  currentView: _currentView,
  onViewChange: _onViewChange,
  lifecycles,
  selectedLifecycleId,
  onSelectLifecycle,
  searchQuery: _searchQuery,
  onSearchChange: _onSearchChange,
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
      <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-xl flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E2E0D9] bg-white text-xs font-mono font-bold text-[#19243B] shadow-xs">
          <span className="text-[10px] tracking-wider text-[#8A94A6] bg-[#F0EEE9] px-1.5 py-0.5 rounded">T·05</span>
          <span>Lifecycle</span>
        </div>

        {lifecycles.length > 0 && (
          <select
            value={selectedLifecycleId}
            onChange={(e) => onSelectLifecycle(e.target.value)}
            className="bg-white text-[#B45309] text-xs font-bold rounded-xl px-2.5 py-1.5 border border-[#E2E0D9] font-mono focus:outline-none focus:border-amber-500 cursor-pointer max-w-[240px] truncate shadow-sm"
          >
            {lifecycles.map((lc) => (
              <option key={lc.id} value={lc.id} className="bg-white text-[#19243B]">
                {lc.entity_name} ({lc.states?.length || 0} states)
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center gap-1 bg-[#F0EEE9] p-0.5 rounded-xl border border-[#E2E0D9] text-[10px] font-mono hidden md:flex">
          {LIFECYCLE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFilterChange(f.id)}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-white text-[#19243B] font-bold shadow-sm'
                  : 'text-[#526078] hover:text-[#19243B]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#F0EEE9] border border-[#E2E0D9]">
          <button
            onClick={onTogglePlay}
            disabled={totalSimSteps <= 1}
            className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isPlaying
                ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-sm'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
            title={isPlaying ? 'Pause Simulation' : 'Play Lifecycle Simulation'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simulate</span>
              </>
            )}
          </button>

          {totalSimSteps > 1 && (
            <div className="text-[10px] font-mono text-[#526078] px-1 border-l border-[#D5D2CA]">
              <span className="text-amber-700 font-bold">{currentSimIndex + 1}</span>
              <span className="text-[#687184]"> of </span>
              <span>{totalSimSteps}</span>
            </div>
          )}

          <button
            onClick={onResetSimulator}
            className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] transition cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={onToggleLayoutDirection}
          className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer shadow-sm"
          title={`Switch to ${layoutDirection === 'LR' ? 'Top-to-Bottom' : 'Left-to-Right'} layout`}
        >
          {layoutDirection === 'LR' ? (
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-700" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-700" />
          )}
        </button>

        <button
          onClick={onFitView}
          className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer shadow-sm"
          title="Fit to view"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer shadow-sm"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={onExport}
          className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer shadow-sm"
          title="Export Lifecycle State Machine (JSON)"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
