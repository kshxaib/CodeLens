import React from 'react';
import { X, ExternalLink, ShieldCheck, FileCode2, Sparkles } from 'lucide-react';
import type { ExplainComponentResponse } from '../../types';

interface ExplainModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExplainComponentResponse | null;
  loading?: boolean;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const ExplainModal: React.FC<ExplainModalProps> = ({
  isOpen,
  onClose,
  data,
  loading = false,
  onOpenSource,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-[#E2E0D9] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-[#E2E0D9] bg-[#F8F7F4]/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#19243B] font-mono flex items-center gap-2">
                <span>Component Architecture Explanation</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Grounded Evidence
                </span>
              </h2>
              <p className="text-[11px] text-[#526078] font-mono mt-0.5">
                Analyzed via CodeLens AST Knowledge Graph & verified source code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#526078]">
              <Sparkles className="w-6 h-6 text-amber-600 animate-spin" />
              <span>Gathering deterministic evidence & analyzing architectural role...</span>
            </div>
          ) : data ? (
            <>
              <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-[#19243B]">{data.component_name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-[#526078]">
                    <span className="text-indigo-800 font-semibold capitalize">{data.component_type}</span>
                    <span>•</span>
                    <span className="text-sky-800 font-semibold capitalize">{data.layer} Layer</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Evidence-Grounded ({data.confidence})</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4]">
                  <span className="text-[10px] text-[#526078] uppercase tracking-wider block font-bold mb-1">
                    Direct Callers (Upstream)
                  </span>
                  <span className="text-lg font-bold text-sky-800">{data.upstream_count}</span>
                </div>

                <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4]">
                  <span className="text-[10px] text-[#526078] uppercase tracking-wider block font-bold mb-1">
                    Dependencies (Downstream)
                  </span>
                  <span className="text-lg font-bold text-emerald-800">{data.downstream_count}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
                <span className="text-[10px] font-bold text-[#526078] uppercase tracking-wider block">
                  Architectural Synthesis
                </span>
                <div className="text-[#19243B] text-xs leading-relaxed whitespace-pre-line">
                  {data.explanation}
                </div>
              </div>

              {data.evidence && data.evidence.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-[#526078] uppercase tracking-wider block">
                    Source Code Evidence ({data.evidence.length})
                  </span>

                  {data.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-[#E2E0D9] bg-white space-y-2 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-indigo-800 text-xs font-bold truncate">
                          <FileCode2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate">
                            {ev.file_path}:{ev.start_line}-{ev.end_line}
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            onOpenSource(ev.file_path, {
                              start: ev.start_line,
                              end: ev.end_line,
                            })
                          }
                          className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border border-amber-200 shrink-0"
                        >
                          <span>Open Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {ev.snippet && (
                        <pre className="p-2.5 rounded-lg bg-[#F8F7F4] border border-[#E2E0D9] text-[10px] text-[#19243B] overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
                          {ev.snippet}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-[#687184]">No component explanation available.</div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#E2E0D9] bg-[#F8F7F4] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#F0EEE9] hover:bg-[#E2E0D9] text-[#19243B] text-xs font-mono font-medium transition cursor-pointer border border-[#E2E0D9]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
