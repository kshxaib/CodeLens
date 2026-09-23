import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Network,
  Zap,
  X,
  FileCode2,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Layers,
  MousePointer2,
  Info,
  Code2,
  GitBranch,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import type { ArchitectureGraphData, ArchitectureNode, BlastRadiusResponse } from '../types';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorState } from '../components/common/ErrorState';

const LAYER_CONFIG: Record<string, { label: string; emoji: string; color: string; border: string; bg: string; dot: string }> = {
  presentation:  { label: 'Presentation',  emoji: '??', color: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   dot: '#f59e0b' },
  frontend:      { label: 'Frontend',       emoji: '??', color: 'text-amber-300',   border: 'border-amber-500/40',   bg: 'bg-amber-500/10',   dot: '#f59e0b' },
  api_gateway:   { label: 'API Gateway',    emoji: '??', color: 'text-sky-300',     border: 'border-sky-500/40',     bg: 'bg-sky-500/10',     dot: '#3b82f6' },
  application:   { label: 'Application',    emoji: '??', color: 'text-sky-300',     border: 'border-sky-500/40',     bg: 'bg-sky-500/10',     dot: '#3b82f6' },
  service:       { label: 'Service',        emoji: '??', color: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', dot: '#10b981' },
  domain:        { label: 'Domain',         emoji: '??', color: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', dot: '#10b981' },
  data:          { label: 'Data',           emoji: '??', color: 'text-purple-300',  border: 'border-purple-500/40',  bg: 'bg-purple-500/10',  dot: '#a855f7' },
  infrastructure:{ label: 'Infrastructure', emoji: '??', color: 'text-purple-300',  border: 'border-purple-500/40',  bg: 'bg-purple-500/10',  dot: '#a855f7' },
  unknown:       { label: 'Unknown',        emoji: '?', color: 'text-slate-400',   border: 'border-[#1f1f23]',      bg: 'bg-[#121214]',      dot: '#64748b' },
};
const getLayerCfg = (layer: string) => LAYER_CONFIG[layer] ?? LAYER_CONFIG.unknown;

const LayerNode = ({ data, selected }: any) => {
  const cfg = getLayerCfg(data.layer);
  let highlightClass = '';
  if (data.isBlastTarget) highlightClass = 'ring-2 ring-rose-500 shadow-2xl scale-105';
  else if (data.isUpstream) highlightClass = 'ring-2 ring-amber-400';
  else if (data.isDownstream) highlightClass = 'ring-2 ring-sky-400';

  return (
    <div className={`px-3 py-2.5 rounded-xl border shadow-lg transition-all min-w-[180px] bg-[#0d0d0f] ${cfg.border} ${selected ? 'ring-2 ring-amber-400 scale-105' : ''} ${highlightClass}`}>
      <Handle type="target" position={Position.Top} className="!bg-slate-600 !w-1.5 !h-1.5 !border-0" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className={`text-[9px] uppercase tracking-widest font-mono px-1.5 py-0.5 rounded-full font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>{data.layer}</span>
        <span className="text-[9px] font-mono text-slate-600">{data.symbols?.length || 0}s</span>
      </div>
      <div className="font-mono font-semibold text-[11px] text-slate-100 truncate">{data.label}</div>
      {data.file_path && <div className="text-[9px] text-slate-600 font-mono truncate mt-0.5">{data.file_path}</div>}
      <Handle type="source" position={Position.Bottom} className="!bg-slate-600 !w-1.5 !h-1.5 !border-0" />
    </div>
  );
};

const nodeTypes = { layerNode: LayerNode };

const LEGEND = [
  { emoji: '??', label: 'Presentation', sub: 'Controllers / Routes / UI',       layer: 'presentation' },
  { emoji: '??', label: 'Application',  sub: 'Services / Handlers',             layer: 'application' },
  { emoji: '??', label: 'Domain',       sub: 'Models / Entities',               layer: 'domain' },
  { emoji: '??', label: 'Infrastructure', sub: 'DB / External APIs / Config',   layer: 'infrastructure' },
];

const BLAST_LEGEND = [
  { color: 'bg-rose-500',  label: 'Target Node' },
  { color: 'bg-amber-400', label: 'Upstream Dependents' },
  { color: 'bg-sky-400',   label: 'Downstream Calls' },
];

export const ArchitectureMapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const repoId = parseInt(id || '0', 10);
  const { selectedRepo } = useWorkspaceStore();

  const [graphData, setGraphData] = useState<ArchitectureGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResponse | null>(null);
  const [blastLoading, setBlastLoading] = useState(false);
  const [leftOpen, setLeftOpen] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const fetchArchitecture = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getArchitecture(repoId);
      setGraphData(data);

      const COLS_PER_LAYER = 20;
      const COL_GAP = 240;
      const ROW_GAP = 170;
      const LAYER_Y_GAP = 200;
      const layerOrder = ['presentation','frontend','api_gateway','application','service','domain','data','infrastructure','unknown'];

      const layerBaseY: Record<string, number> = {};
      let cumulativeY = 50;
      for (const layer of layerOrder) {
        const count = (data?.nodes || []).filter((n: any) => (n.layer || n.data?.layer || 'unknown') === layer).length;
        layerBaseY[layer] = cumulativeY;
        cumulativeY += (Math.ceil(count / COLS_PER_LAYER) || 1) * ROW_GAP + LAYER_Y_GAP;
      }

      const layerCounters: Record<string, number> = {};
      const rawNodes = data?.nodes || [];
      const rawEdges = data?.edges || [];

      const flowNodes: Node[] = rawNodes.map((n: any) => {
        const nodeData = n.data || {};
        const layer = n.layer || nodeData.layer || 'unknown';
        const normalizedLayer = layerOrder.includes(layer) ? layer : 'unknown';
        if (!(normalizedLayer in layerCounters)) layerCounters[normalizedLayer] = 0;
        const idx = layerCounters[normalizedLayer]++;
        const xPos = 50 + (idx % COLS_PER_LAYER) * COL_GAP;
        const yPos = (layerBaseY[normalizedLayer] ?? 50) + Math.floor(idx / COLS_PER_LAYER) * ROW_GAP;
        const filePath = nodeData.filePath || nodeData.file_path || n.file_path || '';
        const rawLabel = nodeData.label || n.label || (filePath ? filePath.split(/[/\\]/).pop() : n.id || 'Module');
        return {
          id: n.id,
          type: 'layerNode',
          position: n.position || { x: xPos, y: yPos },
          data: { ...nodeData, ...n, label: rawLabel, file_path: filePath, layer: normalizedLayer, symbols: nodeData.topSymbols || n.symbols || [] },
        };
      });

      const flowEdges: Edge[] = rawEdges.map((e: any, idx: number) => ({
        id: e.id || `edge-${idx}`,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: 'rgba(245,158,11,0.35)', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err: any) {
      setError(err.message || 'Failed to generate repository architecture topology.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (repoId) fetchArchitecture(); }, [repoId]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const matched = graphData?.nodes.find((n) => n.id === node.id);
      setSelectedNode(matched || (node.data as any));
      setBlastRadius(null);
    },
    [graphData]
  );

  const handleComputeBlastRadius = async (symbolName?: string) => {
    if (!selectedNode) return;
    const targetSymbol = symbolName || selectedNode.symbols?.[0]?.name || selectedNode.label;
    try {
      setBlastLoading(true);
      const res = await api.getBlastRadius(repoId, targetSymbol);
      setBlastRadius(res);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isBlastTarget: n.id === selectedNode.id,
            isUpstream: res.upstream_dependents.some((u) => u.includes(n.data.label as string)),
            isDownstream: res.downstream_dependencies.some((d) => d.includes(n.data.label as string)),
          },
        }))
      );
    } catch (err: any) {
      console.error('Blast radius error:', err);
    } finally {
      setBlastLoading(false);
    }
  };

  const clearBlastRadius = () => {
    setBlastRadius(null);
    setNodes((nds) => nds.map((n) => ({ ...n, data: { ...n.data, isBlastTarget: false, isUpstream: false, isDownstream: false } })));
  };

  const layerStats = nodes.reduce<Record<string, number>>((acc, n) => {
    const l = (n.data as any).layer || 'unknown';
    acc[l] = (acc[l] || 0) + 1;
    return acc;
  }, {});

  if (loading) return <LoadingScreen title="Rendering Architecture Topology" message="Analyzing Tree-sitter AST nodes and dependency graph..." />;
  if (error) return <ErrorState type="general" title="Topology Generation Failed" message={error} onRetry={fetchArchitecture} />;

  return (
    <WorkspaceLayout>
      <style>{`
        .arc-left { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease, transform 0.28s cubic-bezier(0.4,0,0.2,1); }
        .arc-left.open  { width:260px; opacity:1; transform:translateX(0); }
        .arc-left.closed{ width:0px;   opacity:0; transform:translateX(-20px); overflow:hidden; }
        .arc-right { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease; }
        .arc-right.open  { width:340px; opacity:1; }
        .arc-right.closed{ width:0px;   opacity:0; pointer-events:none; overflow:hidden; }
        .arc-topbar { transition: left 0.28s cubic-bezier(0.4,0,0.2,1); }
        .arc-toggle-btn { transition: left 0.28s cubic-bezier(0.4,0,0.2,1); }
      `}</style>

      <div className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] overflow-hidden bg-[#000000] flex">

        {/* LEFT SIDEBAR */}
        <div className={`arc-left flex-shrink-0 h-full bg-[#09090b] border-r border-[#1f1f23] flex flex-col ${leftOpen ? 'open' : 'closed'}`}>
          <div className="flex flex-col h-full overflow-y-auto p-4 min-w-[260px]">
            <div className="flex items-center gap-2 mb-5">
              <Layers className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">Layer Guide</span>
            </div>

            {/* Legend */}
            <div className="space-y-2 mb-6">
              {LEGEND.map((l) => {
                const cfg = getLayerCfg(l.layer);
                const count = layerStats[l.layer] ?? 0;
                return (
                  <div key={l.layer} className={`flex items-start gap-2.5 p-2.5 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                    <span className="text-base leading-none mt-0.5">{l.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-bold font-mono ${cfg.color}`}>{l.label}</div>
                      <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{l.sub}</div>
                    </div>
                    {count > 0 && <span className={`text-[10px] font-mono font-bold ${cfg.color} mt-0.5`}>{count}</span>}
                  </div>
                );
              })}
            </div>

            {/* Blast colors */}
            <div className="mb-6">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider font-mono">Blast Radius Colors</span>
              </div>
              <div className="space-y-1.5">
                {BLAST_LEGEND.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${b.color}`} />
                    <span className="text-[10px] text-slate-400 font-mono">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How to use */}
            <div className="border-t border-[#1f1f23] pt-4">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">How to Use</span>
              </div>
              <ul className="space-y-2">
                {[
                  { icon: <MousePointer2 className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />, text: 'Click any node to inspect details in the right panel.' },
                  { icon: <Zap className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />, text: 'Press "Analyze Impact Radius" to highlight upstream & downstream.' },
                  { icon: <GitBranch className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />, text: 'Scroll to zoom · Drag to pan · MiniMap to jump.' },
                  { icon: <Code2 className="w-3 h-3 text-slate-500 flex-shrink-0 mt-0.5" />, text: 'Click a symbol in the drawer to blast on that specific symbol.' },
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    {s.icon}
                    <span className="text-[10px] text-slate-500 leading-snug font-mono">{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats */}
            <div className="mt-auto pt-4 border-t border-[#1f1f23]">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-[#111113] border border-[#1f1f23] text-center">
                  <div className="text-base font-bold text-amber-400 font-mono">{nodes.length}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Nodes</div>
                </div>
                <div className="p-2.5 rounded-xl bg-[#111113] border border-[#1f1f23] text-center">
                  <div className="text-base font-bold text-sky-400 font-mono">{edges.length}</div>
                  <div className="text-[9px] text-slate-500 uppercase tracking-wider">Edges</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR TOGGLE ARROW */}
        <button
          onClick={() => setLeftOpen((v) => !v)}
          title={leftOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="arc-toggle-btn absolute top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-5 h-10 bg-[#18181b] border border-[#1f1f23] border-l-0 rounded-r-lg text-slate-500 hover:text-white hover:bg-[#232326] transition cursor-pointer shadow-xl"
          style={{ left: leftOpen ? '260px' : '0px' }}
        >
          {leftOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* TOP BAR */}
        <div
          className="arc-topbar absolute top-4 z-30 flex items-center gap-3 bg-[#09090b]/90 backdrop-blur-xl border border-[#1f1f23] px-3 py-2 rounded-2xl shadow-2xl"
          style={{ left: leftOpen ? '276px' : '16px' }}
        >
          <button onClick={() => setLeftOpen((v) => !v)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer">
            {leftOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
          <div className="w-px h-4 bg-[#1f1f23]" />
          <Link to={`/repository/${repoId}`} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#18181b] transition cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white font-mono">{selectedRepo?.name || 'Architecture Map'}</span>
            <span className="text-[10px] text-slate-500 font-mono">{nodes.length} nodes · {edges.length} edges</span>
          </div>
          {blastRadius && (
            <button onClick={clearBlastRadius} className="ml-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 px-2.5 py-1 rounded-lg border border-rose-500/30 transition cursor-pointer">
              <X className="w-3 h-3" /> Clear Focus
            </button>
          )}
        </div>

        {/* CANVAS */}
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            minZoom={0.05}
            maxZoom={2}
            className="bg-[#000000]"
            style={{ width: '100%', height: '100%' }}
          >
            <Background color="rgba(255,255,255,0.03)" gap={24} size={1} />
            <Controls showInteractive={false} className="!bg-[#09090b] !border-[#1f1f23] !rounded-xl !text-slate-300" />
            <MiniMap
              nodeColor={(n) => getLayerCfg((n.data as any)?.layer || 'unknown').dot}
              zoomable
              pannable
              className="!bg-[#09090b] !border-[#1f1f23] !rounded-xl overflow-hidden"
            />
          </ReactFlow>
        </div>

        {/* RIGHT DRAWER */}
        <div className={`arc-right flex-shrink-0 h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl flex flex-col z-30 ${selectedNode ? 'open' : 'closed'}`}>
          {selectedNode && (
            <div className="flex flex-col h-full overflow-y-auto p-5 min-w-[340px]">

              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-[#1f1f23] mb-4 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <h3 className="text-sm font-bold text-white font-mono leading-tight break-all">{selectedNode.label}</h3>
                </div>
                <button onClick={() => { setSelectedNode(null); clearBlastRadius(); }} className="p-1 rounded-lg text-slate-500 hover:text-white hover:bg-[#18181b] transition cursor-pointer flex-shrink-0">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Layer badge */}
              {(() => {
                const cfg = getLayerCfg(selectedNode.layer || 'unknown');
                const leg = LEGEND.find((l) => l.layer === selectedNode.layer);
                return (
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border mb-4 ${cfg.border} ${cfg.bg}`}>
                    <span className="text-lg">{leg?.emoji ?? '?'}</span>
                    <div>
                      <div className={`text-[11px] font-bold font-mono ${cfg.color}`}>{cfg.label} Layer</div>
                      <div className="text-[10px] text-slate-500">{leg?.sub ?? 'Module'}</div>
                    </div>
                  </div>
                );
              })()}

              {/* Meta */}
              <div className="space-y-3 text-xs font-mono mb-5">
                {selectedNode.file_path && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">File Path</span>
                    <span className="text-slate-300 break-all text-[11px] leading-relaxed">{selectedNode.file_path}</span>
                  </div>
                )}
                {selectedNode.id && (
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-0.5">Node ID</span>
                    <span className="text-slate-500 text-[10px]">{selectedNode.id}</span>
                  </div>
                )}
              </div>

              {/* AST Symbols */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-bold">
                    AST Symbols ({selectedNode.symbols?.length || 0})
                  </span>
                  {selectedNode.symbols && selectedNode.symbols.length > 0 && (
                    <span className="text-[9px] text-slate-600 font-mono">click to blast</span>
                  )}
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto pr-1">
                  {selectedNode.symbols && selectedNode.symbols.length > 0 ? (
                    selectedNode.symbols.map((sym: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleComputeBlastRadius(sym.name)}
                        className="w-full flex items-center justify-between p-2 rounded-lg bg-[#111113] border border-[#1f1f23] hover:border-amber-500/40 hover:bg-amber-500/5 transition cursor-pointer text-left group"
                      >
                        <div className="min-w-0">
                          <span className="text-amber-300 font-bold text-[11px] group-hover:text-amber-200 truncate block">{sym.name}</span>
                          <span className="text-[9px] text-slate-600 font-sans capitalize">{sym.kind}</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                          <span className="text-[9px] text-slate-600 font-mono">L:{sym.line_number}</span>
                          <Zap className="w-2.5 h-2.5 text-slate-700 group-hover:text-amber-400 transition" />
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="flex items-center gap-1.5 p-3 rounded-lg bg-[#111113] border border-[#1f1f23]">
                      <AlertTriangle className="w-3 h-3 text-slate-600" />
                      <span className="text-slate-600 text-[10px]">No high-level symbols found.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Blast Radius */}
              <div className="border-t border-[#1f1f23] pt-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white font-mono">Impact Radius Analysis</span>
                </div>

                {blastRadius ? (
                  <div className="rounded-xl border border-[#1f1f23] overflow-hidden">
                    <div className="flex justify-between items-center px-3 py-2.5 bg-rose-500/10 border-b border-[#1f1f23]">
                      <span className="text-[10px] text-slate-400 font-mono">Target Symbol</span>
                      <span className="font-bold text-rose-300 font-mono text-[11px]">{blastRadius.target_symbol}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2.5 border-b border-[#1f1f23]">
                      <span className="text-[10px] text-slate-400 font-mono">Impact Level</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">{blastRadius.impact_level}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2.5 border-b border-[#1f1f23]">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                        <span className="text-[10px] text-slate-400 font-mono">Upstream Dependents</span>
                      </div>
                      <span className="font-mono text-amber-300 font-bold text-sm">{blastRadius.upstream_count}</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-400 flex-shrink-0" />
                        <span className="text-[10px] text-slate-400 font-mono">Downstream Calls</span>
                      </div>
                      <span className="font-mono text-sky-300 font-bold text-sm">{blastRadius.downstream_count}</span>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleComputeBlastRadius()}
                    disabled={blastLoading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-[#0d1017] text-xs font-bold py-2.5 px-4 rounded-xl transition disabled:opacity-50 cursor-pointer"
                  >
                    {blastLoading ? (<><Loader2 className="w-3.5 h-3.5 animate-spin" />Computing...</>) : (<><Zap className="w-3.5 h-3.5" />Analyze Impact Radius</>)}
                  </button>
                )}
              </div>

              {/* Footer */}
              <div className="mt-auto pt-4 border-t border-[#1f1f23] text-center">
                <Link to={`/chat?repository=${repoId}`} className="text-[11px] text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1 cursor-pointer transition">
                  Ask AI Copilot about this module <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  );
};
