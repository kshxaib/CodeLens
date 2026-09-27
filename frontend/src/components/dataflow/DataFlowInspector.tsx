import React from 'react';
import { X, ExternalLink, ChevronRight, FileCode2, Database, ArrowDownRight, ArrowUpRight, Tag } from 'lucide-react';
import { getDataClassificationCfg } from './constants';
import type { DataNode, DataFlowEdge } from '../../types';

interface DataFlowInspectorProps {
  node: DataNode;
  allNodes: DataNode[];
  edges: DataFlowEdge[];
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const DataFlowInspector: React.FC<DataFlowInspectorProps> = ({
  node,
  allNodes,
  edges,
  onClose,
  onSelectNode,
  onOpenSource,
}) => {
  const cfg = getDataClassificationCfg(node.data_classification);

  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#E2E0D9] shadow-2xl overflow-hidden min-w-[360px] max-w-[420px] z-30 select-text">
      <div className="px-5 py-4 border-b border-[#E2E0D9] bg-[#F8F7F4]/90 backdrop-blur-md flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium border ${cfg.badgeBg}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
              {cfg.label}
            </span>

            {node.format && (
              <span className="px-2 py-0.5 rounded bg-[#F0EEE9] text-[#19243B] border border-[#E2E0D9] text-[10px] font-mono uppercase font-semibold">
                {node.format}
              </span>
            )}
          </div>

          <h2 className="text-base font-bold text-[#19243B] font-mono break-all leading-tight">
            {node.name}
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
        {node.evidence && (
          <button
            onClick={() =>
              onOpenSource(node.evidence!.file_path, {
                start: node.evidence!.start_line,
                end: node.evidence!.end_line,
              })
            }
            className="w-full py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-800 font-bold flex items-center justify-between transition cursor-pointer shadow-sm group"
          >
            <div className="flex items-center gap-2 truncate">
              <FileCode2 className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="truncate text-xs">
                {node.evidence.file_path.split(/[/\\]/).pop()}:{node.evidence.start_line}-{node.evidence.end_line}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-700 group-hover:text-amber-900 shrink-0">
              <span>Open Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </button>
        )}

        {node.storage && (
          <div className="p-3 rounded-xl border border-sky-200 bg-sky-50 flex items-center gap-2.5 text-sky-900">
            <Database className="w-4 h-4 text-sky-700 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-sky-700 uppercase tracking-wider font-bold block">
                Storage Destination
              </span>
              <span className="text-xs font-bold text-sky-950 truncate block">
                {node.storage}
              </span>
            </div>
          </div>
        )}

        <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-1.5">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
            Entity Description
          </span>
          <p className="text-[#19243B] leading-relaxed text-[11px]">
            {node.description || 'Data entity or transformation unit within this data pipeline.'}
          </p>
        </div>

        {node.fields && node.fields.length > 0 && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold flex items-center gap-1">
                <Tag className="w-3 h-3 text-amber-600" />
                Detected Fields ({node.fields.length})
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {node.fields.map((f, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-white border border-[#E2E0D9] text-[#19243B] text-[10px]"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2 border-t border-[#E2E0D9] pt-4">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-[#687184]" />
            Upstream Lineage ({incomingEdges.length})
          </span>
          {incomingEdges.length > 0 ? (
            <div className="space-y-1.5">
              {incomingEdges.map((e) => {
                const srcNode = allNodes.find((n) => n.id === e.source);
                return (
                  <div
                    key={e.id}
                    onClick={() => onSelectNode(e.source)}
                    className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] hover:border-amber-400 hover:bg-amber-50/40 transition cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[#19243B] text-[11px] font-semibold truncate group-hover:text-amber-800">
                        <span>←</span>
                        <span className="truncate">{srcNode?.name || e.source}</span>
                      </div>
                      <span className="text-[9px] text-[#526078] truncate block mt-0.5">
                        Transformation: {e.transformation || e.data_type}
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#687184] group-hover:text-[#19243B] shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-[#687184] text-[10px]">Origin entity (Inbound entry point)</span>
          )}
        </div>

        <div className="space-y-2 border-t border-[#E2E0D9] pt-4">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-700" />
            Downstream Lineage ({outgoingEdges.length})
          </span>
          {outgoingEdges.length > 0 ? (
            <div className="space-y-1.5">
              {outgoingEdges.map((e) => {
                const tgtNode = allNodes.find((n) => n.id === e.target);
                return (
                  <div
                    key={e.id}
                    onClick={() => onSelectNode(e.target)}
                    className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] hover:border-amber-400 hover:bg-amber-50/40 transition cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[#19243B] text-[11px] font-semibold truncate group-hover:text-amber-800">
                        <span>→</span>
                        <span className="truncate">{tgtNode?.name || e.target}</span>
                      </div>
                      <span className="text-[9px] text-[#526078] truncate block mt-0.5">
                        Data: {e.data_type} ({e.confidence_level})
                      </span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-[#687184] group-hover:text-[#19243B] shrink-0" />
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="text-[#687184] text-[10px]">Outbound terminal response</span>
          )}
        </div>

        {node.evidence && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold">
                Traceable Evidence
              </span>
              <span className="text-[10px] text-amber-700 font-bold">
                Lines {node.evidence.start_line}-{node.evidence.end_line}
              </span>
            </div>
            {node.evidence.snippet && (
              <div className="p-2.5 rounded-lg bg-white border border-[#E2E0D9] overflow-x-auto text-[10px] text-[#19243B] font-mono shadow-inner">
                <pre className="whitespace-pre-wrap">{node.evidence.snippet}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
