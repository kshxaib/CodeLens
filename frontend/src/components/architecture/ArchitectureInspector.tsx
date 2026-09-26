import React, { useState } from 'react';
import {
  X,
  FileCode2,
  ExternalLink,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Loader2,
  Code,
  Info,
  HelpCircle,
  Compass,
  ShieldAlert,
} from 'lucide-react';
import { ARCH_TIERS, CONFIDENCE_BADGES, getRelationshipCfg, getNodeTier } from './constants';
import type { ArchKGNode, ArchKGEdge } from '../../types';
import { useTrace } from '../../store/useTraceStore';

interface ArchitectureInspectorProps {
  node: ArchKGNode;
  allNodes: ArchKGNode[];
  edges: ArchKGEdge[];
  repositoryId?: number;
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
  onAnalyzeBlastRadius: (symbolName: string) => void;
  blastLoading?: boolean;
}

export const ArchitectureInspector: React.FC<ArchitectureInspectorProps> = ({
  node,
  allNodes,
  edges,
  onClose,
  onSelectNode,
  onOpenSource,
  onAnalyzeBlastRadius,
  blastLoading = false,
}) => {
  const { openExplain, openWhy, selectTraceNode, calculateImpact } = useTrace();
  const [activeTab, setActiveTab] = useState<'overview' | 'modules' | 'symbols' | 'relationships' | 'evidence'>('overview');

  const tierKey = getNodeTier(node.type, node.layer);
  const tierCfg = ARCH_TIERS[tierKey] || ARCH_TIERS.application;
  const confBadge = CONFIDENCE_BADGES[node.confidence_level] || CONFIDENCE_BADGES.deterministic;

  // Incoming and outgoing edges for this node
  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  const primarySourceFile = node.source_files?.[0] || '';

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl overflow-hidden min-w-[380px] max-w-[420px] z-30 select-text">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]/80 backdrop-blur-md flex items-start justify-between gap-3">
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

          <h2 className="text-base font-bold text-white font-mono break-all leading-tight">
            {node.name || node.display_name}
          </h2>
          <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
            Type: <span className="text-zinc-200 uppercase font-semibold">{node.type.replace('_', ' ')}</span>
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

      {/* Progressive Detail Stepper / Navigation Tabs */}
      <div className="flex items-center border-b border-[#1f1f23] bg-[#070709] px-2 py-1 gap-1 text-[11px] font-mono overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('modules')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'modules'
              ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Modules
          <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
            {node.source_files?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('symbols')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'symbols'
              ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Symbols
          <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
            {node.symbols?.length || 0}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('relationships')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'relationships'
              ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Links
          <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
            {incomingEdges.length + outgoingEdges.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('evidence')}
          className={`px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'evidence'
              ? 'bg-amber-400/10 text-amber-300 font-bold border border-amber-400/20'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Evidence
          <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300">
            {node.evidence?.length || 0}
          </span>
        </button>
      </div>

      {/* Inspector Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Trace & AI Action Buttons */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => selectTraceNode(node.id)}
                className="py-2 px-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-sm text-[11px]"
                title="Trace Upstream callers and Downstream callees"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Trace</span>
              </button>

              <button
                onClick={() => openExplain(node.id)}
                className="py-2 px-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-sm text-[11px]"
                title="Explain component using evidence-first synthesis"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Explain</span>
              </button>

              <button
                onClick={() => calculateImpact(node.id)}
                className="py-2 px-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 font-bold flex items-center justify-center gap-1 transition cursor-pointer shadow-sm text-[11px]"
                title="Calculate dependent impact and depth"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Impact</span>
              </button>
            </div>

            {/* Quick Action: Open Primary Source */}
            {primarySourceFile && (
              <button
                onClick={() => onOpenSource(primarySourceFile)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 to-amber-600/10 hover:from-amber-500/25 hover:to-amber-600/20 border border-amber-500/30 text-amber-300 font-bold flex items-center justify-between transition cursor-pointer shadow-md group"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileCode2 className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate text-xs">{primarySourceFile.split(/[/\\]/).pop()}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-400/80 group-hover:text-amber-300 shrink-0">
                  <span>Open Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </button>
            )}

            {/* Description */}
            <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-1.5">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
                Description
              </span>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                {node.description ||
                  `Architecture ${node.type} component mapped to the ${tierCfg.label} layer.`}
              </p>
            </div>

            {/* Connection Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl border border-[#1f1f23] bg-[#0c0c0e]">
                <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                  <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[10px] uppercase font-bold">Incoming Calls</span>
                </div>
                <div className="text-xl font-bold text-white">{incomingEdges.length}</div>
                <span className="text-[10px] text-zinc-500">Dependents calling this</span>
              </div>

              <div className="p-3 rounded-xl border border-[#1f1f23] bg-[#0c0c0e]">
                <div className="flex items-center gap-1.5 text-zinc-400 mb-1">
                  <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                  <span className="text-[10px] uppercase font-bold">Outgoing Calls</span>
                </div>
                <div className="text-xl font-bold text-white">{outgoingEdges.length}</div>
                <span className="text-[10px] text-zinc-500">Dependencies consumed</span>
              </div>
            </div>

            {/* Progressive Detail Guide Card */}
            <div className="p-3.5 rounded-xl border border-dashed border-[#27272a] bg-[#09090b]/80 space-y-2">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-bold uppercase">
                <Info className="w-3.5 h-3.5" /> Progressive Detail Drilldown
              </div>
              <div className="text-[11px] text-zinc-400 space-y-1 leading-relaxed">
                <div>1. <span className="text-white font-bold">Component:</span> {node.name}</div>
                <div>2. <span className="text-white font-bold">Modules:</span> {node.source_files?.length || 0} source file(s)</div>
                <div>3. <span className="text-white font-bold">Symbols:</span> {node.symbols?.length || 0} AST symbols extracted</div>
                <div>4. <span className="text-white font-bold">Exact Source:</span> Click any symbol or evidence to view code</div>
              </div>
            </div>

            {/* Impact Analysis Action */}
            <div className="border-t border-[#1f1f23] pt-4">
              <button
                onClick={() => onAnalyzeBlastRadius(node.id || node.name)}
                disabled={blastLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-lg disabled:opacity-50"
              >
                {blastLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Blast Radius...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Highlight Impact Dependency Path</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: MODULES (SOURCE FILES) */}
        {activeTab === 'modules' && (
          <div className="space-y-3">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
              Underlying Source Files ({node.source_files?.length || 0})
            </div>

            {node.source_files && node.source_files.length > 0 ? (
              <div className="space-y-2">
                {node.source_files.map((file, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] hover:border-zinc-600 transition flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCode2 className="w-4 h-4 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white font-mono text-[11px] truncate font-semibold">
                          {file.split(/[/\\]/).pop()}
                        </div>
                        <div className="text-zinc-500 text-[10px] font-mono truncate max-w-[200px]" title={file}>
                          {file}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onOpenSource(file)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-semibold flex items-center gap-1 transition cursor-pointer shrink-0"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[#1f1f23] text-center text-zinc-500">
                No local source file (inferred or synthetic entity such as PostgreSQL or third-party API).
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SYMBOLS (AST EXTRACTED) */}
        {activeTab === 'symbols' && (
          <div className="space-y-3">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
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
                    className="p-2.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] hover:border-amber-400/50 hover:bg-[#121215] transition cursor-pointer flex items-center justify-between gap-2 group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Code className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-white font-mono text-[11px] font-semibold truncate group-hover:text-amber-300 transition-colors">
                          {sym.name}
                        </div>
                        <div className="text-zinc-500 text-[10px] font-mono flex items-center gap-2">
                          <span className="uppercase text-[9px] text-zinc-400 font-bold">{sym.kind}</span>
                          <span>Line {sym.line_number}</span>
                        </div>
                      </div>
                    </div>

                    <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                      View code <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[#1f1f23] text-center text-zinc-500">
                No AST symbols found for this node.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: RELATIONSHIPS */}
        {activeTab === 'relationships' && (
          <div className="space-y-4">
            {/* Outgoing Calls */}
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                Outgoing Calls & Dependencies ({outgoingEdges.length})
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
                        className="p-2.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] hover:border-sky-400/50 hover:bg-[#121215] transition cursor-pointer flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase border"
                              style={{ borderColor: relCfg.stroke, color: relCfg.stroke }}
                            >
                              {edge.relationship_type}
                            </span>
                            <span className="text-white text-[11px] font-bold font-mono truncate group-hover:text-sky-300">
                              {targetNode?.name || edge.target}
                            </span>
                          </div>
                          {edge.evidence && edge.evidence[0] && (
                            <div className="text-[9px] text-zinc-500 font-mono mt-1 truncate">
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
                            className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition"
                            title="Why does this relationship exist?"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Why?</span>
                          </button>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-[#1f1f23] text-center text-zinc-500 text-[11px]">
                  No outgoing dependencies.
                </div>
              )}
            </div>

            {/* Incoming Calls */}
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                <ArrowDownLeft className="w-3.5 h-3.5 text-amber-400" />
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
                        className="p-2.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] hover:border-amber-400/50 hover:bg-[#121215] transition cursor-pointer flex items-center justify-between gap-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-[11px] font-bold font-mono truncate group-hover:text-amber-300">
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
                            <div className="text-[9px] text-zinc-500 font-mono mt-1 truncate">
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
                            className="px-2 py-0.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition"
                            title="Why does this relationship exist?"
                          >
                            <HelpCircle className="w-3 h-3" />
                            <span>Why?</span>
                          </button>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-white shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-[#1f1f23] text-center text-zinc-500 text-[11px]">
                  No incoming callers detected.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SOURCE EVIDENCE */}
        {activeTab === 'evidence' && (
          <div className="space-y-3">
            <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
              Traceable Source Code Evidence ({node.evidence?.length || 0})
            </div>

            {node.evidence && node.evidence.length > 0 ? (
              <div className="space-y-3">
                {node.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white font-mono truncate">
                          {ev.file_path.split(/[/\\]/).pop()}
                        </div>
                        <div className="text-[10px] text-amber-400 font-mono">
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
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>

                    {ev.snippet && (
                      <div className="p-2.5 rounded-lg bg-[#070709] border border-[#18181b] overflow-x-auto text-[10px] text-zinc-300 font-mono">
                        <pre className="whitespace-pre-wrap">{ev.snippet}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-[#1f1f23] text-center text-zinc-500">
                No direct AST classification snippet available.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
