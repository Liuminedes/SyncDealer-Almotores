import { create } from "zustand";
import { authApi } from "../../api/auth.api";
import { setAuthToken } from "../../api/http";

const STORAGE_KEY = "syncdealer_auth_v1";

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const persisted = loadPersisted();

export const useAuthStore = create((set, get) => ({
  token: persisted?.token || null,
  user: persisted?.user || null,

  isAuthLoading: false,
  isLoggingIn: false,

  init: async () => {
    const { token } = get();
    if (!token) return;

    setAuthToken(token);
    set({ isAuthLoading: true });

    try {
      const { user } = await authApi.me();
      set({ user, isAuthLoading: false });
      persist({ token, user });
    } catch {
      setAuthToken(null);
      set({ token: null, user: null, isAuthLoading: false });
      persist({ token: null, user: null });
    }
  },

  login: async ({ email, password }) => {
    set({ isLoggingIn: true });
    try {
      const { token, user } = await authApi.login({ email, password });
      setAuthToken(token);
      set({ token, user, isLoggingIn: false });
      persist({ token, user });
      return { ok: true };
    } catch (e) {
      set({ isLoggingIn: false });
      const msg = e?.response?.data?.message || "No se pudo iniciar sesión";
      return { ok: false, message: msg };
    }
  },

  logout: () => {
    setAuthToken(null);
    set({ token: null, user: null });
    persist({ token: null, user: null });
  },

  // Helpers
  hasBrand: (brandCode) => {
    const user = get().user;
    if (!user?.brands) return false;
    return user.brands.some((b) => (b.code || "").toUpperCase() === brandCode.toUpperCase());
  },
}));
