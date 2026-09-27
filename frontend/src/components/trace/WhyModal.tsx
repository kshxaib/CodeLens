import React from 'react';
import { X, ArrowRight, HelpCircle, Sparkles } from 'lucide-react';
import type { WhyRelationshipResponse } from '../../types';
import { EvidencePanel, VerificationBadge, ConfidenceBar, InferredWarning } from './EvidencePanel';

interface WhyModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WhyRelationshipResponse | null;
  loading?: boolean;
  onOpenSource: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const WhyModal: React.FC<WhyModalProps> = ({
  isOpen,
  onClose,
  data,
  loading = false,
  onOpenSource,
}) => {
  if (!isOpen) return null;

  const isInferred = data?.confidence_level === 'inferred' ||
    data?.confidence_level === 'medium' ||
    !data?.evidence?.some(e => e.has_location ?? Boolean(e.file_path && e.start_line > 0));

  const verificationStatus = !data
    ? 'NOT_FOUND'
    : isInferred
      ? 'INFERRED'
      : 'VERIFIED';

  const confidencePct = data ? Math.round(data.confidence * 100) : 0;

  const inferredWarning = data?.is_inferred
    ? '⚠ Relationship is a heuristic inference. No direct code reference was found. Treat this connection with appropriate uncertainty.'
    : (data?.evidence?.length === 0)
      ? '⚠ No source evidence attached. This connection appears to be inferred from graph topology or naming patterns.'
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white border border-[#E2E0D9] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">

        <div className="px-6 py-4 border-b border-[#E2E0D9] bg-[#F8F7F4]/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#19243B] font-mono flex items-center gap-2">
                <span>Relationship Evidence</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                  Why does this relationship exist?
                </span>
              </h2>
              <p className="text-[11px] text-[#526078] font-mono mt-0.5">
                Source evidence · AST inference · Verification status
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#526078] hover:text-[#19243B] hover:bg-[#F0EEE9] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-[#526078]">
              <Sparkles className="w-6 h-6 text-amber-600 animate-spin" />
              <span>Analyzing AST and relationship evidence...</span>
            </div>
          ) : data ? (
            <>
              <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#687184] uppercase font-bold">Source</span>
                    <span className="text-sm font-bold text-sky-800">{data.source.name}</span>
                    {data.source.type && (
                      <span className="text-[9px] text-[#687184] mt-0.5">{data.source.type}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mx-1">
                    <ArrowRight className="w-4 h-4 text-[#687184] shrink-0" />
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      {data.relationship_type}
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#687184] shrink-0" />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#687184] uppercase font-bold">Target</span>
                    <span className="text-sm font-bold text-emerald-800">{data.target.name}</span>
                    {data.target.type && (
                      <span className="text-[9px] text-[#687184] mt-0.5">{data.target.type}</span>
                    )}
                  </div>

                  <div className="ml-auto">
                    <VerificationBadge
                      status={verificationStatus as any}
                      confidencePct={confidencePct}
                    />
                  </div>
                </div>

                <ConfidenceBar value={confidencePct} label="Confidence" />
              </div>

              <InferredWarning warning={inferredWarning} />

              <div className="p-4 rounded-xl border border-[#E2E0D9] bg-[#F8F7F4] space-y-1.5">
                <span className="text-[10px] font-bold text-[#526078] uppercase tracking-wider block">
                  Inference Justification
                </span>
                <p className="text-[#19243B] text-xs leading-relaxed">
                  {data.reason?.split('\n\n')[0] || 'No justification available.'}
                </p>
              </div>

              <EvidencePanel
                evidence={data.evidence || []}
                verification={{
                  status: verificationStatus as any,
                  confidence_pct: confidencePct,
                  evidence_count: data.evidence?.length || 0,
                  direct_evidence_count: data.evidence?.filter(e =>
                    e.has_location ?? Boolean(e.file_path && e.start_line > 0)
                  ).length || 0,
                  inferred_evidence_count: data.evidence?.filter(e => e.is_inferred).length || 0,
                  warning: null, 
                }}
                confidence={data.confidence}
                title="Source Evidence"
                onOpenSource={onOpenSource}
              />
            </>
          ) : (
            <div className="py-8 text-center text-[#687184]">No relationship data available.</div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-[#E2E0D9] bg-[#F8F7F4] flex items-center justify-between shrink-0">
          <p className="text-[10px] text-[#687184] font-mono">
            {data?.evidence?.length
              ? `${data.evidence.length} evidence item${data.evidence.length !== 1 ? 's' : ''} · `
              : ''}
            All claims backed by deterministic AST analysis
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#F0EEE9] hover:bg-[#E2E0D9] text-[#19243B] text-xs font-mono font-medium transition cursor-pointer border border-[#E2E0D9]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
