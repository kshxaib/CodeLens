import type { DataClassificationType } from '../../types';

export interface DataClassificationConfig {
  id: DataClassificationType;
  label: string;
  sub: string;
  color: string;
  border: string;
  bg: string;
  dot: string;
  badgeBg: string;
}

export const DATA_CLASSIFICATION_CONFIG: Record<DataClassificationType, DataClassificationConfig> = {
  request_payload: {
    id: 'request_payload',
    label: 'Request Payload',
    sub: 'Inbound Request Body',
    color: 'text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    dot: '#38bdf8',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  dto_schema: {
    id: 'dto_schema',
    label: 'Schema',
    sub: 'Typed Data Transfer Object',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    dot: '#f59e0b',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  transformation_step: {
    id: 'transformation_step',
    label: 'Transformation',
    sub: 'Validation and Mapping',
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    dot: '#c084fc',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  database_model: {
    id: 'database_model',
    label: 'Database Entity',
    sub: 'Persisted Database Record',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    dot: '#10b981',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  response_payload: {
    id: 'response_payload',
    label: 'Response Payload',
    sub: 'HTTP Response Output',
    color: 'text-teal-400',
    border: 'border-teal-500/40',
    bg: 'bg-teal-500/10',
    dot: '#14b8a6',
    badgeBg: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
  file_binary: {
    id: 'file_binary',
    label: 'Binary Asset',
    sub: 'File Upload Stream',
    color: 'text-rose-400',
    border: 'border-rose-500/40',
    bg: 'bg-rose-500/10',
    dot: '#f43f5e',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  storage_object: {
    id: 'storage_object',
    label: 'Storage Object',
    sub: 'Cloud Object Storage',
    color: 'text-indigo-400',
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-500/10',
    dot: '#818cf8',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  queue_message: {
    id: 'queue_message',
    label: 'Event Queue',
    sub: 'Message Broker',
    color: 'text-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    dot: '#fb923c',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  token_secret: {
    id: 'token_secret',
    label: 'Security Token',
    sub: 'Authentication Credential',
    color: 'text-red-400',
    border: 'border-red-500/40',
    bg: 'bg-red-500/10',
    dot: '#ef4444',
    badgeBg: 'bg-red-500/15 text-red-300 border-red-500/30',
  },
  cache_entry: {
    id: 'cache_entry',
    label: 'Cache Entry',
    sub: 'In-Memory Cache Store',
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10',
    dot: '#06b6d4',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
};

export function getDataClassificationCfg(type: string): DataClassificationConfig {
  const normalized = (type || 'request_payload').toLowerCase() as DataClassificationType;
  return DATA_CLASSIFICATION_CONFIG[normalized] || DATA_CLASSIFICATION_CONFIG.request_payload;
}
