import { create } from 'zustand';
import apiClient from '@/api/client';
import { getSession, setSession, clearSession } from '@/store/session';

interface AuthState {
  /** Whether the current user has a valid session. Read by the auth gate in app/_layout.tsx. */
  authed: boolean;
  /** True once the initial startup auth check has finished (controls the launch spinner). */
  ready: boolean;
  /** Run once at app launch: read any stored session token and validate it with the backend. */
  bootstrap: () => Promise<void>;
  /** Call after a successful Dexcom login: persist the session token and flip the gate to signed-in. */
  signIn: (token: string) => Promise<void>;
  /** Call on logout: clear the stored session token and flip the gate to signed-out. */
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  authed: false,
  ready: false,

  bootstrap: async () => {
    const token = await getSession();
    if (!token) {
      set({ authed: false, ready: true });
      return;
    }
    try {
      const { data } = await apiClient.get('/api/auth/validate');
      set({ authed: data.valid === true, ready: true });
    } catch {
      // Network/server error on startup — treat as signed out rather than blocking the app.
      set({ authed: false, ready: true });
    }
  },

  signIn: async (token: string) => {
    await setSession(token);
    set({ authed: true });
  },

  signOut: async () => {
    await clearSession();
    set({ authed: false });
  },
}));
