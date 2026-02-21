import { create } from 'zustand';
import { api } from '../lib/api';
import { wsClient } from '../lib/websocket';

interface AuthState {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  login: (username: string, password: string) => Promise<boolean>;
  register: (username: string, password: string, displayName: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,
  isAuthenticated: false,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    const res = await api.login({ username, password });

    if (res.success && res.data) {
      api.setToken(res.data.token);
      wsClient.connect(res.data.token);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      return true;
    }

    set({ error: res.error || 'Ошибка входа', isLoading: false });
    return false;
  },

  register: async (username, password, displayName) => {
    set({ isLoading: true, error: null });
    const res = await api.register({ username, password, displayName });

    if (res.success && res.data) {
      api.setToken(res.data.token);
      wsClient.connect(res.data.token);
      set({ user: res.data.user, isAuthenticated: true, isLoading: false });
      return true;
    }

    set({ error: res.error || 'Ошибка регистрации', isLoading: false });
    return false;
  },

  logout: async () => {
    await api.logout();
    api.setToken(null);
    wsClient.disconnect();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = api.getToken();
    if (!token) {
      set({ isLoading: false });
      return;
    }

    const res = await api.getMe();
    if (res.success && res.data) {
      wsClient.connect(token);
      set({ user: res.data, isAuthenticated: true, isLoading: false });
    } else {
      api.setToken(null);
      set({ isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
