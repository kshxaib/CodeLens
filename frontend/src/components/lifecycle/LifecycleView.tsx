import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ReactFlow, MiniMap, Controls, Background, useNodesState, useEdgesState, MarkerType, useReactFlow, type Node, type Edge } from '@xyflow/react';
import { LifecycleStateNode } from './LifecycleStateNode';
import { LifecycleTransitionEdge } from './LifecycleTransitionEdge';
import { LifecycleInspector } from './LifecycleInspector';
import { LifecycleToolbar } from './LifecycleToolbar';
import { getLifecycleLayoutedElements } from './layout';
import { api } from '../../api/client';
import type { EntityLifecycle, LifecycleTransition } from '../../types';
import type { LifecycleFilterType } from './constants';
import { Loader2, RefreshCw } from 'lucide-react';

interface LifecycleViewProps {
  repositoryId: number;
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

const nodeTypes = {
  lifecycleState: LifecycleStateNode,
};

const edgeTypes = {
  lifecycleTransition: LifecycleTransitionEdge,
};

export const LifecycleView: React.FC<LifecycleViewProps> = ({
  repositoryId,
  currentView,
  onViewChange,
  onOpenSource,
}) => {
  const reactFlowInstance = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);

  const [lifecycles, setLifecycles] = useState<EntityLifecycle[]>([]);
  const [selectedLifecycleId, setSelectedLifecycleId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [selectedTransition, setSelectedTransition] = useState<LifecycleTransition | null>(null);
  const [hoveredStateId, setHoveredStateId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<LifecycleFilterType>('all');
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(-1);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const fetchLifecycles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getLifecycles(repositoryId);
      const list = res.lifecycles || [];
      setLifecycles(list);
      if (list.length > 0) {
        setSelectedLifecycleId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract lifecycles.');
    } finally {
      setLoading(false);
    }
  }, [repositoryId]);

  useEffect(() => {
    fetchLifecycles();
  }, [fetchLifecycles]);

  const activeLifecycle = useMemo(() => {
    return lifecycles.find((l) => l.id === selectedLifecycleId) || lifecycles[0] || null;
  }, [lifecycles, selectedLifecycleId]);

  useEffect(() => {
    setSelectedStateId(null);
    setSelectedTransition(null);
    setIsPlaying(false);
    setSimulationIndex(-1);
  }, [selectedLifecycleId]);


  const simulationTransitions = useMemo(() => {
    if (!activeLifecycle) return [];
    const transitions = activeLifecycle.transitions || [];
    const happy = transitions.filter((t) => !t.is_failure);
    return happy.length > 0 ? happy : transitions;
  }, [activeLifecycle]);

  useEffect(() => {
    if (!isPlaying || simulationTransitions.length === 0) return;

    const interval = setInterval(() => {
      setSimulationIndex((prev) => (prev + 1) % simulationTransitions.length);
    }, 1400);

    return () => clearInterval(interval);
  }, [isPlaying, simulationTransitions]);

  const activeSimTransition = simulationIndex >= 0 && simulationIndex < simulationTransitions.length
    ? simulationTransitions[simulationIndex]
    : null;

