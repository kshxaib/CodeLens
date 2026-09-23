import { create } from 'zustand';
import type { UserProfile } from '../types';
import { api, API_BASE_URL } from '../api/client';

interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  loginWithGitHub: () => Promise<void>;
  handleCallback: (code: string) => Promise<UserProfile>;
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
      // If profile fails, check if we had a token, if not valid clear
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  loginWithGitHub: async () => {
    try {
      const data = await api.getGitHubOAuthUrl();
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('Failed to get GitHub OAuth URL from API, falling back to direct redirect', err);
    }
    window.location.href = `${API_BASE_URL}/auth/github?redirect=true`;
  },

  handleCallback: async (code: string) => {
    try {
      set({ loading: true, error: null });
      const data = await api.handleGitHubCallback(code);
      if (data.access_token) {
        localStorage.setItem('codelens_token', data.access_token);
      }
      set({ user: data.user, error: null });
      return data.user;
    } catch (err: any) {
      const msg = err.message || 'GitHub login failed';
      set({ error: msg, user: null });
      throw err;
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error', err);
    } finally {
      localStorage.removeItem('codelens_token');
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
