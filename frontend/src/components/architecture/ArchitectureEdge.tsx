import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
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
  isDimmed?: boolean;
  evidence_count?: number;
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

  // Calculate stroke color & width based on state
  let strokeColor = cfg.stroke;
  let strokeWidth = cfg.width;

  if (edgeData.isUpstream) {
    strokeColor = '#f59e0b';
    strokeWidth = 2.5;
  } else if (edgeData.isDownstream) {
    strokeColor = '#38bdf8';
    strokeWidth = 2.5;
  } else if (edgeData.isHovered || edgeData.isSelected) {
    strokeColor = '#fcd34d';
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

      {/* Relationship Label Badge */}
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
            className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider uppercase border shadow-md transition-all cursor-pointer ${
              edgeData.isUpstream
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 ring-1 ring-amber-400/50'
                : edgeData.isDownstream
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 ring-1 ring-sky-400/50'
                : edgeData.isHovered
                ? 'bg-white/10 text-white border-white/30 ring-1 ring-white/30'
                : 'bg-[#09090b]/90 text-zinc-400 border-[#27272a] hover:border-zinc-500 hover:text-zinc-200'
            }`}
            title={`${relType} (${edgeData.confidence_level || 'deterministic'})`}
          >
            {cfg.label}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

ArchitectureEdge.displayName = 'ArchitectureEdge';
