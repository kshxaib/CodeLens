import React from 'react';
import { X, ExternalLink, ChevronRight, FileCode2, Cpu, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { getStepTypeCfg } from './constants';
import type { WorkflowStep, WorkflowTransition } from '../../types';

interface WorkflowInspectorProps {
  step: WorkflowStep;
  allSteps: WorkflowStep[];
  transitions: WorkflowTransition[];
  onClose: () => void;
  onSelectStep: (stepId: string) => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const WorkflowInspector: React.FC<WorkflowInspectorProps> = ({
  step,
  allSteps,
  transitions,
  onClose,
  onSelectStep,
  onOpenSource,
}) => {
  const cfg = getStepTypeCfg(step.step_type);

  const incomingTransitions = transitions.filter((t) => t.target === step.id);
  const outgoingTransitions = transitions.filter((t) => t.source === step.id);

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
          </div>

          <h2 className="text-base font-bold text-[#19243B] font-mono break-all leading-tight">
            {step.name}
          </h2>
          <p className="text-[11px] font-mono text-[#526078] mt-0.5">
            Role: <span className="text-[#19243B] font-semibold">{cfg.sub}</span>
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

      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono">
        {step.evidence && (
          <button
            onClick={() =>
              onOpenSource(step.evidence!.file_path, {
                start: step.evidence!.start_line,
                end: step.evidence!.end_line,
              })
            }
            className="w-full py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-800 font-bold flex items-center justify-between transition cursor-pointer shadow-sm group"
          >
            <div className="flex items-center gap-2 truncate">
              <FileCode2 className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="truncate text-xs">
                {step.evidence.file_path.split(/[/\\]/).pop()}:{step.evidence.start_line}-{step.evidence.end_line}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-700 group-hover:text-amber-900 shrink-0">
              <span>Open Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </button>
        )}

        <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-1.5">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
            Step Description
          </span>
          <p className="text-[#19243B] leading-relaxed text-[11px]">
            {step.description || 'Execution unit within this business workflow process.'}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block mb-1.5">
              Inputs
            </span>
            {step.inputs && step.inputs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {step.inputs.map((inp, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-white border border-[#E2E0D9] text-[#19243B] text-[10px]"
                  >
                    {inp}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[#687184] text-[10px]">No explicit inputs declared</span>
            )}
          </div>

          <div>
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block mb-1.5">
              Outputs
            </span>
            {step.outputs && step.outputs.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {step.outputs.map((out, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px]"
                  >
                    {out}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[#687184] text-[10px]">Mutates context</span>
            )}
          </div>
        </div>

        {step.calls && step.calls.length > 0 && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
              Invocations & Method Calls
            </span>
            <div className="space-y-1">
              {step.calls.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sky-800 text-[11px]">
                  <Cpu className="w-3.5 h-3.5 text-sky-600" />
                  <span>{c}()</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step.evidence && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold">
                Traceable Evidence
              </span>
              <span className="text-[10px] text-amber-700 font-bold">
                Lines {step.evidence.start_line}-{step.evidence.end_line}
              </span>
            </div>
            {step.evidence.snippet && (
              <div className="p-2.5 rounded-lg bg-white border border-[#E2E0D9] overflow-x-auto text-[10px] text-[#19243B] font-mono shadow-inner">
                <pre className="whitespace-pre-wrap">{step.evidence.snippet}</pre>
              </div>
            )}
          </div>
        )}

        {incomingTransitions.length > 0 && (
          <div className="space-y-2 border-t border-[#E2E0D9] pt-4">
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <ArrowDownRight className="w-3.5 h-3.5 text-[#687184]" />
              Incoming Steps ({incomingTransitions.length})
            </span>
            <div className="space-y-1.5">
              {incomingTransitions.map((t) => {
                const srcStep = allSteps.find((s) => s.id === t.source);
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectStep(t.source)}
                    className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] hover:border-amber-400 hover:bg-amber-50/40 transition cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[#19243B] text-[11px] font-semibold truncate group-hover:text-amber-800">
                        <span>←</span>
                        <span className="truncate">{srcStep?.name || t.source}</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-[#526078]">
                        {t.transition_type} {t.label ? `(${t.label})` : ''}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#687184] group-hover:text-[#19243B] shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3 border-t border-[#E2E0D9] pt-4">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
            Outgoing Transitions ({outgoingTransitions.length})
          </span>
          {outgoingTransitions.length > 0 ? (
            <div className="space-y-1.5">
              {outgoingTransitions.map((t) => {
                const targetStep = allSteps.find((s) => s.id === t.target);
                return (
                  <div
                    key={t.id}
                    onClick={() => onSelectStep(t.target)}
                    className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] hover:border-amber-400 hover:bg-amber-50/40 transition cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[#19243B] text-[11px] font-semibold truncate group-hover:text-amber-800">
                        <span>{t.label ? `[${t.label}]` : '→'}</span>
                        <span className="truncate">{targetStep?.name || t.target}</span>
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-[#526078]">
                        {t.transition_type}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#687184] group-hover:text-[#19243B] shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-[#687184] text-[10px]">Workflow reaches terminal state.</span>
          )}
        </div>
      </div>
    </div>
  );
};
