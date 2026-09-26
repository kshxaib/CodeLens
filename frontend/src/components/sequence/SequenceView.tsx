import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import type { SequenceDiagram } from '../../types';
import { SequenceToolbar } from './SequenceToolbar';
import { SequenceParticipantHeader } from './SequenceParticipantHeader';
import { SequenceMessageRow } from './SequenceMessageRow';
import { SequenceInspector } from './SequenceInspector';
import { useTrace } from '../../store/useTraceStore';

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
  const { setViewNodes, selectTraceNode } = useTrace();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [sequences, setSequences] = useState<SequenceDiagram[]>([]);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector & Selection
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'calls' | 'returns' | 'async' | 'errors'>('all');

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Step Simulation
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // 1. Fetch Sequences
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

  // Active Sequence
  const activeSequence = useMemo(() => {
    return sequences.find((s) => s.id === selectedSequenceId) || sequences[0] || null;
  }, [sequences, selectedSequenceId]);

  // Sync sequence participants with TraceContext
  useEffect(() => {
    if (activeSequence?.participants) {
      setViewNodes(
        activeSequence.participants.map((p) => ({
          id: p.id,
          name: p.name,
          type: p.participant_type,
          layer: 'service',
        }))
      );
    }
  }, [activeSequence, setViewNodes]);

  // Filtered Messages
  const filteredMessages = useMemo(() => {
    if (!activeSequence) return [];

    return activeSequence.messages.filter((m) => {
      // Type filter
      if (filterType === 'calls' && m.interaction_type !== 'call') return false;
      if (filterType === 'returns' && m.interaction_type !== 'return') return false;
      if (filterType === 'async' && !m.is_async && m.interaction_type !== 'event_emit') return false;
      if (filterType === 'errors' && !m.is_error && m.interaction_type !== 'error') return false;

      // Text search
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

  // Participant Map
  const participantIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeSequence) return map;
    activeSequence.participants.forEach((p, idx) => {
      map.set(p.id, idx);
    });
    return map;
  }, [activeSequence]);

  // Active Message being simulated or selected
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

  // 2. Playback Simulation Loop
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

  // Handlers
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
  }, []);

  const handleChangeSpeed = useCallback(() => {
    setPlaybackSpeed((prev) => {
      if (prev === 0.5) return 1;
      if (prev === 1) return 2;
      return 0.5;
    });
  }, []);

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

  // Selected Message for inspector
  const activeSelectedMessage = useMemo(() => {
    if (!selectedMessageId || !activeSequence) return null;
    return activeSequence.messages.find((m) => m.id === selectedMessageId) || null;
  }, [selectedMessageId, activeSequence]);

  if (loading) {
    return (
      <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] flex flex-col items-center justify-center bg-[#070709] text-zinc-400 font-mono">
        <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-3" />
        <span className="text-sm font-medium text-zinc-200">Analyzing Runtime Sequence Order...</span>
      </div>
    );
  }

  if (error || !activeSequence) {
    return (
      <div className="w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] flex flex-col items-center justify-center bg-[#070709] text-zinc-400 font-mono p-6">
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 max-w-md text-center">
          <p className="font-bold text-sm mb-1">Failed to Load Sequences</p>
          <p className="text-xs text-rose-400 mb-3">{error || 'No sequence diagrams extracted.'}</p>
          <button
            onClick={fetchSequences}
            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
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
      className="relative w-full h-[calc(100vh-10rem)] rounded-2xl border border-[#1f1f23] overflow-hidden bg-[#000000] flex select-none"
    >
      <style>{`
        .seq-right { transition: width 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease; }
        .seq-right.open  { width: 380px; opacity: 1; }
        .seq-right.closed{ width: 0px; opacity: 0; pointer-events: none; overflow: hidden; }
      `}</style>

      {/* Top Floating Toolbar */}
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
      />

      {/* Main Sequence Canvas (Vertical Timeline with Horizontal Scroll) */}
      <div
        ref={scrollAreaRef}
        className="flex-1 h-full w-full overflow-auto pt-32 pb-16 px-8 relative"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, #18181b 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }}
      >
        <div
          style={{
            width: `${diagramTotalWidth}px`,
            minHeight: `${diagramTotalHeight}px`,
          }}
          className="relative mx-auto flex flex-col"
        >
          {/* 1. Sticky Participant Headers with Lifelines */}
          <div className="sticky top-0 z-30 pt-2 pb-4 bg-[#000000]/95 backdrop-blur-md">
            <SequenceParticipantHeader
              participants={activeSequence.participants}
              columnWidth={COLUMN_WIDTH}
              diagramHeight={diagramTotalHeight}
              activeParticipantIds={activeParticipantIds}
            />
          </div>

          {/* 2. Messages List (Vertical Timeline Execution Order) */}
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
                    selectTraceNode(m.caller_id);
                  }}
                  onOpenSource={onOpenSource}
                />
              );
            })}

            {filteredMessages.length === 0 && (
              <div className="text-center py-16 text-zinc-500 font-mono text-xs">
                No interaction steps match the current search or filter.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Slide-in Inspector Drawer */}
      <div
        className={`seq-right flex-shrink-0 h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl flex flex-col z-30 ${
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
