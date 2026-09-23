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
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { useWorkspace } from '../context/WorkspaceContext';
import type { ArchitectureGraphData, ArchitectureNode, BlastRadiusResponse } from '../types';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { ErrorState } from '../components/common/ErrorState';

// Custom CustomNode for React Flow
const LayerNode = ({ data, selected }: any) => {
  const getLayerColor = (layer: string) => {
    switch (layer) {
      case 'presentation':
        return 'border-purple-500/50 bg-purple-950/40 text-purple-200 shadow-purple-500/10';
      case 'application':
        return 'border-blue-500/50 bg-blue-950/40 text-blue-200 shadow-blue-500/10';
      case 'domain':
        return 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200 shadow-emerald-500/10';
      case 'infrastructure':
        return 'border-amber-500/50 bg-amber-950/40 text-amber-200 shadow-amber-500/10';
      default:
        return 'border-slate-500/40 bg-slate-900/40 text-slate-300';
    }
  };

  const isBlastTarget = data.isBlastTarget;
  const isUpstream = data.isUpstream;
  const isDownstream = data.isDownstream;

  let highlightClass = '';
  if (isBlastTarget) {
    highlightClass = 'ring-4 ring-rose-500 bg-rose-950/60 shadow-2xl scale-105';
  } else if (isUpstream) {
    highlightClass = 'ring-2 ring-amber-400 bg-amber-950/40';
  } else if (isDownstream) {
    highlightClass = 'ring-2 ring-cyan-400 bg-cyan-950/40';
  }

  return (
    <div
      className={`px-4 py-3 rounded-2xl border backdrop-blur-md shadow-xl transition-all min-w-[200px] ${getLayerColor(
        data.layer
      )} ${selected ? 'ring-2 ring-purple-400 scale-105' : ''} ${highlightClass}`}
    >
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-2 !h-2" />
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded-full bg-white/[0.08] font-bold">
          {data.layer}
        </span>
        <span className="text-[10px] font-mono opacity-75">{data.symbols?.length || 0} syms</span>
      </div>
      <div className="font-mono font-bold text-xs truncate">{data.label}</div>
      <div className="text-[10px] opacity-60 font-mono truncate mt-0.5">{data.file_path}</div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-400 !w-2 !h-2" />
    </div>
  );
};

const nodeTypes = {
  layerNode: LayerNode,
};

