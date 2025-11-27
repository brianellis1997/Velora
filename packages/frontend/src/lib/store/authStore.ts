import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  userId: string;
  email: string;
  username: string;
  subscriptionTier: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  idToken: string | null;
  refreshToken: string | null;
  setUser: (user: User) => void;
  setTokens: (tokens: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
  }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      idToken: null,
      refreshToken: null,
      setUser: (user) => set({ user }),
      setTokens: (tokens) =>
        set({
          accessToken: tokens.accessToken,
          idToken: tokens.idToken,
          refreshToken: tokens.refreshToken,
        }),
      logout: () =>
        set({
          user: null,
          accessToken: null,
          idToken: null,
          refreshToken: null,
        }),
    }),
    {
      name: 'velora-auth',
    }
  )
);
