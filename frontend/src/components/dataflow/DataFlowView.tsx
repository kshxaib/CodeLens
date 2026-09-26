import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  useReactFlow,
  type Node,
  type Edge,
} from '@xyflow/react';
import { DataFlowNode } from './DataFlowNode';
import { DataFlowEdge } from './DataFlowEdge';
import { DataFlowInspector } from './DataFlowInspector';
import { DataFlowToolbar } from './DataFlowToolbar';
import { getDataFlowLayoutedElements } from './layout';
import { api } from '../../api/client';
import type { DataPipeline } from '../../types';
import { Loader2 } from 'lucide-react';
import { useTrace } from '../../context/TraceContext';

interface DataFlowViewProps {
  repositoryId: number;
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

const nodeTypes = {
  dataFlowNode: DataFlowNode,
};

const edgeTypes = {
  dataFlowEdge: DataFlowEdge,
};

export const DataFlowView: React.FC<DataFlowViewProps> = ({
  repositoryId,
  currentView,
  onViewChange,
  onOpenSource,
}) => {
  const { setViewNodes, selectTraceNode, openWhy } = useTrace();
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const [pipelines, setPipelines] = useState<DataPipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector & Selection
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Toolbar & Simulator
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState('all');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('LR');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Lineage animation playback simulator
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(-1);

  // ReactFlow elements
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 1. Fetch data flows
  const fetchDataFlows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getDataFlows(repositoryId);
      const list = res.pipelines || [];
      setPipelines(list);
      if (list.length > 0) {
        setSelectedPipelineId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract data flows.');
    } finally {
      setLoading(false);
    }
  }, [repositoryId]);

  useEffect(() => {
    fetchDataFlows();
  }, [fetchDataFlows]);

  // Active pipeline
  const activePipeline = useMemo(() => {
    return pipelines.find((p) => p.id === selectedPipelineId) || pipelines[0] || null;
  }, [pipelines, selectedPipelineId]);

  // Sync data flow nodes with TraceContext
  useEffect(() => {
    if (activePipeline?.nodes) {
      setViewNodes(
        activePipeline.nodes.map((n) => ({
          id: n.id,
          name: n.name,
          type: n.data_classification,
          layer: 'data',
        }))
      );
    }
  }, [activePipeline, setViewNodes]);

  // 2. Lineage Simulator Timer Loop
  useEffect(() => {
    if (!isPlaying || !activePipeline || !activePipeline.nodes.length) return;

    const interval = setInterval(() => {
      setSimulationIndex((prev) => {
        const next = prev + 1;
        if (next >= activePipeline.nodes.length) {
          setIsPlaying(false);
          return -1;
        }
        return next;
      });
    }, 1300);

    return () => clearInterval(interval);
  }, [isPlaying, activePipeline]);

  const handleTogglePlay = useCallback(() => {
    if (!activePipeline || !activePipeline.nodes.length) return;
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (simulationIndex === -1 || simulationIndex >= activePipeline.nodes.length - 1) {
        setSimulationIndex(0);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, simulationIndex, activePipeline]);

  const handleResetSimulator = useCallback(() => {
    setIsPlaying(false);
    setSimulationIndex(-1);
  }, []);

  // 3. Upstream & Downstream Lineage Computation
  const { upstreamIds, downstreamIds } = useMemo(() => {
    if (!selectedNodeId || !activePipeline) {
      return { upstreamIds: new Set<string>(), downstreamIds: new Set<string>() };
    }

    const up = new Set<string>();
    const down = new Set<string>();

    // BFS Upstream (traverse source <- target)
    const queueUp = [selectedNodeId];
    while (queueUp.length > 0) {
      const curr = queueUp.shift()!;
      for (const edge of activePipeline.edges) {
        if (edge.target === curr && !up.has(edge.source)) {
          up.add(edge.source);
          queueUp.push(edge.source);
        }
      }
    }

    // BFS Downstream (traverse source -> target)
    const queueDown = [selectedNodeId];
    while (queueDown.length > 0) {
      const curr = queueDown.shift()!;
      for (const edge of activePipeline.edges) {
        if (edge.source === curr && !down.has(edge.target)) {
          down.add(edge.target);
          queueDown.push(edge.target);
        }
      }
    }

    return { upstreamIds: up, downstreamIds: down };
  }, [selectedNodeId, activePipeline]);

  // 4. Construct ReactFlow graph from active pipeline
  useEffect(() => {
    if (!activePipeline) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const rawNodes = activePipeline.nodes || [];
    const rawEdges = activePipeline.edges || [];

    // Filter nodes based on search & classification
    const filteredNodes = rawNodes.filter((n) => {
      if (classificationFilter === 'transformations' && !n.is_transformation) return false;
      if (classificationFilter === 'models' && n.data_classification !== 'database_model') return false;
      if (classificationFilter === 'schemas' && n.data_classification !== 'dto_schema') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = n.name.toLowerCase().includes(q);
        const matchesDesc = (n.description || '').toLowerCase().includes(q);
        const matchesStorage = (n.storage || '').toLowerCase().includes(q);
        const matchesFields = (n.fields || []).some((f) => f.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesStorage && !matchesFields) return false;
      }
      return true;
    });

    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));

    // Filter edges connecting visible nodes
    const filteredEdges = rawEdges.filter(
      (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    const activeExecutingNodeId =
      simulationIndex >= 0 && simulationIndex < rawNodes.length
        ? rawNodes[simulationIndex].id
        : null;

    // Convert to ReactFlow Nodes
    const flowNodes: Node[] = filteredNodes.map((n) => {
      const isSelected = n.id === selectedNodeId;
      const isHovered = n.id === hoveredNodeId;
      const isCurrentExecutionStep = n.id === activeExecutingNodeId;
      const isLineageActive =
        isSelected || upstreamIds.has(n.id) || downstreamIds.has(n.id);
      const hasFocus = !!selectedNodeId || !!hoveredNodeId;
      const isDimmed = hasFocus && !isLineageActive && !isHovered && !isCurrentExecutionStep;

      return {
        id: n.id,
        type: 'dataFlowNode',
        position: { x: 0, y: 0 },
        data: {
          ...n,
          isSelected,
          isHovered,
          isDimmed,
          isLineageActive,
          isCurrentExecutionStep,
          onSelectNode: (id: string) => setSelectedNodeId(id),
        },
      };
    });

    // Convert to ReactFlow Edges
    const flowEdges: Edge[] = filteredEdges.map((e) => {
      const isConnected = e.source === selectedNodeId || e.target === selectedNodeId;
      const isLineageEdge =
        (upstreamIds.has(e.source) || e.source === selectedNodeId) &&
        (upstreamIds.has(e.target) || e.target === selectedNodeId || downstreamIds.has(e.target));
      const hasFocus = !!selectedNodeId || !!hoveredNodeId;
      const isDimmed = hasFocus && !isLineageEdge && !isConnected;

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'dataFlowEdge',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isLineageEdge || isConnected ? '#38bdf8' : '#71717a',
          width: 14,
          height: 14,
        },
        data: {
          data_type: e.data_type,
          transformation: e.transformation,
          storage: e.storage,
          isHighlighted: isConnected,
          isLineageActive: isLineageEdge,
          isDimmed,
        },
      };
    });

    // Dagre layout
    const layouted = getDataFlowLayoutedElements(flowNodes, flowEdges, {
      direction: layoutDirection,
    });

    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [
    activePipeline,
    searchQuery,
    classificationFilter,
    layoutDirection,
    selectedNodeId,
    hoveredNodeId,
    simulationIndex,
    upstreamIds,
    downstreamIds,
    setNodes,
    setEdges,
  ]);

  // Fit to screen on initial load
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [activePipeline?.id, layoutDirection, reactFlowInstance]);

  // Handlers
  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
      selectTraceNode(node.id);
    },
    [selectTraceNode]
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
    setSelectedNodeId(null);
  }, []);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.2, duration: 300 });
  }, [reactFlowInstance]);

  const handleToggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  const handleExportJSON = useCallback(() => {
    if (!activePipeline) return;
    const jsonStr = JSON.stringify(activePipeline, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activePipeline.id}_data_flow.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activePipeline]);

  // Selected Data Node for inspector
  const activeSelectedDataNode = useMemo(() => {
    if (!selectedNodeId || !activePipeline) return null;
    return activePipeline.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, activePipeline]);

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] flex flex-col items-center justify-center bg-[#070709] text-zinc-400 font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
        <span className="text-sm font-medium text-zinc-200">Analyzing Data Flow Lineage...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] flex flex-col items-center justify-center bg-[#070709] text-zinc-400 font-mono p-6">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 max-w-md text-center">
          <p className="font-bold text-sm mb-1">Failed to Load Data Flows</p>
          <p className="text-xs text-rose-400 mb-3">{error}</p>
          <button
            onClick={fetchDataFlows}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
          >
            Retry Extraction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] overflow-hidden bg-[#000000] flex select-none"
    >
      <style>{`
        .df-right { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease; }
        .df-right.open  { width: 380px; opacity: 1; }
        .df-right.closed{ width: 0px; opacity: 0; pointer-events: none; overflow: hidden; }
      `}</style>

      {/* Top Floating Toolbar */}
      <DataFlowToolbar
        currentView={currentView}
        onViewChange={onViewChange}
        pipelines={pipelines}
        selectedPipelineId={activePipeline?.id || ''}
        onSelectPipeline={(id) => {
          setSelectedPipelineId(id);
          setSelectedNodeId(null);
          setSimulationIndex(-1);
          setIsPlaying(false);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        classificationFilter={classificationFilter}
        onClassificationFilterChange={setClassificationFilter}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onResetSimulator={handleResetSimulator}
        currentStepIndex={simulationIndex}
        totalSteps={activePipeline?.nodes?.length || 0}
        layoutDirection={layoutDirection}
        onToggleLayoutDirection={() =>
          setLayoutDirection((prev) => (prev === 'TB' ? 'LR' : 'TB'))
        }
        onFitView={handleFitView}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onExport={handleExportJSON}
      />

      {/* ReactFlow Canvas */}
      <div className="flex-1 h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onPaneClick={handlePaneClick}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.15}
          maxZoom={2.2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#1f1f23" gap={20} size={1} />
          <Controls
            position="bottom-left"
            className="!bg-[#0c0c0e] !border-[#1f1f23] !rounded-xl !overflow-hidden [&>button]:!bg-[#0c0c0e] [&>button]:!border-[#1f1f23] [&>button]:!text-zinc-400 [&>button:hover]:!bg-white/[0.06] [&>button:hover]:!text-white"
          />
          <MiniMap
            position="bottom-right"
            zoomable
            pannable
            nodeColor={(n) => {
              const data = n.data as any;
              return data?.is_transformation ? '#c084fc' : '#38bdf8';
            }}
            maskColor="rgba(7, 7, 9, 0.75)"
            className="!bg-[#09090b] !border !border-[#1f1f23] !rounded-xl !overflow-hidden !m-4"
          />
        </ReactFlow>
      </div>

      {/* Right Slide-in Inspector Drawer */}
      <div
        className={`df-right flex-shrink-0 h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl flex flex-col z-30 ${
          activeSelectedDataNode ? 'open' : 'closed'
        }`}
      >
        {activeSelectedDataNode && activePipeline && (
          <DataFlowInspector
            node={activeSelectedDataNode}
            allNodes={activePipeline.nodes}
            edges={activePipeline.edges}
            onClose={() => setSelectedNodeId(null)}
            onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
            onOpenSource={onOpenSource}
          />
        )}
      </div>
    </div>
  );
};
