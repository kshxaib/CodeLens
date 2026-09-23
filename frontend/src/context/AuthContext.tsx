import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const refreshUser = useAuthStore((state) => state.refreshUser);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return <>{children}</>;
};

export const useAuth = useAuthStore;
