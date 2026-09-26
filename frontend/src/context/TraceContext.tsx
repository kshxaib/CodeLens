import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  useTraceStore,
  type TraceState,
  type ViewNodeItem,
} from '../store/useTraceStore';

export type { ViewNodeItem };
export type TraceContextType = TraceState;

export const TraceProvider: React.FC<{
  repositoryId: number;
  currentView: 'architecture' | 'workflow' | 'sequence' | 'dataflow' | 'lifecycle';
  children: ReactNode;
}> = ({ repositoryId, currentView, children }) => {
  useEffect(() => {
    useTraceStore.getState().initTraceView(repositoryId, currentView);
  }, [repositoryId, currentView]);

  return <>{children}</>;
};

// Hook alias to Zustand store for seamless backward compatibility
export const useTrace = useTraceStore;
