// frontend/src/app/store/sales.store.js
// CAMBIOS: +importDialog flujo en dos pasos (preview → confirmar)
import { create }       from "zustand";
import toast            from "react-hot-toast";
import { salesApi }     from "../../api/sales.api";
import { brandsApi }    from "../../api/brands.api";
import { vehiclesApi }  from "../../api/vehicles.api";
import { usersApi }     from "../../api/users.api";
import { useAuthStore } from "./auth.store";

const initialFilters = {
  page: 1, limit: 10, q: "", brand_id: "6", date_from: "", date_to: "", advisor_id: "",
};

function normalizeListResponse(res) {
  const root    = res?.data ?? res ?? {};
  const payload = root?.data ?? root;
  const items   = payload?.items || payload?.sales || payload?.rows || payload?.data || (Array.isArray(payload) ? payload : []);
  const total   = payload?.total ?? payload?.count ?? (Array.isArray(items) ? items.length : 0);
  const totalPages = payload?.totalPages ?? (payload?.limit ? Math.ceil(total / payload.limit) : 1);
  return { items: items || [], total: total || 0, totalPages: totalPages || 1 };
}

function getAdvisorIdFilter() {
  const user = useAuthStore.getState().user;
  return String(user?.role || "").toUpperCase() === "ADVISOR" ? user?.id : undefined;
}

