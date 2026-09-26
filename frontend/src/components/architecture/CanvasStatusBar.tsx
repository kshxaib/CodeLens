/**
 * CanvasStatusBar — Bottom status bar for the Architecture Canvas.
 *
 * Shows:
 * - Breadcrumb (repo → view)
 * - Active node/path selection
 * - Evidence status
 * - Node/edge counts
 * - Zoom level
 */
import React from 'react';
import {
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Layers,
  GitBranch,
  ZoomIn,
} from 'lucide-react';

interface CanvasStatusBarProps {
  repoName?: string;
  currentView: string;
  selectedNodeName?: string | null;
  selectedEdgeLabel?: string | null;
  pathLabel?: string | null;
  totalNodes: number;
  filteredNodes: number;
  totalEdges: number;
  filteredEdges: number;
  evidenceStatus?: 'verified' | 'inferred' | 'none' | null;
  zoom?: number;
}

const VIEW_LABELS: Record<string, string> = {
  architecture: 'Architecture',
  workflow: 'Workflow',
  sequence: 'Sequence',
  dataflow: 'Data Flow',
  lifecycle: 'Lifecycle',
};

export const CanvasStatusBar: React.FC<CanvasStatusBarProps> = ({
  repoName,
  currentView,
  selectedNodeName,
  selectedEdgeLabel,
  pathLabel,
  totalNodes,
  filteredNodes,
  totalEdges,
  filteredEdges,
  evidenceStatus,
  zoom,
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 h-8 bg-[#09090b]/95 backdrop-blur-md border-t border-[#1f1f23] flex items-center px-3 gap-3 text-[10px] font-mono text-zinc-500 pointer-events-none select-none">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-zinc-500 shrink-0">
        <Layers className="w-3 h-3 text-zinc-600" />
        {repoName && (
          <>
            <span className="text-zinc-500 truncate max-w-[100px]">{repoName}</span>
            <ChevronRight className="w-3 h-3 text-zinc-700" />
          </>
        )}
        <span className="text-zinc-400">{VIEW_LABELS[currentView] || currentView}</span>
      </div>

      <span className="text-zinc-700">|</span>

      {/* Node/Edge counts */}
      <div className="flex items-center gap-2 shrink-0">
        <span className={filteredNodes < totalNodes ? 'text-amber-400' : 'text-zinc-400'}>
          {filteredNodes < totalNodes ? `${filteredNodes}/${totalNodes}` : totalNodes} nodes
        </span>
        <span className="text-zinc-700">·</span>
        <span className={filteredEdges < totalEdges ? 'text-amber-400' : 'text-zinc-400'}>
          {filteredEdges < totalEdges ? `${filteredEdges}/${totalEdges}` : totalEdges} edges
        </span>
      </div>

      {/* Selected context */}
      {(selectedNodeName || selectedEdgeLabel || pathLabel) && (
        <>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1.5 min-w-0">
            {pathLabel ? (
              <>
                <GitBranch className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="text-sky-300 truncate max-w-[200px]">{pathLabel}</span>
              </>
            ) : selectedEdgeLabel ? (
              <>
                <span className="text-zinc-600">edge:</span>
                <span className="text-indigo-300 truncate max-w-[180px]">{selectedEdgeLabel}</span>
              </>
            ) : selectedNodeName ? (
              <>
                <span className="text-zinc-600">focus:</span>
                <span className="text-white font-bold truncate max-w-[160px]">{selectedNodeName}</span>
              </>
            ) : null}
          </div>
        </>
      )}

      {/* Evidence status */}
      {evidenceStatus && evidenceStatus !== 'none' && (
        <>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-1 shrink-0">
            {evidenceStatus === 'verified' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Verified</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400">Inferred</span>
              </>
            )}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Zoom */}
      {zoom !== undefined && (
        <div className="flex items-center gap-1 shrink-0">
          <ZoomIn className="w-3 h-3 text-zinc-600" />
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      )}
    </div>
  );
};
