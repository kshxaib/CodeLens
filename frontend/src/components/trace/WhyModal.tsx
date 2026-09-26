/**
 * WhyModal — Relationship Evidence & Verification Modal
 *
 * Shows why CodeLens believes a relationship exists:
 * - Relationship header (source → relationship_type → target)
 * - Verification status badge (VERIFIED / INFERRED / NOT_FOUND)
 * - Confidence bar
 * - Inference justification text
 * - Source Evidence Panel with evidence type badges, code snippets, "Open Source"
 * - Explicit inferred warning when no direct code reference exists
 */
import React from 'react';
import {
  X,
  ArrowRight,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import type { WhyRelationshipResponse } from '../../types';
import {
  EvidencePanel,
  VerificationBadge,
  ConfidenceBar,
  InferredWarning,
} from './EvidencePanel';

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

  // Derive verification status from the response
  const isInferred = data?.confidence_level === 'inferred' ||
    data?.confidence_level === 'medium' ||
    !data?.evidence?.some(e => e.has_location ?? Boolean(e.file_path && e.start_line > 0));

  const verificationStatus = !data
    ? 'NOT_FOUND'
    : isInferred
      ? 'INFERRED'
      : 'VERIFIED';

  const confidencePct = data ? Math.round(data.confidence * 100) : 0;

  // Check if reason text contains an inferred note
  const inferredWarning = data?.is_inferred
    ? '⚠ Relationship is a heuristic inference. No direct code reference was found. Treat this connection with appropriate uncertainty.'
    : (data?.evidence?.length === 0)
      ? '⚠ No source evidence attached. This connection appears to be inferred from graph topology or naming patterns.'
      : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#09090b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1f1f23] bg-[#0c0c0e]/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <HelpCircle className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>Relationship Evidence</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Why does this relationship exist?
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                Source evidence · AST inference · Verification status
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 font-mono text-xs">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-400">
              <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
              <span>Analyzing AST and relationship evidence...</span>
            </div>
          ) : data ? (
            <>
              {/* Relationship Banner */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] space-y-3">
                {/* Source → rel → Target row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-600 uppercase">Source</span>
                    <span className="text-sm font-bold text-sky-400">{data.source.name}</span>
                    {data.source.type && (
                      <span className="text-[9px] text-zinc-600 mt-0.5">{data.source.type}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 mx-1">
                    <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 uppercase">
                      {data.relationship_type}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] text-zinc-600 uppercase">Target</span>
                    <span className="text-sm font-bold text-emerald-400">{data.target.name}</span>
                    {data.target.type && (
                      <span className="text-[9px] text-zinc-600 mt-0.5">{data.target.type}</span>
                    )}
                  </div>

                  <div className="ml-auto">
                    <VerificationBadge
                      status={verificationStatus as any}
                      confidencePct={confidencePct}
                    />
                  </div>
                </div>

                {/* Confidence bar */}
                <ConfidenceBar value={confidencePct} label="Confidence" />
              </div>

              {/* Inferred Warning (when applicable) */}
              <InferredWarning warning={inferredWarning} />

              {/* Inference Justification */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-[#0c0c0e] space-y-1.5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Inference Justification
                </span>
                {/* Strip the ⚠ WARNING note from reason text if already shown as InferredWarning */}
                <p className="text-zinc-200 text-xs leading-relaxed">
                  {data.reason?.split('\n\n')[0] || 'No justification available.'}
                </p>
              </div>

              {/* Source Evidence Panel */}
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
                  warning: null, // Already shown via InferredWarning above
                }}
                confidence={data.confidence}
                title="Source Evidence"
                onOpenSource={onOpenSource}
              />
            </>
          ) : (
            <div className="py-8 text-center text-zinc-500">No relationship data available.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#1f1f23] bg-[#0c0c0e] flex items-center justify-between shrink-0">
          <p className="text-[10px] text-zinc-600 font-mono">
            {data?.evidence?.length
              ? `${data.evidence.length} evidence item${data.evidence.length !== 1 ? 's' : ''} · `
              : ''}
            All claims backed by deterministic AST analysis
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-medium transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
