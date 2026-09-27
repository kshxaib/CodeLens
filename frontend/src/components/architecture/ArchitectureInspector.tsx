import React from 'react';
import {
  X,
  FileCode2,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
} from 'lucide-react';
import { ARCH_TIERS, getNodeTier, getRelationshipCfg } from './constants';
import type { ArchKGNode, ArchKGEdge } from '../../types';

interface ArchitectureInspectorProps {
  node: ArchKGNode;
  allNodes: ArchKGNode[];
  edges: ArchKGEdge[];
  repositoryId?: number;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export const ArchitectureInspector: React.FC<ArchitectureInspectorProps> = ({
  node,
  allNodes,
  edges,
  onClose,
  onSelectNode,
}) => {
  const tierKey = getNodeTier(node.type, node.layer);
  const tierCfg = ARCH_TIERS[tierKey] || ARCH_TIERS.application;

  // Filter incoming edges (who imports / calls this node)
  const incomingEdges = edges.filter((e) => e.target === node.id);

  // Filter outgoing edges (what this node imports / calls)
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  const primarySourceFile = node.source_files?.[0] || '';

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#E2E0D9] shadow-xl overflow-hidden min-w-[360px] max-w-[420px] z-30 select-text">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E2E0D9] bg-[#FAF9F5] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${tierCfg.badgeBg}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tierCfg.dot }} />
              {tierCfg.label}
            </span>

            <span className="text-[10px] font-mono uppercase tracking-wider text-[#526078] bg-white px-2 py-0.5 rounded-md border border-[#E2E0D9]">
              {node.type.replace(/_/g, ' ')}
            </span>
          </div>

          <h2 className="text-base font-bold text-[#19243B] font-mono break-all leading-snug">
            {node.display_name || node.name}
          </h2>

          {primarySourceFile && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#526078] mt-1 truncate" title={primarySourceFile}>
              <FileCode2 className="w-3.5 h-3.5 text-[#78716C] shrink-0" />
              <span className="truncate">{primarySourceFile}</span>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer shrink-0"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 gap-2 p-4 bg-[#F8F7F4] border-b border-[#E2E0D9]">
        <div className="p-3 rounded-xl border border-[#E2E0D9] bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 text-[#526078] mb-1">
            <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />
            <span className="text-[10px] font-mono font-bold uppercase">Incoming</span>
          </div>
          <div className="text-lg font-bold text-[#19243B] font-mono">{incomingEdges.length}</div>
          <span className="text-[10px] text-[#78716C] font-mono">Calling / Importing this</span>
        </div>

        <div className="p-3 rounded-xl border border-[#E2E0D9] bg-white shadow-2xs">
          <div className="flex items-center gap-1.5 text-[#526078] mb-1">
            <ArrowUpRight className="w-3.5 h-3.5 text-sky-700" />
            <span className="text-[10px] font-mono font-bold uppercase">Outgoing</span>
          </div>
          <div className="text-lg font-bold text-[#19243B] font-mono">{outgoingEdges.length}</div>
          <span className="text-[10px] text-[#78716C] font-mono">Calls &amp; Dependencies</span>
        </div>
      </div>

      {/* Main Body: Incoming & Outgoing Dependencies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-white">
        {/* SECTION 1: Who imports / calls this node */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-amber-900 font-mono font-bold text-[11px] uppercase tracking-wider">
              <ArrowDownLeft className="w-4 h-4 text-amber-600" />
              <span>Incoming Callers ({incomingEdges.length})</span>
            </div>
            <span className="text-[9.5px] font-mono text-[#78716C]">Imported by</span>
          </div>

          {incomingEdges.length > 0 ? (
            <div className="space-y-1.5">
              {incomingEdges.map((edge) => {
                const sourceNode = allNodes.find((n) => n.id === edge.source);
                const relCfg = getRelationshipCfg(edge.relationship_type);
                const srcTier = sourceNode ? getNodeTier(sourceNode.type, sourceNode.layer) : 'application';
                const srcTierCfg = ARCH_TIERS[srcTier] || ARCH_TIERS.application;

                return (
                  <div
                    key={edge.id}
                    onClick={() => onSelectNode(edge.source)}
                    className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#FAF9F5] hover:border-amber-400 hover:bg-white transition cursor-pointer flex items-center justify-between gap-2 group shadow-2xs"
                    title={`Click to focus on ${sourceNode?.name || edge.source}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[#19243B] text-[11.5px] font-bold font-mono truncate group-hover:text-amber-800">
                          {sourceNode?.display_name || sourceNode?.name || edge.source}
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded text-[8.5px] font-bold font-mono uppercase border shrink-0"
                          style={{ borderColor: relCfg.stroke, color: relCfg.stroke }}
                        >
                          {edge.relationship_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9.5px] font-mono text-[#78716C] truncate">
                          {sourceNode?.type?.replace(/_/g, ' ') || 'node'}
                        </span>
                        <span className="text-[#D5D2CA]">•</span>
                        <span className="text-[9.5px] font-mono font-medium truncate" style={{ color: srcTierCfg.dot }}>
                          {srcTierCfg.label}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#A19D94] group-hover:text-amber-700 shrink-0 transition" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-dashed border-[#E2E0D9] bg-[#FAF9F5] text-center text-[#78716C] text-[11px] font-mono">
              Root component (no incoming callers detected).
            </div>
          )}
        </div>

        {/* SECTION 2: What this node calls / imports */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-sky-900 font-mono font-bold text-[11px] uppercase tracking-wider">
              <ArrowUpRight className="w-4 h-4 text-sky-600" />
              <span>Outgoing Calls &amp; Imports ({outgoingEdges.length})</span>
            </div>
            <span className="text-[9.5px] font-mono text-[#78716C]">Calls / Consumes</span>
          </div>

          {outgoingEdges.length > 0 ? (
            <div className="space-y-1.5">
              {outgoingEdges.map((edge) => {
                const targetNode = allNodes.find((n) => n.id === edge.target);
                const relCfg = getRelationshipCfg(edge.relationship_type);
                const tgtTier = targetNode ? getNodeTier(targetNode.type, targetNode.layer) : 'application';
                const tgtTierCfg = ARCH_TIERS[tgtTier] || ARCH_TIERS.application;

                return (
                  <div
                    key={edge.id}
                    onClick={() => onSelectNode(edge.target)}
                    className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#FAF9F5] hover:border-sky-400 hover:bg-white transition cursor-pointer flex items-center justify-between gap-2 group shadow-2xs"
                    title={`Click to focus on ${targetNode?.name || edge.target}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="px-1.5 py-0.2 rounded text-[8.5px] font-bold font-mono uppercase border shrink-0"
                          style={{ borderColor: relCfg.stroke, color: relCfg.stroke }}
                        >
                          {edge.relationship_type}
                        </span>
                        <span className="text-[#19243B] text-[11.5px] font-bold font-mono truncate group-hover:text-sky-800">
                          {targetNode?.display_name || targetNode?.name || edge.target}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9.5px] font-mono text-[#78716C] truncate">
                          {targetNode?.type?.replace(/_/g, ' ') || 'node'}
                        </span>
                        <span className="text-[#D5D2CA]">•</span>
                        <span className="text-[9.5px] font-mono font-medium truncate" style={{ color: tgtTierCfg.dot }}>
                          {tgtTierCfg.label}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-[#A19D94] group-hover:text-sky-700 shrink-0 transition" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-3.5 rounded-xl border border-dashed border-[#E2E0D9] bg-[#FAF9F5] text-center text-[#78716C] text-[11px] font-mono">
              Leaf component (no outgoing calls or dependencies).
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
