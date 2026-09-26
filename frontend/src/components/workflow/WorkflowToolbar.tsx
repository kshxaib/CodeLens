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
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import type { WorkflowItem } from '../../types';

interface WorkflowToolbarProps {
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  workflows: WorkflowItem[];
  selectedWorkflowId: string;
  onSelectWorkflow: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  pathFilter: 'all' | 'happy' | 'failure';
  onPathFilterChange: (f: 'all' | 'happy' | 'failure') => void;
  // Simulator props
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetSimulator: () => void;
  currentStepIndex: number;
  totalSteps: number;
  // Layout & View props
  layoutDirection: 'TB' | 'LR';
  onToggleLayoutDirection: () => void;
  onFitView: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onExport: () => void;
}

export const WorkflowToolbar: React.FC<WorkflowToolbarProps> = ({
  currentView,
  onViewChange,
  workflows,
  selectedWorkflowId,
  onSelectWorkflow,
  searchQuery,
  onSearchChange,
  pathFilter,
  onPathFilterChange,
  isPlaying,
  onTogglePlay,
  onResetSimulator,
  currentStepIndex,
  totalSteps,
  layoutDirection,
  onToggleLayoutDirection,
  onFitView,
  isFullscreen,
  onToggleFullscreen,
  onExport,
}) => {
  return (
    <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
      {/* LEFT: View Selector & Workflow Selector */}
      <div className="flex items-center gap-2 pointer-events-auto bg-[#09090b]/90 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-2xl flex-wrap">
        {/* VIEW SELECTOR */}
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
            disabled
            title="Coming Soon"
            className="px-2 py-1 rounded-lg text-zinc-600 cursor-not-allowed hidden sm:inline"
          >
            Sequence
          </button>
          <button
            disabled
            title="Coming Soon"
            className="px-2 py-1 rounded-lg text-zinc-600 cursor-not-allowed hidden sm:inline"
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

        {/* WORKFLOW DROPDOWN SELECTOR */}
        {workflows.length > 0 && (
          <select
            value={selectedWorkflowId}
            onChange={(e) => onSelectWorkflow(e.target.value)}
            className="bg-[#121214] text-amber-300 text-xs font-bold rounded-xl px-2.5 py-1.5 border border-amber-500/30 font-mono focus:outline-none focus:border-amber-400 cursor-pointer max-w-[220px] truncate"
          >
            {workflows.map((wf) => (
              <option key={wf.id} value={wf.id} className="bg-[#121214] text-white">
                {wf.name} ({wf.steps?.length || 0} steps)
              </option>
            ))}
          </select>
        )}

        {/* SEARCH INPUT */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search steps..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#121214] text-xs text-zinc-200 placeholder-zinc-500 rounded-xl pl-8 pr-2.5 py-1.5 border border-[#27272a] focus:outline-none focus:border-amber-500/50 w-28 sm:w-36 md:w-44 transition font-mono"
          />
        </div>

        {/* PATH FILTER (Happy Path vs Failure Paths) */}
        <div className="flex items-center bg-[#141416] p-0.5 rounded-xl border border-[#27272a] text-[10px] font-mono hidden md:flex">
          <button
            onClick={() => onPathFilterChange('all')}
            className={`px-2 py-1 rounded-lg cursor-pointer ${
              pathFilter === 'all'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All Paths
          </button>
          <button
            onClick={() => onPathFilterChange('happy')}
            className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
              pathFilter === 'happy'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Happy Path
          </button>
          <button
            onClick={() => onPathFilterChange('failure')}
            className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
              pathFilter === 'failure'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            Failure Paths
          </button>
        </div>
      </div>

      {/* RIGHT: Simulator Controls + Layout + Export */}
      <div className="flex items-center gap-2 pointer-events-auto bg-[#09090b]/90 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-2xl">
        {/* WORKFLOW SIMULATOR CONTROLS */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#141416] border border-[#27272a]">
          <button
            onClick={onTogglePlay}
            className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isPlaying
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md'
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
                <span>Play Flow</span>
              </>
            )}
          </button>

          <button
            onClick={onResetSimulator}
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {currentStepIndex >= 0 && (
            <span className="text-[10px] font-mono text-amber-400 font-bold pl-1 border-l border-zinc-700">
              Step {currentStepIndex + 1}/{totalSteps}
            </span>
          )}
        </div>

        {/* Layout direction */}
        <button
          onClick={onToggleLayoutDirection}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer flex items-center gap-1 text-xs font-mono"
          title={`Switch to ${layoutDirection === 'TB' ? 'Horizontal' : 'Vertical'} Layout`}
        >
          {layoutDirection === 'TB' ? (
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5 text-sky-400" />
          )}
        </button>

        {/* Fit to View */}
        <button
          onClick={onFitView}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer"
          title="Fit Workflow to Screen"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
        </button>

        {/* Export Workflow */}
        <button
          onClick={onExport}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer"
          title="Export Workflow JSON"
        >
          <Download className="w-3.5 h-3.5 text-amber-400" />
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
    </div>
  );
};
