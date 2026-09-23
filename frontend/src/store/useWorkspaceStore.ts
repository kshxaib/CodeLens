import { create } from 'zustand';
import type { RepositoryItem } from '../types';
import { api } from '../api/client';

interface WorkspaceState {
  repositories: RepositoryItem[];
  selectedRepo: RepositoryItem | null;
  loading: boolean;
  error: string | null;
  setSelectedRepo: (repo: RepositoryItem | null) => void;
  fetchRepositories: () => Promise<void>;
  addRepository: (url: string) => Promise<RepositoryItem>;
  triggerIndexing: (repoId: number) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  repositories: [],
  selectedRepo: null,
  loading: false,
  error: null,

  setSelectedRepo: (repo) => set({ selectedRepo: repo }),

  fetchRepositories: async () => {
    try {
      set({ loading: true });
      const data = await api.getRepositories();
      const currentSelected = get().selectedRepo;
      let updatedSelected = currentSelected;

      if (currentSelected) {
        updatedSelected = data.repositories.find((r) => r.id === currentSelected.id) || null;
      } else if (data.repositories.length > 0) {
        updatedSelected = data.repositories[0];
      }

      set({
        repositories: data.repositories,
        selectedRepo: updatedSelected,
        error: null,
      });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch repositories' });
    } finally {
      set({ loading: false });
    }
  },

  addRepository: async (url: string) => {
    const newRepo = await api.addRepository(url);
    await get().fetchRepositories();
    return newRepo;
  },

  triggerIndexing: async (repoId: number) => {
    await api.indexRepository(repoId);
    await get().fetchRepositories();
  },
}));

// Compatibility Hook export
export const useWorkspace = useWorkspaceStore;
