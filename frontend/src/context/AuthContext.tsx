import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserProfile } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  loginWithGitHub: () => void;
  logout: () => Promise<void>;
  updateGeminiKey: (apiKey: string) => Promise<UserProfile>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      setLoading(true);
      const profile = await api.getUserProfile();
      setUser(profile);
      setError(null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginWithGitHub = () => {
    window.location.href = '/api/auth/github';
  };

  const logout = async () => {
    try {
      await api.logout();
      setUser(null);
      window.location.href = '/login';
    } catch {
      setUser(null);
      window.location.href = '/login';
    }
  };

  const updateGeminiKey = async (apiKey: string): Promise<UserProfile> => {
    const updated = await api.updateGeminiKey(apiKey);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        loginWithGitHub,
        logout,
        updateGeminiKey,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
