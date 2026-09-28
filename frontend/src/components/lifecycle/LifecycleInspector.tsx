import React from 'react';
import { X, ChevronRight, FileCode2, Sparkles, ArrowRight, RotateCcw, AlertTriangle, Zap } from 'lucide-react';
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
  onOpenSource?: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

const cleanName = (name: string) => (name.includes('/') ? name.split('/')[0].trim() : name);

export const LifecycleInspector: React.FC<LifecycleInspectorProps> = ({
  selectedState,
  selectedTransition,
  allStates,
  transitions,
  onClose,
  onSelectState: _onSelectState,
  onSelectTransition,
  onOpenSource: _onOpenSource,
}) => {
  if (!selectedState && !selectedTransition) return null;

  if (selectedTransition) {
    const fromName = allStates.find((s) => s.id === selectedTransition.from_state || s.name === selectedTransition.from_state)?.name || selectedTransition.from_state;
    const toName = allStates.find((s) => s.id === selectedTransition.to_state || s.name === selectedTransition.to_state)?.name || selectedTransition.to_state;

    return (
      <div className="flex flex-col h-full bg-white border-l border-[#E2E0D9] shadow-2xl overflow-hidden min-w-[360px] max-w-[400px] z-30 select-text">
        <div className="px-5 py-4 border-b border-[#E2E0D9] bg-[#F8F7F4]/90 backdrop-blur-md flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border bg-indigo-50 text-indigo-800 border-indigo-200">
                <Zap className="w-3 h-3 text-indigo-600" />
                State Transition
              </span>
              {selectedTransition.is_retry && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  <RotateCcw className="w-3 h-3 text-amber-600" />
                  Retry Loop
                </span>
              )}
              {selectedTransition.is_failure && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Failure Branch
                </span>
              )}
            </div>

            <h2 className="text-base font-bold text-[#19243B] font-mono break-all leading-tight">
              {cleanName(selectedTransition.event)}
            </h2>
            <p className="text-[11px] font-mono text-[#526078] mt-1 flex items-center gap-1.5">
              <span className="text-sky-800 font-semibold">
                {cleanName(fromName)}
              </span>
              <ArrowRight className="w-3 h-3 text-[#687184] shrink-0" />
              <span className="text-emerald-800 font-semibold">
                {cleanName(toName)}
              </span>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer shrink-0"
            title="Close Inspector"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
          {selectedTransition.evidence && (
            <div className="w-full py-2 px-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-amber-900 font-mono text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 truncate">
                <FileCode2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span className="truncate text-xs font-semibold">
                  {selectedTransition.evidence.file_path.split(/[/\\]/).pop()}:
                  {selectedTransition.evidence.start_line}-{selectedTransition.evidence.end_line}
                </span>
              </div>
              <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider shrink-0 bg-amber-100/60 px-1.5 py-0.5 rounded">
                Citation
              </span>
            </div>
          )}

          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-3">
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
              Transition Details
            </span>

            <div className="space-y-2">
              <div>
                <span className="text-[#526078] text-[10px] block">Trigger Event:</span>
                <span className="text-[#19243B] font-bold">{selectedTransition.event}</span>
              </div>

              <div>
                <span className="text-[#526078] text-[10px] block">Guard Condition:</span>
                <span className="text-amber-700 font-semibold">
                  {selectedTransition.condition ? `[${selectedTransition.condition}]` : 'Unconditional'}
                </span>
              </div>

              <div>
                <span className="text-[#526078] text-[10px] block">Action Handler:</span>
                <span className="text-indigo-800 font-semibold">
                  {selectedTransition.action || 'Direct State Mutation'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-[#E2E0D9]">
                <span className="text-[#526078] text-[10px]">Confidence:</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    selectedTransition.confidence_level === 'deterministic'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : selectedTransition.confidence_level === 'high'
                      ? 'bg-sky-50 text-sky-800 border border-sky-200'
                      : selectedTransition.confidence_level === 'medium'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-[#F0EEE9] text-[#526078] border border-[#E2E0D9]'
                  }`}
                >
                  {selectedTransition.confidence_level}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Selected State view
  const incoming = transitions.filter(
    (t) => t.to_state === selectedState?.id || t.to_state === selectedState?.name
  );
  const outgoing = transitions.filter(
    (t) => t.from_state === selectedState?.id || t.from_state === selectedState?.name
  );
  const cfg = getStateTypeCfg(selectedState?.state_type);

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#E2E0D9] shadow-2xl overflow-hidden min-w-[360px] max-w-[400px] z-30 select-text">
      <div className="px-5 py-4 border-b border-[#E2E0D9] bg-[#F8F7F4]/90 backdrop-blur-md flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${cfg.badgeBg}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
              {cfg.label}
            </span>
            {selectedState!.is_initial && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200 uppercase">
                Initial
              </span>
            )}
            {selectedState!.is_terminal && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
                Terminal
              </span>
            )}
          </div>

          <h2 className="text-base font-bold text-[#19243B] font-mono break-all leading-tight">
            {cleanName(selectedState!.name)}
          </h2>
          <p className="text-[11px] font-mono text-[#526078] mt-0.5">
            Entity: <span className="text-[#19243B] font-semibold">{cleanName(selectedState!.entity_name)}</span>
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer shrink-0"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-mono">
        {selectedState?.evidence && (
          <div className="w-full py-2 px-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-amber-900 font-mono text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 truncate">
              <FileCode2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="truncate text-xs font-semibold">
                {selectedState.evidence.file_path.split(/[/\\]/).pop()}:{selectedState.evidence.start_line}-
                {selectedState.evidence.end_line}
              </span>
            </div>
            <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider shrink-0 bg-amber-100/60 px-1.5 py-0.5 rounded">
              Citation
            </span>
          </div>
        )}

        <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-1.5">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
            State Description
          </span>
          <p className="text-[#19243B] leading-relaxed text-[11px]">
            {selectedState!.description || `${selectedState!.name} phase for ${selectedState!.entity_name}`}
          </p>
        </div>

        {selectedState!.associated_node_id && (
          <div className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-800 font-bold text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Unified Architecture KG Node</span>
            </div>
            <p className="text-[#526078] text-[10px] break-all">
              Node ID: <code className="text-[#19243B]">{selectedState!.associated_node_id}</code>
            </p>
          </div>
        )}

        <div className="space-y-2">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
            Outgoing Transitions ({outgoing.length})
          </span>
          {outgoing.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-[#E2E0D9] text-center text-[#687184] text-[11px]">
              No outgoing transitions (Terminal state)
            </div>
          ) : (
            <div className="space-y-1.5">
              {outgoing.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTransition(t)}
                  className="p-2.5 rounded-lg border border-[#E2E0D9] bg-[#F8F7F4] hover:border-amber-400 hover:bg-amber-50/40 flex items-center justify-between gap-2 transition cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#19243B] font-bold truncate group-hover:text-amber-800">{cleanName(t.event)}</span>
                      {t.is_retry && (
                        <span className="px-1 py-0.2 rounded text-[8px] bg-orange-50 text-orange-800 font-bold border border-orange-200">
                          RETRY
                        </span>
                      )}
                      {t.is_failure && (
                        <span className="px-1 py-0.2 rounded text-[8px] bg-rose-50 text-rose-800 font-bold border border-rose-200">
                          FAIL
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#526078] flex items-center gap-1 mt-0.5">
                      <span>to</span>
                      <span className="text-[#19243B] font-semibold">
                        {cleanName(allStates.find((s) => s.id === t.to_state || s.name === t.to_state)?.name || t.to_state)}
                      </span>
                      {t.condition && <span className="text-[#687184]">[{t.condition}]</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#687184] group-hover:text-[#19243B] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
            Incoming Transitions ({incoming.length})
          </span>
          {incoming.length === 0 ? (
            <div className="p-3 rounded-xl border border-dashed border-[#E2E0D9] text-center text-[#687184] text-[11px]">
              No incoming transitions (Entry state)
            </div>
          ) : (
            <div className="space-y-1.5">
              {incoming.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelectTransition(t)}
                  className="p-2.5 rounded-lg border border-[#E2E0D9] bg-[#F8F7F4] hover:border-amber-400 hover:bg-amber-50/40 flex items-center justify-between gap-2 transition cursor-pointer group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#19243B] font-bold truncate group-hover:text-amber-800">{cleanName(t.event)}</span>
                    </div>
                    <div className="text-[10px] text-[#526078] flex items-center gap-1 mt-0.5">
                      <span>from</span>
                      <span className="text-[#19243B] font-semibold">
                        {cleanName(allStates.find((s) => s.id === t.from_state || s.name === t.from_state)?.name || t.from_state)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[#687184] group-hover:text-[#19243B] shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
