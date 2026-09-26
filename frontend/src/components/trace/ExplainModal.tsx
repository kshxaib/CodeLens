import React from 'react';
import {
  X,
  ExternalLink,
  ShieldCheck,
  FileCode2,
  Sparkles,
} from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>Component Architecture Explanation</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Grounded Evidence
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Analyzed via CodeLens AST Knowledge Graph & verified source code
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
              <span>Gathering deterministic evidence & analyzing architectural role...</span>
            </div>
          ) : data ? (
            <>
              {/* Component Identity Card */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-white">{data.component_name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400">
                    <span className="text-indigo-300 capitalize">{data.component_type}</span>
                    <span>•</span>
                    <span className="text-sky-300 capitalize">{data.layer} Layer</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Evidence-Grounded ({data.confidence})</span>
                  </span>
                </div>
              </div>

              {/* Inbound & Outbound Invocations */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-[#0c0c0e]">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">
                    Direct Callers (Upstream)
                  </span>
                  <span className="text-lg font-bold text-sky-400">{data.upstream_count}</span>
                </div>

                <div className="p-3.5 rounded-xl border border-zinc-800/80 bg-[#0c0c0e]">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold mb-1">
                    Dependencies (Downstream)
                  </span>
                  <span className="text-lg font-bold text-emerald-400">{data.downstream_count}</span>
                </div>
              </div>

              {/* Architectural Explanation */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Architectural Synthesis
                </span>
                <div className="text-zinc-200 text-xs leading-relaxed whitespace-pre-line">
                  {data.explanation}
                </div>
              </div>

              {/* Source Evidence */}
              {data.evidence && data.evidence.length > 0 && (
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Source Code Evidence ({data.evidence.length})
                  </span>

                  {data.evidence.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-zinc-800/90 bg-[#0c0c0e] space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-bold truncate">
                          <FileCode2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
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
                          className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer border border-indigo-500/20 shrink-0"
                        >
                          <span>Open Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>

                      {ev.snippet && (
                        <pre className="p-2.5 rounded-lg bg-black/60 border border-zinc-800 text-[10px] text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed">
                          {ev.snippet}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-zinc-500">No explanation available.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1f1f23] bg-[#0c0c0e] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
