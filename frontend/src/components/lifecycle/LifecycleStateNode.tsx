import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play, CheckCircle2, AlertOctagon, RefreshCw, FileCode2, Sparkles } from 'lucide-react';
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
    return <AlertOctagon className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
  }
  switch (stateType) {
    case 'initial':
      return <Play className="w-3.5 h-3.5 fill-sky-600 text-sky-600 shrink-0" />;
    case 'terminal_success':
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    default:
      return <RefreshCw className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
  }
};

const cleanStateName = (name: string) => (name.includes('/') ? name.split('/')[0].trim() : name);

export const LifecycleStateNode: React.FC<LifecycleStateNodeProps> = memo(({ data, selected }) => {
  const cfg = getStateTypeCfg(data.state_type);
  const isCurrentActive = !!data.isCurrentActiveState;
  const isSelected = !!selected || !!data.isSelected;
  const isHovered = !!data.isHovered;

  let ringClass = 'border-[#E2E0D9] hover:border-zinc-400 shadow-sm';
  let activeStyle: React.CSSProperties | undefined = undefined;

  if (isCurrentActive) {
    activeStyle = {
      boxShadow: `0 0 0 4px ${cfg.dot}60, 0 0 28px ${cfg.dot}40`,
      borderColor: cfg.dot,
      transform: 'scale(1.04)',
    };
  } else if (isSelected) {
    ringClass = 'ring-2 ring-indigo-500 border-indigo-400 shadow-[0_4px_16px_rgba(79,70,229,0.2)]';
  } else if (isHovered) {
    ringClass = 'ring-1 ring-zinc-400 border-zinc-400 shadow-md';
  }

  const opacityClass = data.isDimmed ? 'opacity-25 grayscale pointer-events-none' : 'opacity-100';

  return (
    <div
      style={activeStyle}
      className={`relative w-[250px] rounded-xl bg-white/95 backdrop-blur-md border p-3.5 shadow-sm transition-all duration-200 cursor-pointer select-none group ${ringClass} ${opacityClass}`}
    >
      <Handle
        type="target"
        position={data.targetPosition || Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#F0EEE9] !border-2 !border-[#D5D2CA] hover:!border-indigo-500 hover:!bg-indigo-400 transition"
      />
      <Handle
        type="source"
        position={data.sourcePosition || Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#F0EEE9] !border-2 !border-[#D5D2CA] hover:!border-indigo-500 hover:!bg-indigo-400 transition"
      />

      <div className="flex items-center justify-between gap-1.5 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-medium border ${cfg.badgeBg}`}
        >
          {getStateIcon(data.state_type, data.is_failure)}
          <span>{cfg.label}</span>
        </span>

        <div className="flex items-center gap-1">
          {data.is_initial && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-sky-50 text-sky-800 border border-sky-200 uppercase">
              Entry
            </span>
          )}
          {data.is_terminal && !data.is_failure && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase">
              End
            </span>
          )}
          {data.is_failure && (
            <span className="px-1.5 py-0.2 rounded text-[8px] font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200 uppercase">
              Fail
            </span>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-1.5">
        <h3 className="text-sm font-bold font-mono text-[#19243B] tracking-wide truncate group-hover:text-indigo-800 transition-colors">
          {cleanStateName(data.name)}
        </h3>
      </div>

      <p className="text-[11px] text-[#526078] line-clamp-1 mb-2 font-mono">
        {data.description || `${data.entity_name} in state ${data.name}`}
      </p>

      <div className="flex items-center justify-between pt-1.5 border-t border-[#F0EEE9] text-[10px] font-mono text-[#526078]">
        {data.evidence ? (
          <div className="flex items-center gap-1 truncate text-[#526078]">
            <FileCode2 className="w-3 h-3 text-indigo-600 shrink-0" />
            <span className="truncate">
              {data.evidence.file_path.split(/[/\\]/).pop()}:{data.evidence.start_line}
            </span>
          </div>
        ) : (
          <span className="text-[#687184]">Model schema</span>
        )}

        {data.associated_node_id && (
          <span
            className="flex items-center gap-0.5 text-[9px] text-indigo-700 hover:text-indigo-900"
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
