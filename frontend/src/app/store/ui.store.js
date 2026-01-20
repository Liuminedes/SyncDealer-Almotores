import { create } from "zustand";

const STORAGE_KEY = "syncdealer_ui_v1";

function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function persist(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

const persisted = loadPersisted();

export const useUiStore = create((set, get) => ({
  themeMode: persisted?.themeMode || "dark", // "dark" | "light"
  setThemeMode: (mode) => {
    set({ themeMode: mode });
    persist({ ...loadPersisted(), themeMode: mode });
  },
  toggleTheme: () => {
    const next = get().themeMode === "dark" ? "light" : "dark";
    set({ themeMode: next });
    persist({ ...loadPersisted(), themeMode: next });
  },
}));
