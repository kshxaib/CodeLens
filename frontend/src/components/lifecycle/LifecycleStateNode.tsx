import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Play,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  FileCode2,
  Sparkles,
} from 'lucide-react';
import { getStateTypeCfg } from './constants';
import type { LifecycleState } from '../../types';

interface LifecycleStateNodeProps {
  data: LifecycleState & {
    isSelected?: boolean;
    isHovered?: boolean;
    isDimmed?: boolean;
    isCurrentActiveState?: boolean;
    targetPosition?: Position;
    sourcePosition?: Position;
  };
  selected?: boolean;
}

const getStateIcon = (stateType: string, isFailure: boolean) => {
  if (isFailure || stateType === 'terminal_failure') {
    return <AlertOctagon className="w-3.5 h-3.5 text-rose-400 shrink-0" />;
  }
  switch (stateType) {
    case 'initial':
      return <Play className="w-3.5 h-3.5 fill-sky-400 text-sky-400 shrink-0" />;
    case 'terminal_success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
    default:
      return <RefreshCw className="w-3.5 h-3.5 text-indigo-400 shrink-0" />;
  }
};

export const LifecycleStateNode: React.FC<LifecycleStateNodeProps> = memo(({ data, selected }) => {
  const cfg = getStateTypeCfg(data.state_type);

  let ringClass = 'border-[#27272a] hover:border-[#3f3f46]';
  if (data.isCurrentActiveState) {
    ringClass = 'ring-4 ring-amber-400 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.65)] scale-105 animate-pulse';
  } else if (selected || data.isSelected) {
    ringClass = 'ring-2 ring-indigo-400 border-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.35)]';
  } else if (data.isHovered) {
    ringClass = 'ring-1 ring-white/40 border-white/30 shadow-lg';
  }

  const opacityClass = data.isDimmed ? 'opacity-25 grayscale pointer-events-none' : 'opacity-100';

  return (
    <div
      className={`relative w-[250px] rounded-xl bg-[#09090b]/95 backdrop-blur-md border p-3.5 shadow-xl transition-all duration-200 cursor-pointer select-none group ${ringClass} ${opacityClass}`}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={data.targetPosition || Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#27272a] !border !border-[#3f3f46] hover:!bg-indigo-400 transition"
      />
      <Handle
        type="source"
        position={data.sourcePosition || Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#27272a] !border !border-[#3f3f46] hover:!bg-indigo-400 transition"
      />

      {/* Top Header: State type and badges */}
      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border ${cfg.badgeBg}`}
        >
          {getStateIcon(data.state_type, data.is_failure)}
          <span>{cfg.label}</span>
        </span>

        <div className="flex items-center gap-1">
          {data.is_initial && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 uppercase">
              Entry
            </span>
          )}
          {data.is_terminal && !data.is_failure && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
              End
            </span>
          )}
          {data.is_failure && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
              Fail
            </span>
          )}
        </div>
      </div>

      {/* Main State Identifier */}
      <div className="flex items-baseline gap-2 mb-1.5">
        <h3 className="text-sm font-bold font-mono text-white tracking-wide truncate group-hover:text-indigo-300 transition-colors">
          {data.name}
        </h3>
      </div>

      {/* State description */}
      <p className="text-[11px] text-zinc-400 line-clamp-1 mb-2 font-mono">
        {data.description || `${data.entity_name} in state ${data.name}`}
      </p>

      {/* Footer: Canonical link & evidence snippet */}
      <div className="flex items-center justify-between pt-1.5 border-t border-[#1f1f23] text-[10px] font-mono text-zinc-500">
        {data.evidence ? (
          <div className="flex items-center gap-1 truncate text-zinc-400">
            <FileCode2 className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="truncate">
              {data.evidence.file_path.split(/[/\\]/).pop()}:{data.evidence.start_line}
            </span>
          </div>
        ) : (
          <span className="text-zinc-600">Model schema</span>
        )}

        {data.associated_node_id && (
          <span
            className="flex items-center gap-0.5 text-[9px] text-indigo-400/90 hover:text-indigo-300"
            title={`Unified KG Node: ${data.associated_node_id}`}
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>KG Linked</span>
          </span>
        )}
      </div>
    </div>
  );
});

LifecycleStateNode.displayName = 'LifecycleStateNode';
