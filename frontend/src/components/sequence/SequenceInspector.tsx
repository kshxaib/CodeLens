import React from 'react';
import { X, ExternalLink, FileCode2, ArrowRight, Zap, AlertTriangle, ShieldCheck, Code2, HelpCircle, Compass } from 'lucide-react';
import type { SequenceMessage, SequenceParticipant } from '../../types';
import { getInteractionConfig, getParticipantConfig } from './constants';
import { useTrace } from '../../store/useTraceStore';

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
  const { openWhy, selectTraceNode } = useTrace();
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
          <button
            onClick={() =>
              onOpenSource(message.evidence!.file_path, {
                start: message.evidence!.start_line,
                end: message.evidence!.end_line,
              })
            }
            className="w-full py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200/80 text-amber-800 font-bold flex items-center justify-between transition cursor-pointer shadow-sm group"
          >
            <div className="flex items-center gap-2 truncate">
              <FileCode2 className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="truncate text-xs">
                {message.evidence.file_path.split(/[/\\]/).pop()}:{message.evidence.start_line}-{message.evidence.end_line}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-700 group-hover:text-amber-900 shrink-0">
              <span>Open Source</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          </button>
        )}

        <button
          onClick={() =>
            openWhy({
              source: message.caller_id,
              target: message.callee_id,
            })
          }
          className="w-full py-2 px-3.5 rounded-xl bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 text-amber-800 font-bold flex items-center justify-between transition cursor-pointer shadow-sm text-xs"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Why does this interaction exist?</span>
          </div>
          <span className="text-[10px] text-amber-700 font-mono">Verify AST & Evidence</span>
        </button>

        <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-3">
          <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold block">
            Interaction Participants
          </span>

          <div className="flex items-center gap-2.5">
            <div
              onClick={() => selectTraceNode(caller?.id || message.caller_id)}
              className="flex-1 p-2.5 rounded-lg bg-white hover:bg-amber-50/50 border border-[#E2E0D9] hover:border-amber-300 text-center cursor-pointer transition group shadow-sm"
              title="Click to Trace Caller"
            >
              <div className="flex items-center justify-between text-[9px] text-[#526078] mb-1">
                <span>CALLER</span>
                <Compass className="w-2.5 h-2.5 text-[#687184] group-hover:text-amber-700" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[#19243B] group-hover:text-amber-800 font-semibold truncate">
                {CallerIcon && <CallerIcon className="w-3 h-3 text-sky-600 shrink-0" />}
                <span className="truncate text-xs">{caller?.name || message.caller_id}</span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-[#687184] shrink-0" />

            <div
              onClick={() => selectTraceNode(callee?.id || message.callee_id)}
              className="flex-1 p-2.5 rounded-lg bg-white hover:bg-amber-50/50 border border-[#E2E0D9] hover:border-amber-300 text-center cursor-pointer transition group shadow-sm"
              title="Click to Trace Callee"
            >
              <div className="flex items-center justify-between text-[9px] text-[#526078] mb-1">
                <span>CALLEE</span>
                <Compass className="w-2.5 h-2.5 text-[#687184] group-hover:text-emerald-700" />
              </div>
              <div className="flex items-center justify-center gap-1.5 text-[#19243B] group-hover:text-emerald-800 font-semibold truncate">
                {CalleeIcon && <CalleeIcon className="w-3 h-3 text-emerald-600 shrink-0" />}
                <span className="truncate text-xs">{callee?.name || message.callee_id}</span>
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

        {message.evidence && (
          <div className="p-3.5 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[#526078] uppercase tracking-wider font-bold">
                Traceable Evidence
              </span>
              <span className="text-[10px] text-amber-700 font-bold">
                Lines {message.evidence.start_line}-{message.evidence.end_line}
              </span>
            </div>
            {message.evidence.snippet && (
              <div className="p-2.5 rounded-lg bg-white border border-[#E2E0D9] overflow-x-auto text-[10px] text-[#19243B] font-mono shadow-inner">
                <pre className="whitespace-pre-wrap">{message.evidence.snippet}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
