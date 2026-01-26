import { create } from "zustand";
import { salesApi } from "../../api/sales.api";
import { brandsApi } from "../../api/brands.api";
import { usersApi } from "../../api/users.api";
import { vehiclesApi } from "../../api/vehicles.api";

const initialFilters = {
  page: 1,
  limit: 10,
  q: "",
  brand_id: "6", // KIA por defecto
  from: "",
  to: "",
};

function normalizeSalesResponse(res) {
  const root = res?.data ?? res ?? {};
  const payload = root?.data ?? root;

  const items =
    payload?.items ||
    payload?.sales ||
    payload?.rows ||
    payload?.data ||
    (Array.isArray(payload) ? payload : []);

  const total = payload?.total ?? payload?.count ?? (Array.isArray(items) ? items.length : 0);
  const totalPages = payload?.totalPages ?? 1;

  return { items: items || [], total: total || 0, totalPages: totalPages || 1 };
}

export const useSalesStore = create((set, get) => ({
  items: [],
  total: 0,
  totalPages: 1,

  brands: [],
  advisors: [],
  vehicles: [],

  filters: { ...initialFilters },
  isLoading: false,
  isSaving: false,
  error: null,

  openForm: false,
  formSale: null,

  setFilters: (patch) =>
    set((s) => ({
      filters: {
        ...s.filters,
        ...patch,
        page: patch.page ?? (patch.q !== undefined || patch.from !== undefined || patch.to !== undefined || patch.brand_id !== undefined ? 1 : s.filters.page),
      },
    })),

  resetFilters: () => set({ filters: { ...initialFilters } }),

  hydrateMeta: async () => {
    try {
      const [brandsRes, usersRes, vehiclesRes] = await Promise.all([
        brandsApi.list(),
        usersApi.list({ page: 1, limit: 100, role: "ADVISOR", status: "active", brand_id: 6 }),
        vehiclesApi.list({ page: 1, limit: 200, brand_id: 6, status: "active" }),
      ]);

      const brands = brandsRes || [];

      const usersRoot = usersRes?.data ?? usersRes;
      const usersPayload = usersRoot?.data ?? usersRoot;
      const advisors = usersPayload?.items ?? usersPayload?.users ?? [];

      const vehiclesRoot = vehiclesRes?.data ?? vehiclesRes;
      const vehiclesPayload = vehiclesRoot?.data ?? vehiclesRoot;
      const vehicles = vehiclesPayload?.items ?? vehiclesPayload?.vehicles ?? [];

      set({
        brands,
        advisors,
        vehicles,
      });
    } catch {
      set({ brands: [], advisors: [], vehicles: [] });
    }
  },

  fetchSales: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });

    try {
      const res = await salesApi.list({
        page: filters.page,
        limit: filters.limit,
        q: filters.q || undefined,
        brand_id: filters.brand_id ? Number(filters.brand_id) : undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
      });

      const { items, total, totalPages } = normalizeSalesResponse(res);
      set({ items, total, totalPages, isLoading: false });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron cargar las ventas";
      set({ isLoading: false, error: msg });
    }
  },

  openCreate: () =>
    set({
      openForm: true,
      error: null,
      formSale: {
        brand_id: 6,
        advisor_id: "",
        vehicle_id: "",
        sale_date: "",
        cut_month: "",
        fortnight: "FIRST",
        charge_month: "",
        invoice: "",
        client_name: "",
        plate: "",
        units_count: "",
        tier_used: "1",
        commission_value: "",
        notes: "",
      },
    }),

  closeForm: () => set({ openForm: false, formSale: null, error: null }),

  setFormSale: (patch) =>
    set((s) => ({
      formSale: s.formSale ? { ...s.formSale, ...patch } : s.formSale,
    })),

  submitForm: async () => {
    const { formSale } = get();
    if (!formSale) return;

    set({ isSaving: true, error: null });

    try {
      const payload = {
        brand_id: Number(formSale.brand_id || 6),
        advisor_id: Number(formSale.advisor_id),
        vehicle_id: Number(formSale.vehicle_id),
        sale_date: formSale.sale_date,
        cut_month: Number(formSale.cut_month),
        fortnight: formSale.fortnight,
        charge_month: formSale.charge_month === "" ? null : Number(formSale.charge_month),
        invoice: formSale.invoice?.trim() || null,
        client_name: String(formSale.client_name || "").trim(),
        plate: formSale.plate?.trim() || null,
        units_count: formSale.units_count === "" ? null : Number(formSale.units_count),
        tier_used: Number(formSale.tier_used),
        commission_value: Number(formSale.commission_value),
        notes: formSale.notes?.trim() || null,
      };

      if (!payload.advisor_id || !payload.vehicle_id || !payload.sale_date || !payload.cut_month || !payload.client_name) {
        throw new Error("Faltan campos obligatorios (asesor, vehículo, fecha, mes corte, cliente)");
      }

      await salesApi.create(payload);

      set({ isSaving: false, openForm: false, formSale: null });
      await get().fetchSales();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo guardar la venta";
      set({ isSaving: false, error: msg });
    }
  },
}));
