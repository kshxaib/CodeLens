import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
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
    strokeColor = '#D97706';
    strokeWidth = 2.5;
  }

  const opacity = edgeData.isDimmed ? 0.2 : 0.9;
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
              className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase border shadow-sm transition-all ${
                transType === 'failure'
                  ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-sm'
                  : transType === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm'
                  : transType === 'retry'
                  ? 'bg-orange-50 text-orange-800 border-orange-200 shadow-sm'
                  : transType === 'async'
                  ? 'bg-sky-50 text-sky-800 border-sky-200 shadow-sm'
                  : 'bg-white/95 text-[#526078] border-[#E2E0D9] shadow-sm'
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
