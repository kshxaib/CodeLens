import React, { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';

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

  const strokeColor = isLineageActive || isHighlighted ? '#38bdf8' : '#52525b';
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
          opacity: isDimmed ? 0.2 : 1,
          transition: 'all 0.3s ease',
        }}
      />

      {/* Pill Badge at Center of Edge */}
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
            className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-tight shadow-lg border backdrop-blur-md transition-all cursor-pointer ${
              isLineageActive || isHighlighted
                ? 'bg-sky-950/90 text-sky-300 border-sky-500/50 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                : 'bg-[#0f0f12]/90 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200'
            }`}
            title={transformation ? `${dataType} — ${transformation}` : dataType}
          >
            <span>{dataType}</span>
          </div>

          {/* Optional Transformation Tooltip Snippet if highlighted */}
          {(isLineageActive || isHighlighted) && transformation && (
            <span className="mt-1 px-1.5 py-0.2 rounded bg-black/80 text-[8px] font-mono text-zinc-400 border border-zinc-800 max-w-[140px] truncate">
              {transformation}
            </span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
