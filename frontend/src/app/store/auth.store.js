// frontend/src/app/store/auth.store.js
import { create }        from "zustand";
import toast             from "react-hot-toast";
import { authApi }       from "../../api/auth.api";
import { setAuthToken }  from "../../api/http";

const STORAGE_KEY = "syncdealer_auth_v1";

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persist(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

const persisted = loadPersisted();

export const useAuthStore = create((set, get) => ({
  token:         persisted?.token || null,
  user:          persisted?.user  || null,
  isAuthLoading: false,
  isLoggingIn:   false,

  // ── Init — valida token al arrancar la app ────────────────────────────────
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

  // ── Login ─────────────────────────────────────────────────────────────────
  login: async ({ email, password }) => {
    set({ isLoggingIn: true });
    try {
      const { token, user } = await authApi.login({ email, password });
      setAuthToken(token);
      set({ token, user, isLoggingIn: false });
      persist({ token, user });

      // Toast de bienvenida con el nombre del usuario
      const firstName = (user?.full_name || "").split(" ")[0] || "bienvenido";
      toast.success(`Bienvenido, ${firstName}`, { duration: 3000 });

      return { ok: true };
    } catch (e) {
      set({ isLoggingIn: false });
      const msg = e?.response?.data?.message || "Credenciales incorrectas";
      // No usamos toast aquí — el Login.jsx maneja el error inline
      return { ok: false, message: msg };
    }
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  logout: () => {
    setAuthToken(null);
    set({ token: null, user: null });
    persist({ token: null, user: null });
    toast("Sesión cerrada", { icon: "👋", duration: 2500 });
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  hasBrand: (brandCode) => {
    const user = get().user;
    if (!user?.brands) return false;
    return user.brands.some(
      (b) => (b.code || "").toUpperCase() === brandCode.toUpperCase()
    );
  },
}));
