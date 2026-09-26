import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
  Zap,
  X,
  ChevronRight,
  ChevronLeft,
  Layers,
  MousePointer2,
  Info,
  Code2,
  GitBranch,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import type { KnowledgeGraphData, BlastRadiusResponse } from '../types';
import { ErrorState } from '../components/common/ErrorState';
import { ArchitectureNode } from '../components/architecture/ArchitectureNode';
import { ArchitectureEdge } from '../components/architecture/ArchitectureEdge';
import { ArchitectureInspector } from '../components/architecture/ArchitectureInspector';
import { ArchitectureToolbar } from '../components/architecture/ArchitectureToolbar';
import { getLayoutedElements } from '../components/architecture/layout';
import { ARCH_TIERS, getNodeTier } from '../components/architecture/constants';
import { CodeViewerModal } from '../components/code/CodeViewerModal';
import { WorkflowView } from '../components/workflow/WorkflowView';
import { DataFlowView } from '../components/dataflow/DataFlowView';
import { SequenceView } from '../components/sequence/SequenceView';

const nodeTypes = {
  architectureNode: ArchitectureNode,
};

const edgeTypes = {
  architectureEdge: ArchitectureEdge,
};

const BLAST_LEGEND = [
  { color: 'bg-amber-400', label: 'Selected / Target Entity' },
  { color: 'bg-amber-400', label: 'Upstream Callers (Dependents)' },
  { color: 'bg-sky-400', label: 'Downstream Dependencies' },
];

