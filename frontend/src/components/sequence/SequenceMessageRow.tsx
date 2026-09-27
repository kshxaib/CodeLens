import { FileCode2, AlertTriangle, Zap, ArrowRight, ArrowLeft } from 'lucide-react';
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

  const sourceLabel = message.evidence?.file_path
    ? `${message.evidence.file_path.split(/[/\\]/).pop()}:${message.evidence.start_line}`
    : null;

  return (
    <div
      onClick={() => onSelectMessage(message)}
      style={{ height: `${rowHeight}px` }}
      className={`relative w-full transition-all duration-200 cursor-pointer group select-none ${
        isActiveSimulationStep
          ? 'bg-amber-500/[0.08] z-20 ring-1 ring-amber-500/40'
          : isSelected
          ? 'bg-amber-500/[0.04] z-10 ring-1 ring-amber-500/30'
          : 'hover:bg-amber-500/[0.02]'
      }`}
    >
      <div
        style={{ left: `${callerX - 5}px`, top: '10px', height: `${rowHeight - 20}px` }}
        className={`absolute w-2.5 rounded-sm transition-all z-10 ${
          isActiveSimulationStep || isSelected
            ? 'bg-amber-500 border border-amber-600 shadow-sm'
            : 'bg-[#E2E0D9] border border-[#D5D2CA]'
        }`}
      />
      {!isSelf && (
        <div
          style={{ left: `${calleeX - 5}px`, top: '10px', height: `${rowHeight - 20}px` }}
          className={`absolute w-2.5 rounded-sm transition-all z-10 ${
            isActiveSimulationStep || isSelected
              ? 'bg-amber-500 border border-amber-600 shadow-sm'
              : 'bg-[#E2E0D9] border border-[#D5D2CA]'
          }`}
        />
      )}

      <svg
        className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
        style={{ height: `${rowHeight}px` }}
      >
        <defs>
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
              fill={message.is_error ? '#e11d48' : cfg.color}
            />
          </marker>
        </defs>

        {isSelf ? (
          <path
            d={`M ${startX + 5} ${yCenter - 10} C ${startX + 45} ${yCenter - 25}, ${startX + 45} ${
              yCenter + 25
            }, ${startX + 5} ${yCenter + 10}`}
            fill="none"
            stroke={message.is_error ? '#e11d48' : cfg.color}
            strokeWidth={isActiveSimulationStep || isSelected ? '2.5' : '1.75'}
            strokeDasharray={cfg.strokeDasharray}
            markerEnd={`url(#arrow-${message.id})`}
            className="transition-all"
          />
        ) : (
          <line
            x1={isLeftToRight ? startX + 5 : startX - 5}
            y1={yCenter}
            x2={isLeftToRight ? endX - 5 : endX + 5}
            y2={yCenter}
            stroke={message.is_error ? '#e11d48' : cfg.color}
            strokeWidth={isActiveSimulationStep || isSelected ? '2.5' : '1.75'}
            strokeDasharray={cfg.strokeDasharray}
            markerEnd={`url(#arrow-${message.id})`}
            className="transition-all"
          />
        )}
      </svg>

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
              ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-400/40 shadow-[0_2px_12px_rgba(217,119,6,0.2)]'
              : isSelected
              ? 'bg-white border-amber-500 text-[#19243B] ring-1 ring-amber-400/40 shadow-md'
              : 'bg-white/95 border-[#E2E0D9] text-[#19243B] hover:border-zinc-400 shadow-sm'
          }`}
        >
          <span
            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
              isActiveSimulationStep
                ? 'bg-amber-600 text-white'
                : isSelected
                ? 'bg-amber-600 text-white'
                : 'bg-[#F0EEE9] text-[#526078]'
            }`}
          >
            {message.step_number}
          </span>

          {!isSelf && (
            <span className="text-[10px] text-[#687184]">
              {isLeftToRight ? <ArrowRight className="w-3 h-3 inline" /> : <ArrowLeft className="w-3 h-3 inline" />}
            </span>
          )}

          <span className="font-semibold truncate max-w-[220px]" title={message.method}>
            {message.method}
          </span>

          {message.payload && (
            <span
              className="px-1.5 py-0.5 rounded bg-[#F0EEE9] text-[10px] text-[#526078] border border-[#E2E0D9] truncate max-w-[120px]"
              title={`Payload: ${message.payload}`}
            >
              {message.payload}
            </span>
          )}

          {message.is_async && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Zap className="w-2.5 h-2.5" />
              Async
            </span>
          )}

          {message.is_error && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
              <AlertTriangle className="w-2.5 h-2.5" />
              Error
            </span>
          )}

          {message.is_inferred && (
            <span
              className="text-[9px] text-[#687184] italic"
              title="Inferred from architecture boundary"
            >
              (inferred)
            </span>
          )}

          {sourceLabel && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenSource(message.evidence!.file_path, {
                  start: message.evidence!.start_line,
                  end: message.evidence!.end_line,
                });
              }}
              className="ml-1 inline-flex items-center gap-1 text-[9px] text-[#687184] hover:text-amber-700 transition cursor-pointer"
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
