import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { RotateCcw, AlertTriangle, HelpCircle } from 'lucide-react';
import type { LifecycleTransition } from '../../types';

export interface LifecycleEdgeData {
  transition: LifecycleTransition;
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isCurrentActive?: boolean;
  onSelectTransition?: (transition: LifecycleTransition) => void;
}

export const LifecycleTransitionEdge: React.FC<EdgeProps> = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
}) => {
  const edgeData = (data || {}) as unknown as LifecycleEdgeData;
  const transition = edgeData.transition;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  const isRetry = transition?.is_retry;
  const isFailure = transition?.is_failure;
  const isInferred = transition?.is_inferred;

  let strokeColor = '#6366f1'; // indigo
  let strokeDasharray: string | undefined = undefined;
  let strokeWidth = 1.75;

  if (isFailure) {
    strokeColor = '#f43f5e'; // rose
  } else if (isRetry) {
    strokeColor = '#f59e0b'; // amber
    strokeDasharray = '5 3';
  } else if (isInferred) {
    strokeColor = '#71717a'; // zinc
    strokeDasharray = '3 3';
  }

  if (edgeData.isCurrentActive) {
    strokeColor = '#38bdf8'; // sky
    strokeWidth = 3;
    strokeDasharray = '6 3';
  } else if (edgeData.isHighlighted) {
    strokeColor = '#a855f7'; // purple
    strokeWidth = 2.5;
  }

  const opacity = edgeData.isDimmed ? 0.15 : 0.9;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray,
          opacity,
          transition: 'all 0.2s ease',
        }}
      />

      {transition && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity,
            }}
            className="group cursor-pointer select-none"
            onClick={(e) => {
              e.stopPropagation();
              edgeData.onSelectTransition?.(transition);
            }}
          >
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-semibold border shadow-lg backdrop-blur-md transition-all group-hover:scale-105 ${
                edgeData.isCurrentActive
                  ? 'bg-sky-500/20 text-sky-200 border-sky-400 ring-2 ring-sky-400/50 scale-105'
                  : edgeData.isHighlighted
                  ? 'bg-purple-500/20 text-purple-200 border-purple-400 ring-2 ring-purple-400/50'
                  : isFailure
                  ? 'bg-rose-950/80 text-rose-300 border-rose-500/40 hover:border-rose-400'
                  : isRetry
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:border-amber-400'
                  : isInferred
                  ? 'bg-zinc-900/90 text-zinc-400 border-zinc-700/60 hover:border-zinc-500'
                  : 'bg-[#0f1015]/90 text-indigo-200 border-indigo-500/30 hover:border-indigo-400'
              }`}
            >
              {isRetry && <RotateCcw className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
              {isFailure && <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />}
              {isInferred && <HelpCircle className="w-2.5 h-2.5 text-zinc-400 shrink-0" />}

              <span className="truncate max-w-[130px]">{transition.event}</span>

              {transition.condition && (
                <span className="text-[8px] text-zinc-400 px-1 py-0.2 rounded bg-black/40 border border-white/10 max-w-[100px] truncate">
                  [{transition.condition}]
                </span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

LifecycleTransitionEdge.displayName = 'LifecycleTransitionEdge';
