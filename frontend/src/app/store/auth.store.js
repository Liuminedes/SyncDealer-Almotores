// frontend/src/app/store/auth.store.js
import { create }        from "zustand";
import toast             from "react-hot-toast";
import { authApi }       from "../../api/auth.api";
import { setAuthToken, getStoredToken } from "../../api/http";

// ── Almacenamiento separado por sensibilidad ──────────────────────────────────
// TOKEN   → sessionStorage (se limpia al cerrar pestaña, no accesible entre tabs)
// USER    → localStorage   (solo datos no-sensibles para reconocer al usuario en UX)
const USER_KEY = "syncdealer_user_v1";

function loadPersistedUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function persistUser(user) {
  try {
    if (user) {
      // Solo guardar campos no-sensibles para UX (NO el token, NO roles críticos)
      localStorage.setItem(USER_KEY, JSON.stringify({
        id:        user.id,
        full_name: user.full_name,
        email:     user.email,
        role:      user.role,
        branch_id: user.branch_id,
        brands:    user.brands,
      }));
    } else {
      localStorage.removeItem(USER_KEY);
    }
  } catch { /* ignore */ }
}

const persistedUser  = loadPersistedUser();
const persistedToken = getStoredToken(); // lee desde sessionStorage

export const useAuthStore = create((set, get) => ({
  token:         persistedToken || null,
  user:          persistedUser  || null,
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
      persistUser(user);
    } catch {
      // Token inválido o expirado — limpiar todo
      setAuthToken(null);
      persistUser(null);
      set({ token: null, user: null, isAuthLoading: false });
    }
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  login: async ({ email, password }) => {
    set({ isLoggingIn: true });
    try {
      const { token, user } = await authApi.login({ email, password });

      // Token → sessionStorage (via setAuthToken)
      setAuthToken(token);
      // Datos de usuario → localStorage (solo para UX)
      persistUser(user);

      set({ token, user, isLoggingIn: false });

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
    setAuthToken(null);  // limpia sessionStorage + header axios
    persistUser(null);   // limpia localStorage
    set({ token: null, user: null });
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