export const useSalesStore = create((set, get) => ({
  items: [], total: 0, totalPages: 1,
  brands: [], vehicles: [], advisors: [],
  filters: { ...initialFilters },
  isLoading: false, isSaving: false, isDeleting: false, error: null,

  // Selección múltiple
  selected: new Set(),
  toggleSelect:    (id) => set((s) => { const n = new Set(s.selected); n.has(id) ? n.delete(id) : n.add(id); return { selected: n }; }),
  toggleSelectAll: ()   => set((s) => { const ids = s.items.map((i) => i.id); return { selected: ids.every((id) => s.selected.has(id)) ? new Set() : new Set(ids) }; }),
  clearSelection:  ()   => set({ selected: new Set() }),

  // Form
  openForm: false, formMode: "create", formSale: null,

  // Delete individual
  openConfirmDelete: false, deleteTargetId: null,
  openForceDelete: false, forceDeleteMessage: "", forceDeleteStatus: "",

  // Delete masivo
  openConfirmBulk: false,
  openForceBulk: false, forceBulkSkipped: [], forceBulkMessage: "",

  // Import — step: 'idle' | 'dropzone' | 'previewing' | 'preview_ready' | 'importing' | 'done'
  openImportDialog: false,
  importStep:       "idle",
  importFile:       null,
  importFileName:   "",
  importPreview:    null,
  importResults:    null,
  isImporting:      false,

  // Filters
  setFilters: (patch) =>
    set((s) => ({
      filters: {
        ...s.filters, ...patch,
        page: patch.page ?? (
          patch.q !== undefined || patch.brand_id !== undefined ||
          patch.date_from !== undefined || patch.date_to !== undefined ? 1 : s.filters.page
        ),
      },
    })),
  resetFilters: () => set({ filters: { ...initialFilters } }),

  hydrateMeta: async () => {
    try {
      const res = await brandsApi.list();
      const root = res?.data ?? res;
      set({ brands: Array.isArray(root?.brands ?? root?.data ?? root) ? (root?.brands ?? root?.data ?? root) : [] });
    } catch { set({ brands: [] }); }
    await get().fetchVehiclesForBrand();
    if (!getAdvisorIdFilter()) await get().fetchAdvisors();
  },

  fetchVehiclesForBrand: async () => {
    const { filters } = get();
    try {
      const res = await vehiclesApi.list({ brand_id: filters.brand_id ? Number(filters.brand_id) : undefined, status: "active", limit: 200, page: 1 });
      const root = res?.data ?? res; const payload = root?.data ?? root;
      const items = payload?.items || payload?.vehicles || payload?.rows || payload?.data || (Array.isArray(payload) ? payload : []);
      set({ vehicles: items || [] });
    } catch { set({ vehicles: [] }); }
  },

  fetchAdvisors: async () => {
    try { set({ advisors: (await usersApi.list({ role: "ADVISOR", limit: 100, page: 1 }))?.data?.items ?? [] }); }
    catch { set({ advisors: [] }); }
  },

  fetchSales: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });
    const advisorId = getAdvisorIdFilter();
    try {
      const res = await salesApi.list({
        page: filters.page, limit: filters.limit,
        q: filters.q || undefined, brand_id: filters.brand_id ? Number(filters.brand_id) : undefined,
        date_from: filters.date_from || undefined, date_to: filters.date_to || undefined,
        advisor_id: advisorId || (filters.advisor_id ? Number(filters.advisor_id) : undefined),
      });
      const { items, total, totalPages } = normalizeListResponse(res);
      set({ items, total, totalPages, isLoading: false, selected: new Set() });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron cargar las ventas";
      set({ isLoading: false, error: msg }); toast.error(msg);
    }
  },

  openCreate: async () => {
    const advisorId = getAdvisorIdFilter();
    await get().fetchVehiclesForBrand();
    set({ openForm: true, formMode: "create", error: null,
      formSale: { brand_id: Number(get().filters.brand_id || 6), advisor_id: advisorId ? String(advisorId) : "",
        vehicle_id: "", sale_date: new Date().toISOString().slice(0, 10),
        invoice: "", client_name: "", plate: "", notes: "" } });
  },

  openEdit: async (sale) => {
    set({ openForm: true, formMode: "edit", formSale: null, isSaving: false, error: null });
    try {
      const res = await salesApi.getById(sale.id);
      const s   = (res?.data ?? res)?.sale ?? (res?.data ?? res)?.data ?? (res?.data ?? res);
      set({ formSale: { id: s.id, brand_id: Number(s.brand_id), advisor_id: s.advisor_id ?? "",
        vehicle_id: s.vehicle_id ?? "", sale_date: s.sale_date, invoice: s.invoice ?? "",
        client_name: s.client_name ?? "", plate: s.plate ?? "", notes: s.notes ?? "" } });
      set({ filters: { ...get().filters, brand_id: String(s.brand_id) } });
      await get().fetchVehiclesForBrand();
    } catch { set({ openForm: false, formSale: null }); toast.error("No se pudo cargar la venta"); }
  },

  closeForm:   () => set({ openForm: false, formSale: null, error: null }),
  setFormSale: (patch) => set((s) => ({ formSale: s.formSale ? { ...s.formSale, ...patch } : s.formSale })),

  submitForm: async () => {
    const { formMode, formSale } = get();
    if (!formSale) return;
    set({ isSaving: true, error: null });
    try {
      const payload = {
        brand_id: Number(formSale.brand_id), advisor_id: Number(formSale.advisor_id),
        vehicle_id: Number(formSale.vehicle_id), sale_date: formSale.sale_date,
        invoice: formSale.invoice?.trim() || null,
        client_name: String(formSale.client_name || "").trim(),
        plate: formSale.plate?.trim() || null, notes: formSale.notes?.trim() || null,
      };
      if (!payload.brand_id || !payload.advisor_id || !payload.vehicle_id) throw new Error("Completa Marca, Asesor y Vehículo");
      if (!payload.sale_date) throw new Error("Selecciona la fecha de la venta");
      if (!payload.client_name) throw new Error("El nombre del cliente es obligatorio");
      if (formMode === "create") { await salesApi.create(payload); toast.success("Venta registrada exitosamente"); }
      else { await salesApi.update(formSale.id, payload); toast.success("Venta actualizada"); }
      set({ isSaving: false, openForm: false, formSale: null });
      await get().fetchSales();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo guardar la venta";
      toast.error(msg); set({ isSaving: false, error: msg });
    }
  },

  // Delete individual
  promptDelete: (id) => set({ openConfirmDelete: true, deleteTargetId: id }),
  cancelDelete: ()   => set({ openConfirmDelete: false, deleteTargetId: null }),
  confirmDelete: async () => {
    const { deleteTargetId } = get();
    if (!deleteTargetId) return;
    set({ isDeleting: true });
    try {
      await salesApi.remove(deleteTargetId);
      toast.success("Venta eliminada");
      set({ isDeleting: false, openConfirmDelete: false, deleteTargetId: null });
      await get().fetchSales();
    } catch (e) {
      const data = e?.response?.data;
      if (e?.response?.status === 409 && data?.requiresForce) {
        set({ isDeleting: false, openConfirmDelete: false, openForceDelete: true,
          forceDeleteMessage: data.message || "", forceDeleteStatus: data.commissionStatus || "" });
        return;
      }
      toast.error(data?.message || "No se pudo eliminar"); set({ isDeleting: false });
    }
  },
  cancelForceDelete: () => set({ openForceDelete: false, forceDeleteMessage: "", forceDeleteStatus: "" }),
  confirmForceDelete: async () => {
    const { deleteTargetId } = get();
    if (!deleteTargetId) return;
    set({ isDeleting: true });
    const tid = toast.loading("Eliminando…");
    try {
      await salesApi.remove(deleteTargetId, { force: true });
      toast.success("Venta eliminada", { id: tid });
      set({ isDeleting: false, openForceDelete: false, deleteTargetId: null, forceDeleteMessage: "", forceDeleteStatus: "" });
      await get().fetchSales();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Error", { id: tid }); set({ isDeleting: false });
    }
  },

  // Delete masivo
  promptBulkDelete: () => set({ openConfirmBulk: true }),
  cancelBulkDelete: () => set({ openConfirmBulk: false }),
  confirmBulkDelete: async () => {
    const ids = [...get().selected];
    if (!ids.length) return;
    set({ isDeleting: true, openConfirmBulk: false });
    const tid = toast.loading(`Eliminando ${ids.length} venta(s)…`);
    try {
      const res = await salesApi.removeBulk(ids, false);
      toast.success(res.message || "Eliminadas", { id: tid, duration: 4000 });
      set({ isDeleting: false, selected: new Set() }); await get().fetchSales();
    } catch (e) {
      const data = e?.response?.data;
      if (e?.response?.status === 409 && data?.requiresForce) {
        toast.dismiss(tid);
        set({ isDeleting: false, openForceBulk: true, forceBulkSkipped: data.skipped || [], forceBulkMessage: data.message || "" });
        return;
      }
      toast.error(data?.message || "Error", { id: tid }); set({ isDeleting: false });
    }
  },
  cancelForceBulk: () => set({ openForceBulk: false, forceBulkSkipped: [], forceBulkMessage: "" }),
  confirmForceBulk: async () => {
    const ids = [...get().selected];
    if (!ids.length) return;
    set({ isDeleting: true });
    const tid = toast.loading(`Eliminando ${ids.length} venta(s)…`);
    try {
      const res = await salesApi.removeBulk(ids, true);
      toast.success(res.message || "Eliminadas", { id: tid, duration: 4000 });
      set({ isDeleting: false, openForceBulk: false, selected: new Set(), forceBulkSkipped: [], forceBulkMessage: "" });
      await get().fetchSales();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Error", { id: tid }); set({ isDeleting: false });
    }
  },

  // Import — flujo en dos pasos
  openImport: () => set({ openImportDialog: true, importStep: "dropzone",
    importFile: null, importFileName: "", importPreview: null, importResults: null, isImporting: false }),

  closeImport: () => set({ openImportDialog: false, importStep: "idle",
    importFile: null, importFileName: "", importPreview: null, importResults: null, isImporting: false }),

  setImportFile:  (file) => set({ importFile: file, importFileName: file?.name || "", importPreview: null }),
  clearImportFile: ()    => set({ importFile: null, importFileName: "", importPreview: null }),

  // Paso 1: analizar sin insertar
  runPreview: async () => {
    const { importFile, filters } = get();
    if (!importFile) { toast.error("Selecciona un archivo primero"); return; }
    const brand_id = filters.brand_id ? Number(filters.brand_id) : null;
    if (!brand_id) { toast.error("Selecciona una marca en los filtros antes de importar"); return; }

    set({ isImporting: true, importStep: "previewing" });
    const tid = toast.loading("Analizando archivo…");
    try {
      const res = await salesApi.previewImport(importFile, brand_id);
      toast.success("Análisis completado", { id: tid });
      set({ isImporting: false, importStep: "preview_ready", importPreview: res.data ?? res });
    } catch (e) {
      toast.error(e?.response?.data?.message || "Error al analizar el archivo", { id: tid });
      set({ isImporting: false, importStep: "dropzone" });
    }
  },

  // Paso 2: importar confirmado
  runImport: async () => {
    const { importFile, filters } = get();
    if (!importFile) return;
    const brand_id = filters.brand_id ? Number(filters.brand_id) : null;
    if (!brand_id) { toast.error("Selecciona una marca"); return; }

    set({ isImporting: true, importStep: "importing" });
    const tid = toast.loading("Importando ventas…");
    try {
      const res = await salesApi.confirmImport(importFile, brand_id);
      toast.success(res.message || "Importación completada", { id: tid, duration: 5000 });
      set({ isImporting: false, importStep: "done", importResults: res.data ?? res });
      await get().fetchSales();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Error al importar", { id: tid });
      set({ isImporting: false, importStep: "preview_ready" });
    }
  },

  downloadSalesTemplate: async () => {
    const tid = toast.loading("Preparando plantilla…");
    try {
      const blob = await salesApi.downloadTemplate();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "plantilla_ventas.xlsx";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Plantilla descargada", { id: tid });
    } catch { toast.error("No se pudo descargar la plantilla", { id: tid }); }
  },
}));
