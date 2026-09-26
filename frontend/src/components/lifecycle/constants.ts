import type { StateType } from '../../types';

export interface StateTypeConfig {
  id: StateType;
  label: string;
  sub: string;
  color: string;
  border: string;
  bg: string;
  dot: string;
  badgeBg: string;
}

export const STATE_TYPE_CONFIG: Record<StateType, StateTypeConfig> = {
  initial: {
    id: 'initial',
    label: 'Initial State',
    sub: 'Entrypoint / Created State',
    color: 'text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    dot: '#38bdf8',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  intermediate: {
    id: 'intermediate',
    label: 'Active / Intermediate',
    sub: 'In-Progress Lifecycle Phase',
    color: 'text-indigo-400',
    border: 'border-indigo-500/40',
    bg: 'bg-indigo-500/10',
    dot: '#818cf8',
    badgeBg: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  },
  terminal_success: {
    id: 'terminal_success',
    label: 'Terminal (Success)',
    sub: 'Successful Completed Outcome',
    color: 'text-emerald-400',
    border: 'border-emerald-500/50',
    bg: 'bg-emerald-500/10',
    dot: '#34d399',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  terminal_failure: {
    id: 'terminal_failure',
    label: 'Terminal (Failure)',
    sub: 'Failed / Aborted / Rejected State',
    color: 'text-rose-400',
    border: 'border-rose-500/50',
    bg: 'bg-rose-500/10',
    dot: '#f43f5e',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
};

export const getStateTypeCfg = (type?: string): StateTypeConfig => {
  if (type && type in STATE_TYPE_CONFIG) {
    return STATE_TYPE_CONFIG[type as StateType];
  }
  return STATE_TYPE_CONFIG.intermediate;
};

export type LifecycleFilterType = 'all' | 'happy_path' | 'failures' | 'retries';

export const LIFECYCLE_FILTERS: { id: LifecycleFilterType; label: string; countKey?: string }[] = [
  { id: 'all', label: 'All Transitions' },
  { id: 'happy_path', label: 'Happy Path Only' },
  { id: 'failures', label: 'Failure States' },
  { id: 'retries', label: 'Retry Loops' },
];
