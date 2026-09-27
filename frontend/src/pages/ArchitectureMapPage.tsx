import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ReactFlow, Controls, Background, useNodesState, useEdgesState, MarkerType, ReactFlowProvider, useReactFlow, useViewport, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Loader2, Maximize2, X } from 'lucide-react';
import { api } from '../api/client';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { WorkspaceLayout } from '../components/layout/WorkspaceLayout';
import type { KnowledgeGraphData, BlastRadiusResponse } from '../types';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { ArchitectureNode } from '../components/architecture/ArchitectureNode';
import { ArchitectureEdge } from '../components/architecture/ArchitectureEdge';
import { ArchitectureInspector } from '../components/architecture/ArchitectureInspector';
import { ArchitectureToolbar } from '../components/architecture/ArchitectureToolbar';
import { CanvasSidebar } from '../components/architecture/CanvasSidebar';
import { CanvasStatusBar } from '../components/architecture/CanvasStatusBar';
import { getLayoutedElements } from '../components/architecture/layout';
import { getNodeTier, getArchitectureSemantic } from '../components/architecture/constants';
import { ArchitectureLegend } from '../components/architecture/ArchitectureLegend';
import { CodeViewerModal } from '../components/code/CodeViewerModal';
import { WorkflowView } from '../components/workflow/WorkflowView';
import { DataFlowView } from '../components/dataflow/DataFlowView';
import { SequenceView } from '../components/sequence/SequenceView';
import { LifecycleView } from '../components/lifecycle/LifecycleView';

const nodeTypes = {
  architectureNode: ArchitectureNode,
};

