import { create } from "zustand";
import { vehiclesApi } from "../../api/vehicles.api";
import { brandsApi } from "../../api/brands.api";
import { brandConfigApi } from "../../api/brandConfig.api";

const initialFilters = {
  page: 1,
  limit: 10,
  q: "",
  status: "active", // active | inactive | all
  brand_id: "6", // KIA por defecto
};

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function normalizeVehiclesResponse(res) {
  // res puede ser: { ok, data: { items... } } o { items... } o { vehicles: [] } etc
  const root = res?.data ?? res ?? {};
  const payload = root?.data ?? root;

  const items =
    payload?.items ||
    payload?.vehicles ||
    payload?.rows ||
    payload?.data ||
    (Array.isArray(payload) ? payload : []);

  const total =
    payload?.total ?? payload?.count ?? (Array.isArray(items) ? items.length : 0);
  const totalPages =
    payload?.totalPages ?? (payload?.limit ? Math.ceil(total / payload.limit) : 1);

  return { items: items || [], total: total || 0, totalPages: totalPages || 1 };
}

function getRate(veh, key) {
  // soporta rates como objeto o como array
  if (!veh) return 0;
  const rates = veh.rates ?? veh.commission_rates ?? veh.rate_map ?? null;
  if (!rates) return 0;

  if (Array.isArray(rates)) {
    const hit = rates.find(
      (r) => String(r.tier_name || r.tier || "").toUpperCase() === key
    );
    return Number(hit?.amount ?? hit?.value ?? 0) || 0;
  }

  return Number(rates[key] ?? 0) || 0;
}

/**
 * ===== Helpers para autocalc por % =====
 */
