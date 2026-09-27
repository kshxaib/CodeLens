import { User, Monitor, Globe, FileCode2, Cpu, Database, Cloud, Layers, Zap } from 'lucide-react';
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
    dot: '#D97706',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    headerBorder: 'border-amber-300',
    lifelineColor: '#D9770633',
    glow: 'rgba(217, 119, 6, 0.15)',
  },
  client: {
    label: 'Client App',
    sub: 'Web Client',
    icon: Monitor,
    dot: '#9333ea',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
    headerBorder: 'border-purple-300',
    lifelineColor: '#9333ea33',
    glow: 'rgba(147, 51, 234, 0.15)',
  },
  api_gateway: {
    label: 'API Gateway',
    sub: 'Gateway Router',
    icon: Globe,
    dot: '#0284c7',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
    headerBorder: 'border-sky-300',
    lifelineColor: '#0284c733',
    glow: 'rgba(2, 132, 199, 0.15)',
  },
  controller: {
    label: 'Controller',
    sub: 'HTTP Handler',
    icon: FileCode2,
    dot: '#0891b2',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    headerBorder: 'border-cyan-300',
    lifelineColor: '#0891b233',
    glow: 'rgba(8, 145, 178, 0.15)',
  },
  service: {
    label: 'Domain Service',
    sub: 'Business Logic Core',
    icon: Cpu,
    dot: '#4f46e5',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    headerBorder: 'border-indigo-300',
    lifelineColor: '#4f46e533',
    glow: 'rgba(79, 70, 229, 0.15)',
  },
  database: {
    label: 'Database',
    sub: 'Persistent Data Store',
    icon: Database,
    dot: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    headerBorder: 'border-emerald-300',
    lifelineColor: '#05966933',
    glow: 'rgba(5, 150, 105, 0.15)',
  },
  external_service: {
    label: 'External Service',
    sub: 'Third-Party API',
    icon: Cloud,
    dot: '#e11d48',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
    headerBorder: 'border-rose-300',
    lifelineColor: '#e11d4833',
    glow: 'rgba(225, 29, 72, 0.15)',
  },
  queue: {
    label: 'Message Queue',
    sub: 'Event Bus',
    icon: Layers,
    dot: '#ea580c',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
    headerBorder: 'border-orange-300',
    lifelineColor: '#ea580c33',
    glow: 'rgba(234, 88, 12, 0.15)',
  },
  worker: {
    label: 'Background Worker',
    sub: 'Async Job Processor',
    icon: Zap,
    dot: '#ca8a04',
    badgeBg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    headerBorder: 'border-yellow-300',
    lifelineColor: '#ca8a0433',
    glow: 'rgba(202, 138, 4, 0.15)',
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
    color: '#0284c7',
    strokeDasharray: 'none',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  return: {
    label: 'Return Response',
    color: '#059669',
    strokeDasharray: '5,4',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  async_call: {
    label: 'Async Dispatch',
    color: '#D97706',
    strokeDasharray: '4,3',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  event_emit: {
    label: 'Event Publish',
    color: '#9333ea',
    strokeDasharray: '6,3',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  callback: {
    label: 'Callback',
    color: '#0891b2',
    strokeDasharray: 'none',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  error: {
    label: 'Error Response',
    color: '#e11d48',
    strokeDasharray: '4,4',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  retry: {
    label: 'Retry Loop',
    color: '#ea580c',
    strokeDasharray: '3,3',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  timeout: {
    label: 'Timeout',
    color: '#D97706',
    strokeDasharray: '2,2',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  self_call: {
    label: 'Internal Validation',
    color: '#4f46e5',
    strokeDasharray: 'none',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
};

export const getInteractionConfig = (type: InteractionType): InteractionConfig => {
  return INTERACTION_CONFIG[type] || INTERACTION_CONFIG.call;
};
