import { create } from 'zustand';
import type { RepositoryItem } from '../types';
import { api } from '../api/client';

interface WorkspaceState {
  repositories: RepositoryItem[];
  selectedRepo: RepositoryItem | null;
  loading: boolean;
  error: string | null;
  setSelectedRepo: (repo: RepositoryItem | null) => void;
  fetchRepositories: (silent?: boolean) => Promise<void>;
  addRepository: (url: string) => Promise<RepositoryItem>;
  triggerIndexing: (repoId: number) => Promise<void>;
}

let indexingPollTimer: ReturnType<typeof setInterval> | null = null;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  repositories: [],
  selectedRepo: null,
  loading: false,
  error: null,

  setSelectedRepo: (repo) => set({ selectedRepo: repo }),

  fetchRepositories: async (silent = false) => {
    try {
      if (!silent) set({ loading: true });
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
      if (!silent) set({ error: err.message || 'Failed to fetch repositories' });
    } finally {
      if (!silent) set({ loading: false });
    }
  },

  addRepository: async (url: string) => {
    const newRepo = await api.addRepository(url);
    await get().fetchRepositories();
    return newRepo;
  },

  triggerIndexing: async (repoId: number) => {
    // 1. Optimistically set repository status to 'indexing'
    set((state) => ({
      repositories: state.repositories.map((r) =>
        r.id === repoId ? { ...r, index_status: 'indexing' } : r
      ),
    }));

    try {
      await api.indexRepository(repoId);
    } catch (err) {
      // Revert if API call itself failed
      await get().fetchRepositories(true);
      throw err;
    }

    // 2. Clear any existing active poll
    if (indexingPollTimer) {
      clearInterval(indexingPollTimer);
      indexingPollTimer = null;
    }

    // 3. Smart poll every 2.5s until repo is finished indexing
    let pollCount = 0;
    indexingPollTimer = setInterval(async () => {
      pollCount++;
      await get().fetchRepositories(true);
      const current = get().repositories.find((r) => r.id === repoId);

      // Stop polling when indexing completes or after 50 attempts (~2 minutes)
      if (!current || current.index_status !== 'indexing' || pollCount > 50) {
        if (indexingPollTimer) {
          clearInterval(indexingPollTimer);
          indexingPollTimer = null;
        }
      }
    }, 2500);
  },
}));

// Compatibility Hook export
export const useWorkspace = useWorkspaceStore;
