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
  Database,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { DataPipeline } from '../../types';

interface DataFlowToolbarProps {
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  pipelines: DataPipeline[];
  selectedPipelineId: string;
  onSelectPipeline: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (f: string) => void;
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

export const DataFlowToolbar: React.FC<DataFlowToolbarProps> = ({
  currentView,
  onViewChange,
  pipelines,
  selectedPipelineId,
  onSelectPipeline,
  searchQuery,
  onSearchChange,
  classificationFilter,
  onClassificationFilterChange,
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
      {/* LEFT: View Selector & Pipeline Selector & Filters */}
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
            onClick={() => onViewChange('lifecycle')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'lifecycle'
                ? 'bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Lifecycle
          </button>
        </div>

        {/* PIPELINE DROPDOWN SELECTOR */}
        {pipelines.length > 0 && (
          <select
            value={selectedPipelineId}
            onChange={(e) => onSelectPipeline(e.target.value)}
            className="bg-[#121214] text-sky-300 text-xs font-bold rounded-xl px-2.5 py-1.5 border border-sky-500/30 font-mono focus:outline-none focus:border-sky-400 cursor-pointer max-w-[230px] truncate"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id} className="bg-[#121214] text-white">
                {p.name} ({p.nodes?.length || 0} entities)
              </option>
            ))}
          </select>
        )}

        {/* SEARCH INPUT */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search data entities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-[#121214] text-xs text-zinc-200 placeholder-zinc-500 rounded-xl pl-8 pr-2.5 py-1.5 border border-[#27272a] focus:outline-none focus:border-sky-500/50 w-28 sm:w-36 md:w-44 transition font-mono"
          />
        </div>

        {/* CLASSIFICATION FILTERS */}
        <div className="flex items-center bg-[#141416] p-0.5 rounded-xl border border-[#27272a] text-[10px] font-mono hidden lg:flex">
          <button
            onClick={() => onClassificationFilterChange('all')}
            className={`px-2 py-1 rounded-lg cursor-pointer ${
              classificationFilter === 'all'
                ? 'bg-zinc-800 text-white font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onClassificationFilterChange('transformations')}
            className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
              classificationFilter === 'transformations'
                ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            Transforms
          </button>
          <button
            onClick={() => onClassificationFilterChange('models')}
            className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
              classificationFilter === 'models'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Database className="w-3 h-3 text-emerald-400" />
            Models
          </button>
          <button
            onClick={() => onClassificationFilterChange('schemas')}
            className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
              classificationFilter === 'schemas'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3 h-3 text-amber-400" />
            Schemas
          </button>
        </div>
      </div>

      {/* RIGHT: Lineage Simulator Controls + Layout + Export */}
      <div className="flex items-center gap-2 pointer-events-auto bg-[#09090b]/90 backdrop-blur-xl border border-[#1f1f23] p-1.5 rounded-2xl shadow-2xl">
        {/* LINEAGE FLOW SIMULATOR */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#141416] border border-[#27272a]">
          <button
            onClick={onTogglePlay}
            className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
              isPlaying
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'bg-sky-500 hover:bg-sky-400 text-zinc-950 shadow-md'
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
                <span>Trace Lineage</span>
              </>
            )}
          </button>

          <button
            onClick={onResetSimulator}
            className="p-1 rounded-lg text-zinc-400 hover:text-white transition cursor-pointer"
            title="Reset Lineage Animation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {currentStepIndex >= 0 && (
            <span className="text-[10px] font-mono text-sky-400 font-bold pl-1 border-l border-zinc-700">
              Stage {currentStepIndex + 1}/{totalSteps}
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
            <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5 text-amber-400" />
          )}
        </button>

        {/* Fit to View */}
        <button
          onClick={onFitView}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer"
          title="Fit Data Flow to Screen"
        >
          <Compass className="w-3.5 h-3.5 text-sky-400" />
        </button>

        {/* Export JSON */}
        <button
          onClick={onExport}
          className="p-1.5 rounded-xl bg-[#121214] border border-[#27272a] text-zinc-400 hover:text-white hover:border-zinc-500 transition cursor-pointer"
          title="Export Data Flow JSON"
        >
          <Download className="w-3.5 h-3.5 text-sky-400" />
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