const ArchitectureMapCanvas: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const repoId = parseInt(id || '0', 10);
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Raw Knowledge Graph Data from backend
  const [kgData, setKgData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentView, setCurrentView] = useState<'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle'>('architecture');

  // Filtering & View Mode
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRel, setSelectedRel] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [viewMode, setViewMode] = useState<'system' | 'full'>('system');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');

  // Blast radius state
  const [blastRadius, setBlastRadius] = useState<BlastRadiusResponse | null>(null);
  const [blastLoading, setBlastLoading] = useState(false);

  // Source code viewer modal state
  const [codeViewerState, setCodeViewerState] = useState<{
    isOpen: boolean;
    filePath?: string;
    highlightLines?: { start: number; end: number };
  }>({ isOpen: false });

  // React Flow elements
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ---------------------------------------------------------------------------
  // Data Fetching
  // ---------------------------------------------------------------------------
  const fetchKnowledgeGraph = useCallback(async (forceRebuild = false) => {
    try {
      if (forceRebuild) {
        setIsRebuilding(true);
      } else {
        setLoading(true);
      }
      setError(null);

      let data: KnowledgeGraphData;
      if (forceRebuild) {
        data = await api.buildKnowledgeGraph(repoId);
      } else {
        try {
          data = await api.getKnowledgeGraph(repoId);
        } catch (fetchErr: any) {
          // If 404 or missing, automatically trigger on-demand build
          data = await api.buildKnowledgeGraph(repoId);
        }
      }

      setKgData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to generate Architecture Knowledge Graph.');
    } finally {
      setLoading(false);
      setIsRebuilding(false);
    }
  }, [repoId]);

  useEffect(() => {
    if (repoId) {
      fetchKnowledgeGraph();
    }
  }, [repoId, fetchKnowledgeGraph]);

  // ---------------------------------------------------------------------------
  // Graph Filtering & Layout Transformation
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!kgData) return;

    const rawNodes = kgData.nodes || [];
    const rawEdges = kgData.edges || [];

    // Filter nodes according to viewMode, tier, type, scope, and search
    const filteredNodes = rawNodes.filter((n) => {
      const tierKey = getNodeTier(n.type, n.layer);

      // View mode filter: 'system' shows semantic components, services, APIs, databases, external
      if (viewMode === 'system') {
        const isUtilityModule =
          (n.type === 'module' || n.type === 'function' || n.type === 'class') &&
          (!n.symbols || n.symbols.length === 0);
        if (isUtilityModule) return false;
      }

      // Tier filter
      if (selectedTier !== 'all' && tierKey !== selectedTier) return false;

      // Entity type filter
      if (selectedType !== 'all') {
        if (selectedType === 'queue' && n.type !== 'queue' && n.type !== 'worker') return false;
        else if (selectedType !== 'queue' && n.type !== selectedType) return false;
      }

      // Scope filter
      if (scopeFilter === 'internal' && n.type === 'external_service') return false;
      if (scopeFilter === 'external' && n.type !== 'external_service') return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (n.name || '').toLowerCase().includes(q);
        const matchesDisplay = (n.display_name || '').toLowerCase().includes(q);
        const matchesType = (n.type || '').toLowerCase().includes(q);
        const matchesFile = (n.source_files || []).some((f) => f.toLowerCase().includes(q));
        const matchesSymbol = (n.symbols || []).some((s) => s.name.toLowerCase().includes(q));
        if (!matchesName && !matchesDisplay && !matchesType && !matchesFile && !matchesSymbol) {
          return false;
        }
      }

      return true;
    });

    const visibleNodeIdSet = new Set(filteredNodes.map((n) => n.id));

    // Filter edges: both source and target must be visible, plus relationship filter
    const filteredEdges = rawEdges.filter((e) => {
      if (!visibleNodeIdSet.has(e.source) || !visibleNodeIdSet.has(e.target)) return false;
      if (selectedRel !== 'all' && e.relationship_type !== selectedRel) return false;
      return true;
    });

    // Compute Upstream and Downstream dependency sets if a node is selected or hovered
    const activeFocusNodeId = selectedNodeId || hoveredNodeId;

    const upstreamNodeIds = new Set<string>();
    const downstreamNodeIds = new Set<string>();
    const highlightedEdgeIds = new Set<string>();

    if (activeFocusNodeId && visibleNodeIdSet.has(activeFocusNodeId)) {
      // Direct edges and paths
      filteredEdges.forEach((e) => {
        if (e.target === activeFocusNodeId) {
          upstreamNodeIds.add(e.source);
          highlightedEdgeIds.add(e.id);
        }
        if (e.source === activeFocusNodeId) {
          downstreamNodeIds.add(e.target);
          highlightedEdgeIds.add(e.id);
        }
      });

      // If blast radius data exists, integrate with blast upstream/downstream
      if (blastRadius) {
        const upstreamNames = new Set(blastRadius.upstream_dependents || []);
        const downstreamNames = new Set(blastRadius.downstream_dependencies || []);

        filteredNodes.forEach((n) => {
          if (upstreamNames.has(n.name) || upstreamNames.has(n.display_name)) {
            upstreamNodeIds.add(n.id);
          }
          if (downstreamNames.has(n.name) || downstreamNames.has(n.display_name)) {
            downstreamNodeIds.add(n.id);
          }
        });
      }
    }

    const hasFocus = !!activeFocusNodeId;

    // Convert ArchKGNode to ReactFlow Node
    const flowNodes: Node[] = filteredNodes.map((n) => {
      const isSelected = n.id === selectedNodeId;
      const isHovered = n.id === hoveredNodeId;
      const isUpstream = upstreamNodeIds.has(n.id);
      const isDownstream = downstreamNodeIds.has(n.id);
      const isTarget = n.id === activeFocusNodeId;

      const isDimmed = hasFocus && !isSelected && !isHovered && !isUpstream && !isDownstream && !isTarget;

      return {
        id: n.id,
        type: 'architectureNode',
        position: { x: 0, y: 0 }, // Will be laid out by Dagre
        data: {
          ...n,
          isSelected,
          isHovered,
          isUpstream,
          isDownstream,
          isBlastTarget: isTarget && isSelected,
          isDimmed,
          tier: getNodeTier(n.type, n.layer),
        },
      };
    });

    // Convert ArchKGEdge to ReactFlow Edge
    const flowEdges: Edge[] = filteredEdges.map((e) => {
      const isUpstream = upstreamNodeIds.has(e.source) && (e.target === activeFocusNodeId || downstreamNodeIds.has(e.target));
      const isDownstream = (e.source === activeFocusNodeId || upstreamNodeIds.has(e.source)) && downstreamNodeIds.has(e.target);
      const isConnected = e.source === activeFocusNodeId || e.target === activeFocusNodeId;
      const isDimmed = hasFocus && !isConnected && !isUpstream && !isDownstream;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'architectureEdge',
        animated: e.relationship_type === 'CALLS' || e.relationship_type === 'CONSUMES' || isConnected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isUpstream ? '#f59e0b' : isDownstream ? '#38bdf8' : '#71717a',
          width: 14,
          height: 14,
        },
        data: {
          relationship_type: e.relationship_type,
          confidence: e.confidence,
          confidence_level: e.confidence_level,
          isUpstream,
          isDownstream,
          isHovered: isConnected,
          isDimmed,
          evidence_count: e.evidence?.length || 0,
        },
      };
    });

    // Compute Dagre layered layout
    const layouted = getLayoutedElements(flowNodes, flowEdges, {
      direction: layoutDirection,
    });

    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [
    kgData,
    searchQuery,
    selectedTier,
    selectedType,
    selectedRel,
    scopeFilter,
    viewMode,
    layoutDirection,
    selectedNodeId,
    hoveredNodeId,
    blastRadius,
    setNodes,
    setEdges,
  ]);

  // Fit to screen on initial layout
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, layoutDirection, viewMode, reactFlowInstance]);

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
    setBlastRadius(null);
  }, []);

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setHoveredNodeId(null);
    setBlastRadius(null);
  }, []);

  const handleAnalyzeBlastRadius = async (symbolName: string) => {
    if (!symbolName) return;
    try {
      setBlastLoading(true);
      const res = await api.getBlastRadius(repoId, symbolName);
      setBlastRadius(res);
    } catch (err: any) {
      console.error('Blast radius calculation failed:', err);
    } finally {
      setBlastLoading(false);
    }
  };

  const handleOpenSource = (filePath: string, lineRange?: { start: number; end: number }) => {
    setCodeViewerState({
      isOpen: true,
      filePath,
      highlightLines: lineRange,
    });
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Currently selected ArchKGNode object
  const activeSelectedNode = useMemo(() => {
    if (!selectedNodeId || !kgData) return null;
    return kgData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, kgData]);

  // Layer statistics
  const tierStats = useMemo(() => {
    if (!kgData) return {};
    return kgData.nodes.reduce<Record<string, number>>((acc, n) => {
      const t = getNodeTier(n.type, n.layer);
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {});
  }, [kgData]);

  if (loading) {
    return (
      <WorkspaceLayout>
        <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] bg-[#000000] flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-12 h-12 rounded-2xl bg-[#141416] border border-[#27272a] flex items-center justify-center mb-4 shadow-xl">
            <Loader2 className="w-6 h-6 animate-spin text-amber-400" />
          </div>
          <h3 className="text-base font-bold text-white font-mono tracking-tight">
            Analyzing Architecture Knowledge Graph
          </h3>
        </div>
      </WorkspaceLayout>
    );
  }

  if (error) {
    return (
      <WorkspaceLayout>
        <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] bg-[#000000] flex items-center justify-center p-6">
          <ErrorState
            type="general"
            title="Knowledge Graph Generation Failed"
            message={error}
            onRetry={() => fetchKnowledgeGraph(true)}
          />
        </div>
      </WorkspaceLayout>
    );
  }

  return (
    <WorkspaceLayout>
      {currentView === 'workflow' ? (
        <WorkflowView
          repositoryId={repoId}
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenSource={handleOpenSource}
        />
      ) : currentView === 'sequence' ? (
        <SequenceView
          repositoryId={repoId}
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenSource={handleOpenSource}
        />
      ) : currentView === 'dataflow' ? (
        <DataFlowView
          repositoryId={repoId}
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenSource={handleOpenSource}
        />
      ) : (
        <div
          ref={containerRef}
          className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] overflow-hidden bg-[#000000] flex select-none"
        >
          <style>{`
            .arc-left { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.28s ease, transform 0.28s cubic-bezier(0.4,0,0.2,1); }
            .arc-left.open  { width: 270px; opacity: 1; transform: translateX(0); }
            .arc-left.closed{ width: 0px; opacity: 0; transform: translateX(-20px); overflow: hidden; }
            .arc-right { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease; }
            .arc-right.open  { width: 400px; opacity: 1; }
            .arc-right.closed{ width: 0px; opacity: 0; pointer-events: none; overflow: hidden; }
          `}</style>
        {/* LEFT LAYER GUIDE SIDEBAR */}
        <div
          className={`arc-left flex-shrink-0 h-full bg-[#09090b] border-r border-[#1f1f23] flex flex-col z-30 ${
            leftOpen ? 'open' : 'closed'
          }`}
        >
          <div className="flex flex-col h-full overflow-y-auto p-4 min-w-[270px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Architectural Layers
                </span>
              </div>
              <button
                onClick={() => setLeftOpen(false)}
                className="text-zinc-500 hover:text-white p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Layer Tiers Cards with click-to-filter */}
            <div className="space-y-2 mb-6">
              {Object.entries(ARCH_TIERS).map(([key, tier]) => {
                const count = tierStats[key] || 0;
                const isSelected = selectedTier === key;
                return (
                  <div
                    key={key}
                    onClick={() => setSelectedTier((prev) => (prev === key ? 'all' : key))}
                    className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start justify-between ${
                      isSelected
                        ? 'bg-amber-400/10 border-amber-400/50 shadow-md ring-1 ring-amber-400/30'
                        : 'bg-[#121214] border-[#1f1f23] hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tier.dot }} />
                        <span className={`text-[11px] font-bold font-mono ${tier.color}`}>{tier.label}</span>
                      </div>
                      <div className="text-[10px] text-zinc-500 leading-snug mt-1 pl-4 truncate">
                        {tier.sub}
                      </div>
                    </div>
                    {count > 0 && (
                      <span className="text-[10px] font-mono font-bold text-zinc-300 px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700">
                        {count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Blast Colors */}
            <div className="mb-6">
              <div className="flex items-center gap-1.5 mb-2.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
                  Dependency Highlights
                </span>
              </div>
              <div className="space-y-1.5">
                {BLAST_LEGEND.map((b) => (
                  <div key={b.label} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${b.color}`} />
                    <span className="text-[10px] text-zinc-400 font-mono">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How to use */}
            <div className="border-t border-[#1f1f23] pt-4 mt-auto">
              <div className="flex items-center gap-1.5 mb-2">
                <Info className="w-3.5 h-3.5 text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">
                  Interactive Features
                </span>
              </div>
              <ul className="space-y-1.5 text-[10px] text-zinc-500 font-mono">
                <li className="flex items-start gap-1.5">
                  <MousePointer2 className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                  <span>Click node to open inspector & trace paths</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <GitBranch className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <span>Hover to isolate connected relationships</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <Code2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Click symbol or evidence to view exact code</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* SIDEBAR TOGGLE BUTTON */}
        <button
          onClick={() => setLeftOpen((v) => !v)}
          title={leftOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="absolute top-1/2 -translate-y-1/2 z-40 flex items-center justify-center w-5 h-10 bg-[#18181b] border border-[#1f1f23] border-l-0 rounded-r-lg text-zinc-400 hover:text-white hover:bg-[#232326] transition cursor-pointer shadow-xl"
          style={{ left: leftOpen ? '270px' : '0px' }}
        >
          {leftOpen ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {/* TOP TOOLBAR */}
        <ArchitectureToolbar
          currentView={currentView}
          onViewChange={setCurrentView}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedRel={selectedRel}
          onRelChange={setSelectedRel}
          scopeFilter={scopeFilter}
          onScopeChange={setScopeFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          layoutDirection={layoutDirection}
          onToggleLayoutDirection={() =>
            setLayoutDirection((d) => (d === 'TB' ? 'LR' : 'TB'))
          }
          onFitView={() => reactFlowInstance.fitView({ padding: 0.15, duration: 400 })}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onRebuildGraph={() => fetchKnowledgeGraph(true)}
          isRebuilding={isRebuilding}
          totalNodes={kgData?.nodes?.length || 0}
          totalEdges={kgData?.edges?.length || 0}
          filteredNodesCount={nodes.length}
        />

        {/* BOTTOM ACTIVE FOCUS BADGE */}
        {(selectedNodeId || blastRadius) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-[#09090b]/90 backdrop-blur-md border border-[#1f1f23] px-3.5 py-2 rounded-2xl shadow-2xl">
            <span className="text-[11px] font-mono text-zinc-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Focus: <span className="font-bold text-white">{activeSelectedNode?.name || selectedNodeId}</span>
            </span>
            <button
              onClick={() => {
                setSelectedNodeId(null);
                setBlastRadius(null);
              }}
              className="text-[10px] font-mono font-bold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2 py-0.5 rounded-lg border border-rose-500/20 transition cursor-pointer"
            >
              Clear Focus
            </button>
          </div>
        )}

        {/* REACT FLOW CANVAS */}
        <div className="flex-1 h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            minZoom={0.05}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
            className="bg-[#000000]"
          >
            <Background color="rgba(255,255,255,0.03)" gap={24} size={1} />
            <Controls
              showInteractive={false}
              className="!bg-[#09090b] !border-[#1f1f23] !rounded-xl !text-zinc-300 shadow-xl"
            />
            <MiniMap
              nodeColor={(n) => {
                const tierKey = (n.data as any)?.tier || 'application';
                return ARCH_TIERS[tierKey]?.dot || '#10b981';
              }}
              zoomable
              pannable
              className="!bg-[#09090b] !border-[#1f1f23] !rounded-xl overflow-hidden shadow-xl"
            />
          </ReactFlow>
        </div>

        {/* RIGHT INSPECTOR DRAWER */}
        <div
          className={`arc-right flex-shrink-0 h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl flex flex-col z-30 ${
            activeSelectedNode ? 'open' : 'closed'
          }`}
        >
          {activeSelectedNode && (
            <ArchitectureInspector
              node={activeSelectedNode}
              allNodes={kgData?.nodes || []}
              edges={kgData?.edges || []}
              repositoryId={repoId}
              onClose={() => {
                setSelectedNodeId(null);
                setBlastRadius(null);
              }}
              onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
              onOpenSource={handleOpenSource}
              onAnalyzeBlastRadius={handleAnalyzeBlastRadius}
              blastLoading={blastLoading}
            />
          )}
        </div>
      </div>
      )}

      {/* SOURCE CODE VIEWER MODAL */}
      <CodeViewerModal
        isOpen={codeViewerState.isOpen}
        onClose={() => setCodeViewerState({ isOpen: false })}
        repositoryId={repoId}
        filePath={codeViewerState.filePath}
        highlightLines={codeViewerState.highlightLines}
      />
    </WorkspaceLayout>
  );
};

export const ArchitectureMapPage: React.FC = () => {
  return (
    <ReactFlowProvider>
      <ArchitectureMapCanvas />
    </ReactFlowProvider>
  );
};
