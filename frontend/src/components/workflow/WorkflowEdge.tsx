import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import { getTransitionCfg } from './constants';
import type { WorkflowTransitionType } from '../../types';

export interface WorkflowEdgeData {
  transition_type?: WorkflowTransitionType;
  label?: string;
  isHighlighted?: boolean;
  isDimmed?: boolean;
}

export const WorkflowEdge: React.FC<EdgeProps> = memo(({
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
  const edgeData = (data || {}) as WorkflowEdgeData;
  const transType = edgeData.transition_type || 'normal';
  const cfg = getTransitionCfg(transType);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  });

  let strokeColor = cfg.stroke;
  let strokeWidth = cfg.width;

  if (edgeData.isHighlighted) {
    strokeColor = '#f59e0b';
    strokeWidth = 2.5;
  }

  const opacity = edgeData.isDimmed ? 0.15 : 0.85;
  const labelText = edgeData.label || cfg.label;

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
          strokeDasharray: cfg.strokeDasharray,
          opacity,
          transition: 'all 0.2s ease',
        }}
      />

      {labelText && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
              opacity,
            }}
            className="group transition-opacity duration-200"
          >
            <div
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase border shadow-md transition-all ${
                transType === 'failure'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : transType === 'success'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : transType === 'retry'
                  ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                  : transType === 'async'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-[#09090b]/90 text-zinc-400 border-[#27272a]'
              }`}
            >
              {labelText}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

WorkflowEdge.displayName = 'WorkflowEdge';
