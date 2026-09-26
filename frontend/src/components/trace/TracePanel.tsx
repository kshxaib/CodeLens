import React from 'react';
import {
  Compass,
  ArrowRight,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useTrace } from '../../context/TraceContext';

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

  // If dock is collapsed, render minimal floating pill
  if (!isPanelOpen) {
    return (
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40">
        <button
          onClick={() => setIsPanelOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#09090b]/90 hover:bg-[#121214] text-white border border-[#27272a] shadow-2xl backdrop-blur-xl transition group cursor-pointer"
        >
          <div className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Compass className="w-3.5 h-3.5 group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <span className="text-xs font-mono font-bold tracking-tight">Trace & Explore</span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 capitalize">
            {currentView}
          </span>
          {pathData && pathData.found && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Path Active ({pathData.path_nodes.length} hops)
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-4xl w-[94vw] bg-[#09090b]/95 border border-[#27272a] rounded-2xl shadow-2xl backdrop-blur-2xl overflow-hidden flex flex-col font-mono text-xs select-none animate-in slide-in-from-bottom-2 duration-200">
      {/* Top Header / Tab Bar */}
      <div className="px-4 py-2.5 border-b border-[#1f1f23] bg-[#0c0c0e]/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-white tracking-tight">TRACE / EXPLORE</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-300 border border-zinc-700">
              {viewLabels[currentView] || currentView}
            </span>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-[#141416] p-0.5 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveTab('trace')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer ${
              activeTab === 'trace'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Node Trace
          </button>
          <button
            onClick={() => setActiveTab('path')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'path'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Pathfinder</span>
            {pathData && pathData.found && (
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('impact')}
            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'impact'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Change Impact</span>
          </button>
        </div>

        <button
          onClick={() => setIsPanelOpen(false)}
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          title="Minimize Dock"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: NODE TRACE (Upstream, Current, Downstream, Explain, Impact) */}
      {activeTab === 'trace' && (
        <div className="p-3.5 space-y-3 max-h-[360px] overflow-y-auto">
          {/* Quick Node Selector */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider shrink-0">
                Target Node:
              </span>
              <select
                value={selectedNodeId || ''}
                onChange={(e) => selectTraceNode(e.target.value || null)}
                className="w-full bg-[#141416] text-zinc-200 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-700/80 font-mono focus:outline-none focus:border-amber-500/60 cursor-pointer"
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
                  className="px-2.5 py-1 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Explain component using evidence-first synthesis"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Explain Component</span>
                </button>
                <button
                  onClick={() => calculateImpact(selectedNodeId)}
                  disabled={impactLoading}
                  className="px-2.5 py-1 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Calculate dependency impact and depth"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Impact Analysis</span>
                </button>
                <button
                  onClick={() => selectTraceNode(null)}
                  className="p-1 text-zinc-500 hover:text-zinc-300 rounded cursor-pointer"
                  title="Clear Selection"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Trace 3-Column Grid */}
          {traceLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-zinc-400">
              <Zap className="w-5 h-5 text-amber-400 animate-pulse" />
              <span>Tracing Upstream Callers and Downstream Dependencies...</span>
            </div>
          ) : traceData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Column 1: Upstream */}
              <div className="p-3 rounded-xl border border-zinc-800 bg-[#0c0c0e] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Upstream (Callers)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    {traceData.upstream.length}
                  </span>
                </div>
                <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
                  {traceData.upstream.length === 0 ? (
                    <div className="text-[11px] text-zinc-500 italic py-2">
                      No upstream callers found
                    </div>
                  ) : (
                    traceData.upstream.map((it, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectTraceNode(it.node.id)}
                        className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-amber-500/10 border border-zinc-800 hover:border-amber-500/30 flex items-center justify-between gap-2 transition cursor-pointer group"
                      >
                        <span className="text-zinc-200 group-hover:text-amber-300 truncate font-semibold">
                          {it.node.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] text-zinc-400 px-1 py-0.2 rounded bg-zinc-800">
                            {it.relationship_type}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhy({ source: it.node.id, target: traceData.current.id });
                            }}
                            className="p-0.5 hover:text-amber-400 text-zinc-500"
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

              {/* Column 2: Current */}
              <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                      Current Entity
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 capitalize">
                      {traceData.current.type}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white truncate">
                    {traceData.current.name}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                    {traceData.current.description || `Layer: ${traceData.current.layer}`}
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-400">
                  <span>Up: {traceData.upstream.length}</span>
                  <span>Down: {traceData.downstream.length}</span>
                  <span>Total: {traceData.upstream.length + traceData.downstream.length}</span>
                </div>
              </div>

              {/* Column 3: Downstream */}
              <div className="p-3 rounded-xl border border-zinc-800 bg-[#0c0c0e] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Downstream (Callees)</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    {traceData.downstream.length}
                  </span>
                </div>
                <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1">
                  {traceData.downstream.length === 0 ? (
                    <div className="text-[11px] text-zinc-500 italic py-2">
                      No downstream dependencies found
                    </div>
                  ) : (
                    traceData.downstream.map((it, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectTraceNode(it.node.id)}
                        className="p-1.5 rounded-lg bg-zinc-900/80 hover:bg-sky-500/10 border border-zinc-800 hover:border-sky-500/30 flex items-center justify-between gap-2 transition cursor-pointer group"
                      >
                        <span className="text-zinc-200 group-hover:text-sky-300 truncate font-semibold">
                          {it.node.name}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[9px] text-zinc-400 px-1 py-0.2 rounded bg-zinc-800">
                            {it.relationship_type}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openWhy({ source: traceData.current.id, target: it.node.id });
                            }}
                            className="p-0.5 hover:text-sky-400 text-zinc-500"
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
            <div className="py-6 text-center text-zinc-500 italic">
              Select any node from the canvas or choose from the dropdown to inspect Upstream, Current, and Downstream relationships.
            </div>
          )}

          {/* Feature 6: Impact Analysis Drawer / Summary */}
          {impactData && (
            <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-white">
                    Impact Radius for {impactData.target.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      impactData.risk_level === 'critical'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : impactData.risk_level === 'high'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    {impactData.risk_level} Risk
                  </span>
                </div>
                <button
                  onClick={clearImpact}
                  className="p-1 text-zinc-400 hover:text-white rounded"
                  title="Close Impact Analysis"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Direct Dependents</span>
                  <span className="text-base font-bold text-rose-300">
                    {impactData.direct_dependents.length}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Indirect Dependents</span>
                  <span className="text-base font-bold text-amber-300">
                    {impactData.indirect_dependents.length}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 block">Dependency Depth</span>
                  <span className="text-base font-bold text-sky-300">
                    {impactData.dependency_depth} hops
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PATHFINDER & ANIMATION PLAYER (Features 2, 3) */}
      {activeTab === 'path' && (
        <div className="p-3.5 space-y-3 max-h-[380px] overflow-y-auto">
          {/* Start and End Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-center">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                Start Node:
              </label>
              <select
                value={startNodeId}
                onChange={(e) => setStartNodeId(e.target.value)}
                className="w-full bg-[#141416] text-zinc-200 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-700/80 font-mono focus:outline-none focus:border-emerald-500/60 cursor-pointer"
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
              <label className="text-[10px] font-bold text-sky-400 uppercase tracking-wider block">
                End Node:
              </label>
              <select
                value={endNodeId}
                onChange={(e) => setEndNodeId(e.target.value)}
                className="w-full bg-[#141416] text-zinc-200 text-xs px-2.5 py-1.5 rounded-xl border border-zinc-700/80 font-mono focus:outline-none focus:border-sky-500/60 cursor-pointer"
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

          {/* Action Row */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => findPath()}
                disabled={!startNodeId || !endNodeId || pathLoading}
                className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-zinc-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
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
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition cursor-pointer"
                >
                  Clear Path
                </button>
              )}
            </div>

            {pathData && pathData.found && (
              <label className="flex items-center gap-2 text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={highlightOnlyPath}
                  onChange={(e) => setHighlightOnlyPath(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-900 text-sky-500 focus:ring-sky-500/40"
                />
                <span className="text-[11px]">Highlight Only Path</span>
              </label>
            )}
          </div>

          {/* Path Display & Animation Player */}
          {pathData && (
            <div className="space-y-3 pt-2">
              {!pathData.found ? (
                <div className="p-3 rounded-xl border border-zinc-800 bg-[#0c0c0e] text-amber-300">
                  {pathData.summary || 'No path found between these components.'}
                </div>
              ) : (
                <>
                  {/* Ordered Path Representation */}
                  <div className="p-3 rounded-xl border border-zinc-800 bg-[#0c0c0e] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
                        Calculated Path ({pathData.hop_count} Hops)
                      </span>
                      <span className="text-[11px] text-sky-400 font-bold">
                        {pathStepIndex >= 0
                          ? `Active Step: ${pathStepIndex + 1} / ${pathData.path_nodes.length}`
                          : 'Ready'}
                      </span>
                    </div>

                    {/* Path Breadcrumbs / Node Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                      {pathData.path_nodes.map((n, idx) => {
                        const isCurrentStep = idx === pathStepIndex;
                        return (
                          <React.Fragment key={idx}>
                            <button
                              onClick={() => selectTraceNode(n.id)}
                              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                                isCurrentStep
                                  ? 'bg-sky-500 text-zinc-950 border-sky-400 shadow-lg ring-2 ring-sky-400/50 scale-105'
                                  : 'bg-zinc-900/90 text-zinc-200 border-zinc-700/80 hover:border-zinc-500'
                              }`}
                            >
                              {n.name}
                            </button>
                            {idx < pathData.path_nodes.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>

                  {/* FEATURE 3: Path Animation Controls */}
                  <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 flex items-center justify-between gap-3 flex-wrap">
                    {/* Controls: Play, Pause, Step, Restart */}
                    <div className="flex items-center gap-1.5">
                      {isPathPlaying ? (
                        <button
                          onClick={pausePath}
                          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                          title="Pause Animation"
                        >
                          <Pause className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          onClick={playPath}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                          title="Play Animation"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Play</span>
                        </button>
                      )}

                      <button
                        onClick={stepPrev}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
                        title="Step Back"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={stepNext}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
                        title="Step Forward"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={restartPath}
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition cursor-pointer"
                        title="Restart from Beginning"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Speed Selector */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-400 uppercase mr-1">Speed:</span>
                      {[0.5, 1, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => setSpeed(s)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            pathSpeed === s
                              ? 'bg-sky-500 text-zinc-950 font-extrabold'
                              : 'bg-zinc-800 text-zinc-400 hover:text-white'
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

      {/* TAB 3: CHANGE IMPACT LAUNCHER (Feature 7) */}
      {activeTab === 'impact' && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>Code Change Impact Simulator</span>
              </h3>
              <p className="text-[11px] text-zinc-400">
                Simulate modifying any file, function, or symbol to evaluate systemic ripple effects across APIs, workflows, and data flows.
              </p>
            </div>

            <button
              onClick={openChangeImpact}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500 text-zinc-950 font-bold flex items-center gap-2 transition cursor-pointer shadow-lg"
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
