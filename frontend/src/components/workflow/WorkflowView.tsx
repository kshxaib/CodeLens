import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, MarkerType, useReactFlow, type Node, type Edge } from '@xyflow/react';
import { WorkflowNode } from './WorkflowNode';
import { WorkflowEdge } from './WorkflowEdge';
import { WorkflowInspector } from './WorkflowInspector';
import { WorkflowToolbar } from './WorkflowToolbar';
import { getWorkflowLayoutedElements } from './layout';
import { api } from '../../api/client';
import type { WorkflowItem, WorkflowStep } from '../../types';
import { Loader2 } from 'lucide-react';

interface WorkflowViewProps {
  repositoryId: number;
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

const nodeTypes = {
  workflowNode: WorkflowNode,
};

const edgeTypes = {
  workflowEdge: WorkflowEdge,
};

export const WorkflowView: React.FC<WorkflowViewProps> = ({
  repositoryId,
  currentView,
  onViewChange,
  onOpenSource,
}) => {
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [hoveredStepId, setHoveredStepId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [pathFilter, setPathFilter] = useState<'all' | 'happy' | 'failure'>('all');
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('TB');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(-1);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const fetchWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getWorkflows(repositoryId);
      const list = res.workflows || [];
      setWorkflows(list);
      if (list.length > 0) {
        setSelectedWorkflowId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract workflows.');
    } finally {
      setLoading(false);
    }
  }, [repositoryId]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const activeWorkflow = useMemo(() => {
    return workflows.find((w) => w.id === selectedWorkflowId) || workflows[0] || null;
  }, [workflows, selectedWorkflowId]);


  useEffect(() => {
    if (!isPlaying || !activeWorkflow || !activeWorkflow.steps.length) return;

    const timer = setInterval(() => {
      setSimulationIndex((prev) => {
        const next = prev + 1;
        if (next >= activeWorkflow.steps.length) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [isPlaying, activeWorkflow]);

  useEffect(() => {
    if (!activeWorkflow) return;

    const rawSteps = activeWorkflow.steps || [];
    const rawTransitions = activeWorkflow.transitions || [];

    const filteredSteps = rawSteps.filter((s) => {
      if (pathFilter === 'happy' && s.step_type === 'failure') return false;
      if (pathFilter === 'failure' && s.step_type === 'end') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesDesc = (s.description || '').toLowerCase().includes(q);
        const matchesCalls = (s.calls || []).some((c) => c.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesCalls) return false;
      }
      return true;
    });

    const visibleStepIds = new Set(filteredSteps.map((s) => s.id));

    const filteredTransitions = rawTransitions.filter((t) => {
      if (!visibleStepIds.has(t.source) || !visibleStepIds.has(t.target)) return false;
      if (pathFilter === 'happy' && t.transition_type === 'failure') return false;
      if (pathFilter === 'failure' && t.transition_type === 'success') return false;
      return true;
    });

    const activeExecutingStepId =
      simulationIndex >= 0 && simulationIndex < rawSteps.length
        ? rawSteps[simulationIndex].id
        : null;

    const flowNodes: Node[] = filteredSteps.map((s) => {
      const isSelected = s.id === selectedStepId;
      const isHovered = s.id === hoveredStepId;
      const isCurrentExecutionStep = s.id === activeExecutingStepId;
      const hasFocus = !!selectedStepId || !!hoveredStepId;
      const isDimmed = hasFocus && !isSelected && !isHovered && !isCurrentExecutionStep;

      return {
        id: s.id,
        type: 'workflowNode',
        position: { x: 0, y: 0 },
        data: {
          ...s,
          isSelected,
          isHovered,
          isDimmed,
          isCurrentExecutionStep,
        },
      };
    });

    const flowEdges: Edge[] = filteredTransitions.map((t) => {
      const isConnected = t.source === selectedStepId || t.target === selectedStepId;
      const hasFocus = !!selectedStepId || !!hoveredStepId;
      const isDimmed = hasFocus && !isConnected;

      return {
        id: t.id,
        source: t.source,
        target: t.target,
        type: 'workflowEdge',
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color:
            t.transition_type === 'failure'
              ? '#f43f5e'
              : t.transition_type === 'success'
              ? '#10b981'
              : t.transition_type === 'retry'
              ? '#fb923c'
              : '#71717a',
          width: 14,
          height: 14,
        },
        data: {
          transition_type: t.transition_type,
          label: t.label,
          isHighlighted: isConnected,
          isDimmed,
        },
      };
    });

    const layouted = getWorkflowLayoutedElements(flowNodes, flowEdges, {
      direction: layoutDirection,
    });

    setNodes(layouted.nodes);
    setEdges(layouted.edges);
  }, [
    activeWorkflow,
    searchQuery,
    pathFilter,
    layoutDirection,
    selectedStepId,
    hoveredStepId,
    simulationIndex,
    setNodes,
    setEdges,
  ]);

  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, selectedWorkflowId, layoutDirection, reactFlowInstance]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedStepId((prev) => (prev === node.id ? null : node.id));
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, _edge: Edge) => {},
    []
  );

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredStepId(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredStepId(null);
  }, []);

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

