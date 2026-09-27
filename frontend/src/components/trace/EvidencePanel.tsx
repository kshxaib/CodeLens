import React from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, FileCode2, ExternalLink, ZapOff, Zap, Database, Globe, Settings, GitMerge, Cpu, BrainCircuit } from 'lucide-react';
import type { SourceEvidence, EvidenceType, EvidenceVerification } from '../../types';

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
  ast: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  import: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200' },
  function_call: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
  route: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  db_access: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-200' },
  configuration: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
  inferred: { bg: 'bg-[#F0EEE9]', text: 'text-[#526078]', border: 'border-[#E2E0D9]' },
  llm_inferred: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-200' },
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
      classes: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      Icon: ({ className }) => <CheckCircle2 className={className} />,
    },
    INFERRED: {
      label: 'Inferred',
      classes: 'bg-amber-50 text-amber-800 border-amber-200',
      Icon: ({ className }) => <AlertTriangle className={className} />,
    },
    PARTIAL: {
      label: 'Partial',
      classes: 'bg-orange-50 text-orange-800 border-orange-200',
      Icon: ({ className }) => <HelpCircle className={className} />,
    },
    NOT_FOUND: {
      label: 'Not Found',
      classes: 'bg-[#F0EEE9] text-[#526078] border-[#E2E0D9]',
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

interface ConfidenceBarProps {
  value: number; 
  label?: string;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ value, label }) => {
  const color =
    value >= 85 ? 'bg-emerald-600' :
    value >= 55 ? 'bg-amber-600' :
    'bg-rose-600';

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-[#526078] font-mono uppercase tracking-wider font-bold">{label}</span>
          <span className="text-[11px] font-bold font-mono text-[#19243B]">{value}%</span>
        </div>
      )}
      <div className="h-1.5 rounded-full bg-[#E2E0D9] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
};

interface InferredWarningProps {
  warning?: string | null;
}

export const InferredWarning: React.FC<InferredWarningProps> = ({ warning }) => {
  if (!warning) return null;
  return (
    <div className="flex items-start gap-2.5 p-3.5 rounded-xl border border-amber-200 bg-amber-50">
      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
      <div>
        <p className="text-[11px] font-bold text-amber-900 mb-0.5">Inferred Relationship</p>
        <p className="text-[10px] text-amber-800 leading-relaxed">
          {warning.replace(/⚠\s?/, '')}
        </p>
      </div>
    </div>
  );
};

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
      className={`rounded-xl border transition-colors shadow-sm ${
        isInferred
          ? 'border-[#E2E0D9] bg-[#F8F7F4]'
          : 'border-[#E2E0D9] bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-[#F0EEE9]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] text-[#687184] font-mono shrink-0">#{index + 1}</span>
          <EvidenceTypeBadge type={evType} />
          {evidence.symbol && (
            <code className="text-[10px] text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 font-mono truncate max-w-[120px]">
              {evidence.symbol}
            </code>
          )}
        </div>

        {hasLocation && onOpenSource && (
          <button
            onClick={() => onOpenSource(evidence.file_path, { start: evidence.start_line, end: evidence.end_line })}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 transition shrink-0 cursor-pointer shadow-sm"
          >
            Open Source
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {hasLocation ? (
        <div className="px-3.5 py-2 flex items-center gap-1.5">
          <FileCode2 className="w-3 h-3 text-[#687184] shrink-0" />
          <span className="text-[10px] text-[#526078] font-mono truncate">
            {evidence.file_path}
            <span className="text-[#687184] mx-1">:</span>
            <span className="text-sky-700 font-semibold">L{evidence.start_line}–{evidence.end_line}</span>
          </span>
        </div>
      ) : (
        <div className="px-3.5 py-2 flex items-center gap-1.5">
          <ZapOff className="w-3 h-3 text-[#687184] shrink-0" />
          <span className="text-[10px] text-[#687184] italic">No direct file reference — heuristic inference</span>
        </div>
      )}

      {(evidence.snippet || evidence.code_snippet) && (
        <pre className="mx-3.5 mb-3 px-3 py-2.5 rounded-lg bg-[#F8F7F4] border border-[#E2E0D9] text-[10px] text-[#19243B] overflow-x-auto whitespace-pre leading-relaxed font-mono shadow-inner">
          {evidence.snippet || evidence.code_snippet}
        </pre>
      )}
    </div>
  );
};

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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-[10px] font-bold text-[#526078] uppercase tracking-wider">{title}</span>
          <span className="text-[10px] text-[#687184]">({evidence.length})</span>
          {directCount > 0 && (
            <span className="text-[9px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200 font-bold">
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

      {confidencePct !== undefined && !compact && (
        <ConfidenceBar value={confidencePct} label="Confidence" />
      )}

      {verification?.warning && (
        <InferredWarning warning={verification.warning} />
      )}

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
        <div className="p-4 rounded-xl border border-dashed border-[#E2E0D9] bg-[#F8F7F4] text-center space-y-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 mx-auto" />
          <p className="text-[#526078] text-[11px] font-semibold">No direct source evidence available.</p>
          <p className="text-[#687184] text-[10px]">
            This relationship is an <span className="text-amber-700 font-bold">inferred connection</span> based on
            naming patterns or graph topology — not a verified code reference.
          </p>
        </div>
      )}
    </div>
  );
};

export default EvidencePanel;
