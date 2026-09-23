import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { RepositoryItem } from '../types';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  repositories: RepositoryItem[];
  selectedRepo: RepositoryItem | null;
  loading: boolean;
  error: string | null;
  setSelectedRepo: (repo: RepositoryItem | null) => void;
  fetchRepositories: () => Promise<void>;
  addRepository: (url: string) => Promise<RepositoryItem>;
  triggerIndexing: (repoId: number) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [repositories, setRepositories] = useState<RepositoryItem[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<RepositoryItem | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepositories = async () => {
    if (!user) {
      setRepositories([]);
      setSelectedRepo(null);
      return;
    }
    try {
      setLoading(true);
      const data = await api.getRepositories();
      setRepositories(data.repositories);
      if (selectedRepo) {
        const updated = data.repositories.find((r) => r.id === selectedRepo.id);
        if (updated) setSelectedRepo(updated);
      }
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRepositories();
  }, [user]);

  const addRepository = async (url: string): Promise<RepositoryItem> => {
    const newRepo = await api.addRepository(url);
    await fetchRepositories();
    return newRepo;
  };

  const triggerIndexing = async (repoId: number) => {
    await api.indexRepository(repoId);
    await fetchRepositories();
  };

  return (
    <WorkspaceContext.Provider
      value={{
        repositories,
        selectedRepo,
        loading,
        error,
        setSelectedRepo,
        fetchRepositories,
        addRepository,
        triggerIndexing,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
