import React from 'react';
import { Search, Play, Pause, RotateCcw, Compass, ArrowUpDown, ArrowLeftRight, Maximize2, Minimize2, Download, Database, Sparkles, Layers } from 'lucide-react';
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
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetSimulator: () => void;
  currentStepIndex: number;
  totalSteps: number;
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
      <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-xl flex-wrap">
        <div className="flex items-center bg-[#F0EEE9] p-0.5 rounded-xl border border-[#E2E0D9] text-[11px] font-mono">
          <button
            onClick={() => onViewChange('architecture')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'architecture'
                ? 'bg-white text-[#B45309] font-bold border border-amber-200 shadow-sm'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => onViewChange('workflow')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'workflow'
                ? 'bg-white text-[#B45309] font-bold border border-amber-200 shadow-sm'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            Workflow
          </button>
          <button
            onClick={() => onViewChange('sequence')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'sequence'
                ? 'bg-white text-[#B45309] font-bold border border-amber-200 shadow-sm'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            Sequence
          </button>
          <button
            onClick={() => onViewChange('dataflow')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'dataflow'
                ? 'bg-white text-[#B45309] font-bold border border-amber-200 shadow-sm'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            Data Flow
          </button>
          <button
            onClick={() => onViewChange('lifecycle')}
            className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
              currentView === 'lifecycle'
                ? 'bg-white text-[#B45309] font-bold border border-amber-200 shadow-sm'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            Lifecycle
          </button>
        </div>

        {pipelines.length > 0 && (
          <select
            value={selectedPipelineId}
            onChange={(e) => onSelectPipeline(e.target.value)}
            className="bg-white text-[#B45309] text-xs font-bold rounded-xl px-2.5 py-1.5 border border-[#E2E0D9] font-mono focus:outline-none focus:border-amber-500 cursor-pointer max-w-[230px] truncate shadow-sm"
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id} className="bg-white text-[#19243B]">
                {p.name} ({p.nodes?.length || 0} entities)
              </option>
            ))}
          </select>
        )}

        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-[#687184] absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search data entities..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-white text-xs text-[#19243B] placeholder-[#687184] rounded-xl pl-8 pr-2.5 py-1.5 border border-[#E2E0D9] focus:outline-none focus:border-amber-500 w-28 sm:w-36 md:w-44 transition font-mono shadow-sm"
          />
        </div>

        <div className="flex items-center bg-[#F0EEE9] p-0.5 rounded-xl border border-[#E2E0D9] text-[10px] font-mono hidden lg:flex">
          <button
            onClick={() => onClassificationFilterChange('all')}
            className={`px-2 py-1 rounded-lg cursor-pointer ${
              classificationFilter === 'all'
                ? 'bg-white text-[#19243B] font-bold shadow-sm'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            All
          </button>
          <button
            onClick={() => onClassificationFilterChange('transformations')}
            className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
              classificationFilter === 'transformations'
                ? 'bg-purple-50 text-purple-800 font-bold border border-purple-200'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            <Sparkles className="w-3 h-3 text-purple-600" />
            Transforms
          </button>
          <button
            onClick={() => onClassificationFilterChange('models')}
            className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
              classificationFilter === 'models'
                ? 'bg-emerald-50 text-emerald-800 font-bold border border-emerald-200'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            <Database className="w-3 h-3 text-emerald-600" />
            Models
          </button>
          <button
            onClick={() => onClassificationFilterChange('schemas')}
            className={`px-2 py-1 rounded-lg cursor-pointer flex items-center gap-1 ${
              classificationFilter === 'schemas'
                ? 'bg-amber-50 text-amber-800 font-bold border border-amber-200'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            <Layers className="w-3 h-3 text-amber-600" />
            Schemas
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xl border border-[#E2E0D9] p-1.5 rounded-2xl shadow-xl">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#F0EEE9] border border-[#E2E0D9]">
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
                <span>Trace Lineage</span>
              </>
            )}
          </button>

          <button
            onClick={onResetSimulator}
            className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] transition cursor-pointer"
            title="Reset Lineage Animation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {currentStepIndex >= 0 && (
            <span className="text-[10px] font-mono text-amber-700 font-bold pl-1 border-l border-[#D5D2CA]">
              Stage {currentStepIndex + 1}/{totalSteps}
            </span>
          )}
        </div>

        <button
          onClick={onToggleLayoutDirection}
          className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer flex items-center gap-1 text-xs font-mono shadow-sm"
          title={`Switch to ${layoutDirection === 'TB' ? 'Horizontal' : 'Vertical'} Layout`}
        >
          {layoutDirection === 'TB' ? (
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-700" />
          ) : (
            <ArrowLeftRight className="w-3.5 h-3.5 text-sky-700" />
          )}
        </button>

        <button
          onClick={onFitView}
          className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer shadow-sm"
          title="Fit Data Flow to Screen"
        >
          <Compass className="w-3.5 h-3.5 text-amber-700" />
        </button>

        <button
          onClick={onExport}
          className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer shadow-sm"
          title="Export Data Flow JSON"
        >
          <Download className="w-3.5 h-3.5 text-amber-700" />
        </button>

        <button
          onClick={onToggleFullscreen}
          className="p-1.5 rounded-xl bg-white border border-[#E2E0D9] text-[#526078] hover:text-[#19243B] hover:border-[#D5D2CA] transition cursor-pointer shadow-sm"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
};
