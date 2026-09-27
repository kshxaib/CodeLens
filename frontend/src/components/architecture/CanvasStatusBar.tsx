
import React from 'react';
import { ChevronRight, CheckCircle2, AlertTriangle, Layers, GitBranch, ZoomIn } from 'lucide-react';

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
    <div className="absolute bottom-0 left-0 right-0 z-20 h-8 bg-white/95 backdrop-blur-md border-t border-[#E2E0D9] flex items-center px-3 gap-3 text-[10px] font-mono text-[#687184] pointer-events-none select-none">
      <div className="flex items-center gap-1 text-[#526078] shrink-0">
        <Layers className="w-3 h-3 text-[#687184]" />
        {repoName && (
          <>
            <span className="text-[#526078] truncate max-w-[100px]">{repoName}</span>
            <ChevronRight className="w-3 h-3 text-[#A19D94]" />
          </>
        )}
        <span className="text-[#19243B] font-semibold">{VIEW_LABELS[currentView] || currentView}</span>
      </div>

      <span className="text-[#E2E0D9]">|</span>

      <div className="flex items-center gap-2 shrink-0">
        <span className={filteredNodes < totalNodes ? 'text-amber-700 font-bold' : 'text-[#526078]'}>
          {filteredNodes < totalNodes ? `${filteredNodes}/${totalNodes}` : totalNodes} nodes
        </span>
        <span className="text-[#E2E0D9]">·</span>
        <span className={filteredEdges < totalEdges ? 'text-amber-700 font-bold' : 'text-[#526078]'}>
          {filteredEdges < totalEdges ? `${filteredEdges}/${totalEdges}` : totalEdges} edges
        </span>
      </div>

      {(selectedNodeName || selectedEdgeLabel || pathLabel) && (
        <>
          <span className="text-[#E2E0D9]">|</span>
          <div className="flex items-center gap-1.5 min-w-0">
            {pathLabel ? (
              <>
                <GitBranch className="w-3 h-3 text-sky-600 shrink-0" />
                <span className="text-sky-800 font-bold truncate max-w-[200px]">{pathLabel}</span>
              </>
            ) : selectedEdgeLabel ? (
              <>
                <span className="text-[#687184]">edge:</span>
                <span className="text-indigo-700 font-bold truncate max-w-[180px]">{selectedEdgeLabel}</span>
              </>
            ) : selectedNodeName ? (
              <>
                <span className="text-[#687184]">focus:</span>
                <span className="text-[#19243B] font-bold truncate max-w-[160px]">{selectedNodeName}</span>
              </>
            ) : null}
          </div>
        </>
      )}

      {evidenceStatus && evidenceStatus !== 'none' && (
        <>
          <span className="text-[#E2E0D9]">|</span>
          <div className="flex items-center gap-1 shrink-0">
            {evidenceStatus === 'verified' ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Verified</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span className="text-amber-700 font-bold">Inferred</span>
              </>
            )}
          </div>
        </>
      )}

      <div className="flex-1" />

      {zoom !== undefined && (
        <div className="flex items-center gap-1 shrink-0 text-[#687184]">
          <ZoomIn className="w-3 h-3" />
          <span>{Math.round(zoom * 100)}%</span>
        </div>
      )}
    </div>
  );
};
