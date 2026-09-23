import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import { useAuthStore } from '../store/useAuthStore';

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const fetchRepositories = useWorkspaceStore((state) => state.fetchRepositories);

  useEffect(() => {
    if (user) {
      fetchRepositories();
    }
  }, [user, fetchRepositories]);

  return <>{children}</>;
};

export const useWorkspace = useWorkspaceStore;
