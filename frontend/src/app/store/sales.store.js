import { create } from "zustand";
import { salesApi } from "../../api/sales.api";
import { brandsApi } from "../../api/brands.api";
import { vehiclesApi } from "../../api/vehicles.api";
import { usersApi } from "../../api/users.api"; // Debe existir en tu proyecto (si no, te doy fallback abajo)

const initialFilters = {
  page: 1,
  limit: 10,
  q: "",
  brand_id: "6", // KIA por defecto
  date_from: "",
  date_to: "",
};

function normalizeListResponse(res) {
  const root = res?.data ?? res ?? {};
  const payload = root?.data ?? root;

  const items =
    payload?.items ||
    payload?.sales ||
    payload?.rows ||
    payload?.data ||
    (Array.isArray(payload) ? payload : []);

  const total =
    payload?.total ??
    payload?.count ??
    (Array.isArray(items) ? items.length : 0);

  const totalPages =
    payload?.totalPages ??
    (payload?.limit ? Math.ceil(total / payload.limit) : 1);

  return { items: items || [], total: total || 0, totalPages: totalPages || 1 };
}

export const useSalesStore = create((set, get) => ({
  // Data
  items: [],
  total: 0,
  totalPages: 1,

  brands: [],
  vehicles: [],
  advisors: [],

  // UI/State
  filters: { ...initialFilters },
  isLoading: false,
  isSaving: false,
  error: null,

  // Dialog
  openForm: false,
  formMode: "create", // create | edit
  formSale: null,

  // --- Filters ---
  setFilters: (patch) =>
    set((s) => ({
      filters: {
        ...s.filters,
        ...patch,
        page:
          patch.page ??
          (patch.q !== undefined ||
          patch.brand_id !== undefined ||
          patch.date_from !== undefined ||
          patch.date_to !== undefined
            ? 1
            : s.filters.page),
      },
    })),

  resetFilters: () => set({ filters: { ...initialFilters } }),

  // --- Meta (brands, vehicles, advisors) ---
  hydrateMeta: async () => {
    // Brands
    try {
      const res = await brandsApi.list();
      const root = res?.data ?? res;
      const brands = root?.brands ?? root?.data ?? root ?? [];
      set({ brands: Array.isArray(brands) ? brands : [] });
    } catch {
      set({ brands: [] });
    }

    // Vehicles (por marca actual)
    await get().fetchVehiclesForBrand();

    // Advisors (usuarios con rol ASESOR)
    await get().fetchAdvisors();
  },

  fetchVehiclesForBrand: async () => {
    const { filters } = get();
    try {
      const res = await vehiclesApi.list({
        brand_id: filters.brand_id ? Number(filters.brand_id) : undefined,
        status: "active",
        limit: 200,
        page: 1,
      });

      // vehiclesApi.list te puede devolver {items} o {vehicles} etc
      const root = res?.data ?? res;
      const payload = root?.data ?? root;
      const items =
        payload?.items ||
        payload?.vehicles ||
        payload?.rows ||
        payload?.data ||
        (Array.isArray(payload) ? payload : []);

      set({ vehicles: items || [] });
    } catch {
      set({ vehicles: [] });
    }
  },

  fetchAdvisors: async () => {
    try {
      // ✅ Asumiendo que tienes usersApi.list({ role: "ADVISOR" }) o similar
      const res = await usersApi.list({ role: "ADVISOR", limit: 200, page: 1 });

      const root = res?.data ?? res;
      const payload = root?.data ?? root;
      const items =
        payload?.items ||
        payload?.users ||
        payload?.rows ||
        payload?.data ||
        (Array.isArray(payload) ? payload : []);

      set({ advisors: items || [] });
    } catch {
      set({ advisors: [] });
    }
  },

  // --- List ---
  fetchSales: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });

    try {
      const res = await salesApi.list({
        page: filters.page,
        limit: filters.limit,
        q: filters.q || undefined,
        brand_id: filters.brand_id ? Number(filters.brand_id) : undefined,
        date_from: filters.date_from || undefined,
        date_to: filters.date_to || undefined,
      });

      const { items, total, totalPages } = normalizeListResponse(res);

      set({ items, total, totalPages, isLoading: false });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron cargar las ventas";
      set({ isLoading: false, error: msg });
    }
  },

  // --- Form ---
  openCreate: async () => {
    const brand_id = Number(get().filters.brand_id || 6);

    // refrescar vehículos por marca
    await get().fetchVehiclesForBrand();

    set({
      openForm: true,
      formMode: "create",
      error: null,
      formSale: {
        brand_id,
        advisor_id: "",
        vehicle_id: "",
        sale_date: new Date().toISOString().slice(0, 10), // yyyy-mm-dd
        cut_month: new Date().getMonth() + 1,
        fortnight: "FIRST",
        charge_month: null,

        invoice: "",
        client_name: "",
        plate: "",
        notes: "",
      },
    });
  },

  openEdit: async (sale) => {
    set({ openForm: true, formMode: "edit", formSale: null, isSaving: false, error: null });
    try {
      const res = await salesApi.getById(sale.id);
      const root = res?.data ?? res;
      const s = root?.sale ?? root?.data ?? root;

      set({
        formSale: {
          id: s.id,
          brand_id: Number(s.brand_id),
          advisor_id: s.advisor_id ?? "",
          vehicle_id: s.vehicle_id ?? "",
          sale_date: s.sale_date,
          cut_month: s.cut_month,
          fortnight: s.fortnight,
          charge_month: s.charge_month ?? null,
          invoice: s.invoice ?? "",
          client_name: s.client_name ?? "",
          plate: s.plate ?? "",
          notes: s.notes ?? "",
        },
      });

      // cargar vehículos para la marca del registro
      set({ filters: { ...get().filters, brand_id: String(s.brand_id) } });
      await get().fetchVehiclesForBrand();
    } catch (e) {
      set({ openForm: false, formSale: null });
    }
  },

  closeForm: () => set({ openForm: false, formSale: null, error: null }),

  setFormSale: (patch) =>
    set((s) => ({
      formSale: s.formSale ? { ...s.formSale, ...patch } : s.formSale,
    })),

  submitForm: async () => {
    const { formMode, formSale } = get();
    if (!formSale) return;

    set({ isSaving: true, error: null });

    try {
      // ✅ payload limpio (sin comisión/tabla)
      const payload = {
        brand_id: Number(formSale.brand_id),
        advisor_id: Number(formSale.advisor_id),
        vehicle_id: Number(formSale.vehicle_id),
        sale_date: formSale.sale_date,

        cut_month: Number(formSale.cut_month),
        fortnight: formSale.fortnight,
        charge_month:
          formSale.charge_month === "" || formSale.charge_month === null
            ? null
            : Number(formSale.charge_month),

        invoice: formSale.invoice?.trim() || null,
        client_name: String(formSale.client_name || "").trim(),
        plate: formSale.plate?.trim() || null,
        notes: formSale.notes?.trim() || null,
      };

      // validaciones mínimas
      if (!payload.brand_id || !payload.advisor_id || !payload.vehicle_id) {
        throw new Error("Completa Marca, Asesor y Vehículo");
      }
      if (!payload.sale_date) throw new Error("Selecciona la fecha de la venta");
      if (!payload.client_name) throw new Error("El nombre del cliente es obligatorio");

      if (formMode === "create") {
        await salesApi.create(payload);
      } else {
        await salesApi.update(formSale.id, payload);
      }

      set({ isSaving: false, openForm: false, formSale: null });
      await get().fetchSales();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo guardar la venta";
      set({ isSaving: false, error: msg });
    }
  },
}));
