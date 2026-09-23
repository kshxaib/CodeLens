import { create } from 'zustand';
import type { UserProfile } from '../types';
import { api, API_BASE_URL } from '../api/client';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  loginWithGitHub: () => void;
  logout: () => Promise<void>;
  updateGeminiKey: (apiKey: string) => Promise<UserProfile>;
  refreshUser: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),

  refreshUser: async () => {
    try {
      set({ loading: true });
      const profile = await api.getUserProfile();
      set({ user: profile, error: null });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  loginWithGitHub: () => {
    window.location.href = `${API_BASE_URL}/auth/github`;
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      set({ user: null });
      window.location.href = '/login';
    }
  },

  updateGeminiKey: async (apiKey: string) => {
    const updated = await api.updateGeminiKey(apiKey);
    set({ user: updated });
    return updated;
  },
}));

// Compatibility Hook export
export const useAuth = useAuthStore;
