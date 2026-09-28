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
    color: 'text-sky-800',
    border: 'border-sky-300',
    bg: 'bg-sky-50',
    dot: '#0284c7',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  dto_schema: {
    id: 'dto_schema',
    label: 'Schema',
    sub: 'Typed Data Transfer Object',
    color: 'text-amber-800',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    dot: '#D97706',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  transformation_step: {
    id: 'transformation_step',
    label: 'Transformation',
    sub: 'Validation and Mapping',
    color: 'text-purple-800',
    border: 'border-purple-300',
    bg: 'bg-purple-50',
    dot: '#9333ea',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  database_model: {
    id: 'database_model',
    label: 'Database Entity',
    sub: 'Persisted Database Record',
    color: 'text-emerald-800',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    dot: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  response_payload: {
    id: 'response_payload',
    label: 'Response Payload',
    sub: 'HTTP Response Output',
    color: 'text-teal-800',
    border: 'border-teal-300',
    bg: 'bg-teal-50',
    dot: '#0d9488',
    badgeBg: 'bg-teal-50 text-teal-800 border-teal-200',
  },
  file_binary: {
    id: 'file_binary',
    label: 'Binary Asset',
    sub: 'File Upload Stream',
    color: 'text-rose-800',
    border: 'border-rose-300',
    bg: 'bg-rose-50',
    dot: '#e11d48',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  storage_object: {
    id: 'storage_object',
    label: 'Storage Object',
    sub: 'Cloud Object Storage',
    color: 'text-indigo-800',
    border: 'border-indigo-300',
    bg: 'bg-indigo-50',
    dot: '#4f46e5',
    badgeBg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  },
  queue_message: {
    id: 'queue_message',
    label: 'Event Queue',
    sub: 'Message Broker',
    color: 'text-orange-800',
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    dot: '#ea580c',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  token_secret: {
    id: 'token_secret',
    label: 'Security Token',
    sub: 'Authentication Credential',
    color: 'text-red-800',
    border: 'border-red-300',
    bg: 'bg-red-50',
    dot: '#dc2626',
    badgeBg: 'bg-red-50 text-red-800 border-red-200',
  },
  cache_entry: {
    id: 'cache_entry',
    label: 'Cache Entry',
    sub: 'In-Memory Cache Store',
    color: 'text-cyan-800',
    border: 'border-cyan-300',
    bg: 'bg-cyan-50',
    dot: '#0891b2',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
};

export function getDataClassificationCfg(type: string): DataClassificationConfig {
  const normalized = (type || 'request_payload').toLowerCase() as DataClassificationType;
  return DATA_CLASSIFICATION_CONFIG[normalized] || DATA_CLASSIFICATION_CONFIG.request_payload;
}

export const cleanDataNodeName = (name?: string | null): string => {
  if (!name) return '';
  if (name.includes(' / ')) {
    return name.split(' / ')[0].trim();
  }
  if (name.includes('/')) {
    return name.split('/')[0].trim();
  }
  return name;
};
