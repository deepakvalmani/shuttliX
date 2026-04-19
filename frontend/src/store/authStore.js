/**
 * store/authStore.js  v2.0
 * – Persisted across page reloads (zustand persist)
 * – Optimistic UI updates
 * – Token storage abstracted (easy to swap to httpOnly cookies later)
 */
import { create } from 'zustand';
import { persist }  from 'zustand/middleware';
import api from '../services/api';

// ── Token helpers ─────────────────────────────────────────
const setTokens = (access, refresh) => {
  localStorage.setItem('accessToken', access);
  localStorage.setItem('refreshToken', refresh);
};
const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// ── Store ─────────────────────────────────────────────────
const useAuthStore = create(
  persist(
    (set, get) => ({
      user:            null,
      isAuthenticated: false,
      isLoading:       true,
      error:           null,

      // ── Init: re-hydrate from stored token ──────────────
      init: async () => {
        const token = localStorage.getItem('accessToken');
        if (!token) { set({ isLoading: false }); return; }
        try {
          const { data } = await api.get('/auth/me');
          set({ user: data.user, isAuthenticated: true, isLoading: false, error: null });
        } catch {
          clearTokens();
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      // ── Login ──────────────────────────────────────────
      login: async (email, password, organizationCode = '') => {
        set({ error: null });
        const { data } = await api.post('/auth/login', { email, password, organizationCode });
        setTokens(data.accessToken, data.refreshToken);
        set({ user: data.user, isAuthenticated: true });
        return data.user;
      },

      // ── Register ───────────────────────────────────────
      register: async payload => {
        set({ error: null });
        const { data } = await api.post('/auth/register', payload);
        setTokens(data.accessToken, data.refreshToken);
        set({ user: data.user, isAuthenticated: true });
        return data.user;
      },

      // ── Admin register ─────────────────────────────────
      adminRegister: async payload => {
        set({ error: null });
        const { data } = await api.post('/auth/admin-register', payload);
        setTokens(data.accessToken, data.refreshToken);
        set({ user: data.user, isAuthenticated: true });
        return data.user;
      },

      // ── Logout ─────────────────────────────────────────
      logout: async () => {
        try { await api.post('/auth/logout'); } catch {}
        clearTokens();
        set({ user: null, isAuthenticated: false, error: null });
      },

      // ── Update local user state ────────────────────────
      updateUser: updates =>
        set(s => ({ user: s.user ? { ...s.user, ...updates } : s.user })),

      // ── Helpers ────────────────────────────────────────
      isAdmin:       () => ['admin', 'superadmin'].includes(get().user?.role),
      isSuperAdmin:  () => get().user?.role === 'superadmin',
      isDriver:      () => get().user?.role === 'driver',
      isStudent:     () => get().user?.role === 'student',
      orgId:         () => get().user?.organizationId?._id || get().user?.organizationId,
    }),
    {
      name:    'shuttlix-auth',
      partialize: state => ({
        user:            state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
