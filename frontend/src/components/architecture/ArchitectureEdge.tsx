import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';
import { getRelationshipCfg } from './constants';
import type { RelationshipType } from '../../types';

export interface ArchitectureEdgeData {
  relationship_type?: RelationshipType;
  confidence?: number;
  confidence_level?: string;
  isHovered?: boolean;
  isSelected?: boolean;
  isUpstream?: boolean;
  isDownstream?: boolean;
  isPathEdge?: boolean;
  isDimmed?: boolean;
  evidence_count?: number;
  onWhyClick?: () => void;
}

export const ArchitectureEdge: React.FC<EdgeProps> = memo(({
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
  const edgeData = (data || {}) as ArchitectureEdgeData;
  const relType = edgeData.relationship_type || 'DEPENDS_ON';
  const cfg = getRelationshipCfg(relType);

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

  if (edgeData.isPathEdge) {
    strokeColor = '#0284C7';
    strokeWidth = 3.5;
  } else if (edgeData.isUpstream) {
    strokeColor = '#D97706';
    strokeWidth = 2.5;
  } else if (edgeData.isDownstream) {
    strokeColor = '#0284C7';
    strokeWidth = 2.5;
  } else if (edgeData.isHovered || edgeData.isSelected) {
    strokeColor = '#B45309';
    strokeWidth = 2.5;
  }

  const opacity = edgeData.isDimmed ? 0.15 : 0.85;

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
            onClick={(e) => {
              e.stopPropagation();
              edgeData.onWhyClick?.();
            }}
            className={`px-1.5 py-0.5 rounded-[3px] text-[8px] font-mono font-bold tracking-wider uppercase border shadow-xs transition-all cursor-pointer select-none ${
              edgeData.isPathEdge
                ? 'bg-sky-600 text-white border-sky-700 font-extrabold shadow-md ring-2 ring-sky-300'
                : edgeData.isUpstream
                ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-300'
                : edgeData.isDownstream
                ? 'bg-sky-50 text-sky-900 border-sky-300 ring-1 ring-sky-300'
                : edgeData.isHovered
                ? 'bg-white text-[#15181B] border-[#15181B] shadow-sm'
                : 'bg-[#F8F7F4] text-[#60686D] border-[#E2E0D9] hover:border-[#15181B] hover:text-[#15181B]'
            }`}
            title={`Evidence: ${relType} (${edgeData.confidence_level || 'deterministic'}). Click to inspect.`}
          >
            {cfg.label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

ArchitectureEdge.displayName = 'ArchitectureEdge';
