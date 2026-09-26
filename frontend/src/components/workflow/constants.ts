import type { WorkflowStepType, WorkflowTransitionType } from '../../types';

export interface StepTypeConfig {
  id: WorkflowStepType;
  label: string;
  sub: string;
  color: string;
  border: string;
  bg: string;
  dot: string;
  badgeBg: string;
}

export const STEP_TYPE_CONFIG: Record<WorkflowStepType, StepTypeConfig> = {
  start: {
    id: 'start',
    label: 'Start / Trigger',
    sub: 'Request Entrypoint / Event Trigger',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    dot: '#10b981',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  step: {
    id: 'step',
    label: 'Operation Step',
    sub: 'Service Logic & Execution',
    color: 'text-zinc-200',
    border: 'border-[#27272a]',
    bg: 'bg-[#121214]',
    dot: '#71717a',
    badgeBg: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/50',
  },
  decision: {
    id: 'decision',
    label: 'Decision Branch',
    sub: 'Conditional Branch & Validation',
    color: 'text-amber-400',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    dot: '#f59e0b',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  parallel: {
    id: 'parallel',
    label: 'Parallel Fork',
    sub: 'Concurrent Execution',
    color: 'text-cyan-400',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-500/10',
    dot: '#22d3ee',
    badgeBg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  failure: {
    id: 'failure',
    label: 'Failure Path',
    sub: 'Exception & Error Handler',
    color: 'text-rose-400',
    border: 'border-rose-500/50',
    bg: 'bg-rose-500/10',
    dot: '#f43f5e',
    badgeBg: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  retry: {
    id: 'retry',
    label: 'Retry Loop',
    sub: 'Transient Error Re-attempt',
    color: 'text-orange-400',
    border: 'border-orange-500/40',
    bg: 'bg-orange-500/10',
    dot: '#fb923c',
    badgeBg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
  external: {
    id: 'external',
    label: 'External Action',
    sub: 'Third-party API Integration',
    color: 'text-purple-400',
    border: 'border-purple-500/40',
    bg: 'bg-purple-500/10',
    dot: '#c084fc',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  },
  approval: {
    id: 'approval',
    label: 'Human Approval',
    sub: 'Manual Confirmation / Review',
    color: 'text-yellow-400',
    border: 'border-yellow-500/40',
    bg: 'bg-yellow-500/10',
    dot: '#eab308',
    badgeBg: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30',
  },
  async_op: {
    id: 'async_op',
    label: 'Async Operation',
    sub: 'Background Worker & Queue Task',
    color: 'text-sky-400',
    border: 'border-sky-500/40',
    bg: 'bg-sky-500/10',
    dot: '#38bdf8',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  end: {
    id: 'end',
    label: 'End / Complete',
    sub: 'Workflow Resolution / Return',
    color: 'text-emerald-400',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-500/10',
    dot: '#10b981',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
};

export const TRANSITION_CONFIG: Record<
  WorkflowTransitionType,
  { label: string; stroke: string; strokeDasharray?: string; animated?: boolean; width: number }
> = {
  normal: { label: 'next', stroke: '#71717a', width: 1.5 },
  success: { label: 'success', stroke: '#10b981', width: 2, animated: true },
  failure: { label: 'failure', stroke: '#f43f5e', strokeDasharray: '4 3', width: 2, animated: true },
  retry: { label: 'retry', stroke: '#fb923c', strokeDasharray: '4 4', width: 2, animated: true },
  async: { label: 'async dispatch', stroke: '#38bdf8', strokeDasharray: '5 3', width: 1.8, animated: true },
};

export const getStepTypeCfg = (type: WorkflowStepType): StepTypeConfig =>
  STEP_TYPE_CONFIG[type] || STEP_TYPE_CONFIG.step;

export const getTransitionCfg = (type: WorkflowTransitionType) =>
  TRANSITION_CONFIG[type] || TRANSITION_CONFIG.normal;
