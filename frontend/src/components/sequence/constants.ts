import {
  User,
  Monitor,
  Globe,
  FileCode2,
  Cpu,
  Database,
  Cloud,
  Layers,
  Zap,
} from 'lucide-react';
import type { ParticipantType, InteractionType } from '../../types';

export interface ParticipantConfig {
  label: string;
  sub: string;
  icon: any;
  dot: string;
  badgeBg: string;
  headerBorder: string;
  lifelineColor: string;
  glow: string;
}

export const PARTICIPANT_CONFIG: Record<ParticipantType, ParticipantConfig> = {
  actor: {
    label: 'Actor',
    sub: 'Request Initiator',
    icon: User,
    dot: '#f59e0b',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    headerBorder: 'border-amber-500/40',
    lifelineColor: '#f59e0b33',
    glow: 'rgba(245, 158, 11, 0.25)',
  },
  client: {
    label: 'Client App',
    sub: 'Web Client',
    icon: Monitor,
    dot: '#a855f7',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    headerBorder: 'border-purple-500/40',
    lifelineColor: '#a855f733',
    glow: 'rgba(168, 85, 247, 0.25)',
  },
  api_gateway: {
    label: 'API Gateway',
    sub: 'Gateway Router',
    icon: Globe,
    dot: '#0284c7',
    badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    headerBorder: 'border-sky-500/40',
    lifelineColor: '#0284c733',
    glow: 'rgba(2, 132, 199, 0.25)',
  },
  controller: {
    label: 'Controller',
    sub: 'HTTP Handler',
    icon: FileCode2,
    dot: '#06b6d4',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
    headerBorder: 'border-cyan-500/40',
    lifelineColor: '#06b6d433',
    glow: 'rgba(6, 182, 212, 0.25)',
  },
  service: {
    label: 'Domain Service',
    sub: 'Business Logic Core',
    icon: Cpu,
    dot: '#c084fc',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
    headerBorder: 'border-purple-500/40',
    lifelineColor: '#c084fc33',
    glow: 'rgba(192, 132, 252, 0.25)',
  },
  database: {
    label: 'Database',
    sub: 'Persistent Data Store',
    icon: Database,
    dot: '#10b981',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    headerBorder: 'border-emerald-500/40',
    lifelineColor: '#10b98133',
    glow: 'rgba(16, 185, 129, 0.25)',
  },
  external_service: {
    label: 'External Service',
    sub: 'Third-Party API',
    icon: Cloud,
    dot: '#ec4899',
    badgeBg: 'bg-pink-500/10 text-pink-300 border-pink-500/30',
    headerBorder: 'border-pink-500/40',
    lifelineColor: '#ec489933',
    glow: 'rgba(236, 72, 153, 0.25)',
  },
  queue: {
    label: 'Message Queue',
    sub: 'Event Bus',
    icon: Layers,
    dot: '#f97316',
    badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
    headerBorder: 'border-orange-500/40',
    lifelineColor: '#f9731633',
    glow: 'rgba(249, 115, 22, 0.25)',
  },
  worker: {
    label: 'Background Worker',
    sub: 'Async Job Processor',
    icon: Zap,
    dot: '#eab308',
    badgeBg: 'bg-yellow-500/10 text-yellow-300 border-yellow-500/30',
    headerBorder: 'border-yellow-500/40',
    lifelineColor: '#eab30833',
    glow: 'rgba(234, 179, 8, 0.25)',
  },
};

export const getParticipantConfig = (type: ParticipantType): ParticipantConfig => {
  return PARTICIPANT_CONFIG[type] || PARTICIPANT_CONFIG.service;
};

export interface InteractionConfig {
  label: string;
  color: string;
  strokeDasharray?: string;
  badgeBg: string;
}

export const INTERACTION_CONFIG: Record<InteractionType, InteractionConfig> = {
  call: {
    label: 'Sync Request',
    color: '#38bdf8',
    strokeDasharray: 'none',
    badgeBg: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  return: {
    label: 'Return Response',
    color: '#34d399',
    strokeDasharray: '5,4',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  async_call: {
    label: 'Async Dispatch',
    color: '#f59e0b',
    strokeDasharray: '4,3',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  event_emit: {
    label: 'Event Publish',
    color: '#c084fc',
    strokeDasharray: '6,3',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
  callback: {
    label: 'Callback',
    color: '#06b6d4',
    strokeDasharray: 'none',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  },
  error: {
    label: 'Error Response',
    color: '#f43f5e',
    strokeDasharray: '4,4',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  retry: {
    label: 'Retry Loop',
    color: '#fb923c',
    strokeDasharray: '3,3',
    badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  },
  timeout: {
    label: 'Timeout',
    color: '#f59e0b',
    strokeDasharray: '2,2',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  self_call: {
    label: 'Internal Validation',
    color: '#a855f7',
    strokeDasharray: 'none',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
};

export const getInteractionConfig = (type: InteractionType): InteractionConfig => {
  return INTERACTION_CONFIG[type] || INTERACTION_CONFIG.call;
};
