import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react';

export const DataFlowEdge: React.FC<EdgeProps> = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isHighlighted = !!data?.isHighlighted;
  const isDimmed = !!data?.isDimmed;
  const isLineageActive = !!data?.isLineageActive;
  const dataType = (data?.data_type as string) || 'Data';
  const transformation = (data?.transformation as string) || '';

  const strokeColor = isLineageActive || isHighlighted ? '#D97706' : '#A3A29E';
  const strokeWidth = isLineageActive || isHighlighted ? 2.5 : 1.5;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isLineageActive || isHighlighted ? '6 4' : undefined,
          animation: isLineageActive || isHighlighted ? 'dashflow 1.5s linear infinite' : undefined,
          opacity: isDimmed ? 0.2 : 0.9,
          transition: 'all 0.3s ease',
        }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`flex flex-col items-center select-none transition-all duration-300 ${
            isDimmed ? 'opacity-20' : 'opacity-100'
          }`}
        >
          <div
            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight shadow-sm border backdrop-blur-md transition-all cursor-pointer ${
              isLineageActive || isHighlighted
                ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-[0_2px_8px_rgba(217,119,6,0.15)]'
                : 'bg-white/95 text-[#526078] border-[#E2E0D9] hover:border-zinc-400 hover:text-[#19243B]'
            }`}
            title={transformation ? `${dataType} — ${transformation}` : dataType}
          >
            <span>{dataType}</span>
          </div>

          {(isLineageActive || isHighlighted) && transformation && (
            <span className="mt-1 px-1.5 py-0.2 rounded bg-[#F0EEE9] text-[8px] font-mono text-[#526078] border border-[#E2E0D9] max-w-[140px] truncate shadow-sm">
              {transformation}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

DataFlowEdge.displayName = 'DataFlowEdge';
