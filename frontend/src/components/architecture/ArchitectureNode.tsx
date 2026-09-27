import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { getArchifySemantic, type ArchifySemanticKind } from './constants';
import type { ArchKGNode } from '../../types';

interface NodeProps {
  data: ArchKGNode & {
    isHovered?: boolean;
    isSelected?: boolean;
    isDimmed?: boolean;
    isBlastTarget?: boolean;
    isUpstream?: boolean;
    isDownstream?: boolean;
    isPathNode?: boolean;
    isPathActiveStep?: boolean;
    tier?: string;
  };
  selected?: boolean;
}

// Crisp Archify Semantic Sigils (matching archify SVG sigil specs)
const renderSemanticSigil = (kind: ArchifySemanticKind, color: string) => {
  switch (kind) {
    case 'backend':
      // Code brackets <>
      return (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 3 3 8l3 5M10 3l3 5-3 5" />
        </svg>
      );
    case 'database':
      // Cylinder with layered disks
      return (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 4.5c0-1.2 2.5-2 5.5-2s5.5.8 5.5 2v7c0 1.2-2.5 2-5.5 2s-5.5-.8-5.5-2v-7z" />
          <path d="M2.5 8c0 1.2 2.5 2 5.5 2s5.5-.8 5.5-2" />
          <path d="M2.5 11.5c0 1.2 2.5 2 5.5 2s5.5-.8 5.5-2" />
        </svg>
      );
    case 'cloud':
      // Cloud outline
      return (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 12h7a3 3 0 0 0 1-5.8 4 4 0 0 0-7.5-1.2A3 3 0 0 0 4.5 12z" />
        </svg>
      );
    case 'security':
      // Shield with lock notch
      return (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 14s5-2.5 5-6.5V3.5L8 2 3 3.5v4c0 4 5 6.5 5 6.5z" />
        </svg>
      );
    case 'messagebus':
      // 3 horizontal bars with 3 offset circles
      return (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />
          <circle cx="5" cy="4.5" r="1.1" fill={color} />
          <circle cx="10.5" cy="8" r="1.1" fill={color} />
          <circle cx="7" cy="11.5" r="1.1" fill={color} />
        </svg>
      );
    case 'external':
    default:
      // Client display / browser window
      return (
        <svg
          className="w-3.5 h-3.5 shrink-0"
          viewBox="0 0 16 16"
          fill="none"
          stroke={color}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="2" y="3.5" width="12" height="8" rx="1.5" />
          <path d="M1 13h14" />
        </svg>
      );
  }
};

export const ArchitectureNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const semantic = getArchifySemantic(data.type, data.layer, data.name);

  let ringClass = '';
  if (data.isPathActiveStep) {
    ringClass = 'ring-4 ring-sky-500 scale-105 z-30 shadow-[0_0_24px_rgba(14,165,233,0.35)]';
  } else if (data.isPathNode) {
    ringClass = 'ring-2 ring-sky-500/90 shadow-[0_0_12px_rgba(14,165,233,0.2)]';
  } else if (data.isBlastTarget || selected || data.isSelected) {
    ringClass = 'ring-2 ring-amber-500 shadow-[0_0_16px_rgba(217,119,6,0.25)]';
  } else if (data.isUpstream) {
    ringClass = 'ring-2 ring-amber-500/80 shadow-sm';
  } else if (data.isDownstream) {
    ringClass = 'ring-2 ring-sky-500/80 shadow-sm';
  } else if (data.isHovered) {
    ringClass = 'shadow-md';
  }

  const opacityClass = data.isDimmed ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100';
  const isDeterministic = data.confidence_level === 'deterministic' || data.confidence >= 0.99;

  // Build context subtitle like Archify (e.g. "FastAPI :8000", "primary :5432", "cache :6379")
  const primaryName = data.display_name || data.name || 'Component';
  let sublabel = data.type ? data.type.replace(/_/g, ' ') : semantic.label;
  if (data.source_files && data.source_files.length > 0) {
    const fileName = data.source_files[0].split(/[/\\]/).pop();
    if (fileName && fileName !== primaryName) {
      sublabel = fileName;
    }
  }

  return (
    <div
      className={`relative w-[210px] h-[68px] rounded-lg border-[1.5px] px-2.5 py-1.5 flex flex-col justify-between select-none shadow-xs transition-all duration-200 cursor-pointer group bg-white/95 backdrop-blur-xs ${ringClass} ${opacityClass}`}
      style={{
        backgroundColor: semantic.fill,
        borderColor: data.isHovered || selected ? semantic.strokeFocus : semantic.stroke,
      }}
    >
      {/* 4 Handles for orthogonal and smooth step connections */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-white !border !border-[#B8B5AB] hover:!bg-amber-500 transition"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-white !border !border-[#B8B5AB] hover:!bg-amber-500 transition"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-2 !h-2 !bg-white !border !border-[#B8B5AB] hover:!bg-amber-500 transition"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-2 !h-2 !bg-white !border !border-[#B8B5AB] hover:!bg-amber-500 transition"
      />

      {/* Top Header: Semantic Sigil + Tag Pill */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-1.5" style={{ color: semantic.sigilColor }}>
          {renderSemanticSigil(semantic.kind, semantic.sigilColor)}
          <span className="text-[9px] font-mono uppercase tracking-wider font-semibold opacity-90">
            {semantic.label}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isDeterministic ? (
            <span
              title="Deterministic (Proven by AST)"
              className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold text-emerald-800 bg-white/80 px-1 py-0.2 rounded border border-emerald-300"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              100%
            </span>
          ) : (
            <span
              title={`Inferred: ${Math.round((data.confidence || 0.85) * 100)}%`}
              className="inline-flex items-center gap-0.5 text-[8px] font-mono font-bold text-amber-800 bg-white/80 px-1 py-0.2 rounded border border-amber-300"
            >
              <Sparkles className="w-2.5 h-2.5" />
              {Math.round((data.confidence || 0.85) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Center & Bottom: Title + Subtitle context */}
      <div className="flex flex-col min-w-0 pr-0.5">
        <div
          className="text-[12px] font-bold font-mono tracking-tight truncate leading-tight transition-colors group-hover:text-amber-800"
          style={{ color: semantic.textPrimary }}
          title={primaryName}
        >
          {primaryName}
        </div>
        <div
          className="text-[9.5px] font-mono truncate leading-tight mt-0.5 opacity-80"
          style={{ color: semantic.textMuted }}
          title={sublabel}
        >
          {sublabel}
        </div>
      </div>
    </div>
  );
});

ArchitectureNode.displayName = 'ArchitectureNode';
