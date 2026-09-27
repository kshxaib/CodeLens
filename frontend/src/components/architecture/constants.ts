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
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: '#D97706',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    order: 0,
  },
  api_gateway: {
    id: 'api_gateway',
    label: 'API Gateway',
    sub: 'HTTP Endpoints, Routes, Controllers',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    dot: '#1D4ED8',
    badgeBg: 'bg-blue-50 text-blue-800 border-blue-200',
    order: 1,
  },
  application: {
    id: 'application',
    label: 'Service',
    sub: 'Business Services, Handlers, Workers',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    order: 2,
  },
  domain: {
    id: 'domain',
    label: 'Data & Domain',
    sub: 'Models, Entities, Schemas, Repositories',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    dot: '#4338CA',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    order: 3,
  },
  infrastructure: {
    id: 'infrastructure',
    label: 'Infrastructure',
    sub: 'Databases, Queues, Storage, Caches',
    color: 'text-purple-700',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    dot: '#7E22CE',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    order: 4,
  },
  external: {
    id: 'external',
    label: 'External',
    sub: 'Third-party APIs, CDNs, External Gateways',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    dot: '#DC2626',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    order: 5,
  },
};

export type ArchifySemanticKind = 'backend' | 'database' | 'cloud' | 'security' | 'messagebus' | 'external';

export interface ArchifySemanticConfig {
  kind: ArchifySemanticKind;
  label: string;
  fill: string;
  stroke: string;
  strokeFocus: string;
  textPrimary: string;
  textMuted: string;
  sigilColor: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
}

export const ARCHIFY_SEMANTICS: Record<ArchifySemanticKind, ArchifySemanticConfig> = {
  backend: {
    kind: 'backend',
    label: 'Backend',
    fill: 'rgba(4, 120, 87, 0.08)',
    stroke: '#10B981',
    strokeFocus: '#059669',
    textPrimary: '#064E3B',
    textMuted: '#047857',
    sigilColor: '#059669',
    badgeBg: 'bg-emerald-50',
    badgeBorder: 'border-emerald-200',
    badgeText: 'text-emerald-800',
  },
  database: {
    kind: 'database',
    label: 'Database',
    fill: 'rgba(109, 40, 217, 0.08)',
    stroke: '#8B5CF6',
    strokeFocus: '#7C3AED',
    textPrimary: '#4C1D95',
    textMuted: '#6D28D9',
    sigilColor: '#7C3AED',
    badgeBg: 'bg-purple-50',
    badgeBorder: 'border-purple-200',
    badgeText: 'text-purple-800',
  },
  cloud: {
    kind: 'cloud',
    label: 'Cloud',
    fill: 'rgba(180, 83, 9, 0.09)',
    stroke: '#F59E0B',
    strokeFocus: '#D97706',
    textPrimary: '#78350F',
    textMuted: '#B45309',
    sigilColor: '#D97706',
    badgeBg: 'bg-amber-50',
    badgeBorder: 'border-amber-200',
    badgeText: 'text-amber-800',
  },
  security: {
    kind: 'security',
    label: 'Security',
    fill: 'rgba(190, 18, 60, 0.08)',
    stroke: '#FB7185',
    strokeFocus: '#E11D48',
    textPrimary: '#881337',
    textMuted: '#BE123C',
    sigilColor: '#E11D48',
    badgeBg: 'bg-rose-50',
    badgeBorder: 'border-rose-200',
    badgeText: 'text-rose-800',
  },
  messagebus: {
    kind: 'messagebus',
    label: 'Message bus',
    fill: 'rgba(194, 65, 12, 0.08)',
    stroke: '#FB923C',
    strokeFocus: '#EA580C',
    textPrimary: '#7C2D12',
    textMuted: '#C2410C',
    sigilColor: '#EA580C',
    badgeBg: 'bg-orange-50',
    badgeBorder: 'border-orange-200',
    badgeText: 'text-orange-800',
  },
  external: {
    kind: 'external',
    label: 'External',
    fill: 'rgba(71, 85, 105, 0.08)',
    stroke: '#94A3B8',
    strokeFocus: '#475569',
    textPrimary: '#1E293B',
    textMuted: '#475569',
    sigilColor: '#475569',
    badgeBg: 'bg-slate-50',
    badgeBorder: 'border-slate-200',
    badgeText: 'text-slate-800',
  },
};

export const getArchifySemantic = (
  type?: string,
  layer?: string,
  name?: string
): ArchifySemanticConfig => {
  const t = (type || '').toLowerCase();
  const l = (layer || '').toLowerCase();
  const n = (name || '').toLowerCase();

  if (
    t.includes('auth') ||
    t.includes('security') ||
    n.includes('auth') ||
    n.includes('jwt') ||
    n.includes('security') ||
    n.includes('firewall')
  ) {
    return ARCHIFY_SEMANTICS.security;
  }

  if (
    t.includes('queue') ||
    t.includes('message') ||
    t.includes('event') ||
    t.includes('bus') ||
    n.includes('queue') ||
    n.includes('sqs') ||
    n.includes('kafka') ||
    n.includes('rabbit') ||
    n.includes('celery')
  ) {
    return ARCHIFY_SEMANTICS.messagebus;
  }

  if (
    t === 'database' ||
    t === 'database_model' ||
    t.includes('cache') ||
    l === 'domain' ||
    n.includes('redis') ||
    n.includes('postgres') ||
    n.includes('mysql') ||
    n.includes('mongo') ||
    n.includes('db') ||
    n.includes('table')
  ) {
    return ARCHIFY_SEMANTICS.database;
  }

  if (
    t === 'storage' ||
    t === 'external_service' ||
    n.includes('s3') ||
    n.includes('cdn') ||
    n.includes('cloudfront') ||
    n.includes('load_balancer') ||
    n.includes('alb') ||
    n.includes('gateway')
  ) {
    return ARCHIFY_SEMANTICS.cloud;
  }

  if (
    t === 'component' ||
    t === 'presentation' ||
    l === 'presentation' ||
    n.includes('user') ||
    n.includes('browser') ||
    n.includes('client') ||
    n.includes('page')
  ) {
    return ARCHIFY_SEMANTICS.external;
  }

  return ARCHIFY_SEMANTICS.backend;
};