  const handleExport = () => {
    if (!activeWorkflow) return;
    const blob = new Blob([JSON.stringify(activeWorkflow, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeWorkflow.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectedStepData: WorkflowStep | null = useMemo(() => {
    if (!selectedStepId || !activeWorkflow) return null;
    return activeWorkflow.steps.find((s) => s.id === selectedStepId) || null;
  }, [selectedStepId, activeWorkflow]);

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#E2E0D9] bg-[#F8F7F4] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-white border border-[#E2E0D9] flex items-center justify-center mb-4 shadow-md">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
        </div>
        <h3 className="text-base font-bold text-[#19243B] font-mono tracking-tight">
          Extracting System Workflows
        </h3>
      </div>
    );
  }

  if (error || !activeWorkflow) {
    return (
      <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#E2E0D9] bg-[#F8F7F4] flex flex-col items-center justify-center p-6 text-center select-none">
        <p className="text-sm text-[#526078] font-mono mb-3">{error || 'No workflows found.'}</p>
        <button
          onClick={fetchWorkflows}
          className="px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs font-mono cursor-pointer hover:bg-amber-700 transition shadow-sm"
        >
          Retry Extraction
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#E2E0D9] overflow-hidden bg-[#F8F7F4] flex select-none"
    >
      <style>{`
        .wf-right { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease; }
        .wf-right.open  { width: 380px; opacity: 1; }
        .wf-right.closed{ width: 0px; opacity: 0; pointer-events: none; overflow: hidden; }
      `}</style>

      <WorkflowToolbar
        currentView={currentView}
        onViewChange={onViewChange}
        workflows={workflows}
        selectedWorkflowId={selectedWorkflowId}
        onSelectWorkflow={(id) => {
          setSelectedWorkflowId(id);
          setSelectedStepId(null);
          setSimulationIndex(-1);
          setIsPlaying(false);
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        pathFilter={pathFilter}
        onPathFilterChange={setPathFilter}
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying((p) => !p)}
        onResetSimulator={() => {
          setIsPlaying(false);
          setSimulationIndex(-1);
        }}
        currentStepIndex={simulationIndex}
        totalSteps={activeWorkflow.steps?.length || 0}
        layoutDirection={layoutDirection}
        onToggleLayoutDirection={() =>
          setLayoutDirection((d) => (d === 'TB' ? 'LR' : 'TB'))
        }
        onFitView={() => reactFlowInstance.fitView({ padding: 0.15, duration: 400 })}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onExport={handleExport}
      />

      <div className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          onPaneClick={() => setSelectedStepId(null)}
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
          className="bg-[#F8F7F4]"
        >
          <Background color="#D5D2CA" gap={24} size={1.2} />
          <Controls
            showInteractive={false}
            className="!bg-white !border-[#E2E0D9] !rounded-xl !text-[#19243B] shadow-md"
          />
          <MiniMap
            nodeColor="#D97706"
            maskColor="rgba(248, 247, 244, 0.7)"
            zoomable
            pannable
            className="!bg-white !border-[#E2E0D9] !rounded-xl overflow-hidden shadow-md"
          />
        </ReactFlow>
      </div>

      <div
        className={`wf-right flex-shrink-0 h-full bg-white border-l border-[#E2E0D9] shadow-2xl flex flex-col z-30 ${
          selectedStepData ? 'open' : 'closed'
        }`}
      >
        {selectedStepData && (
          <WorkflowInspector
            step={selectedStepData}
            allSteps={activeWorkflow.steps || []}
            transitions={activeWorkflow.transitions || []}
            onClose={() => setSelectedStepId(null)}
            onSelectStep={(stepId) => setSelectedStepId(stepId)}
            onOpenSource={onOpenSource}
          />
        )}
      </div>
    </div>
  );
};
