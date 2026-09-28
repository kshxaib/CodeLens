import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2, Plus, Minus, Compass, Move } from 'lucide-react';
import { api } from '../../api/client';
import type { SequenceDiagram } from '../../types';
import { SequenceToolbar } from './SequenceToolbar';
import { SequenceParticipantHeader } from './SequenceParticipantHeader';
import { SequenceMessageRow } from './SequenceMessageRow';
import { SequenceInspector } from './SequenceInspector';

interface SequenceViewProps {
  repositoryId: number;
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  onViewChange: (view: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle') => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

const COLUMN_WIDTH = 220;
const ROW_HEIGHT = 68;

export const SequenceView: React.FC<SequenceViewProps> = ({
  repositoryId,
  currentView,
  onViewChange,
  onOpenSource,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [sequences, setSequences] = useState<SequenceDiagram[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'calls' | 'returns' | 'async' | 'errors'>('all');

  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const [zoom, setZoom] = useState(1);
  const isMouseDownRef = useRef(false);
  const isUserPanningRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);

  const fetchSequences = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getSequences(repositoryId);
      const list = res.sequences || [];
      setSequences(list);
      if (list.length > 0) {
        setSelectedSequenceId(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract runtime sequence diagrams.');
    } finally {
      setLoading(false);
    }
  }, [repositoryId]);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const activeSequence = useMemo(() => {
    return sequences.find((s) => s.id === selectedSequenceId) || sequences[0] || null;
  }, [sequences, selectedSequenceId]);

  const filteredMessages = useMemo(() => {
    if (!activeSequence) return [];

    return activeSequence.messages.filter((m) => {
      if (filterType === 'calls' && m.interaction_type !== 'call') return false;
      if (filterType === 'returns' && m.interaction_type !== 'return') return false;
      if (filterType === 'async' && !m.is_async && m.interaction_type !== 'event_emit') return false;
      if (filterType === 'errors' && !m.is_error && m.interaction_type !== 'error') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesMethod = m.method.toLowerCase().includes(q);
        const matchesDesc = (m.description || '').toLowerCase().includes(q);
        const matchesPayload = (m.payload || '').toLowerCase().includes(q);
        const matchesCaller = m.caller_id.toLowerCase().includes(q);
        const matchesCallee = m.callee_id.toLowerCase().includes(q);
        if (!matchesMethod && !matchesDesc && !matchesPayload && !matchesCaller && !matchesCallee) {
          return false;
        }
      }

      return true;
    });
  }, [activeSequence, filterType, searchQuery]);

  const participantIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeSequence) return map;
    activeSequence.participants.forEach((p, idx) => {
      map.set(p.id, idx);
    });
    return map;
  }, [activeSequence]);

  const activeExecutingMessage = useMemo(() => {
    if (simulationIndex >= 0 && simulationIndex < filteredMessages.length) {
      return filteredMessages[simulationIndex];
    }
    return null;
  }, [simulationIndex, filteredMessages]);

  const activeParticipantIds = useMemo(() => {
    const set = new Set<string>();
    if (activeExecutingMessage) {
      set.add(activeExecutingMessage.caller_id);
      set.add(activeExecutingMessage.callee_id);
    } else if (selectedMessageId) {
      const selected = filteredMessages.find((m) => m.id === selectedMessageId);
      if (selected) {
        set.add(selected.caller_id);
        set.add(selected.callee_id);
      }
    }
    return set;
  }, [activeExecutingMessage, selectedMessageId, filteredMessages]);

  // Auto-focus and shift view to the executing step during playback or manual stepping
  useEffect(() => {
    if (simulationIndex < 0 || !activeExecutingMessage || !scrollAreaRef.current) return;
    if (isUserPanningRef.current) return;

    const timer = setTimeout(() => {
      const rowEl = document.getElementById(`seq-msg-${activeExecutingMessage.id}`);
      const container = scrollAreaRef.current;
      if (!rowEl || !container) return;

      const containerRect = container.getBoundingClientRect();
      const rowRect = rowEl.getBoundingClientRect();

      // Vertical offset: center executing message row in container
      const currentScrollTop = container.scrollTop;
      const rowRelativeTop = rowRect.top - containerRect.top + currentScrollTop;
      const targetTop = rowRelativeTop - containerRect.height / 2 + rowRect.height / 2;

      // Horizontal offset: center on interaction midpoint between caller and callee
      const callerIdx = participantIndexMap.get(activeExecutingMessage.caller_id) ?? 0;
      const calleeIdx = participantIndexMap.get(activeExecutingMessage.callee_id) ?? 0;
      const callerX = callerIdx * COLUMN_WIDTH + COLUMN_WIDTH / 2;
      const calleeX = calleeIdx * COLUMN_WIDTH + COLUMN_WIDTH / 2;
      const midX = (callerX + calleeX) / 2;
      const targetLeft = midX - containerRect.width / 2;

      container.scrollTo({
        top: Math.max(0, targetTop),
        left: Math.max(0, targetLeft),
        behavior: 'smooth',
      });
    }, 60);

    return () => clearTimeout(timer);
  }, [simulationIndex, activeExecutingMessage, participantIndexMap]);

  // Canvas mouse drag-to-pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, input, select, textarea, a, .message-pill, .seq-right')) {
      return;
    }

    isMouseDownRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollAreaRef.current?.scrollLeft || 0,
      scrollTop: scrollAreaRef.current?.scrollTop || 0,
    };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !scrollAreaRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!isUserPanningRef.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
      isUserPanningRef.current = true;
      setIsDraggingCanvas(true);
    }

    if (isUserPanningRef.current) {
      scrollAreaRef.current.scrollLeft = dragStartRef.current.scrollLeft - dx;
      scrollAreaRef.current.scrollTop = dragStartRef.current.scrollTop - dy;
    }
  };

  const handleCanvasMouseUp = () => {
    isMouseDownRef.current = false;
    if (isUserPanningRef.current) {
      setTimeout(() => {
        isUserPanningRef.current = false;
        setIsDraggingCanvas(false);
      }, 60);
    }
  };

  useEffect(() => {
    const onGlobalMouseUp = () => {
      isMouseDownRef.current = false;
      if (isUserPanningRef.current) {
        setTimeout(() => {
          isUserPanningRef.current = false;
          setIsDraggingCanvas(false);
        }, 60);
      }
    };
    window.addEventListener('mouseup', onGlobalMouseUp);
    return () => window.removeEventListener('mouseup', onGlobalMouseUp);
  }, []);

  useEffect(() => {
    if (!isPlaying || !filteredMessages.length) return;

    const baseDelay = 1500;
    const delay = baseDelay / playbackSpeed;

    const interval = setInterval(() => {
      setSimulationIndex((prev) => {
        const next = prev + 1;
        if (next >= filteredMessages.length) {
          setIsPlaying(false);
          return -1;
        }
        return next;
      });
    }, delay);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, filteredMessages.length]);

  const handleTogglePlay = useCallback(() => {
    if (!filteredMessages.length) return;
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (simulationIndex === -1 || simulationIndex >= filteredMessages.length - 1) {
        setSimulationIndex(0);
      }
      setIsPlaying(true);
    }
  }, [isPlaying, simulationIndex, filteredMessages.length]);

  const handleStepNext = useCallback(() => {
    setIsPlaying(false);
    setSimulationIndex((prev) => Math.min(filteredMessages.length - 1, prev + 1));
  }, [filteredMessages.length]);

  const handleStepPrev = useCallback(() => {
    setIsPlaying(false);
    setSimulationIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const handleResetSimulator = useCallback(() => {
    setIsPlaying(false);
    setSimulationIndex(-1);
    scrollAreaRef.current?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, []);

  const handleChangeSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      if (prev === 0.5) return 1;
      if (prev === 1) return 2;
      return 0.5;
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(1.4, Number((z + 0.15).toFixed(2))));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.65, Number((z - 0.15).toFixed(2))));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const handleFitView = useCallback(() => {
    setZoom(1);
    const container = scrollAreaRef.current;
    if (container) {
      const diagramWidth = Math.max((activeSequence?.participants?.length || 0) * COLUMN_WIDTH, 800);
      const targetLeft = Math.max(0, (diagramWidth - container.clientWidth) / 2);
      container.scrollTo({ top: 0, left: targetLeft, behavior: 'smooth' });
    }
  }, [activeSequence]);

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
    if (!activeSequence) return;
    const jsonStr = JSON.stringify(activeSequence, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeSequence.id}_sequence.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeSequence]);

  const activeSelectedMessage = useMemo(() => {
    if (!selectedMessageId || !activeSequence) return null;
    return activeSequence.messages.find((m) => m.id === selectedMessageId) || null;
  }, [selectedMessageId, activeSequence]);

  if (loading) {
    return (
      <div className="w-full h-full min-h-[580px] flex-1 rounded-2xl border border-[#E2E0D9] flex flex-col items-center justify-center bg-[#F8F7F4] text-[#526078] font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-3" />
        <span className="text-sm font-medium text-[#19243B]">Analyzing Runtime Sequence Order...</span>
      </div>
    );
  }

  if (error || !activeSequence) {
    return (
      <div className="w-full h-full min-h-[580px] flex-1 rounded-2xl border border-[#E2E0D9] flex flex-col items-center justify-center bg-[#F8F7F4] text-[#526078] font-mono p-6">
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 max-w-md text-center">
          <p className="font-bold text-sm mb-1">Failed to Load Sequences</p>
          <p className="text-xs text-rose-600 mb-3">{error || 'No sequence diagrams extracted.'}</p>
          <button
            onClick={fetchSequences}
            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer shadow-sm"
          >
            Retry Extraction
          </button>
        </div>
      </div>
    );
  }

  const diagramTotalHeight = filteredMessages.length * ROW_HEIGHT + 140;
  const diagramTotalWidth = Math.max(activeSequence.participants.length * COLUMN_WIDTH, 800);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[580px] flex-1 rounded-2xl border border-[#E2E0D9] overflow-hidden bg-[#F8F7F4] flex select-none"
    >
      <style>{`
        .seq-right { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease; }
        .seq-right.open  { width: 380px; opacity: 1; }
        .seq-right.closed{ width: 0px; opacity: 0; pointer-events: none; overflow: hidden; }
      `}</style>

      <SequenceToolbar
        currentView={currentView}
        onViewChange={onViewChange}
        sequences={sequences}
        selectedSequenceId={activeSequence.id}
        onSelectSequence={(id) => {
          setSelectedSequenceId(id);
          setSelectedMessageId(null);
          setSimulationIndex(-1);
          setIsPlaying(false);
        }}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onStepNext={handleStepNext}
        onStepPrev={handleStepPrev}
        onResetSimulator={handleResetSimulator}
        currentStepIndex={simulationIndex}
        totalSteps={filteredMessages.length}
        playbackSpeed={playbackSpeed}
        onChangeSpeed={handleChangeSpeed}
        filterType={filterType}
        onFilterChange={setFilterType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onExport={handleExportJSON}
        onFitView={handleFitView}
      />

      <div
        ref={scrollAreaRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        className={`flex-1 h-full w-full overflow-auto pt-32 pb-16 px-8 relative ${
          isDraggingCanvas ? 'cursor-grabbing select-none' : 'cursor-grab'
        }`}
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #D5D2CA 1.2px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      >
        <div
          style={{
            width: `${diagramTotalWidth}px`,
            minHeight: `${diagramTotalHeight}px`,
            zoom: zoom !== 1 ? zoom : undefined,
          }}
          className="relative mx-auto flex flex-col transition-[zoom] duration-200"
        >
          <div className="sticky top-[108px] z-30 pt-2 pb-3 bg-[#F8F7F4]/95 backdrop-blur-md rounded-2xl">
            <SequenceParticipantHeader
              participants={activeSequence.participants}
              columnWidth={COLUMN_WIDTH}
              diagramHeight={diagramTotalHeight}
              activeParticipantIds={activeParticipantIds}
            />
          </div>

          <div className="flex flex-col mt-4 relative z-20">
            {filteredMessages.map((msg, idx) => {
              const callerIdx = participantIndexMap.get(msg.caller_id) ?? 0;
              const calleeIdx = participantIndexMap.get(msg.callee_id) ?? 0;
              const isSelected = msg.id === selectedMessageId;
              const isActiveSim = idx === simulationIndex;

              return (
                <SequenceMessageRow
                  key={msg.id}
                  message={msg}
                  callerIndex={callerIdx}
                  calleeIndex={calleeIdx}
                  columnWidth={COLUMN_WIDTH}
                  rowHeight={ROW_HEIGHT}
                  isSelected={isSelected}
                  isActiveSimulationStep={isActiveSim}
                  onSelectMessage={(m) => {
                    setSelectedMessageId((prev) => (prev === m.id ? null : m.id));
                  }}
                  onOpenSource={onOpenSource}
                />
              );
            })}

            {filteredMessages.length === 0 && (
              <div className="text-center py-16 text-[#687184] font-mono text-xs">
                No interaction steps match the current search or filter.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Canvas Navigation & Zoom Controls */}
      <div className="absolute bottom-5 left-5 z-20 flex items-center gap-1 p-1 rounded-xl bg-white/95 backdrop-blur-xl border border-[#E2E0D9] shadow-lg pointer-events-auto font-mono text-xs text-[#19243B]">
        <button
          onClick={handleZoomIn}
          className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
          title="Zoom In (+)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 py-0.5 rounded text-[11px] font-bold text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
          title="Reset Zoom (100%)"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          onClick={handleZoomOut}
          className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
          title="Zoom Out (-)"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-4 bg-[#E2E0D9] mx-0.5" />
        <button
          onClick={handleFitView}
          className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
          title="Fit / Center Sequence"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
        <div className="w-[1px] h-4 bg-[#E2E0D9] mx-0.5 hidden sm:block" />
        <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-[#8A94A6] px-1.5 py-0.5">
          <Move className="w-3 h-3" />
          <span>Drag to pan</span>
        </span>
      </div>

      <div
        className={`seq-right flex-shrink-0 h-full bg-white border-l border-[#E2E0D9] shadow-2xl flex flex-col z-30 ${
          activeSelectedMessage ? 'open' : 'closed'
        }`}
      >
        {activeSelectedMessage && activeSequence && (
          <SequenceInspector
            message={activeSelectedMessage}
            participants={activeSequence.participants}
            onClose={() => setSelectedMessageId(null)}
            onOpenSource={onOpenSource}
          />
        )}
      </div>
    </div>
  );
};
