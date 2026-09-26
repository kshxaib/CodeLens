import React from 'react';
import {
  X,
  ExternalLink,
  ChevronRight,
  FileCode2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { getStateTypeCfg } from './constants';
import type { LifecycleState, LifecycleTransition } from '../../types';

interface LifecycleInspectorProps {
  selectedState: LifecycleState | null;
  selectedTransition: LifecycleTransition | null;
  allStates: LifecycleState[];
  transitions: LifecycleTransition[];
  onClose: () => void;
  onSelectState: (stateName: string) => void;
  onSelectTransition: (transition: LifecycleTransition) => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const LifecycleInspector: React.FC<LifecycleInspectorProps> = ({
  selectedState,
  selectedTransition,
  allStates,
  transitions,
  onClose,
  onSelectState,
  onSelectTransition,
  onOpenSource,
}) => {
  if (!selectedState && !selectedTransition) return null;

  // Render Transition Inspector
  if (selectedTransition) {

    return (
      <div className="flex flex-col h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl overflow-hidden min-w-[360px] max-w-[400px] z-30 select-text">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]/80 backdrop-blur-md flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
                <Zap className="w-3 h-3 text-indigo-400" />
                State Transition
              </span>
              {selectedTransition.is_retry && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  Retry Loop
                </span>
              )}
              {selectedTransition.is_failure && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  Failure Branch
                </span>
              )}
            </div>

            <h2 className="text-base font-bold text-white font-mono break-all leading-tight">
              {selectedTransition.event}
            </h2>
            <p className="text-[11px] font-mono text-zinc-400 mt-1 flex items-center gap-1.5">
              <span className="text-sky-300">
                {allStates.find((s) => s.id === selectedTransition.from_state || s.name === selectedTransition.from_state)?.name || selectedTransition.from_state}
              </span>
              <ArrowRight className="w-3 h-3 text-zinc-500 shrink-0" />
              <span className="text-emerald-300">
                {allStates.find((s) => s.id === selectedTransition.to_state || s.name === selectedTransition.to_state)?.name || selectedTransition.to_state}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition cursor-pointer shrink-0"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
          {/* Quick Action: Open Source */}
          {selectedTransition.evidence && (
            <button
              onClick={() =>
                onOpenSource(selectedTransition.evidence!.file_path, {
                  start: selectedTransition.evidence!.start_line,
                  end: selectedTransition.evidence!.end_line,
                })
              }
              className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-indigo-500/15 to-indigo-600/10 hover:from-indigo-500/25 hover:to-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-between transition cursor-pointer shadow-md group"
            >
              <div className="flex items-center gap-2 truncate">
                <FileCode2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate text-xs">
                  {selectedTransition.evidence.file_path.split(/[/\\]/).pop()}:
                  {selectedTransition.evidence.start_line}-{selectedTransition.evidence.end_line}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-indigo-400/80 group-hover:text-indigo-300 shrink-0">
                <span>Open Source</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </button>
          )}

          {/* Transition Specifications */}
          <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-3">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
              Transition Details
            </span>

            <div className="space-y-2">
              <div>
                <span className="text-zinc-500 text-[10px] block">Trigger Event:</span>
                <span className="text-white font-bold">{selectedTransition.event}</span>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] block">Guard Condition:</span>
                <span className="text-amber-300">
                  {selectedTransition.condition ? `[${selectedTransition.condition}]` : 'Unconditional'}
                </span>
              </div>

              <div>
                <span className="text-zinc-500 text-[10px] block">Action Handler:</span>
                <span className="text-indigo-300">
                  {selectedTransition.action || 'Direct State Mutation'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-zinc-800">
                <span className="text-zinc-500 text-[10px]">Confidence:</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    selectedTransition.confidence_level === 'deterministic'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : selectedTransition.confidence_level === 'high'
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                      : selectedTransition.confidence_level === 'medium'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {selectedTransition.confidence_level}
                </span>
              </div>
            </div>
          </div>

          {/* Connected States Navigation */}
          <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-2.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
              Connected States
            </span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSelectState(selectedTransition.from_state)}
                className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-left transition cursor-pointer"
              >
                <span className="text-[9px] text-zinc-500 block">From State</span>
                <span className="text-white font-bold truncate block">{selectedTransition.from_state}</span>
                {allStates.find((s) => s.name === selectedTransition.from_state)?.state_type && (
                  <span className="text-[8px] text-sky-400 capitalize block mt-0.5">
                    {allStates.find((s) => s.name === selectedTransition.from_state)?.state_type.replace('_', ' ')}
                  </span>
                )}
              </button>

              <button
                onClick={() => onSelectState(selectedTransition.to_state)}
                className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-left transition cursor-pointer"
              >
                <span className="text-[9px] text-zinc-500 block">To State</span>
                <span className="text-white font-bold truncate block">{selectedTransition.to_state}</span>
                {allStates.find((s) => s.name === selectedTransition.to_state)?.state_type && (
                  <span className="text-[8px] text-emerald-400 capitalize block mt-0.5">
                    {allStates.find((s) => s.name === selectedTransition.to_state)?.state_type.replace('_', ' ')}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Evidence Code Snippet */}
          {(selectedTransition.evidence?.code_snippet || selectedTransition.evidence?.snippet) && (
            <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
                Evidence Code Snippet
              </span>
              <pre className="p-2.5 rounded-lg bg-black/60 border border-zinc-800/80 text-[10px] text-zinc-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
                {selectedTransition.evidence.code_snippet || selectedTransition.evidence.snippet}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render State Inspector
  const cfg = getStateTypeCfg(selectedState!.state_type);
  const incoming = transitions.filter(
    (t) => t.to_state === selectedState!.id || t.to_state === selectedState!.name
  );
  const outgoing = transitions.filter(
    (t) => t.from_state === selectedState!.id || t.from_state === selectedState!.name
  );

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl overflow-hidden min-w-[360px] max-w-[400px] z-30 select-text">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]/80 backdrop-blur-md flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${cfg.badgeBg}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
              {cfg.label}
            </span>
            {selectedState!.is_initial && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                Initial
              </span>
            )}
            {selectedState!.is_terminal && (
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Terminal
              </span>
            )}
          </div>

          <h2 className="text-lg font-bold text-white font-mono break-all leading-tight">
            {selectedState!.name}
          </h2>
          <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
            Entity: <span className="text-zinc-200">{selectedState!.entity_name}</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition cursor-pointer shrink-0"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
        {/* Quick Action: Open Source */}
        {selectedState!.evidence && (
          <button
            onClick={() =>
              onOpenSource(selectedState!.evidence!.file_path, {
                start: selectedState!.evidence!.start_line,
                end: selectedState!.evidence!.end_line,
              })
            }
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-sky-500/15 to-indigo-600/10 hover:from-sky-500/25 hover:to-indigo-600/20 border border-sky-500/30 text-sky-300 font-bold flex items-center justify-between transition cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-2 truncate">
              <FileCode2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate text-xs">
                {selectedState!.evidence.file_path.split(/[/\\]/).pop()}:{selectedState!.evidence.start_line}-
                {selectedState!.evidence.end_line}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-sky-400/80 group-hover:text-sky-300 shrink-0">
              <span>Open Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </button>
        )}

        {/* State Description */}
        <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
            State Description
          </span>
          <p className="text-zinc-300 leading-relaxed text-[11px]">
            {selectedState!.description || `${selectedState!.name} phase for ${selectedState!.entity_name}`}
          </p>
        </div>

        {/* Canonical Knowledge Graph Node Link */}
        {selectedState!.associated_node_id && (
          <div className="p-3.5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-400 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Unified Architecture KG Node</span>
            </div>
            <p className="text-zinc-400 text-[10px] break-all">
              Node ID: <code className="text-zinc-200">{selectedState!.associated_node_id}</code>
            </p>
          </div>
        )}

        {/* Outgoing Transitions */}
        <div className="space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
            Outgoing Transitions ({outgoing.length})
          </span>
          {outgoing.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-[#1f1f23] text-center text-zinc-500 text-[11px]">
              No outgoing transitions (Terminal state)
            </div>
          ) : (
            <div className="space-y-1.5">
              {outgoing.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTransition(t)}
                  className="p-2.5 rounded-lg border border-[#1f1f23] bg-[#0c0c0e] hover:border-indigo-500/40 hover:bg-white/[0.02] flex items-center justify-between gap-2 transition cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold truncate">{t.event}</span>
                      {t.is_retry && (
                        <span className="px-1 py-0.2 rounded text-[8px] bg-amber-500/20 text-amber-300 font-bold">
                          RETRY
                        </span>
                      )}
                      {t.is_failure && (
                        <span className="px-1 py-0.2 rounded text-[8px] bg-rose-500/20 text-rose-300 font-bold">
                          FAIL
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <span>to</span>
                      <span className="text-zinc-200 font-semibold">
                        {allStates.find((s) => s.id === t.to_state || s.name === t.to_state)?.name || t.to_state}
                      </span>
                      {t.condition && <span className="text-zinc-500">[{t.condition}]</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Incoming Transitions */}
        <div className="space-y-2">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
            Incoming Transitions ({incoming.length})
          </span>
          {incoming.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-[#1f1f23] text-center text-zinc-500 text-[11px]">
              No incoming transitions (Entry state)
            </div>
          ) : (
            <div className="space-y-1.5">
              {incoming.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTransition(t)}
                  className="p-2.5 rounded-lg border border-[#1f1f23] bg-[#0c0c0e] hover:border-indigo-500/40 hover:bg-white/[0.02] flex items-center justify-between gap-2 transition cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold truncate">{t.event}</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
                      <span>from</span>
                      <span className="text-zinc-200 font-semibold">
                        {allStates.find((s) => s.id === t.from_state || s.name === t.from_state)?.name || t.from_state}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Evidence Snippet */}
        {(selectedState!.evidence?.code_snippet || selectedState!.evidence?.snippet) && (
          <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
              Source Code
            </span>
            <pre className="p-2.5 rounded-lg bg-black/60 border border-zinc-800/80 text-[10px] text-zinc-300 font-mono overflow-x-auto whitespace-pre leading-relaxed">
              {selectedState!.evidence.code_snippet || selectedState!.evidence.snippet}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