export const ARCHIFY_ARCHETYPES = [
  {
    code: 'T·01',
    id: 'architecture',
    label: 'Architecture',
    summary: 'System components, cloud resources, databases, caches, services, security boundaries, and connections between them.',
    topics: ['Microservices topology', 'AWS / Cloud infra', 'Security boundaries', 'Service mesh'],
  },
  {
    code: 'T·02',
    id: 'workflow',
    label: 'Workflow',
    summary: 'Swim-lane processes with semantic nodes and anchored edges — approval gates, async branches, and observability paths.',
    topics: ['Execution lanes', 'Approval gates', 'Async workers', 'Branching logic'],
  },
  {
    code: 'T·03',
    id: 'sequence',
    label: 'Sequence',
    summary: 'API call chains, request lifecycles, cache fallback paths, auth checks — who calls whom, in what order, and what returns.',
    topics: ['Request lifecycles', 'Cache fallbacks', 'Auth validation', 'Async traces'],
  },
  {
    code: 'T·04',
    id: 'dataflow',
    label: 'Data Flow',
    summary: 'Data pipelines, ETL/ELT, analytics events, warehouse sync, lineage, and downstream consumers with governance boundaries.',
    topics: ['Pipeline lineage', 'Event streaming', 'Warehouse sync', 'Transformation steps'],
  },
  {
    code: 'T·05',
    id: 'lifecycle',
    label: 'Lifecycle',
    summary: 'State machines, object lifecycles, run/order/deployment status transitions — with wait states, retries, and terminal outcomes.',
    topics: ['State machines', 'Status transitions', 'Retry policies', 'Terminal outcomes'],
  },
] as const;

export const getNodeTier = (type: ArchNodeType, layer?: ArchLayerType): string => {
  if (type === 'external_service') return 'external';
  if (type === 'database' || type === 'queue' || type === 'storage') return 'infrastructure';
  if (type === 'database_model') return 'domain';
  if (type === 'service' || type === 'worker') return 'application';
  if (type === 'api_endpoint') return 'api_gateway';
  if (type === 'component') return 'presentation';
  if (type === 'application') return 'api_gateway';

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
  CALLS: { label: 'CALLS', stroke: '#1D4ED8', animated: true, width: 2 },
  IMPORTS: { label: 'IMPORTS', stroke: '#94A3B8', width: 1.5 },
  DEPENDS_ON: { label: 'DEPENDS_ON', stroke: '#D97706', strokeDasharray: '4 4', width: 1.5 },
  EXPOSES: { label: 'EXPOSES', stroke: '#059669', animated: true, width: 2 },
  CONSUMES: { label: 'CONSUMES', stroke: '#7E22CE', strokeDasharray: '5 3', animated: true, width: 2 },
  READS: { label: 'READS', stroke: '#0D9488', width: 1.8 },
  WRITES: { label: 'WRITES', stroke: '#B45309', width: 2 },
  PERSISTS: { label: 'PERSISTS', stroke: '#6D28D9', width: 2 },
  AUTHENTICATES: { label: 'AUTHENTICATES', stroke: '#B45309', width: 2 },
  EMITS: { label: 'EMITS', stroke: '#DB2777', strokeDasharray: '4 4', animated: true, width: 1.8 },
  LISTENS: { label: 'LISTENS', stroke: '#4338CA', strokeDasharray: '4 4', width: 1.8 },
  TRIGGERS: { label: 'TRIGGERS', stroke: '#DC2626', animated: true, width: 2 },
  TRANSFORMS: { label: 'TRANSFORMS', stroke: '#0284C7', strokeDasharray: '3 3', width: 1.8 },
  CONTAINS: { label: 'CONTAINS', stroke: '#94A3B8', strokeDasharray: '2 2', width: 1.2 },
  IMPLEMENTS: { label: 'IMPLEMENTS', stroke: '#059669', strokeDasharray: '4 2', width: 1.8 },
};

export const getRelationshipCfg = (rel: string) =>
  RELATIONSHIP_CONFIG[rel] || {
    label: rel || 'CONNECTS',
    stroke: '#94A3B8',
    width: 1.5,
  };

export const CONFIDENCE_BADGES: Record<string, { label: string; text: string; bg: string; border: string }> = {
  deterministic: {
    label: 'Deterministic',
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
  high: {
    label: 'High Confidence',
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  medium: {
    label: 'Inferred (Medium)',
    text: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  low: {
    label: 'Heuristic (Low)',
    text: 'text-slate-600',
    bg: 'bg-slate-100',
    border: 'border-slate-200',
  },
};
