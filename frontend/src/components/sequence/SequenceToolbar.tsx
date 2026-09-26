import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Download,
  Search,
  Network,
  GitBranch,
  ArrowRightLeft,
  Share2,
  RefreshCw,
} from 'lucide-react';
import type { SequenceDiagram } from '../../types';

interface SequenceToolbarProps {
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  sequences: SequenceDiagram[];
  selectedSequenceId: string;
  onSelectSequence: (id: string) => void;
  // Playback simulation
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onResetSimulator: () => void;
  currentStepIndex: number;
  totalSteps: number;
  playbackSpeed: number;
  onChangeSpeed: () => void;
  // Filters & Search
  filterType: 'all' | 'calls' | 'returns' | 'async' | 'errors';
  onFilterChange: (type: 'all' | 'calls' | 'returns' | 'async' | 'errors') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  // Actions
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: () => void;
}

export const SequenceToolbar: React.FC<SequenceToolbarProps> = ({
  currentView,
  onViewChange,
  sequences,
  selectedSequenceId,
  onSelectSequence,
  isPlaying,
  onTogglePlay,
  onStepNext,
  onStepPrev,
  onResetSimulator,
  currentStepIndex,
  totalSteps,
  playbackSpeed,
  onChangeSpeed,
  filterType,
  onFilterChange,
  searchQuery,
  onSearchChange,
  isFullscreen,
  onToggleFullscreen,
  onExport,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-none select-none">
      {/* Top Row: View Selector + Sequence Dropdown + Search + Filters */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: View Selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0c0c0e]/90 backdrop-blur-xl border border-[#1f1f23] shadow-2xl pointer-events-auto">
          <button
            onClick={() => onViewChange('architecture')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              currentView === 'architecture'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>

          <button
            onClick={() => onViewChange('workflow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              currentView === 'workflow'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            <span>Workflow</span>
          </button>

          <button
            onClick={() => onViewChange('sequence')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              currentView === 'sequence'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-sky-400" />
            <span>Sequence</span>
          </button>

          <button
            onClick={() => onViewChange('dataflow')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
              currentView === 'dataflow'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Data Flow</span>
          </button>

          <button
            disabled
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-medium text-zinc-600 cursor-not-allowed opacity-50"
            title="Lifecycle View (Coming Soon)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Lifecycle</span>
          </button>
        </div>

        {/* Center: Sequence Selector Dropdown */}
        {sequences.length > 0 && (
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[#0c0c0e]/90 backdrop-blur-xl border border-[#1f1f23] shadow-2xl pointer-events-auto">
            <span className="text-[11px] font-mono font-medium text-zinc-400 pl-2 shrink-0">
              Sequence:
            </span>
            <select
              value={selectedSequenceId}
              onChange={(e) => onSelectSequence(e.target.value)}
              className="bg-transparent text-white font-mono text-xs font-semibold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer hover:bg-white/[0.04] max-w-[260px] truncate"
            >
              {sequences.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#121215] text-white">
                  {s.title} ({s.total_steps} steps)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Right: Search + Interaction Type Filters */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Search Box */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-[#0c0c0e]/90 backdrop-blur-xl border border-[#1f1f23] shadow-2xl">
            <Search className="w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search steps..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent text-white text-xs font-mono outline-none w-28 focus:w-40 transition-all placeholder:text-zinc-600"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0c0c0e]/90 backdrop-blur-xl border border-[#1f1f23] shadow-2xl">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'calls', label: 'Calls' },
                { id: 'returns', label: 'Returns' },
                { id: 'async', label: 'Async' },
                { id: 'errors', label: 'Errors' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => onFilterChange(f.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition cursor-pointer ${
                  filterType === f.id
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Step Simulation Controls + Utility Actions */}
      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        {/* Playback Simulator Controller */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0c0c0e]/90 backdrop-blur-xl border border-[#1f1f23] shadow-2xl">
          {/* Step Back */}
          <button
            onClick={onStepPrev}
            disabled={currentStepIndex <= 0}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Previous Step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause */}
          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400'
                : 'bg-sky-500 text-white hover:bg-sky-400'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play Sequence</span>
              </>
            )}
          </button>

          {/* Step Forward */}
          <button
            onClick={onStepNext}
            disabled={currentStepIndex >= totalSteps - 1}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Next Step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Step Index Counter */}
          <div className="px-2 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700/60 text-[11px] font-mono text-zinc-200">
            {currentStepIndex >= 0 ? `Step ${currentStepIndex + 1} / ${totalSteps}` : `0 / ${totalSteps} Steps`}
          </div>

          {/* Speed Toggle */}
          <button
            onClick={onChangeSpeed}
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-zinc-400 hover:text-white hover:bg-white/[0.06] border border-zinc-800 transition cursor-pointer"
            title="Change Playback Speed"
          >
            {playbackSpeed}x
          </button>

          {/* Reset */}
          <button
            onClick={onResetSimulator}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Actions: Export + Fullscreen */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0c0c0e]/90 backdrop-blur-xl border border-[#1f1f23] shadow-2xl">
          <button
            onClick={onExport}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            title="Export Sequence JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
