import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Server,
  Database,
  Cloud,
  Layers,
  Globe,
  HardDrive,
  Cpu,
  FileCode,
  Box,
  Terminal,
  Activity,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ARCH_TIERS, getNodeTier } from './constants';
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

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'application':
      return <Terminal className="w-3.5 h-3.5" />;
    case 'service':
      return <Cpu className="w-3.5 h-3.5" />;
    case 'api_endpoint':
      return <Globe className="w-3.5 h-3.5" />;
    case 'component':
      return <Layers className="w-3.5 h-3.5" />;
    case 'database':
      return <Database className="w-3.5 h-3.5" />;
    case 'database_model':
      return <Box className="w-3.5 h-3.5" />;
    case 'external_service':
      return <Cloud className="w-3.5 h-3.5" />;
    case 'storage':
      return <HardDrive className="w-3.5 h-3.5" />;
    case 'worker':
    case 'queue':
      return <Server className="w-3.5 h-3.5" />;
    case 'lifecycle_entity':
      return <Activity className="w-3.5 h-3.5" />;
    default:
      return <FileCode className="w-3.5 h-3.5" />;
  }
};

export const ArchitectureNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const tierKey = data.tier || getNodeTier(data.type, data.layer);
  const tierCfg = ARCH_TIERS[tierKey] || ARCH_TIERS.application;

  let ringClass = 'border-[#1f1f23] hover:border-[#38383f]';
  if (data.isPathActiveStep) {
    ringClass = 'ring-4 ring-sky-400 border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.7)] scale-105 z-30';
  } else if (data.isPathNode) {
    ringClass = 'ring-2 ring-sky-400/90 border-sky-400/70 shadow-[0_0_18px_rgba(56,189,248,0.35)]';
  } else if (data.isBlastTarget || selected) {
    ringClass = 'ring-2 ring-amber-400 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
  } else if (data.isUpstream) {
    ringClass = 'ring-2 ring-amber-400/80 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
  } else if (data.isDownstream) {
    ringClass = 'ring-2 ring-sky-400/80 border-sky-400/50 shadow-[0_0_15px_rgba(56,189,248,0.2)]';
  } else if (data.isHovered) {
    ringClass = 'ring-1 ring-white/40 border-white/30 shadow-lg';
  }

  const opacityClass = data.isDimmed ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100';

  const isDeterministic = data.confidence_level === 'deterministic' || data.confidence >= 0.99;

  return (
    <div
      className={`relative w-[260px] rounded-xl bg-[#09090b]/95 backdrop-blur-md border p-3 shadow-xl transition-all duration-200 cursor-pointer select-none group ${ringClass} ${opacityClass}`}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-[#27272a] !border !border-[#3f3f46] hover:!bg-amber-400 transition"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-[#27272a] !border !border-[#3f3f46] hover:!bg-amber-400 transition"
      />

      {/* Top Bar: Tier Badge + Confidence */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${tierCfg.badgeBg}`}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tierCfg.dot }} />
          {tierCfg.label}
        </span>

        <div className="flex items-center gap-1">
          {isDeterministic ? (
            <span
              title="Deterministic (Proven by AST)"
              className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              100%
            </span>
          ) : (
            <span
              title={`Inferred: ${Math.round((data.confidence || 0.85) * 100)}%`}
              className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-400/90 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20"
            >
              <Sparkles className="w-2.5 h-2.5" />
              {Math.round((data.confidence || 0.85) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Main Node Identity */}
      <div className="flex items-start gap-2.5">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${tierCfg.bg} ${tierCfg.border} ${tierCfg.color}`}
        >
          {getTypeIcon(data.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-white font-mono truncate tracking-tight group-hover:text-amber-300 transition-colors">
            {data.name || data.display_name}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[9px] uppercase tracking-wider font-mono text-zinc-400 font-semibold">
              {data.type.replace('_', ' ')}
            </span>
            {data.symbols && data.symbols.length > 0 && (
              <>
                <span className="text-zinc-600 text-[10px]">•</span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {data.symbols.length} symbol{data.symbols.length > 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Primary Source File Hint */}
      {data.source_files && data.source_files.length > 0 && (
        <div className="mt-2 pt-1.5 border-t border-[#18181b] flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span className="truncate max-w-[190px]" title={data.source_files[0]}>
            {data.source_files[0].split(/[/\\]/).pop()}
          </span>
          {data.source_files.length > 1 && (
            <span className="text-zinc-400 bg-zinc-800/60 px-1 rounded text-[9px]">
              +{data.source_files.length - 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
});

ArchitectureNode.displayName = 'ArchitectureNode';
