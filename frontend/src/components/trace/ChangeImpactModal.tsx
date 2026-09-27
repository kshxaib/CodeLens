import React, { useState } from 'react';
import { X, AlertTriangle, FileCode2, GitBranch, Database, Layers, Activity, ExternalLink, ShieldAlert } from 'lucide-react';
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
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'high':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white border border-[#E2E0D9] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        <div className="px-6 py-4 border-b border-[#E2E0D9] bg-[#F8F7F4]/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#19243B] font-mono flex items-center gap-2">
                <span>Change Impact Intelligence</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-rose-50 text-rose-800 border border-rose-200 font-semibold">
                  Feature 7
                </span>
              </h2>
              <p className="text-[11px] text-[#526078] font-mono mt-0.5">
                Simulate code modifications and evaluate systemic ripple effects across APIs, workflows, and pipelines
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

        <form onSubmit={handleSubmit} className="p-4 border-b border-[#E2E0D9] bg-[#F8F7F4] flex flex-wrap items-center gap-2.5">
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedFile}
              onChange={(e) => setSelectedFile(e.target.value)}
              className="w-full bg-white text-[#19243B] text-xs px-3 py-2 rounded-xl border border-[#E2E0D9] font-mono focus:outline-none focus:border-rose-500 cursor-pointer shadow-sm"
            >
              <option value="">Select File to Change...</option>
              {availableFiles.map((f) => (
                <option key={f} value={f} className="bg-white text-[#19243B]">
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
              className="w-full bg-white text-[#19243B] text-xs px-3 py-2 rounded-xl border border-[#E2E0D9] font-mono focus:outline-none focus:border-rose-500 placeholder:text-[#687184] shadow-sm"
            />
          </div>

          <button
            type="submit"
            disabled={!selectedFile && !symbolQuery}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold transition cursor-pointer shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Calculate Impact
          </button>
        </form>

        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-[#526078]">
              <Activity className="w-6 h-6 text-rose-600 animate-spin" />
              <span>Analyzing call-graphs, API gateways, and pipeline dependencies...</span>
            </div>
          ) : data ? (
            <>
              <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <span className="text-[10px] text-[#526078] uppercase tracking-wider block font-bold">
                    Target of Change
                  </span>
                  <div className="text-sm font-bold text-[#19243B] mt-0.5">
                    {data.query.file_path || data.query.symbol_name || 'All Target Entities'}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-[#526078] uppercase tracking-wider block font-bold">
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

                  <div className="text-right pl-3 border-l border-[#E2E0D9]">
                    <span className="text-[10px] text-[#526078] uppercase tracking-wider block font-bold">
                      Impacted Entities
                    </span>
                    <span className="text-sm font-bold text-[#19243B] mt-0.5 block">
                      {data.total_impacted_nodes}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Affected APIs ({data.affected_apis.length})</span>
                    </span>
                  </div>
                  {data.affected_apis.length > 0 ? (
                    <div className="space-y-1">
                      {data.affected_apis.map((api, idx) => (
                        <div
                          key={idx}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold truncate"
                        >
                          {api}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#687184]">No external API endpoints directly impacted.</p>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Affected Services ({data.affected_services.length})</span>
                  </span>
                  {data.affected_services.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {data.affected_services.map((svc, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#687184]">No application services impacted.</p>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span>Affected Workflows ({data.affected_workflows.length})</span>
                  </span>
                  {data.affected_workflows.length > 0 ? (
                    <div className="space-y-1.5">
                      {data.affected_workflows.map((wf) => (
                        <div key={wf.id} className="p-2 rounded-lg bg-white border border-[#E2E0D9] shadow-sm">
                          <span className="text-[#19243B] font-bold block">{wf.name}</span>
                          <span className="text-[10px] text-[#526078]">
                            Steps: {wf.affected_steps.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#687184]">No business workflows impacted.</p>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
                  <span className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    <span>Affected Data Flows ({data.affected_data_flows.length})</span>
                  </span>
                  {data.affected_data_flows.length > 0 ? (
                    <div className="space-y-1.5">
                      {data.affected_data_flows.map((df) => (
                        <div key={df.id} className="p-2 rounded-lg bg-white border border-[#E2E0D9] shadow-sm">
                          <span className="text-[#19243B] font-bold block">{df.name}</span>
                          <span className="text-[10px] text-[#526078]">
                            Models: {df.affected_entities.join(', ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#687184]">No data pipelines impacted.</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold text-[#526078] uppercase tracking-wider block">
                  Potentially Affected Source Files ({data.affected_files.length})
                </span>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-[#E2E0D9] rounded-xl p-2 bg-white shadow-inner">
                  {data.affected_files.map((file, idx) => (
                    <div
                      key={idx}
                      onClick={() => onOpenSource(file)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-amber-50 text-[#19243B] text-xs flex items-center justify-between transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <FileCode2 className="w-3.5 h-3.5 text-[#687184] group-hover:text-amber-800 shrink-0" />
                        <span className="truncate">{file}</span>
                      </div>
                      <ExternalLink className="w-3 h-3 text-[#687184] group-hover:text-[#19243B] shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-[#687184]">
              Select a file or type a function name above and click <b className="text-[#19243B]">Calculate Impact</b> to trace changes across the Architecture Graph.
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#E2E0D9] bg-[#F8F7F4] flex justify-end">
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
