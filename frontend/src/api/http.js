import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export const http = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// Claves de almacenamiento
const TOKEN_KEY   = "syncdealer_token_v1";    // sessionStorage — se limpia al cerrar pestaña
const SESSION_KEY = "syncdealer_auth_v1";     // localStorage — solo datos UX no sensibles

export function setAuthToken(token) {
  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    delete http.defaults.headers.common.Authorization;
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || null; } catch { return null; }
}

// ✅ Siempre inyecta token antes de cada request
http.interceptors.request.use((config) => {
  try {
    // Token desde sessionStorage (más seguro que localStorage)
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