  useEffect(() => {
    if (!activeLifecycle) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const q = searchQuery.toLowerCase().trim();

    const rawNodes: Node[] = (activeLifecycle.states || []).map((state) => {
      const isSelected = selectedStateId === state.id || selectedStateId === state.name;
      const isHovered = hoveredStateId === state.id || hoveredStateId === state.name;

      let isDimmed = false;
      if (activeFilter === 'happy_path' && (state.is_failure || state.state_type === 'terminal_failure')) {
        isDimmed = true;
      } else if (activeFilter === 'failures' && !state.is_failure && state.state_type !== 'terminal_failure') {
        isDimmed = true;
      } else if (activeFilter === 'retries') {
        const hasRetry = (activeLifecycle.transitions || []).some(
          (t) =>
            t.is_retry &&
            (t.from_state === state.id ||
              t.from_state === state.name ||
              t.to_state === state.id ||
              t.to_state === state.name)
        );
        if (!hasRetry) isDimmed = true;
      }

      if (q && !isDimmed) {
        const matchName = state.name.toLowerCase().includes(q);
        const matchDesc = state.description?.toLowerCase().includes(q);
        if (!matchName && !matchDesc) {
          isDimmed = true;
        }
      }

      const isCurrentActiveState = activeSimTransition
        ? activeSimTransition.from_state === state.id ||
          activeSimTransition.from_state === state.name ||
          activeSimTransition.to_state === state.id ||
          activeSimTransition.to_state === state.name
        : false;

      return {
        id: state.id || state.name,
        type: 'lifecycleState',
        position: { x: 0, y: 0 },
        data: {
          ...state,
          isSelected,
          isHovered,
          isDimmed,
          isCurrentActiveState,
        },
      };
    });

    const rawEdges: Edge[] = (activeLifecycle.transitions || []).map((transition) => {
      const isSelected = selectedTransition?.id === transition.id;

      let isDimmed = false;
      if (activeFilter === 'happy_path' && transition.is_failure) {
        isDimmed = true;
      } else if (activeFilter === 'failures' && !transition.is_failure) {
        isDimmed = true;
      } else if (activeFilter === 'retries' && !transition.is_retry) {
        isDimmed = true;
      }

      if (q && !isDimmed) {
        const matchEvt = transition.event.toLowerCase().includes(q);
        const matchCond = transition.condition?.toLowerCase().includes(q);
        const matchFrom = transition.from_state.toLowerCase().includes(q);
        const matchTo = transition.to_state.toLowerCase().includes(q);
        if (!matchEvt && !matchCond && !matchFrom && !matchTo) {
          isDimmed = true;
        }
      }

      const isCurrentActive = activeSimTransition?.id === transition.id;

      let arrowColor = '#6366f1';
      if (transition.is_failure) arrowColor = '#f43f5e';
      else if (transition.is_retry) arrowColor = '#f59e0b';
      else if (transition.is_inferred) arrowColor = '#71717a';
      if (isCurrentActive) arrowColor = '#38bdf8';

      const srcNode = (activeLifecycle.states || []).find(
        (s) => s.id === transition.from_state || s.name === transition.from_state
      );
      const tgtNode = (activeLifecycle.states || []).find(
        (s) => s.id === transition.to_state || s.name === transition.to_state
      );
      const sourceId = srcNode ? srcNode.id || srcNode.name : transition.from_state;
      const targetId = tgtNode ? tgtNode.id || tgtNode.name : transition.to_state;

      return {
        id: transition.id,
        source: sourceId,
        target: targetId,
        type: 'lifecycleTransition',
        data: {
          transition,
          isHighlighted: isSelected,
          isDimmed,
          isCurrentActive,
          onSelectTransition: (t: LifecycleTransition) => {
            setSelectedTransition(t);
            setSelectedStateId(null);
          },
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: arrowColor,
          width: 14,
          height: 14,
        },
      };
    });

    const layouted = getLifecycleLayoutedElements(rawNodes, rawEdges, {
      direction: layoutDirection,
    });

    setNodes(layouted.nodes);
    setEdges(layouted.edges);

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.18, duration: 400 });
    }, 60);
  }, [
    activeLifecycle,
    selectedStateId,
    selectedTransition,
    hoveredStateId,
    searchQuery,
    activeFilter,
    layoutDirection,
    activeSimTransition,
    reactFlowInstance,
    setNodes,
    setEdges,
  ]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedStateId(node.id);
      setSelectedTransition(null);
    },
    []
  );

  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      const t = (edge.data as any)?.transition as LifecycleTransition;
      if (t) {
        setSelectedTransition(t);
        setSelectedStateId(null);
      }
    },
    []
  );

  const handlePaneClick = useCallback(() => {
    setSelectedStateId(null);
    setSelectedTransition(null);
  }, []);

  const handleNodeMouseEnter = useCallback((_: React.MouseEvent, node: Node) => {
    setHoveredStateId(node.id);
  }, []);

  const handleNodeMouseLeave = useCallback(() => {
    setHoveredStateId(null);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (simulationIndex < 0 || simulationIndex >= simulationTransitions.length - 1) {
        setSimulationIndex(0);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, simulationIndex, simulationTransitions]);

  const handleResetSimulator = useCallback(() => {
    setIsPlaying(false);
    setSimulationIndex(-1);
  }, []);

  const handleExport = useCallback(() => {
    if (!activeLifecycle) return;
    const blob = new Blob([JSON.stringify(activeLifecycle, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLifecycle.entity_name.toLowerCase()}_lifecycle.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeLifecycle]);

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

  const selectedStateData = useMemo(() => {
    if (!selectedStateId || !activeLifecycle) return null;
    return activeLifecycle.states.find((s) => s.id === selectedStateId || s.name === selectedStateId) || null;
  }, [selectedStateId, activeLifecycle]);

  if (loading) {
    return (
      <div className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#E2E0D9] overflow-hidden bg-[#F8F7F4] flex items-center justify-center select-none">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          <span className="text-sm font-medium text-[#19243B] font-mono">
            Analyzing Lifecycle State Machine...
          </span>
        </div>
      </div>
    );
  }

  if (error || !activeLifecycle) {
    return (
      <div className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#E2E0D9] overflow-hidden bg-[#F8F7F4] flex flex-col items-center justify-center p-8 select-none">
        <div className="max-w-md text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-700">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#19243B] font-mono">No Entity Lifecycles Found</h3>
          <p className="text-xs text-[#526078] font-mono">
            {error || 'No state machines, enums, or status updates were identified in this codebase.'}
          </p>
          <button
            onClick={() => {
              setLoading(true);
              api
                .buildLifecycles(repositoryId)
                .then((res) => {
                  setLifecycles(res.lifecycles || []);
                  if (res.lifecycles?.length) setSelectedLifecycleId(res.lifecycles[0].id);
                })
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono font-bold transition cursor-pointer shadow-sm"
          >
            Extract Lifecycle State Machine
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#E2E0D9] overflow-hidden bg-[#F8F7F4] flex select-none"
    >
      <style>{`
        .lc-right { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease; }
        .lc-right.open  { width: 400px; opacity: 1; }
        .lc-right.closed{ width: 0px; opacity: 0; pointer-events: none; overflow: hidden; }
      `}</style>

      <LifecycleToolbar
        currentView={currentView}
        onViewChange={onViewChange}
        lifecycles={lifecycles}
        selectedLifecycleId={selectedLifecycleId}
        onSelectLifecycle={(id) => setSelectedLifecycleId(id)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onResetSimulator={handleResetSimulator}
        currentSimIndex={simulationIndex}
        totalSimSteps={simulationTransitions.length}
        layoutDirection={layoutDirection}
        onToggleLayoutDirection={() =>
          setLayoutDirection((d) => (d === 'LR' ? 'TB' : 'LR'))
        }
        onFitView={() => reactFlowInstance.fitView({ padding: 0.18, duration: 400 })}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onExport={handleExport}
      />

      <div className="flex-1 h-full relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onEdgeClick={handleEdgeClick}
          onPaneClick={handlePaneClick}
          onNodeMouseEnter={handleNodeMouseEnter}
          onNodeMouseLeave={handleNodeMouseLeave}
          fitView
          panOnDrag={true}
          panOnScroll={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          minZoom={0.1}
          maxZoom={2.2}
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
        className={`lc-right flex-shrink-0 h-full bg-white border-l border-[#E2E0D9] shadow-2xl flex flex-col z-30 ${
          selectedStateData || selectedTransition ? 'open' : 'closed'
        }`}
      >
        {(selectedStateData || selectedTransition) && (
          <LifecycleInspector
            selectedState={selectedStateData}
            selectedTransition={selectedTransition}
            allStates={activeLifecycle.states || []}
            transitions={activeLifecycle.transitions || []}
            onClose={() => {
              setSelectedStateId(null);
              setSelectedTransition(null);
            }}
            onSelectState={(identifier) => {
              setSelectedStateId(identifier);
              setSelectedTransition(null);
            }}
            onSelectTransition={(t) => {
              setSelectedTransition(t);
              setSelectedStateId(null);
            }}
            onOpenSource={onOpenSource}
          />
        )}
      </div>
    </div>
  );
};
