import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Cloud,
  UserCheck,
  Zap,
  ArrowRight,
  Split,
  Layers,
} from 'lucide-react';
import { getStepTypeCfg } from './constants';
import type { WorkflowStep } from '../../types';

interface WorkflowNodeProps {
  data: WorkflowStep & {
    isSelected?: boolean;
    isHovered?: boolean;
    isDimmed?: boolean;
    isCurrentExecutionStep?: boolean;
  };
  selected?: boolean;
}

const getStepIcon = (type: string) => {
  switch (type) {
    case 'start':
      return <Play className="w-3.5 h-3.5 fill-current" />;
    case 'end':
      return <CheckCircle2 className="w-3.5 h-3.5" />;
    case 'decision':
      return <Split className="w-3.5 h-3.5" />;
    case 'parallel':
      return <Layers className="w-3.5 h-3.5" />;
    case 'failure':
      return <AlertTriangle className="w-3.5 h-3.5" />;
    case 'retry':
      return <RotateCcw className="w-3.5 h-3.5" />;
    case 'external':
      return <Cloud className="w-3.5 h-3.5" />;
    case 'approval':
      return <UserCheck className="w-3.5 h-3.5" />;
    case 'async_op':
      return <Zap className="w-3.5 h-3.5" />;
    default:
      return <ArrowRight className="w-3.5 h-3.5" />;
  }
};

export const WorkflowNode: React.FC<WorkflowNodeProps> = memo(({ data, selected }) => {
  const cfg = getStepTypeCfg(data.step_type);

  let ringClass = 'border-[#1f1f23] hover:border-[#38383f]';
  if (data.isCurrentExecutionStep) {
    ringClass = 'ring-4 ring-amber-400 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.6)] scale-105 animate-pulse';
  } else if (selected || data.isSelected) {
    ringClass = 'ring-2 ring-amber-400 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.25)]';
  } else if (data.isHovered) {
    ringClass = 'ring-1 ring-white/40 border-white/30 shadow-lg';
  }

  const opacityClass = data.isDimmed ? 'opacity-20 grayscale pointer-events-none' : 'opacity-100';

  return (
    <div
      className={`relative w-[260px] rounded-xl bg-[#09090b]/95 backdrop-blur-md border p-3 shadow-xl transition-all duration-200 cursor-pointer select-none group ${ringClass} ${opacityClass}`}
    >
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

      {/* Top Header Badge */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium border ${cfg.badgeBg}`}
        >
          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.dot }} />
          {cfg.label}
        </span>

        {data.evidence && (
          <span className="text-[9px] font-mono text-zinc-500 truncate max-w-[100px]" title={data.evidence.file_path}>
            {data.evidence.file_path.split(/[/\\]/).pop()}:{data.evidence.start_line}
          </span>
        )}
      </div>

      {/* Main Identity */}
      <div className="flex items-start gap-2.5">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${cfg.bg} ${cfg.border} ${cfg.color}`}
        >
          {getStepIcon(data.step_type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-white font-mono truncate tracking-tight group-hover:text-amber-300 transition-colors">
            {data.name}
          </div>
          <div className="text-[10px] text-zinc-400 font-mono truncate mt-0.5">
            {data.description || cfg.sub}
          </div>
        </div>
      </div>

      {/* Footer Info (Calls or I/O) */}
      {(data.calls?.length > 0 || data.inputs?.length > 0) && (
        <div className="mt-2 pt-1.5 border-t border-[#18181b] flex items-center justify-between text-[9px] text-zinc-500 font-mono">
          {data.calls?.length > 0 ? (
            <span className="text-sky-400 truncate max-w-[180px]">
              call: {data.calls[0]}()
            </span>
          ) : data.inputs?.length > 0 ? (
            <span className="text-zinc-400 truncate max-w-[180px]">
              in: {data.inputs.slice(0, 2).join(', ')}
            </span>
          ) : null}

          {data.step_type === 'decision' && (
            <span className="text-amber-400 font-bold">Branch</span>
          )}
          {data.step_type === 'failure' && (
            <span className="text-rose-400 font-bold">Abort</span>
          )}
        </div>
      )}
    </div>
  );
});

WorkflowNode.displayName = 'WorkflowNode';
