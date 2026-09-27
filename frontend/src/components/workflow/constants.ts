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
    label: 'Start',
    sub: 'Request Entrypoint',
    color: 'text-emerald-700',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    dot: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
  step: {
    id: 'step',
    label: 'Operation Step',
    sub: 'Service Logic & Execution',
    color: 'text-[#19243B]',
    border: 'border-[#E2E0D9]',
    bg: 'bg-white',
    dot: '#687184',
    badgeBg: 'bg-[#F0EEE9] text-[#526078] border-[#E2E0D9]',
  },
  decision: {
    id: 'decision',
    label: 'Decision Branch',
    sub: 'Conditional Branch & Validation',
    color: 'text-amber-800',
    border: 'border-amber-300',
    bg: 'bg-amber-50',
    dot: '#D97706',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  parallel: {
    id: 'parallel',
    label: 'Parallel Fork',
    sub: 'Concurrent Execution',
    color: 'text-cyan-800',
    border: 'border-cyan-300',
    bg: 'bg-cyan-50',
    dot: '#0891b2',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  },
  failure: {
    id: 'failure',
    label: 'Failure Path',
    sub: 'Exception & Error Handler',
    color: 'text-rose-800',
    border: 'border-rose-300',
    bg: 'bg-rose-50',
    dot: '#e11d48',
    badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
  },
  retry: {
    id: 'retry',
    label: 'Retry Loop',
    sub: 'Transient Error Re-attempt',
    color: 'text-orange-800',
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    dot: '#ea580c',
    badgeBg: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  external: {
    id: 'external',
    label: 'External Action',
    sub: 'Third-party API Integration',
    color: 'text-purple-800',
    border: 'border-purple-300',
    bg: 'bg-purple-50',
    dot: '#9333ea',
    badgeBg: 'bg-purple-50 text-purple-800 border-purple-200',
  },
  approval: {
    id: 'approval',
    label: 'Human Approval',
    sub: 'Manual Confirmation',
    color: 'text-yellow-800',
    border: 'border-yellow-400',
    bg: 'bg-yellow-50',
    dot: '#ca8a04',
    badgeBg: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  },
  async_op: {
    id: 'async_op',
    label: 'Async Operation',
    sub: 'Background Worker & Queue Task',
    color: 'text-sky-800',
    border: 'border-sky-300',
    bg: 'bg-sky-50',
    dot: '#0284c7',
    badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
  },
  end: {
    id: 'end',
    label: 'Complete',
    sub: 'Workflow Resolution',
    color: 'text-emerald-800',
    border: 'border-emerald-300',
    bg: 'bg-emerald-50',
    dot: '#059669',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  },
};

export const TRANSITION_CONFIG: Record<
  WorkflowTransitionType,
  { label: string; stroke: string; strokeDasharray?: string; animated?: boolean; width: number }
> = {
  normal: { label: 'next', stroke: '#A3A29E', width: 1.5 },
  success: { label: 'success', stroke: '#059669', width: 2, animated: true },
  failure: { label: 'failure', stroke: '#E11D48', strokeDasharray: '4 3', width: 2, animated: true },
  retry: { label: 'retry', stroke: '#EA580C', strokeDasharray: '4 4', width: 2, animated: true },
  async: { label: 'async dispatch', stroke: '#0284C7', strokeDasharray: '5 3', width: 1.8, animated: true },
};

export const getStepTypeCfg = (type: WorkflowStepType): StepTypeConfig =>
  STEP_TYPE_CONFIG[type] || STEP_TYPE_CONFIG.step;

export const getTransitionCfg = (type: WorkflowTransitionType) =>
  TRANSITION_CONFIG[type] || TRANSITION_CONFIG.normal;
