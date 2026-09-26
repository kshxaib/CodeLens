/**
 * CanvasSidebar — Left panel for the Architecture Canvas.
 *
 * Tabs:
 * - Layers: Architectural tiers with counts (click-to-filter)
 * - Nodes: Node type breakdown
 * - Edges: Relationship type breakdown
 * - Legend: Color/style guide
 *
 * Design: Clean, information-dense, no flashy decorations.
 */
import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Box,
  GitBranch,
  BookOpen,
  MousePointer2,
  Code2,
  GitMerge,
  ZapOff,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { ARCH_TIERS, RELATIONSHIP_CONFIG } from './constants';
import type { KnowledgeGraphData } from '../../types';

type SidebarTab = 'layers' | 'nodes' | 'edges' | 'legend';

interface CanvasSidebarProps {
  kgData: KnowledgeGraphData | null;
  selectedTier: string;
  onTierChange: (tier: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  selectedRel: string;
  onRelChange: (rel: string) => void;
  onClose: () => void;
}

const NODE_TYPE_ICONS: Record<string, React.FC<{ className?: string }>> = {
  service: ({ className }) => <Box className={className} />,
  api_endpoint: ({ className }) => <GitBranch className={className} />,
  component: ({ className }) => <Layers className={className} />,
  database: ({ className }) => <Box className={className} />,
  database_model: ({ className }) => <Box className={className} />,
  external_service: ({ className }) => <GitMerge className={className} />,
  queue: ({ className }) => <Box className={className} />,
  worker: ({ className }) => <Box className={className} />,
  module: ({ className }) => <Code2 className={className} />,
  function: ({ className }) => <Code2 className={className} />,
};

const NODE_TYPE_LABELS: Record<string, string> = {
  service: 'Services',
  api_endpoint: 'API Endpoints',
  component: 'Components',
  database: 'Databases',
  database_model: 'DB Models',
  external_service: 'External',
  queue: 'Queues',
  worker: 'Workers',
  module: 'Modules',
  function: 'Functions',
  class: 'Classes',
  application: 'Applications',
  storage: 'Storage',
  lifecycle_entity: 'Lifecycle',
};

export const CanvasSidebar: React.FC<CanvasSidebarProps> = ({
  kgData,
  selectedTier,
  onTierChange,
  selectedType,
  onTypeChange,
  selectedRel,
  onRelChange,
  onClose,
}) => {
  const [tab, setTab] = useState<SidebarTab>('layers');

  const tierStats = useMemo(() => {
    if (!kgData) return {} as Record<string, number>;
    return kgData.nodes.reduce<Record<string, number>>((acc, n) => {
      const tier =
        n.type === 'external_service' ? 'external' :
        ['database', 'queue', 'storage'].includes(n.type) ? 'infrastructure' :
        n.type === 'database_model' ? 'domain' :
        ['service', 'worker'].includes(n.type) ? 'application' :
        ['api_endpoint', 'application'].includes(n.type) ? 'api_gateway' :
        n.type === 'component' ? 'presentation' : 'application';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {});
  }, [kgData]);

  const nodeTypeStats = useMemo(() => {
    if (!kgData) return {} as Record<string, number>;
    return kgData.nodes.reduce<Record<string, number>>((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {});
  }, [kgData]);

  const edgeTypeStats = useMemo(() => {
    if (!kgData) return {} as Record<string, number>;
    return kgData.edges.reduce<Record<string, number>>((acc, e) => {
      acc[e.relationship_type] = (acc[e.relationship_type] || 0) + 1;
      return acc;
    }, {});
  }, [kgData]);

  const evidenceStats = useMemo(() => {
    if (!kgData) return { verified: 0, inferred: 0, total: 0 };
    const total = kgData.edges.length;
    const verified = kgData.edges.filter(e => e.evidence && e.evidence.length > 0).length;
    return { verified, inferred: total - verified, total };
  }, [kgData]);

  const tabs: { id: SidebarTab; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { id: 'layers', label: 'Layers', Icon: ({ className }) => <Layers className={className} /> },
    { id: 'nodes', label: 'Nodes', Icon: ({ className }) => <Box className={className} /> },
    { id: 'edges', label: 'Edges', Icon: ({ className }) => <GitBranch className={className} /> },
    { id: 'legend', label: 'Guide', Icon: ({ className }) => <BookOpen className={className} /> },
  ];

  return (
    <div className="flex flex-col h-full min-w-[260px] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f23] shrink-0">
        <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider font-mono">
          Graph Explorer
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded text-zinc-500 hover:text-white transition cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1f1f23] shrink-0">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[9px] font-mono font-bold uppercase tracking-wide transition cursor-pointer ${
              tab === id
                ? 'text-amber-300 border-b-2 border-amber-400'
                : 'text-zinc-500 hover:text-zinc-300 border-b-2 border-transparent'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">

        {/* LAYERS TAB */}
        {tab === 'layers' && (
          <>
            {/* Evidence health */}
            <div className="mb-3 p-2.5 rounded-xl border border-[#1f1f23] bg-[#0a0a0c] space-y-2">
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">
                Evidence Coverage
              </p>
              <div className="flex gap-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: evidenceStats.total
                        ? `${Math.round((evidenceStats.verified / evidenceStats.total) * 100)}%`
                        : '0%',
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-[9px] font-mono">
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5" />
                  {evidenceStats.verified} verified
                </span>
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {evidenceStats.inferred} inferred
                </span>
              </div>
            </div>

            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider font-mono px-0.5">
              Click to filter by layer
            </p>
            {Object.entries(ARCH_TIERS)
              .sort((a, b) => a[1].order - b[1].order)
              .map(([key, tier]) => {
                const count = tierStats[key] || 0;
                const isActive = selectedTier === key;
                return (
                  <button
                    key={key}
                    onClick={() => onTierChange(isActive ? 'all' : key)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-amber-400/8 border-amber-400/40'
                        : 'bg-[#0c0c0e] border-[#1a1a1f] hover:border-[#2f2f35]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: tier.dot }}
                      />
                      <div className="min-w-0">
                        <p className={`text-[11px] font-bold font-mono ${tier.color}`}>
                          {tier.label}
                        </p>
                        <p className="text-[9px] text-zinc-600 font-mono truncate mt-0.5">
                          {tier.sub}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/50 ml-2 shrink-0">
                      {count}
                    </span>
                  </button>
                );
              })}
          </>
        )}

        {/* NODES TAB */}
        {tab === 'nodes' && (
          <>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider font-mono px-0.5">
              Click to filter by type
            </p>
            {Object.entries(nodeTypeStats)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const Icon = NODE_TYPE_ICONS[type] || (({ className }: any) => <Box className={className} />);
                const label = NODE_TYPE_LABELS[type] || type.replace(/_/g, ' ');
                const isActive = selectedType === type;
                return (
                  <button
                    key={type}
                    onClick={() => onTypeChange(isActive ? 'all' : type)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-400/8 border-amber-400/40'
                        : 'bg-[#0c0c0e] border-[#1a1a1f] hover:border-[#2f2f35]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="text-[11px] font-mono text-zinc-300 capitalize">
                        {label}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/50">
                      {count}
                    </span>
                  </button>
                );
              })}
          </>
        )}

        {/* EDGES TAB */}
        {tab === 'edges' && (
          <>
            <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider font-mono px-0.5">
              Click to filter by relationship
            </p>
            {Object.entries(edgeTypeStats)
              .sort((a, b) => b[1] - a[1])
              .map(([rel, count]) => {
                const cfg = RELATIONSHIP_CONFIG[rel];
                const isActive = selectedRel === rel;
                return (
                  <button
                    key={rel}
                    onClick={() => onRelChange(isActive ? 'all' : rel)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-400/8 border-amber-400/40'
                        : 'bg-[#0c0c0e] border-[#1a1a1f] hover:border-[#2f2f35]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-0.5 rounded-full shrink-0"
                        style={{
                          backgroundColor: cfg?.stroke || '#71717a',
                          borderTop: cfg?.strokeDasharray ? '1px dashed' : 'none',
                        }}
                      />
                      <span className="text-[10px] font-mono text-zinc-300 font-bold">{rel}</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400 px-1.5 py-0.5 rounded bg-zinc-800/60 border border-zinc-700/50">
                      {count}
                    </span>
                  </button>
                );
              })}
          </>
        )}

        {/* LEGEND TAB */}
        {tab === 'legend' && (
          <div className="space-y-4">
            {/* Interactions */}
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">
                Node Interactions
              </p>
              <div className="space-y-2 text-[10px] font-mono text-zinc-400">
                {[
                  { icon: <MousePointer2 className="w-3 h-3 text-amber-400" />, text: 'Click → select & inspect' },
                  { icon: <MousePointer2 className="w-3 h-3 text-sky-400" />, text: 'Hover → highlight connections' },
                  { icon: <MousePointer2 className="w-3 h-3 text-emerald-400" />, text: 'Click edge → view evidence' },
                  { icon: <Code2 className="w-3 h-3 text-indigo-400" />, text: 'Inspector → open source' },
                ].map(({ icon, text }, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {icon}
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Node states */}
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">
                Node States
              </p>
              <div className="space-y-1.5 text-[10px] font-mono">
                {[
                  { color: '#f59e0b', label: 'Selected node' },
                  { color: '#f59e0b', label: 'Upstream callers', opacity: 0.7 },
                  { color: '#38bdf8', label: 'Downstream dependencies' },
                  { color: '#38bdf8', label: 'Active path step', ring: true },
                  { color: '#71717a', label: 'Dimmed (out of focus)', dim: true },
                ].map(({ color, label, dim }, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded border shrink-0 ${dim ? 'opacity-30' : ''}`}
                      style={{ backgroundColor: color + '30', borderColor: color }}
                    />
                    <span className={dim ? 'text-zinc-600' : 'text-zinc-400'}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Evidence types */}
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">
                Evidence Confidence
              </p>
              <div className="space-y-1.5 text-[10px] font-mono">
                {[
                  { color: '#10b981', icon: <CheckCircle2 className="w-3 h-3" />, label: 'Deterministic (AST proven)' },
                  { color: '#38bdf8', icon: <CheckCircle2 className="w-3 h-3" />, label: 'High confidence' },
                  { color: '#f59e0b', icon: <AlertTriangle className="w-3 h-3" />, label: 'Inferred (heuristic)' },
                  { color: '#71717a', icon: <ZapOff className="w-3 h-3" />, label: 'Low confidence' },
                ].map(({ color, icon, label }, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ color }}>
                    {icon}
                    <span style={{ color: '#a1a1aa' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Relationship legend */}
            <div>
              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono mb-2">
                Relationship Types
              </p>
              <div className="space-y-1.5 text-[10px] font-mono">
                {Object.entries(RELATIONSHIP_CONFIG).slice(0, 8).map(([rel, cfg]) => (
                  <div key={rel} className="flex items-center gap-2">
                    <ArrowRight className="w-3 h-3 shrink-0" style={{ color: cfg.stroke }} />
                    <span className="text-zinc-400">{rel}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
