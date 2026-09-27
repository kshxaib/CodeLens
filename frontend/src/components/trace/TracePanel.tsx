import React from 'react';
import { Compass, ArrowRight, Play, Pause, SkipForward, SkipBack, RotateCcw, Sparkles, ShieldAlert, ChevronDown, ChevronUp, X, ArrowDownLeft, ArrowUpRight, HelpCircle, Zap } from 'lucide-react';
import { useTrace } from '../../store/useTraceStore';

interface TracePanelProps {
  onOpenSource?: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const TracePanel: React.FC<TracePanelProps> = () => {
  const {
    currentView,
    selectedNodeId,
    traceData,
    traceLoading,
    selectTraceNode,
    startNodeId,
    endNodeId,
    setStartNodeId,
    setEndNodeId,
    pathData,
    pathLoading,
    findPath,
    clearPath,
    highlightOnlyPath,
    setHighlightOnlyPath,
    isPathPlaying,
    pathStepIndex,
    pathSpeed,
    playPath,
    pausePath,
    stepNext,
    stepPrev,
    restartPath,
    setSpeed,
    openExplain,
    openWhy,
    impactData,
    impactLoading,
    calculateImpact,
    clearImpact,
    openChangeImpact,
    viewNodes,
    isPanelOpen,
    setIsPanelOpen,
    activeTab,
    setActiveTab,
  } = useTrace();

  const viewLabels: Record<string, string> = {
    architecture: 'Architecture View',
    workflow: 'Workflow View',
    sequence: 'Sequence View',
    dataflow: 'Data Flow View',
    lifecycle: 'Lifecycle View',
  };

  if (!isPanelOpen) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsPanelOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/95 hover:bg-white text-[#19243B] border border-[#E2E0D9] shadow-xl backdrop-blur-xl transition group cursor-pointer"
        >
          <div className="w-5 h-5 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center">
            <Compass className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <span className="text-xs font-mono font-bold tracking-tight">Trace</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F0EEE9] text-[#526078] border border-[#E2E0D9] capitalize font-medium">
            {currentView}
          </span>
          {pathData && pathData.found && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Path Active ({pathData.path_nodes.length} hops)
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-[#687184]" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[94vw] bg-white/95 border border-[#E2E0D9] rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col font-mono text-xs select-none animate-in slide-in-from-bottom-2 duration-200">
      <div className="px-4 py-2.5 border-b border-[#E2E0D9] bg-[#F8F7F4]/90 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-[#19243B] tracking-tight">TRACE</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F0EEE9] text-[#526078] border border-[#E2E0D9]">
              {viewLabels[currentView] || currentView}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-[#F0EEE9] p-0.5 rounded-xl border border-[#E2E0D9]">
          <button
            onClick={() => setActiveTab('trace')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'trace'
                ? 'bg-white text-[#B45309] border border-amber-200 shadow-sm font-bold'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            Node Trace
          </button>
          <button
            onClick={() => setActiveTab('path')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'path'
                ? 'bg-white text-[#B45309] border border-amber-200 shadow-sm font-bold'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            <span>Pathfinder</span>
            {pathData && pathData.found && (
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'impact'
                ? 'bg-white text-rose-800 border border-rose-200 shadow-sm font-bold'
                : 'text-[#526078] hover:text-[#19243B]'
            }`}
          >
            <span>Change Impact</span>
          </button>
        </div>

        <button
          onClick={() => setIsPanelOpen(false)}
          className="p-1 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
          title="Minimize Dock"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {activeTab === 'trace' && (
        <div className="p-3.5 space-y-3 max-h-[360px] overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-[10px] text-[#526078] uppercase tracking-wider shrink-0 font-bold">
                Target Node:
              </span>
              <select
                value={selectedNodeId || ''}
                onChange={(e) => selectTraceNode(e.target.value || null)}
                className="w-full bg-white text-[#19243B] text-xs px-2.5 py-1.5 rounded-xl border border-[#E2E0D9] font-mono focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
              >
                <option value="">-- Click any node or select here --</option>
                {viewNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name} ({n.type || 'component'})
                  </option>
                ))}
              </select>
            </div>

            {selectedNodeId && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openExplain(selectedNodeId)}
                  className="px-2.5 py-1 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Explain component using evidence-first synthesis"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Explain Component</span>
                </button>
                <button
                  onClick={() => calculateImpact(selectedNodeId)}
                  disabled={impactLoading}
                  className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  title="Calculate dependency impact and depth"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Impact Analysis</span>
                </button>
                <button
                  onClick={() => selectTraceNode(null)}
                  className="p-1 text-[#687184] hover:text-[#19243B] rounded cursor-pointer"
                  title="Clear Selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {traceLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-[#526078]">
              <Zap className="w-5 h-5 text-amber-600 animate-pulse" />
              <span>Tracing Upstream Callers and Downstream Dependencies...</span>
            </div>
          ) : traceData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-amber-700 font-bold">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Upstream (Callers)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                    {traceData.upstream.length}
                  </span>
                </div>
                <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
                  {traceData.upstream.length === 0 ? (
                    <div className="text-[11px] text-[#687184] italic py-2">
                      No upstream callers found
                    </div>
                  ) : (
                    traceData.upstream.map((it, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectTraceNode(it.node.id)}
                        className="p-1.5 rounded-lg bg-white hover:bg-amber-50 border border-[#E2E0D9] hover:border-amber-300 flex items-center justify-between gap-2 transition cursor-pointer group shadow-sm"
                      >
                        <span className="text-[#19243B] group-hover:text-amber-800 truncate font-semibold">
                          {it.node.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] text-[#526078] px-1 py-0.2 rounded bg-[#F0EEE9]">
                            {it.relationship_type}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhy({ source: it.node.id, target: traceData.current.id });
                            }}
                            className="p-0.5 hover:text-amber-700 text-[#687184]"
                            title="Why does this relationship exist?"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/50 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                      Current Entity
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#19243B] border border-amber-200 capitalize font-semibold shadow-sm">
                      {traceData.current.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#19243B] truncate">
                    {traceData.current.name}
                  </h3>
                  <p className="text-[11px] text-[#526078] mt-1 line-clamp-2">
                    {traceData.current.description || `Layer: ${traceData.current.layer}`}
                  </p>
                </div>

                <div className="pt-3 border-t border-amber-200/80 flex items-center justify-between text-[10px] text-[#526078] font-semibold">
                  <span>Up: {traceData.upstream.length}</span>
                  <span>Down: {traceData.downstream.length}</span>
                  <span>Total: {traceData.upstream.length + traceData.downstream.length}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sky-800 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Downstream (Callees)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                    {traceData.downstream.length}
                  </span>
                </div>
                <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
                  {traceData.downstream.length === 0 ? (
                    <div className="text-[11px] text-[#687184] italic py-2">
                      No downstream dependencies found
                    </div>
                  ) : (
                    traceData.downstream.map((it, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectTraceNode(it.node.id)}
                        className="p-1.5 rounded-lg bg-white hover:bg-sky-50 border border-[#E2E0D9] hover:border-sky-300 flex items-center justify-between gap-2 transition cursor-pointer group shadow-sm"
                      >
                        <span className="text-[#19243B] group-hover:text-sky-800 truncate font-semibold">
                          {it.node.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] text-[#526078] px-1 py-0.2 rounded bg-[#F0EEE9]">
                            {it.relationship_type}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhy({ source: traceData.current.id, target: it.node.id });
                            }}
                            className="p-0.5 hover:text-sky-700 text-[#687184]"
                            title="Why does this relationship exist?"
                          >
                            <HelpCircle className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-[#687184] italic">
              Select any node from the canvas or choose from the dropdown to inspect Upstream, Current, and Downstream relationships.
            </div>
          )}

          {impactData && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span className="font-bold text-[#19243B]">
                    Impact Radius for {impactData.target.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      impactData.risk_level === 'critical'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : impactData.risk_level === 'high'
                        ? 'bg-orange-50 text-orange-800 border-orange-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {impactData.risk_level} Risk
                  </span>
                </div>
                <button
                  onClick={clearImpact}
                  className="p-1 text-[#687184] hover:text-[#19243B] rounded cursor-pointer"
                  title="Close Impact Analysis"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-white border border-[#E2E0D9] shadow-sm">
                  <span className="text-[10px] text-[#526078] block">Direct Dependents</span>
                  <span className="text-base font-bold text-rose-700">
                    {impactData.direct_dependents.length}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#E2E0D9] shadow-sm">
                  <span className="text-[10px] text-[#526078] block">Indirect Dependents</span>
                  <span className="text-base font-bold text-amber-700">
                    {impactData.indirect_dependents.length}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-white border border-[#E2E0D9] shadow-sm">
                  <span className="text-[10px] text-[#526078] block">Dependency Depth</span>
                  <span className="text-base font-bold text-sky-700">
                    {impactData.dependency_depth} hops
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'path' && (
        <div className="p-3.5 space-y-3 max-h-[380px] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                Start Node:
              </label>
              <select
                value={startNodeId}
                onChange={(e) => setStartNodeId(e.target.value)}
                className="w-full bg-white text-[#19243B] text-xs px-2.5 py-1.5 rounded-xl border border-[#E2E0D9] font-mono focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
              >
                <option value="">-- Choose Starting Point --</option>
                {viewNodes.map((n) => (
                  <option key={`start-${n.id}`} value={n.id}>
                    {n.name} ({n.type || 'component'})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">
                End Node:
              </label>
              <select
                value={endNodeId}
                onChange={(e) => setEndNodeId(e.target.value)}
                className="w-full bg-white text-[#19243B] text-xs px-2.5 py-1.5 rounded-xl border border-[#E2E0D9] font-mono focus:outline-none focus:border-amber-500 cursor-pointer shadow-sm"
              >
                <option value="">-- Choose Destination --</option>
                {viewNodes.map((n) => (
                  <option key={`end-${n.id}`} value={n.id}>
                    {n.name} ({n.type || 'component'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => findPath()}
                disabled={!startNodeId || !endNodeId || pathLoading}
                className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                {pathLoading ? (
                  <>
                    <Zap className="w-3.5 h-3.5 animate-spin" />
                    <span>Calculating Path...</span>
                  </>
                ) : (
                  <>
                    <Compass className="w-3.5 h-3.5" />
                    <span>Trace Path</span>
                  </>
                )}
              </button>

              {pathData && (
                <button
                  onClick={clearPath}
                  className="px-3 py-1.5 rounded-xl bg-[#F0EEE9] hover:bg-[#E2E0D9] text-[#19243B] font-semibold transition cursor-pointer border border-[#E2E0D9]"
                >
                  Clear Path
                </button>
              )}
            </div>

            {pathData && pathData.found && (
              <label className="flex items-center gap-2 text-[#526078] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={highlightOnlyPath}
                  onChange={(e) => setHighlightOnlyPath(e.target.checked)}
                  className="rounded border-[#E2E0D9] text-amber-600 focus:ring-amber-500/40"
                />
                <span className="text-[11px]">Highlight Only Path</span>
              </label>
            )}
          </div>

          {pathData && (
            <div className="space-y-3 pt-2">
              {!pathData.found ? (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900">
                  {pathData.summary || 'No path found between these components.'}
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold">
                        Calculated Path ({pathData.hop_count} Hops)
                      </span>
                      <span className="text-[11px] text-amber-700 font-bold">
                        {pathStepIndex >= 0
                          ? `Active Step: ${pathStepIndex + 1} / ${pathData.path_nodes.length}`
                          : 'Ready'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                      {pathData.path_nodes.map((n, idx) => {
                        const isCurrentStep = idx === pathStepIndex;
                        return (
                          <React.Fragment key={idx}>
                            <button
                              onClick={() => selectTraceNode(n.id)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                                isCurrentStep
                                  ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-400/50 scale-105'
                                  : 'bg-white text-[#19243B] border-[#E2E0D9] hover:border-zinc-400 shadow-sm'
                              }`}
                            >
                              {n.name}
                            </button>
                            {idx < pathData.path_nodes.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-[#687184] shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/40 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {isPathPlaying ? (
                        <button
                          onClick={pausePath}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                          title="Pause Animation"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={playPath}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                          title="Play Animation"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play</span>
                        </button>
                      )}

                      <button
                        onClick={stepPrev}
                        className="p-1.5 rounded-lg bg-white border border-[#E2E0D9] hover:bg-[#F0EEE9] text-[#19243B] transition cursor-pointer shadow-sm"
                        title="Step Back"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={stepNext}
                        className="p-1.5 rounded-lg bg-white border border-[#E2E0D9] hover:bg-[#F0EEE9] text-[#19243B] transition cursor-pointer shadow-sm"
                        title="Step Forward"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={restartPath}
                        className="p-1.5 rounded-lg bg-white border border-[#E2E0D9] hover:bg-[#F0EEE9] text-[#19243B] transition cursor-pointer shadow-sm"
                        title="Restart from Beginning"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#526078] uppercase mr-1 font-bold">Speed:</span>
                      {[0.5, 1, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            pathSpeed === s
                              ? 'bg-amber-600 text-white font-extrabold shadow-sm'
                              : 'bg-white text-[#526078] border border-[#E2E0D9] hover:text-[#19243B]'
                          }`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'impact' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-[#19243B] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Code Change Impact Simulator</span>
              </h3>
              <p className="text-[11px] text-[#526078]">
                Simulate modifying any file, function, or symbol to evaluate systemic ripple effects across APIs, workflows, and data flows.
              </p>
            </div>

            <button
              onClick={openChangeImpact}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold flex items-center gap-2 transition cursor-pointer shadow-md"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Launch Change Simulator</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
