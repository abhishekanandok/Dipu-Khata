import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../services/api';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  isActive: boolean;
  createdAt: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  clearError: () => void;
  setUser: (user: UserProfile) => void;
  setTokens: (token: string, refreshToken: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  setUser: (user: UserProfile) => set({ user }),

  setTokens: async (token: string, refreshToken: string) => {
    try {
      await SecureStore.setItemAsync('auth_token', token);
      await SecureStore.setItemAsync('refresh_token', refreshToken);
    } catch {
      // Ignore secure storage failure in web/emulator
    }
    set({ token, refreshToken, isAuthenticated: true });
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/login', { email, password });
      const { user, tokens } = response.data.data;

      await get().setTokens(tokens.accessToken, tokens.refreshToken);
      try {
        await SecureStore.setItemAsync('user_profile', JSON.stringify(user));
      } catch {}

      set({
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Login failed. Please check your credentials.';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.post('/auth/register', { name, email, password });
      const { user, tokens } = response.data.data;

      await get().setTokens(tokens.accessToken, tokens.refreshToken);
      try {
        await SecureStore.setItemAsync('user_profile', JSON.stringify(user));
      } catch {}

      set({
        user: {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error?.message ||
        err.message ||
        'Registration failed. Please try again.';
      set({ error: errorMessage, isLoading: false });
      throw new Error(errorMessage);
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Continue client cleanup even if network request fails
    } finally {
      try {
        await SecureStore.deleteItemAsync('auth_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_profile');
      } catch {}

      set({
        user: null,
        token: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    }
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const refreshToken = await SecureStore.getItemAsync('refresh_token');
      const cachedUser = await SecureStore.getItemAsync('user_profile');

      if (!token || !refreshToken) {
        set({ isAuthenticated: false, isLoading: false, user: null });
        return false;
      }

      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          set({ user: parsed });
        } catch {}
      }

      set({ token, refreshToken, isAuthenticated: true });

      // Verify token with backend
      try {
        const response = await apiClient.get('/auth/me');
        const user = response.data.data;
        const profile: UserProfile = {
          id: user._id || user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
        };
        set({ user: profile, isAuthenticated: true, isLoading: false });
        return true;
      } catch {
        // Token might need refresh or is expired
        return get().isAuthenticated;
      }
    } catch {
      set({ isAuthenticated: false, isLoading: false, user: null });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));
