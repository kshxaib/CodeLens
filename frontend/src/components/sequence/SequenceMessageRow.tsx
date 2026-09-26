import {
  FileCode2,
  AlertTriangle,
  Zap,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import type { SequenceMessage } from '../../types';
import { getInteractionConfig } from './constants';

interface SequenceMessageRowProps {
  message: SequenceMessage;
  callerIndex: number;
  calleeIndex: number;
  columnWidth: number;
  rowHeight: number;
  isSelected?: boolean;
  isActiveSimulationStep?: boolean;
  onSelectMessage: (msg: SequenceMessage) => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const SequenceMessageRow: React.FC<SequenceMessageRowProps> = ({
  message,
  callerIndex,
  calleeIndex,
  columnWidth,
  rowHeight,
  isSelected,
  isActiveSimulationStep,
  onSelectMessage,
  onOpenSource,
}) => {
  const cfg = getInteractionConfig(message.interaction_type);
  const isSelf = callerIndex === calleeIndex;
  const isLeftToRight = callerIndex < calleeIndex;

  const callerX = callerIndex * columnWidth + columnWidth / 2;
  const calleeX = calleeIndex * columnWidth + columnWidth / 2;

  const startX = callerX;
  const endX = calleeX;
  const midX = (startX + endX) / 2;

  const yCenter = rowHeight / 2;

  // Source evidence label (e.g. auth.controllers.js:14)
  const sourceLabel = message.evidence?.file_path
    ? `${message.evidence.file_path.split(/[/\\]/).pop()}:${message.evidence.start_line}`
    : null;

  return (
    <div
      onClick={() => onSelectMessage(message)}
      style={{ height: `${rowHeight}px` }}
      className={`relative w-full transition-all duration-200 cursor-pointer group select-none ${
        isActiveSimulationStep
          ? 'bg-amber-400/[0.07] z-20 ring-1 ring-amber-400/40'
          : isSelected
          ? 'bg-sky-500/[0.06] z-10 ring-1 ring-sky-500/30'
          : 'hover:bg-white/[0.02]'
      }`}
    >
      {/* 1. UML Activation Bars on Caller and Callee lifelines */}
      <div
        style={{ left: `${callerX - 5}px`, top: '10px', height: `${rowHeight - 20}px` }}
        className={`absolute w-2.5 rounded-sm transition-all z-10 ${
          isActiveSimulationStep || isSelected
            ? 'bg-sky-400 border border-white shadow-[0_0_12px_rgba(56,189,248,0.6)]'
            : 'bg-[#18181b] border border-zinc-700'
        }`}
      />
      {!isSelf && (
        <div
          style={{ left: `${calleeX - 5}px`, top: '10px', height: `${rowHeight - 20}px` }}
          className={`absolute w-2.5 rounded-sm transition-all z-10 ${
            isActiveSimulationStep || isSelected
              ? 'bg-sky-400 border border-white shadow-[0_0_12px_rgba(56,189,248,0.6)]'
              : 'bg-[#18181b] border border-zinc-700'
          }`}
        />
      )}

      {/* 2. SVG Message Connector Arrow */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
        style={{ height: `${rowHeight}px` }}
      >
        <defs>
          {/* Normal End Marker */}
          <marker
            id={`arrow-${message.id}`}
            viewBox="0 0 10 10"
            refX={isLeftToRight ? 9 : 1}
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path
              d={isLeftToRight ? 'M 0 1 L 10 5 L 0 9 z' : 'M 10 1 L 0 5 L 10 9 z'}
              fill={message.is_error ? '#f43f5e' : cfg.color}
            />
          </marker>
        </defs>

        {isSelf ? (
          /* Loopback arc for self-calls */
          <path
            d={`M ${startX + 5} ${yCenter - 10} C ${startX + 45} ${yCenter - 25}, ${startX + 45} ${
              yCenter + 25
            }, ${startX + 5} ${yCenter + 10}`}
            fill="none"
            stroke={message.is_error ? '#f43f5e' : cfg.color}
            strokeWidth={isActiveSimulationStep || isSelected ? '2.5' : '1.75'}
            strokeDasharray={cfg.strokeDasharray}
            markerEnd={`url(#arrow-${message.id})`}
            className="transition-all"
          />
        ) : (
          /* Horizontal connector line */
          <line
            x1={isLeftToRight ? startX + 5 : startX - 5}
            y1={yCenter}
            x2={isLeftToRight ? endX - 5 : endX + 5}
            y2={yCenter}
            stroke={message.is_error ? '#f43f5e' : cfg.color}
            strokeWidth={isActiveSimulationStep || isSelected ? '2.5' : '1.75'}
            strokeDasharray={cfg.strokeDasharray}
            markerEnd={`url(#arrow-${message.id})`}
            className="transition-all"
          />
        )}
      </svg>

      {/* 3. Centered Interactive Message Badge along the arrow */}
      <div
        style={{
          left: isSelf ? `${startX + 45}px` : `${midX}px`,
          top: `${yCenter}px`,
          transform: 'translate(-50%, -50%)',
        }}
        className="absolute z-20 flex items-center gap-1.5 pointer-events-auto"
      >
        <div
          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono border backdrop-blur-md transition-all shadow-md ${
            isActiveSimulationStep
              ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-2 ring-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
              : isSelected
              ? 'bg-[#18181b] border-sky-400 text-white ring-1 ring-sky-400/40 shadow-lg'
              : 'bg-[#0e0e11]/90 border-[#27272a] text-zinc-300 hover:border-zinc-500'
          }`}
        >
          {/* Step Number Badge */}
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
              isActiveSimulationStep
                ? 'bg-amber-400 text-zinc-950'
                : isSelected
                ? 'bg-sky-400 text-zinc-950'
                : 'bg-zinc-800 text-zinc-300'
            }`}
          >
            {message.step_number}
          </span>

          {/* Direction indicator */}
          {!isSelf && (
            <span className="text-[10px] text-zinc-500">
              {isLeftToRight ? <ArrowRight className="w-3 h-3 inline" /> : <ArrowLeft className="w-3 h-3 inline" />}
            </span>
          )}

          {/* Method / Action Label */}
          <span className="font-semibold truncate max-w-[220px]" title={message.method}>
            {message.method}
          </span>

          {/* Payload Preview */}
          {message.payload && (
            <span
              className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[10px] text-zinc-400 border border-zinc-700/50 truncate max-w-[120px]"
              title={`Payload: ${message.payload}`}
            >
              {message.payload}
            </span>
          )}

          {/* Async Indicator */}
          {message.is_async && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
              <Zap className="w-2.5 h-2.5" />
              Async
            </span>
          )}

          {/* Error Indicator */}
          {message.is_error && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
              <AlertTriangle className="w-2.5 h-2.5" />
              Error
            </span>
          )}

          {/* Inferred vs Deterministic */}
          {message.is_inferred && (
            <span
              className="text-[9px] text-zinc-500 italic"
              title="Inferred from architecture boundary"
            >
              (inferred)
            </span>
          )}

          {/* Source Link Quick Action */}
          {sourceLabel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSource(message.evidence!.file_path, {
                  start: message.evidence!.start_line,
                  end: message.evidence!.end_line,
                });
              }}
              className="ml-1 inline-flex items-center gap-1 text-[9px] text-zinc-500 hover:text-amber-400 transition cursor-pointer"
              title={`View ${message.evidence?.file_path}:${message.evidence?.start_line}`}
            >
              <FileCode2 className="w-3 h-3" />
              <span>{sourceLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
