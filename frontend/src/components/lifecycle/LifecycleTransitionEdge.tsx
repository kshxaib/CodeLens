import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
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

  let strokeColor = '#4F46E5'; 
  let strokeDasharray: string | undefined = undefined;
  let strokeWidth = 1.75;

  if (isFailure) {
    strokeColor = '#E11D48'; 
  } else if (isRetry) {
    strokeColor = '#EA580C'; 
    strokeDasharray = '5 3';
  } else if (isInferred) {
    strokeColor = '#A3A29E'; 
    strokeDasharray = '3 3';
  }

  if (edgeData.isCurrentActive) {
    strokeColor = '#D97706'; 
    strokeWidth = 3;
    strokeDasharray = '6 3';
  } else if (edgeData.isHighlighted) {
    strokeColor = '#D97706'; 
    strokeWidth = 2.5;
  }

  const opacity = edgeData.isDimmed ? 0.2 : 0.9;

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
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono font-semibold border shadow-sm backdrop-blur-md transition-all group-hover:scale-105 ${
                edgeData.isCurrentActive
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/40 shadow-sm scale-105'
                  : edgeData.isHighlighted
                  ? 'bg-amber-50 text-amber-900 border-amber-300 ring-2 ring-amber-400/40 shadow-sm'
                  : isFailure
                  ? 'bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-300'
                  : isRetry
                  ? 'bg-orange-50 text-orange-800 border-orange-200 hover:border-orange-300'
                  : isInferred
                  ? 'bg-[#F0EEE9] text-[#526078] border-[#E2E0D9] hover:border-zinc-400'
                  : 'bg-white text-indigo-900 border-indigo-200 hover:border-indigo-300'
              }`}
            >
              {isRetry && <RotateCcw className="w-2.5 h-2.5 text-orange-600 shrink-0" />}
              {isFailure && <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />}
              {isInferred && <HelpCircle className="w-2.5 h-2.5 text-[#687184] shrink-0" />}

              <span className="truncate max-w-[130px]">{transition.event}</span>

              {transition.condition && (
                <span className="text-[8px] text-[#526078] px-1 py-0.2 rounded bg-[#F0EEE9] border border-[#E2E0D9] max-w-[100px] truncate">
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