export const ArchitectureMapPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const repoId = parseInt(id || '0', 10);
  const { selectedRepo } = useWorkspace();

  const [graphData, setGraphData] = useState<ArchitectureGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResponse | null>(null);
  const [blastLoading, setBlastLoading] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Fetch graph from API
  const fetchArchitecture = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getArchitecture(repoId);
      setGraphData(data);

      // Auto Layout Nodes in 4 Layer Bands
      const layerPositions: Record<string, { x: number; y: number; count: number }> = {
        presentation: { x: 50, y: 50, count: 0 },
        application: { x: 50, y: 220, count: 0 },
        domain: { x: 50, y: 390, count: 0 },
        infrastructure: { x: 50, y: 560, count: 0 },
        unknown: { x: 50, y: 730, count: 0 },
      };

      const flowNodes: Node[] = data.nodes.map((n) => {
        const layer = n.layer || 'unknown';
        const posMeta = layerPositions[layer] || layerPositions.unknown;
        const xPos = posMeta.x + posMeta.count * 250;
        const yPos = posMeta.y;
        posMeta.count += 1;

        return {
          id: n.id,
          type: 'layerNode',
          position: { x: xPos, y: yPos },
          data: {
            ...n,
            label: n.label || n.file_path.split('/').pop(),
          },
        };
      });

      const flowEdges: Edge[] = data.edges.map((e, idx) => ({
        id: e.id || `edge-${idx}`,
        source: e.source,
        target: e.target,
        animated: true,
        style: { stroke: 'rgba(168, 85, 247, 0.4)', strokeWidth: 1.5 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#a855f7' },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
    } catch (err: any) {
      setError(err.message || 'Failed to generate repository architecture topology.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (repoId) fetchArchitecture();
  }, [repoId]);

  // Handle node selection
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const matched = graphData?.nodes.find((n) => n.id === node.id);
      setSelectedNode(matched || (node.data as any));
      setBlastRadius(null);
    },
    [graphData]
  );

  // Trigger Blast Radius for first symbol or file
  const handleComputeBlastRadius = async (symbolName?: string) => {
    if (!selectedNode) return;
    const targetSymbol = symbolName || selectedNode.symbols?.[0]?.name || selectedNode.label;
    try {
      setBlastLoading(true);
      const res = await api.getBlastRadius(repoId, targetSymbol);
      setBlastRadius(res);

      // Re-style nodes to highlight dependencies
      setNodes((nds) =>
        nds.map((n) => {
          const isTarget = n.id === selectedNode.id;
          const isUp = res.upstream_dependents.some((u) => u.includes(n.data.label as string));
          const isDown = res.downstream_dependencies.some((d) => d.includes(n.data.label as string));

          return {
            ...n,
            data: {
              ...n.data,
              isBlastTarget: isTarget,
              isUpstream: isUp,
              isDownstream: isDown,
            },
          };
        })
      );
    } catch (err: any) {
      console.error('Blast radius calculation error:', err);
    } finally {
      setBlastLoading(false);
    }
  };

  const clearBlastRadius = () => {
    setBlastRadius(null);
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isBlastTarget: false,
          isUpstream: false,
          isDownstream: false,
        },
      }))
    );
  };

  if (loading) {
    return <LoadingScreen title="Rendering Architecture Topology" message="Analyzing Tree-sitter AST nodes and dependency graph..." />;
  }

  if (error) {
    return <ErrorState type="general" title="Topology Generation Failed" message={error} onRetry={fetchArchitecture} />;
  }

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] flex overflow-hidden bg-[#0a0c10]">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#121622]/90 backdrop-blur-xl border border-white/[0.1] px-4 py-2 rounded-2xl shadow-2xl">
        <Link
          to={`/repository/${repoId}`}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-purple-400" />
          <span className="text-xs font-bold text-white font-mono">
            {selectedRepo?.name || 'Architecture Map'}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">({nodes.length} Nodes)</span>
        </div>

        {blastRadius && (
          <button
            onClick={clearBlastRadius}
            className="ml-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 px-2.5 py-1 rounded-lg border border-rose-500/30 transition cursor-pointer"
          >
            <X className="w-3 h-3" /> Clear Blast Focus
          </button>
        )}
      </div>

      {/* React Flow Interactive Canvas (Screen 10, 13) */}
      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-[#0a0c10]"
        >
          <Background color="rgba(255, 255, 255, 0.05)" gap={20} size={1} />
          <Controls className="!bg-[#121622] !border-white/[0.1] !rounded-xl !text-slate-300" />
          <MiniMap
            nodeColor={(n) => {
              switch ((n.data as any)?.layer) {
                case 'presentation':
                  return '#8b5cf6';
                case 'application':
                  return '#3b82f6';
                case 'domain':
                  return '#10b981';
                case 'infrastructure':
                  return '#f59e0b';
                default:
                  return '#64748b';
              }
            }}
            className="!bg-[#121622] !border-white/[0.1] !rounded-xl overflow-hidden"
          />
        </ReactFlow>
      </div>

      {/* Right Drawer: Node Inspector & Blast Radius (Screen 11, 12) */}
      {selectedNode && (
        <div className="w-80 sm:w-96 h-full bg-[#111420]/95 backdrop-blur-2xl border-l border-white/[0.1] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto z-30 animate-fadeIn">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-4">
              <div className="flex items-center gap-2">
                <FileCode2 className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white truncate font-mono">{selectedNode.label}</h3>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Node Metadata */}
            <div className="space-y-4 text-xs font-mono">
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">File Path</span>
                <span className="text-slate-200 break-all">{selectedNode.file_path}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] uppercase">Architectural Layer</span>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase mt-0.5">
                  {selectedNode.layer}
                </span>
              </div>

              {/* Extracted AST Symbols */}
              <div>
                <span className="text-slate-500 block text-[10px] uppercase mb-1.5">
                  AST Symbols ({selectedNode.symbols?.length || 0})
                </span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedNode.symbols && selectedNode.symbols.length > 0 ? (
                    selectedNode.symbols.map((sym, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-white/[0.03] border border-white/[0.05]"
                      >
                        <div>
                          <span className="text-purple-300 font-bold">{sym.name}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5 font-sans">({sym.kind})</span>
                        </div>
                        <span className="text-[10px] text-slate-600">L:{sym.line_number}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 text-[11px]">No high-level symbols found.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Blast Radius Section (Screen 12) */}
            <div className="mt-6 pt-5 border-t border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" /> Blast Radius Analysis
                </span>
              </div>

              {blastRadius ? (
                <div className="space-y-3 p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Target Symbol</span>
                    <span className="font-bold text-cyan-300 font-mono">{blastRadius.target_symbol}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Impact Level</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {blastRadius.impact_level}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] pt-2 border-t border-white/[0.08]">
                    <span>Upstream Dependents</span>
                    <span className="font-mono text-amber-300 font-bold">{blastRadius.upstream_count}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span>Downstream Calls</span>
                    <span className="font-mono text-cyan-300 font-bold">{blastRadius.downstream_count}</span>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => handleComputeBlastRadius()}
                  disabled={blastLoading}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-lg glow-cyan transition disabled:opacity-50 cursor-pointer"
                >
                  {blastLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Computing Blast Radius...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" />
                      <span>Analyze Impact Radius</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/[0.08] text-center">
            <Link
              to={`/chat?repository=${repoId}`}
              className="text-xs text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              Ask AI Copilot about this module <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
