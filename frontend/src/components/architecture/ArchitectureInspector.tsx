import React, { useState } from 'react';
import {
  X,
  FileCode2,
  ExternalLink,
  Code,
  CheckCircle2,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Zap,
  Info,
  HelpCircle,
  Loader2,
  Compass,
  ShieldAlert,
} from 'lucide-react';
import { ARCH_TIERS, CONFIDENCE_BADGES, getNodeTier, getRelationshipCfg } from './constants';
import type { ArchKGNode, ArchKGEdge } from '../../types';
import { useTrace } from '../../store/useTraceStore';

interface ArchitectureInspectorProps {
  node: ArchKGNode;
  allNodes: ArchKGNode[];
  edges: ArchKGEdge[];
  repositoryId: number;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
  onAnalyzeBlastRadius: (symbol: string) => void;
  blastLoading: boolean;
}

export const ArchitectureInspector: React.FC<ArchitectureInspectorProps> = ({
  node,
  allNodes,
  edges,
  onClose,
  onSelectNode,
  onOpenSource,
  onAnalyzeBlastRadius,
  blastLoading,
}) => {
  const { selectTraceNode, openWhy, openExplain, calculateImpact } = useTrace();
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'symbols' | 'relationships' | 'evidence'>('overview');

  const tierKey = getNodeTier(node.type, node.layer);
  const tierCfg = ARCH_TIERS[tierKey] || ARCH_TIERS.application;
  const confBadge = CONFIDENCE_BADGES[node.confidence_level] || CONFIDENCE_BADGES.deterministic;

  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  const primarySourceFile = node.source_files?.[0] || '';

  return (
    <div className="flex flex-col h-full bg-white border-l border-[#E2E0D9] shadow-xl overflow-hidden min-w-[380px] max-w-[420px] z-30 select-text">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E2E0D9] bg-[#FBFBF9] flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${tierCfg.badgeBg}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tierCfg.dot }} />
              {tierCfg.label}
            </span>

            <span
              className={`inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${confBadge.bg} ${confBadge.text} ${confBadge.border}`}
            >
              {node.confidence_level === 'deterministic' ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              {confBadge.label} ({Math.round(node.confidence * 100)}%)
            </span>
          </div>

          <h2 className="text-base font-bold text-[#19243B] font-mono break-all leading-tight">
            {node.name || node.display_name}
          </h2>
          <p className="text-[11px] font-mono text-[#526078] mt-0.5">
            Type: <span className="text-[#19243B] uppercase font-semibold">{node.type.replace('_', ' ')}</span>
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

      {/* Tabs */}
      <div className="flex items-center border-b border-[#E2E0D9] bg-[#F8F7F4] px-2 py-1 gap-1 text-[11px] font-mono overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-amber-800 font-bold border border-amber-300 shadow-2xs'
              : 'text-[#526078] hover:text-[#19243B]'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'modules'
              ? 'bg-white text-amber-800 font-bold border border-amber-300 shadow-2xs'
              : 'text-[#526078] hover:text-[#19243B]'
          }`}
        >
          Modules
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#E2E0D9] text-[#19243B]">
            {node.source_files?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('symbols')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'symbols'
              ? 'bg-white text-amber-800 font-bold border border-amber-300 shadow-2xs'
              : 'text-[#526078] hover:text-[#19243B]'
          }`}
        >
          Symbols
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#E2E0D9] text-[#19243B]">
            {node.symbols?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('relationships')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'relationships'
              ? 'bg-white text-amber-800 font-bold border border-amber-300 shadow-2xs'
              : 'text-[#526078] hover:text-[#19243B]'
          }`}
        >
          Links
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#E2E0D9] text-[#19243B]">
            {incomingEdges.length + outgoingEdges.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'evidence'
              ? 'bg-white text-amber-800 font-bold border border-amber-300 shadow-2xs'
              : 'text-[#526078] hover:text-[#19243B]'
          }`}
        >
          Evidence
          <span className="text-[9px] px-1 py-0.2 rounded bg-[#E2E0D9] text-[#19243B]">
            {node.evidence?.length || 0}
          </span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono bg-white">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => selectTraceNode(node.id)}
                className="py-2 px-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs text-[11px]"
                title="Trace Upstream callers and Downstream callees"
              >
                <Compass className="w-3.5 h-3.5 text-amber-700" />
                <span>Trace</span>
              </button>

              <button
                onClick={() => openExplain(node.id)}
                className="py-2 px-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-800 font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs text-[11px]"
                title="Explain component using evidence-first synthesis"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
                <span>Explain</span>
              </button>

              <button
                onClick={() => calculateImpact(node.id)}
                className="py-2 px-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs text-[11px]"
                title="Calculate dependent impact and depth"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
                <span>Impact</span>
              </button>
            </div>

            {primarySourceFile && (
              <button
                onClick={() => onOpenSource(primarySourceFile)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 font-bold flex items-center justify-between transition cursor-pointer shadow-xs group"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 className="w-4 h-4 text-amber-700 shrink-0" />
                  <span className="truncate text-xs">{primarySourceFile.split(/[/\\]/).pop()}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-700 group-hover:text-amber-900 shrink-0">
                  <span>Open Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-1.5">
              <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
                Description
              </span>
              <p className="text-[#19243B] leading-relaxed text-[11px]">
                {node.description ||
                  `Architecture ${node.type} component mapped to the ${tierCfg.label} layer.`}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4]">
                <div className="flex items-center gap-1.5 text-[#526078] mb-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />
                  <span className="text-[10px] uppercase font-bold">Incoming Calls</span>
                </div>
                <div className="text-xl font-bold text-[#19243B]">{incomingEdges.length}</div>
                <span className="text-[10px] text-[#687184]">Dependents calling this</span>
              </div>

              <div className="p-3 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4]">
                <div className="flex items-center gap-1.5 text-[#526078] mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-sky-700" />
                  <span className="text-[10px] uppercase font-bold">Outgoing Calls</span>
                </div>
                <div className="text-xl font-bold text-[#19243B]">{outgoingEdges.length}</div>
                <span className="text-[10px] text-[#687184]">Dependencies consumed</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-dashed border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
              <div className="flex items-center gap-1.5 text-amber-800 text-[10px] font-bold uppercase">
                <Info className="w-3.5 h-3.5 text-amber-600" /> Progressive Detail Drilldown
              </div>
              <div className="text-[11px] text-[#526078] space-y-1 leading-relaxed">
                <div>1. <span className="text-[#19243B] font-bold">Component:</span> {node.name}</div>
                <div>2. <span className="text-[#19243B] font-bold">Modules:</span> {node.source_files?.length || 0} source file(s)</div>
                <div>3. <span className="text-[#19243B] font-bold">Symbols:</span> {node.symbols?.length || 0} AST symbols extracted</div>
                <div>4. <span className="text-[#19243B] font-bold">Exact Source:</span> Click any symbol or evidence to view code</div>
              </div>
            </div>

            <div className="border-t border-[#E2E0D9] pt-4">
              <button
                onClick={() => onAnalyzeBlastRadius(node.id || node.name)}
                disabled={blastLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-[#19243B] hover:bg-[#2B3854] text-white font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-sm disabled:opacity-50"
              >
                {blastLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Blast Radius...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current text-amber-400" />
                    <span>Highlight Impact Dependency Path</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="space-y-3">
            <div className="text-[10px] text-[#526078] uppercase tracking-wider font-bold">
              Underlying Source Files ({node.source_files?.length || 0})
            </div>

            {node.source_files && node.source_files.length > 0 ? (
              <div className="space-y-2">
                {node.source_files.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] hover:border-[#19243B]/40 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode2 className="w-4 h-4 text-amber-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[#19243B] font-mono text-[11px] truncate font-semibold">
                          {file.split(/[/\\]/).pop()}
                        </div>
                        <div className="text-[#687184] text-[10px] font-mono truncate max-w-[200px]" title={file}>
                          {file}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenSource(file)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#E2E0D9] hover:bg-[#F0EEE9] text-[#19243B] text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0 shadow-2xs"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[#E2E0D9] text-center text-[#687184]">
                No local source file (inferred or synthetic entity such as PostgreSQL or third-party API).
              </div>
            )}
          </div>
        )}

        {activeTab === 'symbols' && (
          <div className="space-y-3">
            <div className="text-[10px] text-[#526078] uppercase tracking-wider font-bold">
              AST Symbols ({node.symbols?.length || 0})
            </div>

            {node.symbols && node.symbols.length > 0 ? (
              <div className="space-y-2">
                {node.symbols.map((sym, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (primarySourceFile) {
                        onOpenSource(primarySourceFile, {
                          start: sym.line_number || 1,
                          end: sym.end_line || sym.line_number || 1,
                        });
                      }
                    }}
                    className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] hover:border-amber-400 hover:bg-white transition cursor-pointer flex items-center justify-between gap-2 group shadow-2xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Code className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[#19243B] font-mono text-[11px] font-semibold truncate group-hover:text-amber-800 transition-colors">
                          {sym.name}
                        </div>
                        <div className="text-[#687184] text-[10px] font-mono flex items-center gap-2">
                          <span className="uppercase text-[9px] text-[#526078] font-bold">{sym.kind}</span>
                          <span>Line {sym.line_number}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-amber-800 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-bold">
                      View code <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[#E2E0D9] text-center text-[#687184]">
                No AST symbols found for this node.
              </div>
            )}
          </div>
        )}

        {activeTab === 'relationships' && (
          <div className="space-y-4">
            <div>
              <div className="text-[10px] text-[#526078] uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-700" />
                Outgoing Calls &amp; Dependencies ({outgoingEdges.length})
              </div>

              {outgoingEdges.length > 0 ? (
                <div className="space-y-1.5">
                  {outgoingEdges.map((edge) => {
                    const targetNode = allNodes.find((n) => n.id === edge.target);
                    const relCfg = getRelationshipCfg(edge.relationship_type);
                    return (
                      <div
                        key={edge.id}
                        onClick={() => onSelectNode(edge.target)}
                        className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] hover:border-sky-300 hover:bg-white transition cursor-pointer flex items-center justify-between gap-2 group shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase border"
                              style={{ borderColor: relCfg.stroke, color: relCfg.stroke }}
                            >
                              {edge.relationship_type}
                            </span>
                            <span className="text-[#19243B] text-[11px] font-bold font-mono truncate group-hover:text-sky-800">
                              {targetNode?.name || edge.target}
                            </span>
                          </div>
                          {edge.evidence && edge.evidence[0] && (
                            <div className="text-[9px] text-[#687184] font-mono mt-1 truncate">
                              Line {edge.evidence[0].start_line} in {edge.evidence[0].file_path.split(/[/\\]/).pop()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhy({ edgeId: edge.id, source: edge.source, target: edge.target });
                            }}
                            className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center gap-1 transition"
                            title="Why does this relationship exist?"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Why?</span>
                          </button>
                          <ChevronRight className="w-3.5 h-3.5 text-[#A19D94] group-hover:text-[#19243B] shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-[#E2E0D9] text-center text-[#687184] text-[11px]">
                  No outgoing dependencies.
                </div>
              )}
            </div>

            <div>
              <div className="text-[10px] text-[#526078] uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                <ArrowDownLeft className="w-3.5 h-3.5 text-amber-700" />
                Incoming Callers ({incomingEdges.length})
              </div>

              {incomingEdges.length > 0 ? (
                <div className="space-y-1.5">
                  {incomingEdges.map((edge) => {
                    const sourceNode = allNodes.find((n) => n.id === edge.source);
                    const relCfg = getRelationshipCfg(edge.relationship_type);
                    return (
                      <div
                        key={edge.id}
                        onClick={() => onSelectNode(edge.source)}
                        className="p-2.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] hover:border-amber-300 hover:bg-white transition cursor-pointer flex items-center justify-between gap-2 group shadow-2xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[#19243B] text-[11px] font-bold font-mono truncate group-hover:text-amber-800">
                              {sourceNode?.name || edge.source}
                            </span>
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase border"
                              style={{ borderColor: relCfg.stroke, color: relCfg.stroke }}
                            >
                              {edge.relationship_type}
                            </span>
                          </div>
                          {edge.evidence && edge.evidence[0] && (
                            <div className="text-[9px] text-[#687184] font-mono mt-1 truncate">
                              Line {edge.evidence[0].start_line} in {edge.evidence[0].file_path.split(/[/\\]/).pop()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhy({ edgeId: edge.id, source: edge.source, target: edge.target });
                            }}
                            className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center gap-1 transition"
                            title="Why does this relationship exist?"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Why?</span>
                          </button>
                          <ChevronRight className="w-3.5 h-3.5 text-[#A19D94] group-hover:text-[#19243B] shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-[#E2E0D9] text-center text-[#687184] text-[11px]">
                  No incoming callers detected.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'evidence' && (
          <div className="space-y-3">
            <div className="text-[10px] text-[#526078] uppercase tracking-wider font-bold">
              Traceable Source Code Evidence ({node.evidence?.length || 0})
            </div>

            {node.evidence && node.evidence.length > 0 ? (
              <div className="space-y-3">
                {node.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-[#19243B] font-mono truncate">
                          {ev.file_path.split(/[/\\]/).pop()}
                        </div>
                        <div className="text-[10px] text-amber-800 font-mono font-semibold">
                          Lines {ev.start_line}-{ev.end_line}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          onOpenSource(ev.file_path, {
                            start: ev.start_line,
                            end: ev.end_line,
                          })
                        }
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#F0EEE9] text-amber-800 border border-amber-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {ev.snippet && (
                      <div className="p-2.5 rounded-lg bg-white border border-[#E2E0D9] overflow-x-auto text-[10px] text-[#19243B] font-mono">
                        <pre className="whitespace-pre-wrap">{ev.snippet}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[#E2E0D9] text-center text-[#687184]">
                No direct AST classification snippet available.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
