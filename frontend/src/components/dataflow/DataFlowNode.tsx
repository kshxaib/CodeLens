import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Database, ArrowDownRight, ArrowUpRight, Sparkles, Lock, Layers, HardDrive, Paperclip, FileCode2, Box } from 'lucide-react';
import { getDataClassificationCfg } from './constants';
import type { DataClassificationType } from '../../types';

interface DataFlowNodeProps {
  data: {
    id: string;
    name: string;
    data_classification: DataClassificationType;
    description?: string;
    format?: string;
    storage?: string | null;
    fields?: string[];
    is_transformation?: boolean;
    associated_node_id?: string | null;
    evidence?: {
      file_path: string;
      start_line: number;
      end_line: number;
      snippet?: string;
    } | null;
    isSelected?: boolean;
    isHovered?: boolean;
    isDimmed?: boolean;
    isLineageActive?: boolean;
    isCurrentExecutionStep?: boolean;
    onSelectNode?: (id: string) => void;
  };
  selected?: boolean;
}

const getClassificationIcon = (type: string, isTrans?: boolean) => {
  if (isTrans) return <Sparkles className="w-3.5 h-3.5" />;
  switch (type) {
    case 'database_model':
      return <Database className="w-3.5 h-3.5" />;
    case 'request_payload':
      return <ArrowDownRight className="w-3.5 h-3.5" />;
    case 'response_payload':
      return <ArrowUpRight className="w-3.5 h-3.5" />;
    case 'token_secret':
      return <Lock className="w-3.5 h-3.5" />;
    case 'storage_object':
      return <HardDrive className="w-3.5 h-3.5" />;
    case 'file_binary':
      return <Paperclip className="w-3.5 h-3.5" />;
    case 'queue_message':
      return <Layers className="w-3.5 h-3.5" />;
    case 'dto_schema':
      return <FileCode2 className="w-3.5 h-3.5" />;
    default:
      return <Box className="w-3.5 h-3.5" />;
  }
};

export const DataFlowNode: React.FC<DataFlowNodeProps> = memo(({ data, selected }) => {
  const cfg = getDataClassificationCfg(data.data_classification);
  const isSelected = !!selected || !!data.isSelected;
  const isLineageActive = !!data.isLineageActive;
  const isCurrentExecutionStep = !!data.isCurrentExecutionStep;
  const isDimmed = !!data.isDimmed;
  const isTrans = !!data.is_transformation;

  const sourceLabel = data.evidence?.file_path
    ? `${data.evidence.file_path.split(/[/\\]/).pop()}:${data.evidence.start_line}`
    : null;

  return (
    <div
      className={`relative group rounded-2xl transition-all duration-300 w-[280px] select-none cursor-pointer bg-white shadow-md border ${
        isTrans ? 'border-purple-300' : 'border-[#E2E0D9]'
      } ${
        isCurrentExecutionStep
          ? 'ring-4 ring-amber-500/80 shadow-[0_0_30px_rgba(217,119,6,0.35)] scale-[1.03] z-30'
          : isSelected || isLineageActive
          ? 'ring-2 ring-amber-500 shadow-[0_4px_20px_rgba(217,119,6,0.2)] scale-[1.02] z-20'
          : 'hover:scale-[1.01] hover:border-zinc-400 hover:shadow-lg'
      } ${isDimmed ? 'opacity-25 blur-[0.4px] scale-[0.98]' : 'opacity-100'}`}
    >
      <div
        className={`relative z-10 p-3.5 rounded-2xl flex flex-col justify-between h-full ${
          isTrans
            ? 'bg-purple-50/30'
            : 'bg-white'
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${cfg.badgeBg}`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: cfg.dot }}
            />
            <span className="truncate max-w-[130px]">{cfg.label}</span>
          </div>

          {sourceLabel && (
            <span
              className="text-[9px] font-mono text-[#687184] hover:text-amber-700 transition truncate max-w-[100px]"
              title={data.evidence?.file_path}
            >
              {sourceLabel}
            </span>
          )}
        </div>

        <div className="flex items-start gap-2 mb-2 min-h-[38px]">
          <div
            className="p-1.5 rounded-lg border shrink-0 mt-0.5 transition-colors"
            style={{
              borderColor: `${cfg.dot}40`,
              backgroundColor: `${cfg.dot}15`,
              color: cfg.dot,
            }}
          >
            {getClassificationIcon(data.data_classification, isTrans)}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-bold font-mono text-[#19243B] truncate leading-snug group-hover:text-amber-700 transition-colors">
              {data.name}
            </h3>
            <p className="text-[10px] font-mono text-[#526078] truncate mt-0.5">
              {data.description || cfg.sub}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#F0EEE9] text-[9px] font-mono">
          <div className="flex items-center gap-1.5 truncate">
            {data.format && (
              <span className="px-1.5 py-0.5 rounded bg-[#F0EEE9] text-[#19243B] border border-[#E2E0D9] uppercase font-semibold">
                {data.format}
              </span>
            )}
            {data.storage && (
              <span
                className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 truncate max-w-[110px]"
                title={data.storage}
              >
                {data.storage}
              </span>
            )}
          </div>

          {data.fields && data.fields.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0 font-bold">
              {data.fields.length} {data.fields.length === 1 ? 'field' : 'fields'}
            </span>
          )}
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-2.5 !h-2.5 !bg-[#F0EEE9] !border-2 !border-[#D5D2CA] group-hover:!border-amber-500 group-hover:!bg-amber-400 transition"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-2.5 !h-2.5 !bg-[#F0EEE9] !border-2 !border-[#D5D2CA] group-hover:!border-amber-500 group-hover:!bg-amber-400 transition"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-2.5 !h-2.5 !bg-[#F0EEE9] !border-2 !border-[#D5D2CA] group-hover:!border-amber-500 group-hover:!bg-amber-400 transition"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-2.5 !h-2.5 !bg-[#F0EEE9] !border-2 !border-[#D5D2CA] group-hover:!border-amber-500 group-hover:!bg-amber-400 transition"
      />
    </div>
  );
});

DataFlowNode.displayName = 'DataFlowNode';
