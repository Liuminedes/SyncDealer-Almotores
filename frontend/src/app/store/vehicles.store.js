// frontend/src/app/store/vehicles.store.js
// CAMBIOS vs anterior: +openImport, +closeImport, +setImportFile, +runImport, +importResults
import { create }         from "zustand";
import toast              from "react-hot-toast";
import { vehiclesApi }    from "../../api/vehicles.api";
import { brandsApi }      from "../../api/brands.api";
import { brandConfigApi } from "../../api/brandConfig.api";

const initialFilters = { page: 1, limit: 10, q: "", status: "active", brand_id: "6" };

const COP = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function normalizeVehiclesResponse(res) {
  const root    = res?.data ?? res ?? {};
  const payload = root?.data ?? root;
  const items   = payload?.items || payload?.vehicles || payload?.rows || payload?.data || (Array.isArray(payload) ? payload : []);
  const total      = payload?.total ?? payload?.count ?? (Array.isArray(items) ? items.length : 0);
  const totalPages = payload?.totalPages ?? (payload?.limit ? Math.ceil(total / payload.limit) : 1);
  return { items: items || [], total: total || 0, totalPages: totalPages || 1 };
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapTierPercents(tiers = []) {
  const out = {};
  for (const t of tiers) {
    const name = String(t.tier_name || "").toUpperCase().trim();
    if (/^TABLA_\d+$/.test(name)) out[name] = toNumber(t.rate_percent);
  }
  return out;
}

function calcAmount(price, pct) {
  const p = toNumber(price); const r = toNumber(pct);
  if (p === null || r === null) return 0;
  return Math.round(p * (r / 100) * 100) / 100;
}

export const useVehiclesStore = create((set, get) => ({
  // ── Data ──────────────────────────────────────────────────────────────────
  items: [], total: 0, totalPages: 1, brands: [],

  // ── UI ────────────────────────────────────────────────────────────────────
  filters:   { ...initialFilters },
  isLoading: false, isSaving: false, error: null,

  // ── Form dialog ───────────────────────────────────────────────────────────
  openForm: false, formMode: "create", formVehicle: null,

  // ── Import dialog ─────────────────────────────────────────────────────────
  openImportDialog: false,
  importFile:       null,   // File object
  importFileName:   "",
  isImporting:      false,
  importResults:    null,   // { created, updated, skipped, errors[] } | null

  // ── Tier percents ─────────────────────────────────────────────────────────
  tiersPct: {}, tiersPctByBrand: {}, tiersLoading: false, autoCalcRates: true,

  // ── Helpers ───────────────────────────────────────────────────────────────
  formatMoney: (v) => COP.format(Number(v || 0)),
  setAutoCalcRates: (enabled) => set({ autoCalcRates: !!enabled }),

  // ── Filters ───────────────────────────────────────────────────────────────
  setFilters: (patch) =>
    set((s) => ({
      filters: {
        ...s.filters, ...patch,
        page: patch.page ?? (patch.q !== undefined || patch.status !== undefined || patch.brand_id !== undefined ? 1 : s.filters.page),
      },
    })),
  resetFilters: () => set({ filters: { ...initialFilters } }),

  // ── Meta ──────────────────────────────────────────────────────────────────
  hydrateMeta: async () => {
    try {
      const brands = await brandsApi.list();
      set({ brands: brands || [] });
    } catch { set({ brands: [] }); }
  },

  // ── Fetch ─────────────────────────────────────────────────────────────────
  fetchVehicles: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await vehiclesApi.list({
        page: filters.page, limit: filters.limit,
        q: filters.q || undefined, status: filters.status || undefined,
        brand_id: filters.brand_id ? Number(filters.brand_id) : undefined,
      });
      const { items, total, totalPages } = normalizeVehiclesResponse(res);
      set({ items, total, totalPages, isLoading: false });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron cargar los vehículos";
      set({ isLoading: false, error: msg });
      toast.error(msg);
    }
  },

  // ── Tier percents ─────────────────────────────────────────────────────────
  ensureTierPercents: async (brand_id) => {
    const bid = Number(brand_id); if (!bid) return;
    const { tiersPctByBrand } = get();
    if (tiersPctByBrand[bid]) { set({ tiersPct: tiersPctByBrand[bid] }); return; }
    set({ tiersLoading: true });
    try {
      const schemeRes = await brandConfigApi.getScheme(bid);
      const schemeId  = Number(schemeRes?.scheme?.id);
      if (!schemeId) { set({ tiersPct: {}, tiersLoading: false }); return; }
      const tiers  = await brandConfigApi.listTiers(schemeId);
      const pctMap = mapTierPercents(tiers);
      set((s) => ({ tiersPct: pctMap, tiersPctByBrand: { ...s.tiersPctByBrand, [bid]: pctMap }, tiersLoading: false }));
    } catch { set({ tiersPct: {}, tiersLoading: false }); }
  },

  recalcRatesFromPrice: () => {
    const { formVehicle, tiersPct, autoCalcRates } = get();
    if (!formVehicle || !autoCalcRates) return;
    const newRates = {};
    Object.entries(tiersPct).forEach(([k, pct]) => { newRates[k] = calcAmount(formVehicle.sale_price, pct); });
    set((s) => ({ formVehicle: s.formVehicle ? { ...s.formVehicle, rates: { ...s.formVehicle.rates, ...newRates } } : s.formVehicle }));
  },

  setSalePrice: (value) => {
    set((s) => ({ formVehicle: s.formVehicle ? { ...s.formVehicle, sale_price: value } : s.formVehicle }));
    get().recalcRatesFromPrice();
  },

  setBrandId: async (brandId) => {
    const bid = Number(brandId);
    set((s) => ({ formVehicle: s.formVehicle ? { ...s.formVehicle, brand_id: bid } : s.formVehicle, tiersPct: {} }));
    await get().ensureTierPercents(bid);
    get().recalcRatesFromPrice();
  },

  // ── Form CRUD ─────────────────────────────────────────────────────────────
  openCreate: async () => {
    set({ openForm: true, formMode: "create", error: null, isSaving: false, autoCalcRates: true, tiersPct: {},
      formVehicle: { brand_id: 6, code: "", model: "", version: "", model_year: "", sale_price: "", is_active: true, rates: {} } });
    await get().ensureTierPercents(6);
    get().recalcRatesFromPrice();
  },

  openEdit: async (vehicle) => {
    set({ openForm: true, formMode: "edit", formVehicle: null, isSaving: false, error: null, autoCalcRates: false, tiersPct: {} });
    try {
      const res     = await vehiclesApi.getById(vehicle.id);
      const root    = res?.data ?? res;
      const v       = root?.vehicle ?? root?.data ?? root;
      const brand_id = Number(v.brand_id ?? 6);
      set({ formVehicle: { id: v.id, brand_id, code: v.code || "", model: v.model || "", version: v.version || "",
        model_year: v.model_year ?? "", sale_price: v.sale_price ?? "", is_active: v.is_active !== undefined ? !!v.is_active : true,
        rates: v?.rates ?? {} } });
      await get().ensureTierPercents(brand_id);
    } catch { set({ openForm: false, formVehicle: null }); toast.error("No se pudo cargar el vehículo"); }
  },

  closeForm: () => set({ openForm: false, formVehicle: null, error: null }),
  setFormVehicle: (patch) =>
    set((s) => ({ formVehicle: s.formVehicle ? { ...s.formVehicle, ...patch } : s.formVehicle })),
  setRate: (key, value) =>
    set((s) => ({ formVehicle: s.formVehicle ? { ...s.formVehicle, rates: { ...s.formVehicle.rates, [key]: value } } : s.formVehicle })),

  submitForm: async () => {
    const { formMode, formVehicle } = get();
    if (!formVehicle) return;
    set({ isSaving: true, error: null });
    try {
      const rates = {};
      Object.entries(formVehicle.rates || {}).forEach(([k, v]) => { if (/^TABLA_\d+$/.test(k)) rates[k] = v === "" ? 0 : Number(v); });
      const payload = {
        brand_id: Number(formVehicle.brand_id || 6), code: String(formVehicle.code || "").trim(),
        model: String(formVehicle.model || "").trim(), version: String(formVehicle.version || "").trim(),
        model_year: formVehicle.model_year === "" ? null : Number(formVehicle.model_year),
        sale_price: formVehicle.sale_price === "" ? null : Number(formVehicle.sale_price),
        is_active: !!formVehicle.is_active, rates,
      };
      if (!payload.code || !payload.model || !payload.version) throw new Error("Completa Código, Modelo y Versión");
      if (formMode === "create") { await vehiclesApi.create(payload); toast.success("Vehículo creado exitosamente"); }
      else { await vehiclesApi.update(formVehicle.id, payload); toast.success("Vehículo actualizado"); }
      set({ isSaving: false, openForm: false, formVehicle: null });
      await get().fetchVehicles();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo guardar el vehículo";
      toast.error(msg); set({ isSaving: false, error: msg });
    }
  },

  toggleStatus: async (vehicle) => {
    const newState = !vehicle.is_active;
    const toastId  = toast.loading(newState ? "Activando vehículo…" : "Desactivando vehículo…");
    try {
      await vehiclesApi.setStatus(vehicle.id, newState);
      toast.success(newState ? "Vehículo activado" : "Vehículo desactivado", { id: toastId });
      await get().fetchVehicles();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo cambiar el estado", { id: toastId });
    }
  },

  // ── Import dialog ─────────────────────────────────────────────────────────

  openImport: () => set({ openImportDialog: true, importFile: null, importFileName: "", importResults: null, isImporting: false }),

  closeImport: () => set({ openImportDialog: false, importFile: null, importFileName: "", importResults: null, isImporting: false }),

  setImportFile: (file) => set({ importFile: file, importFileName: file?.name || "", importResults: null }),

  clearImportFile: () => set({ importFile: null, importFileName: "", importResults: null }),

  runImport: async () => {
    const { importFile, filters } = get();
    if (!importFile) { toast.error("Selecciona un archivo Excel primero"); return; }

    const brand_id = filters.brand_id ? Number(filters.brand_id) : null;
    if (!brand_id) { toast.error("Selecciona una marca en los filtros antes de importar"); return; }

    set({ isImporting: true, importResults: null });
    const toastId = toast.loading("Procesando archivo Excel…");

    try {
      const res = await vehiclesApi.importFromExcel(importFile, brand_id);
      toast.success(res.message || "Importación completada", { id: toastId, duration: 5000 });
      set({ isImporting: false, importResults: res.data });
      await get().fetchVehicles(); // refrescar la tabla
    } catch (e) {
      const msg = e?.response?.data?.message || "Error al procesar el archivo";
      toast.error(msg, { id: toastId });
      set({ isImporting: false });
    }
  },

  downloadTemplate: async () => {
    const toastId = toast.loading("Preparando plantilla…");
    try {
      const blob = await vehiclesApi.downloadTemplate();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "plantilla_vehiculos.xlsx";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Plantilla descargada", { id: toastId });
    } catch {
      toast.error("No se pudo descargar la plantilla", { id: toastId });
    }
  },
}));
