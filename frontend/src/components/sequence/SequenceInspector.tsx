import React from 'react';
import { X, FileCode2, ArrowRight, Zap, AlertTriangle, ShieldCheck, Code2 } from 'lucide-react';
import type { SequenceMessage, SequenceParticipant } from '../../types';
import { getInteractionConfig, getParticipantConfig, cleanParticipantName } from './constants';

interface SequenceInspectorProps {
  message: SequenceMessage;
  participants: SequenceParticipant[];
  onClose: () => void;
  onOpenSource?: (filePath: string, lineRange?: { start: number; end: number }) => void;
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
    <div className="flex flex-col h-full bg-white border-l border-[#E2E0D9] shadow-2xl overflow-hidden min-w-[360px] max-w-[420px] z-30 select-text">
      <div className="px-5 py-4 border-b border-[#E2E0D9] bg-[#F8F7F4]/90 backdrop-blur-md flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#F0EEE9] text-[#19243B] border border-[#E2E0D9]">
              Step {message.step_number}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold border ${cfg.badgeBg}`}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cfg.color }} />
              {cfg.label}
            </span>

            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold border ${
                message.confidence_level === 'deterministic'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <ShieldCheck className="w-2.5 h-2.5" />
              {message.confidence_level.toUpperCase()}
            </span>
          </div>

          <h2 className="text-base font-bold text-[#19243B] font-mono break-all leading-tight">
            {message.method}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer shrink-0"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs font-mono">
        {message.evidence && (
          <div className="w-full py-2.5 px-3.5 rounded-xl bg-[#F0EEE9] border border-[#E2E0D9] text-[#19243B] flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2 min-w-0">
              <FileCode2 className="w-4 h-4 text-[#687184] shrink-0" />
              <span className="truncate text-xs font-mono font-semibold" title={message.evidence.file_path}>
                {message.evidence.file_path.split(/[/\\]/).pop()}:{message.evidence.start_line}-{message.evidence.end_line}
              </span>
            </div>
            <span className="text-[10px] font-mono text-[#526078] shrink-0 bg-white px-2 py-0.5 rounded-md border border-[#E2E0D9]">
              Citation
            </span>
          </div>
        )}

        <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-3">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
            Interaction Participants
          </span>

          <div className="flex items-center gap-2.5">
            <div className="flex-1 p-2.5 rounded-lg bg-white border border-[#E2E0D9] text-center shadow-xs">
              <div className="flex items-center justify-between text-[9px] text-[#526078] mb-1">
                <span>CALLER</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[#19243B] font-semibold truncate">
                {CallerIcon && <CallerIcon className="w-3 h-3 text-sky-600 shrink-0" />}
                <span className="truncate text-xs">{cleanParticipantName(caller?.name || message.caller_id)}</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-[#687184] shrink-0" />

            <div className="flex-1 p-2.5 rounded-lg bg-white border border-[#E2E0D9] text-center shadow-xs">
              <div className="flex items-center justify-between text-[9px] text-[#526078] mb-1">
                <span>CALLEE</span>
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[#19243B] font-semibold truncate">
                {CalleeIcon && <CalleeIcon className="w-3 h-3 text-emerald-600 shrink-0" />}
                <span className="truncate text-xs">{cleanParticipantName(callee?.name || message.callee_id)}</span>
              </div>
            </div>
          </div>
        </div>

        {message.description && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-1.5">
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
              Step Description
            </span>
            <p className="text-[#19243B] text-xs leading-relaxed">{message.description}</p>
          </div>
        )}

        {message.payload && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-sky-600" />
              Request Payload
            </span>
            <div className="p-2.5 rounded-lg bg-white border border-[#E2E0D9] overflow-x-auto text-[11px] text-sky-800 font-mono shadow-inner">
              <pre>{message.payload}</pre>
            </div>
          </div>
        )}

        {message.response_payload && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-600" />
              Response
            </span>
            <div className="p-2.5 rounded-lg bg-white border border-[#E2E0D9] overflow-x-auto text-[11px] text-emerald-800 font-mono shadow-inner">
              <pre>{message.response_payload}</pre>
            </div>
          </div>
        )}

        {(message.is_async || message.is_error) && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
            <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
              Runtime Characteristics
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {message.is_async && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  <Zap className="w-3.5 h-3.5" />
                  Asynchronous Task
                </span>
              )}
              {message.is_error && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Alternative Failure Branch
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
