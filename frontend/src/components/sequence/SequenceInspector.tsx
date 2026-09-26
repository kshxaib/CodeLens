import React from 'react';
import {
  X,
  ExternalLink,
  FileCode2,
  ArrowRight,
  Zap,
  AlertTriangle,
  ShieldCheck,
  Code2,
} from 'lucide-react';
import type { SequenceMessage, SequenceParticipant } from '../../types';
import { getInteractionConfig, getParticipantConfig } from './constants';

interface SequenceInspectorProps {
  message: SequenceMessage;
  participants: SequenceParticipant[];
  onClose: () => void;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const SequenceInspector: React.FC<SequenceInspectorProps> = ({
  message,
  participants,
  onClose,
  onOpenSource,
}) => {
  const cfg = getInteractionConfig(message.interaction_type);

  const caller = participants.find((p) => p.id === message.caller_id);
  const callee = participants.find((p) => p.id === message.callee_id);

  const callerCfg = caller ? getParticipantConfig(caller.participant_type) : null;
  const calleeCfg = callee ? getParticipantConfig(callee.participant_type) : null;

  const CallerIcon = callerCfg?.icon;
  const CalleeIcon = calleeCfg?.icon;

  return (
    <div className="flex flex-col h-full bg-[#09090b] border-l border-[#1f1f23] shadow-2xl overflow-hidden min-w-[360px] max-w-[420px] z-30 select-text">
      {/* Top Header */}
      <div className="px-5 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]/80 backdrop-blur-md flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            {/* Step Number */}
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
              Step {message.step_number}
            </span>

            {/* Interaction Type Badge */}
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${cfg.badgeBg}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </span>

            {/* Confidence */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold border ${
                message.confidence_level === 'deterministic'
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
              }`}
            >
              <ShieldCheck className="w-2.5 h-2.5" />
              {message.confidence_level.toUpperCase()}
            </span>
          </div>

          <h2 className="text-base font-bold text-white font-mono break-all leading-tight">
            {message.method}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.06] transition cursor-pointer shrink-0"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono">
        {/* Quick Action: Open Source */}
        {message.evidence && (
          <button
            onClick={() =>
              onOpenSource(message.evidence!.file_path, {
                start: message.evidence!.start_line,
                end: message.evidence!.end_line,
              })
            }
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-sky-500/15 to-sky-600/10 hover:from-sky-500/25 hover:to-sky-600/20 border border-sky-500/30 text-sky-300 font-bold flex items-center justify-between transition cursor-pointer shadow-md group"
          >
            <div className="flex items-center gap-2 truncate">
              <FileCode2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="truncate text-xs">
                {message.evidence.file_path.split(/[/\\]/).pop()}:{message.evidence.start_line}-{message.evidence.end_line}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-sky-400/80 group-hover:text-sky-300 shrink-0">
              <span>Open Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </button>
        )}

        {/* Interaction Participants (Caller -> Callee) */}
        <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
            Interaction Participants
          </span>

          <div className="flex items-center gap-2.5">
            {/* Caller */}
            <div className="flex-1 p-2.5 rounded-lg bg-[#141417] border border-[#27272a] text-center">
              <span className="text-[9px] text-zinc-500 block mb-1">CALLER</span>
              <div className="flex items-center justify-center gap-1.5 text-zinc-200 font-semibold truncate">
                {CallerIcon && <CallerIcon className="w-3 h-3 text-sky-400 shrink-0" />}
                <span className="truncate text-xs">{caller?.name || message.caller_id}</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-zinc-500 shrink-0" />

            {/* Callee */}
            <div className="flex-1 p-2.5 rounded-lg bg-[#141417] border border-[#27272a] text-center">
              <span className="text-[9px] text-zinc-500 block mb-1">CALLEE</span>
              <div className="flex items-center justify-center gap-1.5 text-zinc-200 font-semibold truncate">
                {CalleeIcon && <CalleeIcon className="w-3 h-3 text-emerald-400 shrink-0" />}
                <span className="truncate text-xs">{callee?.name || message.callee_id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Description */}
        {message.description && (
          <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-1.5">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
              Step Description
            </span>
            <p className="text-zinc-300 text-xs leading-relaxed">{message.description}</p>
          </div>
        )}

        {/* Request Payload / Arguments */}
        {message.payload && (
          <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-sky-400" />
              Request Payload / Parameters
            </span>
            <div className="p-2.5 rounded-lg bg-[#070709] border border-[#18181b] overflow-x-auto text-[11px] text-sky-300 font-mono">
              <pre>{message.payload}</pre>
            </div>
          </div>
        )}

        {/* Response Payload */}
        {message.response_payload && (
          <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              Response / Return Value
            </span>
            <div className="p-2.5 rounded-lg bg-[#070709] border border-[#18181b] overflow-x-auto text-[11px] text-emerald-300 font-mono">
              <pre>{message.response_payload}</pre>
            </div>
          </div>
        )}

        {/* Special Flags */}
        {(message.is_async || message.is_error) && (
          <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block">
              Runtime Characteristics
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {message.is_async && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Zap className="w-3.5 h-3.5" />
                  Asynchronous Task
                </span>
              )}
              {message.is_error && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Alternative Failure Branch
                </span>
              )}
            </div>
          </div>
        )}

        {/* Traceable Source Code Evidence */}
        {message.evidence && (
          <div className="p-3.5 rounded-xl border border-[#1f1f23] bg-[#0c0c0e] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">
                Traceable Evidence
              </span>
              <span className="text-[10px] text-sky-400">
                Lines {message.evidence.start_line}-{message.evidence.end_line}
              </span>
            </div>
            {message.evidence.snippet && (
              <div className="p-2.5 rounded-lg bg-[#070709] border border-[#18181b] overflow-x-auto text-[10px] text-zinc-300 font-mono">
                <pre className="whitespace-pre-wrap">{message.evidence.snippet}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
