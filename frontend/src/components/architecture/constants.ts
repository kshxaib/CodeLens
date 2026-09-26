import type { ArchNodeType, ArchLayerType } from '../../types';

export interface TierConfig {
  id: string;
  label: string;
  sub: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
  badgeBg: string;
  order: number;
}

export const ARCH_TIERS: Record<string, TierConfig> = {
  presentation: {
    id: 'presentation',
    label: 'Presentation',
    sub: 'Frontend UI, Components, Pages',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    dot: '#f59e0b',
    badgeBg: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
    order: 0,
  },
  api_gateway: {
    id: 'api_gateway',
    label: 'API Gateway',
    sub: 'HTTP Endpoints, Routes, Controllers',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    dot: '#38bdf8',
    badgeBg: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
    order: 1,
  },
  application: {
    id: 'application',
    label: 'Service',
    sub: 'Business Services, Handlers, Workers',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    dot: '#10b981',
    badgeBg: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
    order: 2,
  },
  domain: {
    id: 'domain',
    label: 'Data & Domain',
    sub: 'Models, Entities, Schemas, Repositories',
    color: 'text-indigo-400',
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    dot: '#818cf8',
    badgeBg: 'bg-indigo-400/10 text-indigo-300 border-indigo-400/20',
    order: 3,
  },
  infrastructure: {
    id: 'infrastructure',
    label: 'Infrastructure',
    sub: 'Databases, Queues, Storage, Caches',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    dot: '#c084fc',
    badgeBg: 'bg-purple-400/10 text-purple-300 border-purple-400/20',
    order: 4,
  },
  external: {
    id: 'external',
    label: 'External',
    sub: 'Third-party APIs, CDNs, External Gateways',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    dot: '#f43f5e',
    badgeBg: 'bg-rose-400/10 text-rose-300 border-rose-400/20',
    order: 5,
  },
};

export const getNodeTier = (type: ArchNodeType, layer?: ArchLayerType): string => {
  if (type === 'external_service') return 'external';
  if (type === 'database' || type === 'queue' || type === 'storage') return 'infrastructure';
  if (type === 'database_model') return 'domain';
  if (type === 'service' || type === 'worker') return 'application';
  if (type === 'api_endpoint') return 'api_gateway';
  if (type === 'component') return 'presentation';
  if (type === 'application') return 'api_gateway';

  // Fallback to layer
  if (layer === 'presentation') return 'presentation';
  if (layer === 'api_gateway') return 'api_gateway';
  if (layer === 'application') return 'application';
  if (layer === 'domain') return 'domain';
  if (layer === 'infrastructure') return 'infrastructure';

  return 'application';
};

export const RELATIONSHIP_CONFIG: Record<
  string,
  { label: string; stroke: string; strokeDasharray?: string; animated?: boolean; width: number }
> = {
  CALLS: { label: 'CALLS', stroke: '#38bdf8', animated: true, width: 2 },
  IMPORTS: { label: 'IMPORTS', stroke: '#52525b', width: 1.5 },
  DEPENDS_ON: { label: 'DEPENDS_ON', stroke: '#f59e0b', strokeDasharray: '4 4', width: 1.5 },
  EXPOSES: { label: 'EXPOSES', stroke: '#34d399', animated: true, width: 2 },
  CONSUMES: { label: 'CONSUMES', stroke: '#c084fc', strokeDasharray: '5 3', animated: true, width: 2 },
  READS: { label: 'READS', stroke: '#2dd4bf', width: 1.8 },
  WRITES: { label: 'WRITES', stroke: '#fbbf24', width: 2 },
  PERSISTS: { label: 'PERSISTS', stroke: '#a78bfa', width: 2 },
  AUTHENTICATES: { label: 'AUTHENTICATES', stroke: '#facc15', width: 2 },
  EMITS: { label: 'EMITS', stroke: '#f472b6', strokeDasharray: '4 4', animated: true, width: 1.8 },
  LISTENS: { label: 'LISTENS', stroke: '#818cf8', strokeDasharray: '4 4', width: 1.8 },
  TRIGGERS: { label: 'TRIGGERS', stroke: '#f43f5e', animated: true, width: 2 },
  TRANSFORMS: { label: 'TRANSFORMS', stroke: '#22d3ee', strokeDasharray: '3 3', width: 1.8 },
  CONTAINS: { label: 'CONTAINS', stroke: '#71717a', strokeDasharray: '2 2', width: 1.2 },
  IMPLEMENTS: { label: 'IMPLEMENTS', stroke: '#4ade80', strokeDasharray: '4 2', width: 1.8 },
};

export const getRelationshipCfg = (rel: string) =>
  RELATIONSHIP_CONFIG[rel] || {
    label: rel || 'CONNECTS',
    stroke: '#71717a',
    width: 1.5,
  };

export const CONFIDENCE_BADGES: Record<string, { label: string; text: string; bg: string; border: string }> = {
  deterministic: {
    label: 'Deterministic',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
  },
  high: {
    label: 'High Confidence',
    text: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
  },
  medium: {
    label: 'Inferred (Medium)',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
  },
  low: {
    label: 'Heuristic (Low)',
    text: 'text-zinc-400',
    bg: 'bg-zinc-500/10',
    border: 'border-zinc-500/30',
  },
};
