import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  FileCode2,
  GitBranch,
  Database,
  Layers,
  Activity,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import type { ChangeImpactResponse } from '../../types';

interface ChangeImpactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyzeChange: (params: { filePath?: string; symbol?: string }) => void;
  data: ChangeImpactResponse | null;
  loading?: boolean;
  availableFiles?: string[];
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const ChangeImpactModal: React.FC<ChangeImpactModalProps> = ({
  isOpen,
  onClose,
  onAnalyzeChange,
  data,
  loading = false,
  availableFiles = [],
  onOpenSource,
}) => {
  const [selectedFile, setSelectedFile] = useState('');
  const [symbolQuery, setSymbolQuery] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile || symbolQuery) {
      onAnalyzeChange({
        filePath: selectedFile || undefined,
        symbol: symbolQuery || undefined,
      });
    }
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'medium':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>Change Impact Intelligence</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  Feature 7
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Simulate code modifications and evaluate systemic ripple effects across APIs, workflows, and pipelines
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

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-[#1f1f23] bg-[#121214] flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="w-full bg-[#18181b] text-zinc-200 text-xs px-3 py-2 rounded-xl border border-zinc-700/80 font-mono focus:outline-none focus:border-rose-500/60 cursor-pointer"
            >
              <option value="">Select File to Change...</option>
              {availableFiles.map((f) => (
                <option key={f} value={f} className="bg-[#18181b] text-white">
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[160px] relative">
            <input
              type="text"
              placeholder="Or symbol name..."
              value={symbolQuery}
              onChange={(e) => setSymbolQuery(e.target.value)}
              className="w-full bg-[#18181b] text-zinc-200 text-xs px-3 py-2 rounded-xl border border-zinc-700/80 font-mono focus:outline-none focus:border-rose-500/60 placeholder:text-zinc-600"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedFile && !symbolQuery}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Calculate Impact
          </button>
        </form>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Activity className="w-6 h-6 text-rose-400 animate-spin" />
              <span>Analyzing call-graphs, API gateways, and pipeline dependencies...</span>
            </div>
          ) : data ? (
            <>
              {/* Summary Scorecard */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
                    Target of Change
                  </span>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {data.query.file_path || data.query.symbol_name || 'All Target Entities'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
                      Risk Level
                    </span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border mt-0.5 ${getRiskColor(
                        data.risk_level
                      )}`}
                    >
                      {data.risk_level}
                    </span>
                  </div>

                  <div className="text-right pl-3 border-l border-zinc-800">
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
                      Impacted Entities
                    </span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {data.total_impacted_nodes}
                    </span>
                  </div>
                </div>
              </div>

              {/* Grid of Potentially Affected Areas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Affected APIs */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Affected APIs ({data.affected_apis.length})</span>
                    </span>
                  </div>
                  {data.affected_apis.length > 0 ? (
                    <div className="space-y-1">
                      {data.affected_apis.map((api, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs font-bold truncate"
                        >
                          {api}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">No external API endpoints directly impacted.</p>
                  )}
                </div>

                {/* Affected Services */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] space-y-2">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Affected Services ({data.affected_services.length})</span>
                  </span>
                  {data.affected_services.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {data.affected_services.map((svc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">No application services impacted.</p>
                  )}
                </div>

                {/* Affected Workflows */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] space-y-2">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Affected Workflows ({data.affected_workflows.length})</span>
                  </span>
                  {data.affected_workflows.length > 0 ? (
                    <div className="space-y-1.5">
                      {data.affected_workflows.map((wf) => (
                        <div key={wf.id} className="p-2 rounded-lg bg-[#141416] border border-zinc-800">
                          <span className="text-white font-bold block">{wf.name}</span>
                          <span className="text-[10px] text-zinc-400">
                            Steps: {wf.affected_steps.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">No business workflows impacted.</p>
                  )}
                </div>

                {/* Affected Data Flows */}
                <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] space-y-2">
                  <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>Affected Data Flows ({data.affected_data_flows.length})</span>
                  </span>
                  {data.affected_data_flows.length > 0 ? (
                    <div className="space-y-1.5">
                      {data.affected_data_flows.map((df) => (
                        <div key={df.id} className="p-2 rounded-lg bg-[#141416] border border-zinc-800">
                          <span className="text-white font-bold block">{df.name}</span>
                          <span className="text-[10px] text-zinc-400">
                            Models: {df.affected_entities.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500">No data pipelines impacted.</p>
                  )}
                </div>
              </div>

              {/* Potentially Affected Files */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Potentially Affected Source Files ({data.affected_files.length})
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-zinc-800/80 rounded-xl p-2 bg-[#0c0c0e]">
                  {data.affected_files.map((file, idx) => (
                    <div
                      key={idx}
                      onClick={() => onOpenSource(file)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-white/[0.04] text-zinc-300 text-xs flex items-center justify-between transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileCode2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-indigo-400 shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-zinc-600 group-hover:text-zinc-300 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-zinc-500">
              Select a file or type a function name above and click <b className="text-zinc-300">Calculate Impact</b> to trace changes across the Architecture Graph.
            </div>
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
