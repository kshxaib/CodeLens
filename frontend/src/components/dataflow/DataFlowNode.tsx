import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import {
  Database,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Lock,
  Layers,
  HardDrive,
  Paperclip,
  FileCode2,
  Box,
} from 'lucide-react';
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

  // Source evidence label (e.g. checkout.controller.js:14)
  const sourceLabel = data.evidence?.file_path
    ? `${data.evidence.file_path.split(/[/\\]/).pop()}:${data.evidence.start_line}`
    : null;

  return (
    <div
      className={`relative group rounded-2xl transition-all duration-300 w-[280px] select-none cursor-pointer ${
        isTrans ? 'rounded-3xl' : 'rounded-2xl'
      } ${
        isCurrentExecutionStep
          ? 'ring-4 ring-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.5)] scale-[1.03] z-30'
          : isSelected || isLineageActive
          ? 'ring-2 ring-sky-400 shadow-[0_0_28px_rgba(56,189,248,0.35)] scale-[1.02] z-20'
          : 'hover:scale-[1.01] hover:border-zinc-500 shadow-xl'
      } ${isDimmed ? 'opacity-25 blur-[0.4px] scale-[0.98]' : 'opacity-100'}`}
      style={{
        backgroundColor: '#0c0c0e',
      }}
    >
      {/* Glow highlight for active lineage */}
      {(isLineageActive || isSelected || isCurrentExecutionStep) && (
        <div
          className="absolute -inset-0.5 rounded-2xl pointer-events-none opacity-40 blur-sm transition"
          style={{ backgroundColor: cfg.dot }}
        />
      )}

      {/* Main Card Container */}
      <div
        className={`relative z-10 p-3.5 rounded-2xl border backdrop-blur-xl flex flex-col justify-between h-full ${
          isTrans
            ? 'border-purple-500/40 bg-gradient-to-b from-purple-950/20 via-[#0c0c0e] to-[#0c0c0e]'
            : 'border-[#1f1f23] bg-[#0c0c0e]'
        }`}
      >
        {/* Top Header: Badge + Source line */}
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
              className="text-[9px] font-mono text-zinc-500 hover:text-amber-400 transition truncate max-w-[100px]"
              title={data.evidence?.file_path}
            >
              {sourceLabel}
            </span>
          )}
        </div>

        {/* Center: Entity Name & Icon */}
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
            <h3 className="text-xs font-bold font-mono text-zinc-100 truncate leading-snug group-hover:text-amber-300 transition-colors">
              {data.name}
            </h3>
            <p className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
              {data.description || cfg.sub}
            </p>
          </div>
        </div>

        {/* Bottom Details Bar: Format, Storage, Fields */}
        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-[#1f1f23] text-[9px] font-mono">
          <div className="flex items-center gap-1.5 truncate">
            {data.format && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 uppercase">
                {data.format}
              </span>
            )}
            {data.storage && (
              <span
                className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 truncate max-w-[110px]"
                title={data.storage}
              >
                {data.storage}
              </span>
            )}
          </div>

          {data.fields && data.fields.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0 font-bold">
              {data.fields.length} {data.fields.length === 1 ? 'field' : 'fields'}
            </span>
          )}
        </div>
      </div>

      {/* ReactFlow Handles (both Top/Bottom & Left/Right for TB or LR layouts) */}
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-2 !h-2 !bg-zinc-600 !border-none group-hover:!bg-sky-400 transition"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-2 !h-2 !bg-zinc-600 !border-none group-hover:!bg-sky-400 transition"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-2 !h-2 !bg-zinc-600 !border-none group-hover:!bg-amber-400 transition"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-2 !h-2 !bg-zinc-600 !border-none group-hover:!bg-amber-400 transition"
      />
    </div>
  );
});
