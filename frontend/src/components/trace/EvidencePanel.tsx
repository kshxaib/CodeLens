/**
 * EvidencePanel — Reusable source evidence display component.
 *
 * Shows:
 * - Evidence type badge (AST, Import, Function Call, Route, DB Access, etc.)
 * - File path + line range
 * - Code snippet (syntax-highlighted)
 * - Inferred warning when no direct code reference exists
 * - "Open Source" jump button
 * - Confidence bar
 * - Verification status (VERIFIED / INFERRED / NOT_FOUND)
 *
 * Used by: WhyModal, ExplainModal, ArchitectureInspector, SequenceInspector
 */
import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  FileCode2,
  ExternalLink,
  ZapOff,
  Zap,
  Database,
  Globe,
  Settings,
  GitMerge,
  Cpu,
  BrainCircuit,
} from 'lucide-react';
import type { SourceEvidence, EvidenceType, EvidenceVerification } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  ast: 'AST Parse',
  import: 'Static Import',
  function_call: 'Function Call',
  route: 'HTTP Route',
  db_access: 'Database Access',
  configuration: 'Configuration',
  inferred: 'Inferred',
  llm_inferred: 'LLM Inferred',
};

const EVIDENCE_TYPE_COLORS: Record<EvidenceType, { bg: string; text: string; border: string }> = {
  ast: { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  import: { bg: 'bg-sky-500/15', text: 'text-sky-300', border: 'border-sky-500/30' },
  function_call: { bg: 'bg-violet-500/15', text: 'text-violet-300', border: 'border-violet-500/30' },
  route: { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  db_access: { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
  configuration: { bg: 'bg-orange-500/15', text: 'text-orange-300', border: 'border-orange-500/30' },
  inferred: { bg: 'bg-zinc-500/15', text: 'text-zinc-400', border: 'border-zinc-500/30' },
  llm_inferred: { bg: 'bg-indigo-500/15', text: 'text-indigo-300', border: 'border-indigo-500/30' },
};

const EVIDENCE_TYPE_ICONS: Record<EvidenceType, React.FC<{ className?: string }>> = {
  ast: ({ className }) => <GitMerge className={className} />,
  import: ({ className }) => <FileCode2 className={className} />,
  function_call: ({ className }) => <Cpu className={className} />,
  route: ({ className }) => <Globe className={className} />,
  db_access: ({ className }) => <Database className={className} />,
  configuration: ({ className }) => <Settings className={className} />,
  inferred: ({ className }) => <ZapOff className={className} />,
  llm_inferred: ({ className }) => <BrainCircuit className={className} />,
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface EvidenceTypeBadgeProps {
  type: EvidenceType;
  size?: 'sm' | 'xs';
}

export const EvidenceTypeBadge: React.FC<EvidenceTypeBadgeProps> = ({ type, size = 'xs' }) => {
  const colors = EVIDENCE_TYPE_COLORS[type] || EVIDENCE_TYPE_COLORS.inferred;
  const Icon = EVIDENCE_TYPE_ICONS[type] || EVIDENCE_TYPE_ICONS.inferred;
  const label = EVIDENCE_TYPE_LABELS[type] || type;
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-[10px]';
  const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-3 h-3';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold uppercase tracking-wide border ${textSize} ${colors.bg} ${colors.text} ${colors.border}`}
    >
      <Icon className={iconSize} />
      {label}
    </span>
  );
};

interface VerificationBadgeProps {
  status: EvidenceVerification['status'];
  confidencePct?: number;
}

export const VerificationBadge: React.FC<VerificationBadgeProps> = ({ status, confidencePct }) => {
  const configs: Record<EvidenceVerification['status'], { label: string; classes: string; Icon: React.FC<{className?: string}> }> = {
    VERIFIED: {
      label: 'Verified',
      classes: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      Icon: ({ className }) => <CheckCircle2 className={className} />,
    },
    INFERRED: {
      label: 'Inferred',
      classes: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      Icon: ({ className }) => <AlertTriangle className={className} />,
    },
    PARTIAL: {
      label: 'Partial',
      classes: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
      Icon: ({ className }) => <HelpCircle className={className} />,
    },
    NOT_FOUND: {
      label: 'Not Found',
      classes: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
      Icon: ({ className }) => <ZapOff className={className} />,
    },
  };

  const cfg = configs[status] || configs.INFERRED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase border ${cfg.classes}`}
    >
      <cfg.Icon className="w-3 h-3" />
      {cfg.label}
      {confidencePct !== undefined && (
        <span className="opacity-70">({confidencePct}%)</span>
      )}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Confidence Bar
// ---------------------------------------------------------------------------

interface ConfidenceBarProps {
  value: number; // 0-100
  label?: string;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ value, label }) => {
  const color =
    value >= 85 ? 'bg-emerald-500' :
    value >= 55 ? 'bg-amber-500' :
    'bg-rose-500';

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">{label}</span>
          <span className="text-[11px] font-bold font-mono text-zinc-300">{value}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Inferred Warning Banner
// ---------------------------------------------------------------------------

interface InferredWarningProps {
  warning?: string | null;
}

export const InferredWarning: React.FC<InferredWarningProps> = ({ warning }) => {
  if (!warning) return null;
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07]">
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <div>
        <p className="text-[11px] font-bold text-amber-300 mb-0.5">Inferred Relationship</p>
        <p className="text-[10px] text-amber-200/70 leading-relaxed">
          {warning.replace(/⚠\s?/, '')}
        </p>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Single Evidence Item Card
// ---------------------------------------------------------------------------

interface EvidenceItemCardProps {
  evidence: SourceEvidence;
  index: number;
  onOpenSource?: (filePath: string, lineRange?: { start: number; end: number }) => void;
}

export const EvidenceItemCard: React.FC<EvidenceItemCardProps> = ({
  evidence,
  index,
  onOpenSource,
}) => {
  const evType = (evidence.evidence_type || 'ast') as EvidenceType;
  const isInferred = evidence.is_inferred ?? (evType === 'inferred' || evType === 'llm_inferred');
  const hasLocation = evidence.has_location ?? Boolean(evidence.file_path && evidence.start_line > 0);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        isInferred
          ? 'border-zinc-700/50 bg-zinc-900/40'
          : 'border-zinc-800 bg-[#0c0c0e]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-zinc-800/60">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-zinc-500 font-mono shrink-0">#{index + 1}</span>
          <EvidenceTypeBadge type={evType} />
          {evidence.symbol && (
            <code className="text-[10px] text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20 font-mono truncate max-w-[120px]">
              {evidence.symbol}
            </code>
          )}
        </div>

        {hasLocation && onOpenSource && (
          <button
            onClick={() => onOpenSource(evidence.file_path, { start: evidence.start_line, end: evidence.end_line })}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/20 transition shrink-0 cursor-pointer"
          >
            Open Source
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Location */}
      {hasLocation ? (
        <div className="px-3.5 py-2 flex items-center gap-1.5">
          <FileCode2 className="w-3 h-3 text-zinc-500 shrink-0" />
          <span className="text-[10px] text-zinc-400 font-mono truncate">
            {evidence.file_path}
            <span className="text-zinc-600 mx-1">:</span>
            <span className="text-sky-400">L{evidence.start_line}–{evidence.end_line}</span>
          </span>
        </div>
      ) : (
        <div className="px-3.5 py-2 flex items-center gap-1.5">
          <ZapOff className="w-3 h-3 text-zinc-600 shrink-0" />
          <span className="text-[10px] text-zinc-600 italic">No direct file reference — heuristic inference</span>
        </div>
      )}

      {/* Code snippet */}
      {(evidence.snippet || evidence.code_snippet) && (
        <pre className="mx-3.5 mb-3 px-3 py-2.5 rounded-lg bg-black/60 border border-zinc-800 text-[10px] text-zinc-300 overflow-x-auto whitespace-pre leading-relaxed font-mono">
          {evidence.snippet || evidence.code_snippet}
        </pre>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main EvidencePanel Component
// ---------------------------------------------------------------------------

interface EvidencePanelProps {
  evidence: SourceEvidence[];
  verification?: EvidenceVerification;
  confidence?: number;
  title?: string;
  onOpenSource?: (filePath: string, lineRange?: { start: number; end: number }) => void;
  compact?: boolean;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({
  evidence,
  verification,
  confidence,
  title = 'Source Evidence',
  onOpenSource,
  compact = false,
}) => {
  const confidencePct = confidence !== undefined ? Math.round(confidence * 100) : verification?.confidence_pct;
  const hasAnyEvidence = evidence.length > 0;
  const directCount = evidence.filter(e => !e.is_inferred && e.has_location).length;

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Panel Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{title}</span>
          <span className="text-[10px] text-zinc-600">({evidence.length})</span>
          {directCount > 0 && (
            <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              {directCount} direct
            </span>
          )}
        </div>

        {verification && (
          <VerificationBadge
            status={verification.status}
            confidencePct={verification.confidence_pct}
          />
        )}
      </div>

      {/* Confidence Bar */}
      {confidencePct !== undefined && !compact && (
        <ConfidenceBar value={confidencePct} label="Confidence" />
      )}

      {/* Inferred Warning */}
      {verification?.warning && (
        <InferredWarning warning={verification.warning} />
      )}

      {/* Evidence Items */}
      {hasAnyEvidence ? (
        <div className="space-y-2">
          {evidence.map((ev, idx) => (
            <EvidenceItemCard
              key={idx}
              evidence={ev}
              index={idx}
              onOpenSource={onOpenSource}
            />
          ))}
        </div>
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center space-y-2">
          <AlertTriangle className="w-5 h-5 text-amber-400 mx-auto" />
          <p className="text-zinc-500 text-[11px]">No direct source evidence available.</p>
          <p className="text-zinc-600 text-[10px]">
            This relationship is an <span className="text-amber-400">inferred connection</span> based on
            naming patterns or graph topology — not a verified code reference.
          </p>
        </div>
      )}
    </div>
  );
};

export default EvidencePanel;
