import React from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, Maximize2, Minimize2, Download, Search } from 'lucide-react';
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
  searchQuery: string;
  onSearchChange: (q: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: () => void;
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
  searchQuery,
  onSearchChange,
  isFullscreen,
  onToggleFullscreen,
  onExport,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-none select-none">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#E2E0D9] bg-white text-xs font-mono font-bold text-[#19243B] shadow-xs pointer-events-auto">
          <span className="text-[10px] tracking-wider text-[#8A94A6] bg-[#F0EEE9] px-1.5 py-0.5 rounded">T·03</span>
          <span>Sequence</span>
        </div>

        {sequences.length > 0 && (
          <div className="flex items-center gap-2 p-1 rounded-xl bg-white/95 backdrop-blur-xl border border-[#E2E0D9] shadow-xl pointer-events-auto">
            <span className="text-[11px] font-mono font-medium text-[#526078] pl-2 shrink-0">
              Sequence:
            </span>
            <select
              value={selectedSequenceId}
              onChange={(e) => onSelectSequence(e.target.value)}
              className="bg-transparent text-[#19243B] font-mono text-xs font-semibold px-2 py-1 rounded-lg border-0 outline-none cursor-pointer hover:bg-[#F0EEE9] max-w-[260px] truncate"
            >
              {sequences.map((s) => (
                <option key={s.id} value={s.id} className="bg-white text-[#19243B]">
                  {s.title} ({s.total_steps} steps)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/95 backdrop-blur-xl border border-[#E2E0D9] shadow-xl">
            <Search className="w-3.5 h-3.5 text-[#687184]" />
            <input
              type="text"
              placeholder="Search steps..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="bg-transparent text-[#19243B] text-xs font-mono outline-none w-28 focus:w-40 transition-all placeholder:text-[#687184]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/95 backdrop-blur-xl border border-[#E2E0D9] shadow-xl">
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
                    ? 'bg-amber-50 text-[#B45309] border border-amber-200 font-bold shadow-sm'
                    : 'text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pointer-events-auto">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/95 backdrop-blur-xl border border-[#E2E0D9] shadow-xl">
          <button
            onClick={onStepPrev}
            disabled={currentStepIndex <= 0}
            className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Previous Step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
              isPlaying
                ? 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'
                : 'bg-amber-600 text-white hover:bg-amber-700 shadow-sm'
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
            className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            title="Next Step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <div className="px-2 py-0.5 rounded-md bg-[#F0EEE9] border border-[#E2E0D9] text-[11px] font-mono text-[#19243B] font-semibold">
            {currentStepIndex >= 0 ? `Step ${currentStepIndex + 1} / ${totalSteps}` : `0 / ${totalSteps} Steps`}
          </div>

          <button
            onClick={onChangeSpeed}
            className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] border border-[#E2E0D9] transition cursor-pointer"
            title="Change Playback Speed"
          >
            {playbackSpeed}x
          </button>

          <button
            onClick={onResetSimulator}
            className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/95 backdrop-blur-xl border border-[#E2E0D9] shadow-xl">
          <button
            onClick={onExport}
            className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
            title="Export Sequence JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleFullscreen}
            className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