function toNumber(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function mapTierPercents(tiers = []) {
  const out = { TABLA_1: null, TABLA_2: null, TABLA_3: null };

  for (const t of tiers) {
    const name = String(t.tier_name || "").toUpperCase().trim();
    if (name === "TABLA_1" || name === "TABLA_2" || name === "TABLA_3") {
      out[name] = toNumber(t.rate_percent);
    }
  }
  return out;
}

function calcAmount(price, pct) {
  const p = toNumber(price);
  const r = toNumber(pct);
  if (p === null || r === null) return 0;
  // 2 decimales consistente
  return Math.round(p * (r / 100) * 100) / 100;
}

export const useVehiclesStore = create((set, get) => ({
  // Data
  items: [],
  total: 0,
  totalPages: 1,
  brands: [],

  // UI/State
  filters: { ...initialFilters },
  isLoading: false,
  isSaving: false,
  error: null,

  // Dialog
  openForm: false,
  formMode: "create", // create | edit
  formVehicle: null,

  // --- Helpers ---
  formatMoney: (v) => COP.format(Number(v || 0)),

  // ===== Autocalc por % (tier percents) =====
  tiersPct: { TABLA_1: null, TABLA_2: null, TABLA_3: null },
  tiersPctByBrand: {}, // cache por marca
  tiersLoading: false,
  autoCalcRates: true,

  setAutoCalcRates: (enabled) =>
    set({ autoCalcRates: !!enabled }),

/* Actions */
  setFilters: (patch) =>
    set((s) => ({
      filters: {
        ...s.filters,
        ...patch,
        page:
          patch.page ??
          (patch.q !== undefined ||
          patch.status !== undefined ||
          patch.brand_id !== undefined
            ? 1
            : s.filters.page),
      },
    })),

  resetFilters: () => set({ filters: { ...initialFilters } }),

  hydrateMeta: async () => {
    try {
      const brands = await brandsApi.list(); // <-- ahora es array
      set({ brands: brands || [] });
    } catch {
      set({ brands: [] });
    }
  },

  fetchVehicles: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });

    try {
      const res = await vehiclesApi.list({
        page: filters.page,
        limit: filters.limit,
        q: filters.q || undefined,
        status: filters.status || undefined,
        brand_id: filters.brand_id ? Number(filters.brand_id) : undefined,
      });

      const { items, total, totalPages } = normalizeVehiclesResponse(res);

      // Enriquecer con rates normalizados por si vienen separados
      const mapped = items.map((v) => ({
        ...v,
        _rate1: getRate(v, "TABLA_1"),
        _rate2: getRate(v, "TABLA_2"),
        _rate3: getRate(v, "TABLA_3"),
      }));

      set({
        items: mapped,
        total,
        totalPages,
        isLoading: false,
      });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron cargar los vehículos";
      set({ isLoading: false, error: msg });
    }
  },

  // ====== Tier percents por marca (scheme activo) ======
  ensureTierPercents: async (brand_id) => {
    const bid = Number(brand_id);
    if (!bid) return;

    const { tiersPctByBrand } = get();
    if (tiersPctByBrand[bid]) {
      set({ tiersPct: tiersPctByBrand[bid] });
      return;
    }

    set({ tiersLoading: true });
    try {
      // tu api devuelve { scheme }
      const schemeRes = await brandConfigApi.getScheme(bid);
      const scheme = schemeRes?.scheme ?? null;
      const schemeId = Number(scheme?.id);

      if (!schemeId) {
        set({
          tiersPct: { TABLA_1: null, TABLA_2: null, TABLA_3: null },
          tiersLoading: false,
        });
        return;
      }

      // tu api devuelve array directo
      const tiers = await brandConfigApi.listTiers(schemeId);
      const pctMap = mapTierPercents(tiers);

      set((s) => ({
        tiersPct: pctMap,
        tiersPctByBrand: { ...s.tiersPctByBrand, [bid]: pctMap },
        tiersLoading: false,
      }));
    } catch {
      set({
        tiersPct: { TABLA_1: null, TABLA_2: null, TABLA_3: null },
        tiersLoading: false,
      });
    }
  },

  recalcRatesFromPrice: () => {
    const { formVehicle, tiersPct, autoCalcRates } = get();
    if (!formVehicle || !autoCalcRates) return;

    const price = formVehicle.sale_price;

    set((s) => ({
      formVehicle: s.formVehicle
        ? {
            ...s.formVehicle,
            rates: {
              ...s.formVehicle.rates,
              TABLA_1: calcAmount(price, tiersPct.TABLA_1),
              TABLA_2: calcAmount(price, tiersPct.TABLA_2),
              TABLA_3: calcAmount(price, tiersPct.TABLA_3),
            },
          }
        : s.formVehicle,
    }));
  },

  setSalePrice: (value) => {
    set((s) => ({
      formVehicle: s.formVehicle ? { ...s.formVehicle, sale_price: value } : s.formVehicle,
    }));
    get().recalcRatesFromPrice();
  },

  setBrandId: async (brandId) => {
    const bid = Number(brandId);
    set((s) => ({
      formVehicle: s.formVehicle ? { ...s.formVehicle, brand_id: bid } : s.formVehicle,
    }));
    await get().ensureTierPercents(bid);
    get().recalcRatesFromPrice();
  },

  // --- Form ---
  openCreate: async () => {
    set({
      openForm: true,
      formMode: "create",
      error: null,
      isSaving: false,
      autoCalcRates: true,
      tiersPct: { TABLA_1: null, TABLA_2: null, TABLA_3: null },
      formVehicle: {
        brand_id: 6,
        code: "",
        model: "",
        version: "",
        model_year: "",
        sale_price: "",
        is_active: true,
        rates: {
          TABLA_1: "",
          TABLA_2: "",
          TABLA_3: "",
        },
      },
    });

    // precarga tiers con marca default para que al escribir precio calcule de una
    const bid = 6;
    await get().ensureTierPercents(bid);
    get().recalcRatesFromPrice();
  },

  openEdit: async (vehicle) => {
    set({
      openForm: true,
      formMode: "edit",
      formVehicle: null,
      isSaving: false,
      error: null,
      // en edición por defecto NO pisamos valores existentes
      autoCalcRates: false,
      tiersPct: { TABLA_1: null, TABLA_2: null, TABLA_3: null },
    });

    try {
      const res = await vehiclesApi.getById(vehicle.id);
      const root = res?.data ?? res;
      const v = root?.vehicle ?? root?.data ?? root;

      const rates = v?.rates ?? v?.commission_rates ?? null;

      const rate1 = getRate(v, "TABLA_1");
      const rate2 = getRate(v, "TABLA_2");
      const rate3 = getRate(v, "TABLA_3");

      const brand_id = Number(v.brand_id ?? 6);

      set({
        formVehicle: {
          id: v.id,
          brand_id,
          code: v.code || "",
          model: v.model || "",
          version: v.version || "",
          model_year: v.model_year ?? "",
          sale_price: v.sale_price ?? "",
          is_active: v.is_active !== undefined ? !!v.is_active : true,
          rates: {
            TABLA_1:
              rate1 || (typeof rates?.TABLA_1 !== "undefined" ? rates.TABLA_1 : ""),
            TABLA_2:
              rate2 || (typeof rates?.TABLA_2 !== "undefined" ? rates.TABLA_2 : ""),
            TABLA_3:
              rate3 || (typeof rates?.TABLA_3 !== "undefined" ? rates.TABLA_3 : ""),
          },
        },
      });

      // precarga porcentajes para mostrar hints (aunque autoCalc esté OFF)
      await get().ensureTierPercents(brand_id);
    } catch {
      set({ openForm: false, formVehicle: null });
    }
  },

  closeForm: () => set({ openForm: false, formVehicle: null, error: null }),

  setFormVehicle: (patch) =>
    set((s) => ({
      formVehicle: s.formVehicle ? { ...s.formVehicle, ...patch } : s.formVehicle,
    })),

  setRate: (key, value) =>
    set((s) => ({
      formVehicle: s.formVehicle
        ? { ...s.formVehicle, rates: { ...s.formVehicle.rates, [key]: value } }
        : s.formVehicle,
    })),

  submitForm: async () => {
    const { formMode, formVehicle } = get();
    if (!formVehicle) return;

    set({ isSaving: true, error: null });

    try {
      const payload = {
        brand_id: Number(formVehicle.brand_id || 6),
        code: String(formVehicle.code || "").trim(),
        model: String(formVehicle.model || "").trim(),
        version: String(formVehicle.version || "").trim(),
        model_year: formVehicle.model_year === "" ? null : Number(formVehicle.model_year),
        sale_price: formVehicle.sale_price === "" ? null : Number(formVehicle.sale_price),
        is_active: !!formVehicle.is_active,
        rates: {
          TABLA_1: formVehicle.rates.TABLA_1 === "" ? 0 : Number(formVehicle.rates.TABLA_1),
          TABLA_2: formVehicle.rates.TABLA_2 === "" ? 0 : Number(formVehicle.rates.TABLA_2),
          TABLA_3: formVehicle.rates.TABLA_3 === "" ? 0 : Number(formVehicle.rates.TABLA_3),
        },
      };

      if (!payload.code || !payload.model || !payload.version) {
        throw new Error("Completa Código, Modelo y Versión");
      }

      if (formMode === "create") {
        await vehiclesApi.create(payload);
      } else {
        await vehiclesApi.update(formVehicle.id, payload);
      }

      set({ isSaving: false, openForm: false, formVehicle: null });
      await get().fetchVehicles();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo guardar el vehículo";
      set({ isSaving: false, error: msg });
    }
  },

  // --- Status ---
  toggleStatus: async (vehicle) => {
    try {
      await vehiclesApi.setStatus(vehicle.id, !vehicle.is_active);
      await get().fetchVehicles();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo cambiar el estado";
      set({ error: msg });
    }
  },
}));
