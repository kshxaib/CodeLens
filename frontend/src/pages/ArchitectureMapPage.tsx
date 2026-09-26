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
  useViewport,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import {
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
import { CanvasSidebar } from '../components/architecture/CanvasSidebar';
import { CanvasStatusBar } from '../components/architecture/CanvasStatusBar';
import { getLayoutedElements } from '../components/architecture/layout';
import { ARCH_TIERS, getNodeTier } from '../components/architecture/constants';
import { CodeViewerModal } from '../components/code/CodeViewerModal';
import { WorkflowView } from '../components/workflow/WorkflowView';
import { DataFlowView } from '../components/dataflow/DataFlowView';
import { SequenceView } from '../components/sequence/SequenceView';
import { LifecycleView } from '../components/lifecycle/LifecycleView';
import { TraceProvider, useTrace } from '../store/useTraceStore';
import { TracePanel } from '../components/trace/TracePanel';
import { WhyModal } from '../components/trace/WhyModal';
import { ExplainModal } from '../components/trace/ExplainModal';
import { ChangeImpactModal } from '../components/trace/ChangeImpactModal';

const nodeTypes = {
  architectureNode: ArchitectureNode,
};

const edgeTypes = {
  architectureEdge: ArchitectureEdge,
};

// Zoom tracker hook — reads from ReactFlow viewport
function useZoomLevel() {
  const { zoom } = useViewport();
  return zoom;
}


interface ArchitectureMapCanvasProps {
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  setCurrentView: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
}

const ArchitectureMapCanvas: React.FC<ArchitectureMapCanvasProps> = ({
  currentView,
  setCurrentView,
}) => {
  const { id } = useParams<{ id: string }>();
  const repoId = parseInt(id || '0', 10);
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  // Trace Context
  const {
    selectedNodeId,
    selectTraceNode,
    pathData,
    pathStepIndex,
    highlightOnlyPath,
    openWhy,
    closeWhy,
    isWhyOpen,
    whyData,
    whyLoading,
    closeExplain,
    isExplainOpen,
    explainData,
    explainLoading,
    closeChangeImpact,
    isChangeImpactOpen,
    changeImpactData,
    changeImpactLoading,
    analyzeChange,
    setViewNodes,
    setViewFiles,
    viewFiles,
    calculateImpact,
    impactData,
  } = useTrace();

  // Raw Knowledge Graph Data from backend
  const [kgData, setKgData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const zoom = useZoomLevel();

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

  // Filtered edge count (computed from edges state)
  const filteredEdgesCount = edges.length;

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
      if (data?.nodes) {
        setViewNodes(
          data.nodes.map((n) => ({
            id: n.id,
            name: n.name,
            type: n.type,
            layer: n.layer,
          }))
        );
        const allFiles = Array.from(
          new Set(data.nodes.flatMap((n) => n.source_files || []))
        );
        setViewFiles(allFiles);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate Architecture Knowledge Graph.');
    } finally {
      setLoading(false);
      setIsRebuilding(false);
    }
  }, [repoId, setViewNodes, setViewFiles]);

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

      // Integrate with AKG Impact Analysis data
      if (impactData && (impactData.target?.id === activeFocusNodeId || impactData.target?.name === activeFocusNodeId)) {
        impactData.direct_dependents?.forEach((dep) => {
          upstreamNodeIds.add(dep.id);
        });
        impactData.indirect_dependents?.forEach((dep) => {
          upstreamNodeIds.add(dep.id);
        });
      }

      // If blast radius data exists, integrate with blast upstream/downstream
      if (blastRadius) {
        const upstreamNames = new Set(blastRadius.upstream_dependents || []);
        const downstreamNames = new Set(blastRadius.downstream_dependencies || []);

        filteredNodes.forEach((n) => {
          if (upstreamNames.has(n.name) || upstreamNames.has(n.display_name) || upstreamNames.has(n.id)) {
            upstreamNodeIds.add(n.id);
          }
          if (downstreamNames.has(n.name) || downstreamNames.has(n.display_name) || downstreamNames.has(n.id)) {
            downstreamNodeIds.add(n.id);
          }
        });
      }
    }

    const hasFocus = !!activeFocusNodeId;

    // Path highlighting sets (Features 2 & 3)
    const pathNodeIdSet = new Set(
      pathData?.found && pathData.path_nodes ? pathData.path_nodes.map((n) => n.id) : []
    );
    const activePathNodeId =
      pathData?.found && pathStepIndex >= 0 && pathData.path_nodes
        ? pathData.path_nodes[pathStepIndex]?.id
        : null;
    const pathEdgeIdSet = new Set(
      pathData?.found && pathData.path_edges ? pathData.path_edges.map((e) => e.id) : []
    );
    const isPathActive = pathNodeIdSet.size > 0;

    // Convert ArchKGNode to ReactFlow Node
    const flowNodes: Node[] = filteredNodes.map((n) => {
      const isSelected = n.id === selectedNodeId;
      const isHovered = n.id === hoveredNodeId;
      const isUpstream = upstreamNodeIds.has(n.id);
      const isDownstream = downstreamNodeIds.has(n.id);
      const isTarget = n.id === activeFocusNodeId;
      const isPathNode = pathNodeIdSet.has(n.id);
      const isPathActiveStep = n.id === activePathNodeId;

      let isDimmed = false;
      if (isPathActive && highlightOnlyPath) {
        isDimmed = !isPathNode;
      } else if (hasFocus) {
        isDimmed = !isSelected && !isHovered && !isUpstream && !isDownstream && !isTarget;
      }

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
          isPathNode,
          isPathActiveStep,
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
      const isPathEdge = pathEdgeIdSet.has(e.id);

      let isDimmed = false;
      if (isPathActive && highlightOnlyPath) {
        isDimmed = !isPathEdge;
      } else if (hasFocus) {
        isDimmed = !isConnected && !isUpstream && !isDownstream;
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'architectureEdge',
        animated: isPathEdge || e.relationship_type === 'CALLS' || e.relationship_type === 'CONSUMES' || isConnected,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isPathEdge ? '#38bdf8' : isUpstream ? '#f59e0b' : isDownstream ? '#38bdf8' : '#71717a',
          width: 14,
          height: 14,
        },
        data: {
          relationship_type: e.relationship_type,
          confidence: e.confidence,
          confidence_level: e.confidence_level,
          isUpstream,
          isDownstream,
          isPathEdge,
          isHovered: isConnected,
          isDimmed,
          evidence_count: e.evidence?.length || 0,
          onWhyClick: () => openWhy({ edgeId: e.id, source: e.source, target: e.target }),
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
    impactData,
    pathData,
    pathStepIndex,
    highlightOnlyPath,
    openWhy,
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
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectTraceNode(selectedNodeId === node.id ? null : node.id);
      setBlastRadius(null);
    },
    [selectedNodeId, selectTraceNode]
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      openWhy({ edgeId: edge.id, source: edge.source, target: edge.target });
    },
    [openWhy]
  );

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredNodeId(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredNodeId(null);
  }, []);

  const handlePaneClick = useCallback(() => {
    selectTraceNode(null);
    setHoveredNodeId(null);
    setBlastRadius(null);
  }, [selectTraceNode]);

  const handleAnalyzeBlastRadius = async (symbolName: string) => {
    if (!symbolName) return;
    try {
      setBlastLoading(true);
      await calculateImpact(symbolName);
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
      ) : currentView === 'lifecycle' ? (
        <LifecycleView
          repositoryId={repoId}
          currentView={currentView}
          onViewChange={setCurrentView}
          onOpenSource={handleOpenSource}
        />
      ) : (
          <div
            ref={containerRef}
            className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] overflow-hidden bg-[#000000] flex flex-col select-none"
          >
            <style>{`
              .arc-sidebar {
                transition: width 0.26s cubic-bezier(0.4,0,0.2,1),
                            opacity 0.22s ease,
                            transform 0.26s cubic-bezier(0.4,0,0.2,1);
              }
              .arc-sidebar.open  { width: 260px; opacity: 1; transform: translateX(0); }
              .arc-sidebar.closed{ width: 0px; opacity: 0; transform: translateX(-16px); overflow: hidden; }
              .arc-inspector {
                transition: width 0.26s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease;
              }
              .arc-inspector.open  { width: 400px; opacity: 1; }
              .arc-inspector.closed{ width: 0px; opacity: 0; pointer-events: none; overflow: hidden; }
            `}</style>

            {/* ─── MAIN CONTENT ROW ─── */}
            <div className="flex flex-1 min-h-0">

              {/* LEFT SIDEBAR */}
              <div className={`arc-sidebar flex-shrink-0 h-full bg-[#09090b] border-r border-[#1f1f23] z-30 ${leftOpen ? 'open' : 'closed'}`}>
                {leftOpen && (
                  <CanvasSidebar
                    kgData={kgData}
                    selectedTier={selectedTier}
                    onTierChange={setSelectedTier}
                    selectedType={selectedType}
                    onTypeChange={setSelectedType}
                    selectedRel={selectedRel}
                    onRelChange={setSelectedRel}
                    onClose={() => setLeftOpen(false)}
                  />
                )}
              </div>

              {/* CANVAS + TOOLBAR + STATUS */}
              <div className="flex-1 relative min-w-0 h-full flex flex-col">

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
                  onToggleLayoutDirection={() => setLayoutDirection(d => d === 'TB' ? 'LR' : 'TB')}
                  onFitView={() => reactFlowInstance.fitView({ padding: 0.15, duration: 400 })}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={handleToggleFullscreen}
                  onRebuildGraph={() => fetchKnowledgeGraph(true)}
                  isRebuilding={isRebuilding}
                  totalNodes={kgData?.nodes?.length || 0}
                  totalEdges={kgData?.edges?.length || 0}
                  filteredNodesCount={nodes.length}
                  filteredEdgesCount={filteredEdgesCount}
                  onOpenSidebar={() => setLeftOpen(v => !v)}
                  isSidebarOpen={leftOpen}
                  onOpenTrace={() => {
                    // Dispatch to TracePanel open (it manages its own state via store)
                    const panel = document.querySelector('[data-trace-panel-toggle]') as HTMLButtonElement | null;
                    panel?.click();
                  }}
                  onOpenExplain={
                    selectedNodeId
                      ? () => {
                          const { openExplain } = useTrace.getState();
                          openExplain(selectedNodeId!);
                        }
                      : undefined
                  }
                  kgData={kgData}
                  canvasRef={containerRef}
                  repoName={kgData?.metadata?.repository_name}
                />

                {/* REACT FLOW CANVAS */}
                <div className="flex-1 min-h-0 pb-8">
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
                    onEdgeClick={handleEdgeClick}
                    onNodeMouseEnter={handleNodeMouseEnter}
                    onNodeMouseLeave={handleNodeMouseLeave}
                    onPaneClick={handlePaneClick}
                    nodeTypes={nodeTypes}
                    edgeTypes={edgeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.15 }}
                    panOnDrag
                    panOnScroll={false}
                    zoomOnScroll
                    zoomOnPinch
                    nodesDraggable
                    nodesConnectable={false}
                    elementsSelectable
                    minZoom={0.05}
                    maxZoom={2}
                    proOptions={{ hideAttribution: true }}
                    className="bg-[#000000] h-full"
                  >
                    <Background color="rgba(255,255,255,0.025)" gap={24} size={1} />
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

                {/* BOTTOM STATUS BAR */}
                <CanvasStatusBar
                  repoName={kgData?.metadata?.repository_name}
                  currentView={currentView}
                  selectedNodeName={activeSelectedNode?.name || selectedNodeId}
                  totalNodes={kgData?.nodes?.length || 0}
                  filteredNodes={nodes.length}
                  totalEdges={kgData?.edges?.length || 0}
                  filteredEdges={filteredEdgesCount}
                  evidenceStatus={
                    activeSelectedNode
                      ? (activeSelectedNode.confidence_level === 'deterministic' ? 'verified' : 'inferred')
                      : null
                  }
                  zoom={zoom}
                />
              </div>

              {/* RIGHT INSPECTOR */}
              <div className={`arc-inspector flex-shrink-0 h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl z-30 ${activeSelectedNode ? 'open' : 'closed'}`}>
                {activeSelectedNode && (
                  <ArchitectureInspector
                    node={activeSelectedNode}
                    allNodes={kgData?.nodes || []}
                    edges={kgData?.edges || []}
                    repositoryId={repoId}
                    onClose={() => { selectTraceNode(null); setBlastRadius(null); }}
                    onSelectNode={(nodeId) => selectTraceNode(nodeId)}
                    onOpenSource={handleOpenSource}
                    onAnalyzeBlastRadius={handleAnalyzeBlastRadius}
                    blastLoading={blastLoading}
                  />
                )}
              </div>
            </div>
          </div>
      )}

      {/* TRACE / EXPLORE FLOATING DOCK & CONTROLS */}
      <TracePanel onOpenSource={handleOpenSource} />

      {/* FEATURE 4: WHY RELATIONSHIP MODAL */}
      <WhyModal
        isOpen={isWhyOpen}
        onClose={closeWhy}
        data={whyData}
        loading={whyLoading}
        onOpenSource={handleOpenSource}
      />

      {/* FEATURE 5: EXPLAIN COMPONENT MODAL */}
      <ExplainModal
        isOpen={isExplainOpen}
        onClose={closeExplain}
        data={explainData}
        loading={explainLoading}
        onOpenSource={handleOpenSource}
      />

      {/* FEATURE 7: CHANGE IMPACT SIMULATOR MODAL */}
      <ChangeImpactModal
        isOpen={isChangeImpactOpen}
        onClose={closeChangeImpact}
        onAnalyzeChange={analyzeChange}
        data={changeImpactData}
        loading={changeImpactLoading}
        availableFiles={viewFiles}
        onOpenSource={handleOpenSource}
      />

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
  const { id } = useParams<{ id: string }>();
  const repoId = parseInt(id || '0', 10);
  const [currentView, setCurrentView] = useState<'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle'>('architecture');

  return (
    <ReactFlowProvider>
      <TraceProvider repositoryId={repoId} currentView={currentView}>
        <ArchitectureMapCanvas currentView={currentView} setCurrentView={setCurrentView} />
      </TraceProvider>
    </ReactFlowProvider>
  );
};