const edgeTypes = {
  architectureEdge: ArchitectureEdge,
};

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
  const navigate = useNavigate();
  const { repositories, fetchRepositories, selectedRepo, setSelectedRepo } = useWorkspaceStore();
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (repositories.length === 0) {
      fetchRepositories(true);
    }
  }, [repositories.length, fetchRepositories]);

  useEffect(() => {
    if (repositories.length > 0 && repoId) {
      const current = repositories.find((r) => r.id === repoId);
      if (current && selectedRepo?.id !== current.id) {
        setSelectedRepo(current);
      }
    }
  }, [repositories, repoId, selectedRepo, setSelectedRepo]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [kgData, setKgData] = useState<KnowledgeGraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [leftOpen, setLeftOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenTip, setShowFullscreenTip] = useState(true);
  const zoom = useZoomLevel();

  // 10-second auto-dismiss for fullscreen tip popup
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFullscreenTip(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for native fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (active) {
        setShowFullscreenTip(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // In fullscreen mode, default zoom to 10% (0.10)
  useEffect(() => {
    if (isFullscreen) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 200 });
        setTimeout(() => {
          reactFlowInstance.zoomTo(0.10, { duration: 250 });
        }, 220);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isFullscreen, reactFlowInstance]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedRel, setSelectedRel] = useState('all');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'internal' | 'external'>('all');
  const [viewMode, setViewMode] = useState<'system' | 'full'>('system');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [legendCategory, setLegendCategory] = useState<string>('all');

  const [blastRadius, setBlastRadius] = useState<BlastRadiusResponse | null>(null);

  const [codeViewerState, setCodeViewerState] = useState<{
    isOpen: boolean;
    filePath?: string;
    highlightLines?: { start: number; end: number };
  }>({ isOpen: false });

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const filteredEdgesCount = edges.length;

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
          data = await api.buildKnowledgeGraph(repoId);
        }
      }

      setKgData(data);
    } catch (err: any) {
      const errMsg = (err?.message || '').toLowerCase();
      if ((errMsg.includes('not found') || errMsg.includes('404')) && repositories.length > 0) {
        const fallback = selectedRepo && selectedRepo.id !== repoId ? selectedRepo : repositories.find((r) => r.id !== repoId) || repositories[0];
        if (fallback && fallback.id !== repoId) {
          setSelectedRepo(fallback);
          navigate(`/repository/${fallback.id}/architecture`, { replace: true });
          return;
        }
      }
      setError(err.message || 'Failed to generate Architecture Knowledge Graph.');
    } finally {
      setLoading(false);
      setIsRebuilding(false);
    }
  }, [repoId, repositories, selectedRepo, setSelectedRepo, navigate]);

  useEffect(() => {
    if (repoId) {
      fetchKnowledgeGraph();
    }
  }, [repoId, fetchKnowledgeGraph]);

  useEffect(() => {
    if (!kgData) return;

    const rawNodes = kgData.nodes || [];
    const rawEdges = kgData.edges || [];

    const filteredNodes = rawNodes.filter((n) => {
      const tierKey = getNodeTier(n.type, n.layer);

      if (viewMode === 'system') {
        const isUtilityModule =
          (n.type === 'module' || n.type === 'function' || n.type === 'class') &&
          (!n.symbols || n.symbols.length === 0);
        if (isUtilityModule) return false;
      }

      if (selectedTier !== 'all' && tierKey !== selectedTier) return false;

      if (legendCategory !== 'all') {
        const semantic = getArchitectureSemantic(n.type, n.layer, n.name);
        if (semantic.kind !== legendCategory) return false;
      }

      if (selectedType !== 'all') {
        if (selectedType === 'queue' && n.type !== 'queue' && n.type !== 'worker') return false;
        else if (selectedType !== 'queue' && n.type !== selectedType) return false;
      }

      if (scopeFilter === 'internal' && n.type === 'external_service') return false;
      if (scopeFilter === 'external' && n.type !== 'external_service') return false;

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

    const filteredEdges = rawEdges.filter((e) => {
      if (!visibleNodeIdSet.has(e.source) || !visibleNodeIdSet.has(e.target)) return false;
      if (selectedRel !== 'all' && e.relationship_type !== selectedRel) return false;
      return true;
    });

    const activeFocusNodeId = selectedNodeId || hoveredNodeId;

    const upstreamNodeIds = new Set<string>();
    const downstreamNodeIds = new Set<string>();
    const highlightedEdgeIds = new Set<string>();

    if (activeFocusNodeId && visibleNodeIdSet.has(activeFocusNodeId)) {
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

    const flowNodes: Node[] = filteredNodes.map((n) => {
      const isSelected = n.id === selectedNodeId;
      const isHovered = n.id === hoveredNodeId;
      const isUpstream = upstreamNodeIds.has(n.id);
      const isDownstream = downstreamNodeIds.has(n.id);
      const isTarget = n.id === activeFocusNodeId;

      let isDimmed = false;
      if (hasFocus) {
        isDimmed = !isSelected && !isHovered && !isUpstream && !isDownstream && !isTarget;
      }

      return {
        id: n.id,
        type: 'architectureNode',
        position: { x: 0, y: 0 }, 
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

    const flowEdges: Edge[] = filteredEdges.map((e) => {
      const isUpstream = upstreamNodeIds.has(e.source) && (e.target === activeFocusNodeId || downstreamNodeIds.has(e.target));
      const isDownstream = (e.source === activeFocusNodeId || upstreamNodeIds.has(e.source)) && downstreamNodeIds.has(e.target);
      const isConnected = e.source === activeFocusNodeId || e.target === activeFocusNodeId;

      let isDimmed = false;
      if (hasFocus) {
        isDimmed = !isConnected && !isUpstream && !isDownstream;
      }

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
    legendCategory,
    selectedNodeId,
    hoveredNodeId,
    blastRadius,
    setNodes,
    setEdges,
  ]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
        if (isFullscreen) {
          setTimeout(() => {
            reactFlowInstance.zoomTo(0.10, { duration: 250 });
          }, 400);
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, layoutDirection, viewMode, isFullscreen, reactFlowInstance]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
      setBlastRadius(null);
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, _edge: Edge) => {},
    []
  );

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

  const activeSelectedNode = useMemo(() => {
    if (!selectedNodeId || !kgData) return null;
    return kgData.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, kgData]);

  if (repositories.length === 0 && !loading && !error) {
    return (
      <WorkspaceLayout>
        <EmptyState
          type="repositories"
          title="No Repositories Connected"
          description="Connect a repository first to analyze and explore its Architecture Knowledge Graph."
          actionText="Go to Dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </WorkspaceLayout>
    );
  }

  if (loading || isRebuilding) {
    return (
      <WorkspaceLayout>
        <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#E2E0D9] bg-[#FFFFFF] shadow-xs flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-12 h-12 rounded-2xl bg-[#FEF7EC] border border-amber-200/80 flex items-center justify-center mb-4 shadow-2xs">
            <Loader2 className="w-6 h-6 animate-spin text-amber-700" />
          </div>
          <h3 className="text-base font-bold text-[#19243B] font-mono tracking-tight mb-1">
            Analyzing Architecture Knowledge Graph
          </h3>
          <p className="text-xs text-[#526078] max-w-sm">
            Synthesizing multi-layer AST dependencies and deterministic components...
          </p>
        </div>
      </WorkspaceLayout>
    );
  }

  if (error) {
    return (
      <WorkspaceLayout>
        <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#E2E0D9] bg-[#FFFFFF] shadow-xs flex items-center justify-center p-6">
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
            className="relative w-full h-full min-h-[580px] flex-1 rounded-2xl border border-[#E2E0D9] overflow-hidden bg-[#F8F7F4] flex flex-col select-none"
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

            <div className="flex flex-1 min-h-0">

              <div className={`arc-sidebar flex-shrink-0 h-full bg-white border-r border-[#E2E0D9] z-30 ${leftOpen ? 'open' : 'closed'}`}>
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

              <div className="flex-1 relative min-w-0 h-full flex flex-col bg-[#F8F7F4]">

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
                  onFitView={() => {
                    reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
                    if (isFullscreen) {
                      setTimeout(() => {
                        reactFlowInstance.zoomTo(0.10, { duration: 250 });
                      }, 400);
                    }
                  }}
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
                  kgData={kgData}
                  canvasRef={containerRef}
                  repoName={kgData?.metadata?.repository_name}
                />

                {/* 3-second fullscreen hint toast (Zero gradients, minimalist paper-and-ink dark slate) */}
                {showFullscreenTip && !isFullscreen && (
                  <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-auto">
                    <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-lg bg-[#19243B] text-white shadow-lg border border-[#2B3854]">
                      <Maximize2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="text-xs font-mono font-medium text-slate-200">
                        For the best view, use{' '}
                        <button
                          onClick={() => {
                            handleToggleFullscreen();
                            setShowFullscreenTip(false);
                          }}
                          className="font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 cursor-pointer transition"
                        >
                          Full Screen
                        </button>{' '}
                        mode
                      </span>
                      <button
                        onClick={() => setShowFullscreenTip(false)}
                        className="ml-1 text-slate-400 hover:text-white transition p-0.5 rounded cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

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
                    className="bg-[#F8F7F4] h-full"
                  >
                    <Background color="#D5D2CA" gap={24} size={1.2} />
                    <Controls
                      showInteractive={false}
                      className="!bg-white !border-[#E2E0D9] !rounded-xl !text-[#19243B] shadow-md"
                    />
                  </ReactFlow>

                  {/* Interactive Legend Strip */}
                  <div className="absolute bottom-10 left-4 z-20 pointer-events-auto">
                    <ArchitectureLegend
                      nodes={kgData?.nodes || []}
                      activeCategory={legendCategory}
                      onSelectCategory={setLegendCategory}
                    />
                  </div>
                </div>

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

              <div className={`arc-inspector flex-shrink-0 h-full bg-white border-l border-[#E2E0D9] shadow-xl z-30 ${activeSelectedNode ? 'open' : 'closed'}`}>
                {activeSelectedNode && (
                  <ArchitectureInspector
                    node={activeSelectedNode}
                    allNodes={kgData?.nodes || []}
                    edges={kgData?.edges || []}
                    repositoryId={repoId}
                    onClose={() => { setSelectedNodeId(null); setBlastRadius(null); }}
                    onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                  />
                )}
              </div>
            </div>
          </div>
      )}

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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { repositories, selectedRepo, setSelectedRepo, fetchRepositories } = useWorkspaceStore();

  const urlView = (searchParams.get('view') as any) || 'architecture';
  const validViews = ['architecture', 'workflow', 'sequence', 'dataflow', 'lifecycle'];
  const activeView = validViews.includes(urlView) ? urlView : 'architecture';

  const [currentView, setCurrentView] = useState<'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle'>(activeView);

  useEffect(() => {
    if (validViews.includes(urlView) && urlView !== currentView) {
      setCurrentView(urlView);
    }
  }, [urlView]);

  const handleViewChange = (newView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => {
    setCurrentView(newView);
    if (newView === 'architecture') {
      searchParams.delete('view');
      setSearchParams(searchParams, { replace: true });
    } else {
      searchParams.set('view', newView);
      setSearchParams(searchParams, { replace: true });
    }
  };

  const rawRepoId = parseInt(id || '0', 10);

  useEffect(() => {
    if (repositories.length === 0) {
      fetchRepositories(true);
    }
  }, [repositories.length, fetchRepositories]);

  useEffect(() => {
    if (repositories.length > 0) {
      const exists = repositories.some((r) => r.id === rawRepoId);
      if (!exists) {
        const fallback = selectedRepo && repositories.some((r) => r.id === selectedRepo.id) ? selectedRepo : repositories[0];
        setSelectedRepo(fallback);
        navigate(`/repository/${fallback.id}/architecture`, { replace: true });
      }
    }
  }, [repositories, rawRepoId, selectedRepo, setSelectedRepo, navigate]);

  return (
    <ReactFlowProvider>
      <ArchitectureMapCanvas currentView={currentView} setCurrentView={handleViewChange} />
    </ReactFlowProvider>
  );
};
