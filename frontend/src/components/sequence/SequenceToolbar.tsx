import React from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Maximize2, Minimize2, Download, Compass } from 'lucide-react';
import type { SequenceDiagram } from '../../types';

interface SequenceToolbarProps {
  currentView?: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange?: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  sequences: SequenceDiagram[];
  selectedSequenceId: string;
  onSelectSequence: (id: string) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepNext: () => void;
  onStepPrev: () => void;
  onResetSimulator: () => void;
  currentStepIndex: number;
  totalSteps: number;
  playbackSpeed: number;
  onChangeSpeed: () => void;
  filterType: 'all' | 'calls' | 'returns' | 'async' | 'errors';
  onFilterChange: (type: 'all' | 'calls' | 'returns' | 'async' | 'errors') => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: () => void;
  onFitView?: () => void;
}

export const SequenceToolbar: React.FC<SequenceToolbarProps> = ({
  currentView: _currentView,
  onViewChange: _onViewChange,
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
  searchQuery: _searchQuery,
  onSearchChange: _onSearchChange,
  isFullscreen,
  onToggleFullscreen,
  onExport,
  onFitView,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none select-none">
      {/* Left Card: Badge, Sequence Selector & Filters */}
      <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-xl flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E2E0D9] bg-white text-xs font-mono font-bold text-[#19243B] shadow-xs">
          <span className="text-[10px] tracking-wider text-[#8A94A6] bg-[#F0EEE9] px-1.5 py-0.5 rounded">T·03</span>
          <span>Sequence</span>
        </div>

        {sequences.length > 0 && (
          <select
            value={selectedSequenceId}
            onChange={(e) => onSelectSequence(e.target.value)}
            className="bg-white text-[#B45309] text-xs font-bold rounded-xl px-2.5 py-1.5 border border-[#E2E0D9] font-mono focus:outline-none focus:border-amber-500 cursor-pointer max-w-[220px] truncate shadow-sm"
          >
            {sequences.map((s) => (
              <option key={s.id} value={s.id} className="bg-white text-[#19243B]">
                {s.title} ({s.total_steps} steps)
              </option>
            ))}
          </select>
        )}

        <div className="flex items-center bg-[#F0EEE9] p-0.5 rounded-xl border border-[#E2E0D9] text-[10px] font-mono hidden md:flex">
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
              className={`px-2.5 py-1 rounded-lg cursor-pointer transition ${
                filterType === f.id
                  ? 'bg-white text-[#19243B] font-bold shadow-sm'
                  : 'text-[#526078] hover:text-[#19243B]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Right Card: Simulator Controls, Fit, Fullscreen, Export */}
      <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#F0EEE9] border border-[#E2E0D9]">
          <button
            onClick={onStepPrev}
            disabled={currentStepIndex <= 0}
            className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Previous Step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isPlaying
                ? 'bg-rose-50 text-rose-800 border border-rose-200 shadow-sm'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
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

          <button
            onClick={onStepNext}
            disabled={currentStepIndex >= totalSteps - 1}
            className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Next Step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <span className="text-[10px] font-mono text-amber-700 font-bold px-1.5 py-0.5 rounded bg-white/70 border border-[#E2E0D9]">
            {currentStepIndex >= 0 ? `${currentStepIndex + 1}/${totalSteps}` : `0/${totalSteps}`}
          </span>

          <button
            onClick={onChangeSpeed}
            className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-[#526078] hover:text-[#19243B] hover:bg-white transition cursor-pointer"
            title="Change Playback Speed"
          >
            {playbackSpeed}x
          </button>

          <button
            onClick={onResetSimulator}
            className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] transition cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {onFitView && (
          <button
            onClick={onFitView}
            className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer shadow-sm"
            title="Fit / Center Sequence"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>
        )}

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
          title="Export Sequence JSON"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
