// frontend/src/app/store/commissionRuns.store.js
// CAMBIOS: +bulkCalculate — cálculo masivo secuencial con progreso en tiempo real
import { create } from "zustand";
import toast from "react-hot-toast";
import { commissionRunsApi } from "../../api/commissionRuns.api";
import { brandsApi }          from "../../api/brands.api";
import { usersApi }           from "../../api/users.api";

const now = new Date();

const initialFilters = {
  page:      1,
  limit:     10,
  brand_id:  "6",
  cut_year:  now.getFullYear(),
  cut_month: now.getMonth() + 1,
  fortnight: "FIRST",
  advisor_id: "",
  status:    "",
};

function normalizeListResponse(res) {
  const root    = res?.data ?? res ?? {};
  const payload = root?.data ?? root;
  const items   =
    payload?.items || payload?.runs || payload?.rows || payload?.data ||
    (Array.isArray(payload) ? payload : []);
  const total = payload?.total ?? payload?.count ?? (Array.isArray(items) ? items.length : 0);
  const totalPages = payload?.totalPages ?? (payload?.limit ? Math.ceil(total / payload.limit) : 1);
  return { items: items || [], total: total || 0, totalPages: totalPages || 1 };
}

export const useCommissionRunsStore = create((set, get) => ({
  // ── Data ──────────────────────────────────────────────────────────────────
  items:      [],
  total:      0,
  totalPages: 1,
  brands:     [],
  advisors:   [],

  // ── UI ────────────────────────────────────────────────────────────────────
  filters:         { ...initialFilters },
  isLoading:       false,
  isCalculating:   false,
  isLoadingDetail: false,
  isDeleting:      false,
  isAdjusting:     false,
  error:           null,

  // ── Dialogs ───────────────────────────────────────────────────────────────
  openCalc:   false,
  calcForm:   null,
  openDetail: false,
  detail:     null,
  detailId:   null,
  openConfirmDelete: false,
  deleteTargetId:    null,
  openAdjustDialog:  false,
  adjustForm:        { amount: "", type: "ADD", note: "" },
  hasAdjustment:     false,

  // ── Bulk calculate ────────────────────────────────────────────────────────
  openBulkCalc:     false,   // dialog de progreso
  bulkStep:         "idle",  // 'idle' | 'confirming' | 'running' | 'done'
  bulkAdvisors:     [],      // lista de asesores a procesar
  bulkTotal:        0,
  bulkDone:         0,
  bulkSucceeded:    0,
  bulkFailed:       0,
  bulkCurrentName:  "",      // nombre del asesor que se está calculando ahora
  bulkResults:      [],      // [{ advisor_id, advisor_name, status, error, run_id }]
  bulkAborted:      false,   // flag para abortar el ciclo

  // ── Helpers ───────────────────────────────────────────────────────────────
  getBrandById: (id) => get().brands.find((b) => String(b.id) === String(id)),
  getBrandCode: () => {
    const b = get().getBrandById(get().filters.brand_id);
    return b?.code || "KIA";
  },

  // ── Filters ───────────────────────────────────────────────────────────────
  setFilters: (patch) =>
    set((s) => ({
      filters: {
        ...s.filters,
        ...patch,
        page:
          patch.page ?? (
            patch.brand_id   !== undefined || patch.cut_year  !== undefined ||
            patch.cut_month  !== undefined || patch.fortnight !== undefined ||
            patch.advisor_id !== undefined || patch.status    !== undefined
              ? 1 : s.filters.page
          ),
      },
    })),

  resetFilters: () => set({ filters: { ...initialFilters } }),

  // ── Meta ──────────────────────────────────────────────────────────────────
  fetchAdvisors: async () => {
    try {
      // Solo asesores ACTIVOS de la marca seleccionada en los filtros
      const { filters } = get();
      const brand_id = filters.brand_id || undefined;
      const res = await usersApi.list({
        role:     "ADVISOR",
        status:   "active",   // ← solo activos
        brand_id: brand_id,   // ← solo de la marca del filtro
        limit:    200,
        page:     1,
      });
      set({ advisors: res?.data?.items ?? [] });
    } catch { set({ advisors: [] }); }
  },

  hydrateMeta: async () => {
    try {
      const res    = await brandsApi.list();
      const root   = res?.data ?? res;
      const brands = root?.brands ?? root?.data ?? root ?? [];
      set({ brands: Array.isArray(brands) ? brands : [] });
    } catch { set({ brands: [] }); }
    await get().fetchAdvisors();
  },

  // ── Fetch Runs ────────────────────────────────────────────────────────────
  fetchRuns: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });
    try {
      const brandCode = get().getBrandCode();
      const res = await commissionRunsApi.list({
        brand:      brandCode,
        page:       filters.page,
        limit:      filters.limit,
        cut_year:   filters.cut_year  || undefined,
        cut_month:  filters.cut_month || undefined,
        fortnight:  filters.fortnight || undefined,
        advisor_id: filters.advisor_id ? Number(filters.advisor_id) : undefined,
        status:     filters.status     || undefined,
      });
      const { items, total, totalPages } = normalizeListResponse(res);
      set({ items, total, totalPages, isLoading: false });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron cargar las comisiones";
      set({ isLoading: false, error: msg });
      toast.error(msg);
    }
  },

  // ── Calculate individual ──────────────────────────────────────────────────
  openCalculate: () => {
    const f = get().filters;
    set({
      openCalc: true, error: null,
      calcForm: {
        advisor_id: f.advisor_id || "",
        cut_year:   f.cut_year,
        cut_month:  f.cut_month,
        fortnight:  f.fortnight,
        notes:      "",
      },
    });
  },

  closeCalculate: () => set({ openCalc: false, calcForm: null }),

  setCalcForm: (patch) =>
    set((s) => ({ calcForm: s.calcForm ? { ...s.calcForm, ...patch } : s.calcForm })),

  submitCalculate: async () => {
    const { calcForm } = get();
    if (!calcForm) return;
    set({ isCalculating: true, error: null });
    const toastId = toast.loading("Calculando comisión…");
    try {
      const brandCode = get().getBrandCode();
      const payload   = {
        advisor_id: Number(calcForm.advisor_id),
        cut_year:   Number(calcForm.cut_year),
        cut_month:  Number(calcForm.cut_month),
        fortnight:  String(calcForm.fortnight || "").toUpperCase(),
      };
      if (calcForm.notes?.trim()) payload.notes = calcForm.notes.trim();
      if (!payload.advisor_id) throw new Error("Selecciona un asesor");
      if (!["FIRST","SECOND"].includes(payload.fortnight)) throw new Error("Quincena inválida");

      const res   = await commissionRunsApi.calculate(payload, { brand: brandCode });
      const runId = res?.data?.run_id ?? res?.data?.data?.run_id ?? null;

      toast.success("Comisión calculada exitosamente", { id: toastId });
      set({ isCalculating: false, openCalc: false, calcForm: null });
      await get().fetchRuns();
      if (runId) await get().openRunDetail(runId);
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo calcular";
      toast.error(msg, { id: toastId });
      set({ isCalculating: false, error: msg });
    }
  },

  // ── BULK CALCULATE ────────────────────────────────────────────────────────

  /** Abre el dialog de confirmación previa al cálculo masivo */
  openBulkCalculate: async () => {
    // Recargar siempre con filtro de marca activa y solo activos
    await get().fetchAdvisors();

    const advisors = get().advisors;
    const { filters } = get();

    set({
      openBulkCalc:    true,
      bulkStep:        "confirming",
      bulkAdvisors:    advisors,
      bulkTotal:       advisors.length,
      bulkDone:        0,
      bulkSucceeded:   0,
      bulkFailed:      0,
      bulkCurrentName: "",
      bulkResults:     [],
      bulkAborted:     false,
    });
  },

  closeBulkCalc: () => {
    // Si está corriendo, marcar como abortado
    if (get().bulkStep === "running") {
      set({ bulkAborted: true });
    }
    set({ openBulkCalc: false, bulkStep: "idle" });
  },

  /** Inicia el cálculo secuencial de todos los asesores */
  startBulkCalculate: async () => {
    const { bulkAdvisors, filters } = get();
    const brandCode = get().getBrandCode();

    if (!bulkAdvisors.length) {
      toast.error("No hay asesores para calcular");
      return;
    }

    set({
      bulkStep:      "running",
      bulkDone:      0,
      bulkSucceeded: 0,
      bulkFailed:    0,
      bulkResults:   [],
      bulkAborted:   false,
    });

    const results = [];

    for (let i = 0; i < bulkAdvisors.length; i++) {
      // Verificar si fue abortado
      if (get().bulkAborted) break;

      const advisor = bulkAdvisors[i];
      set({ bulkCurrentName: advisor.full_name });

      try {
        const res = await commissionRunsApi.calculate(
          {
            advisor_id: advisor.id,
            cut_year:   Number(filters.cut_year),
            cut_month:  Number(filters.cut_month),
            fortnight:  filters.fortnight,
          },
          { brand: brandCode }
        );

        const runId = res?.data?.run_id ?? res?.data?.data?.run_id ?? null;
        results.push({
          advisor_id:   advisor.id,
          advisor_name: advisor.full_name,
          status:       "success",
          run_id:       runId,
        });

        set((s) => ({
          bulkDone:      i + 1,
          bulkSucceeded: s.bulkSucceeded + 1,
          bulkResults:   [...results],
        }));

      } catch (e) {
        const errMsg = e?.response?.data?.message || e?.message || "Error desconocido";
        results.push({
          advisor_id:   advisor.id,
          advisor_name: advisor.full_name,
          status:       "error",
          error:        errMsg,
        });

        set((s) => ({
          bulkDone:    i + 1,
          bulkFailed:  s.bulkFailed + 1,
          bulkResults: [...results],
        }));
      }

      // Pequeña pausa para no saturar el servidor (50ms entre requests)
      await new Promise((r) => setTimeout(r, 50));
    }

    // Finalizado
    const { bulkSucceeded, bulkFailed } = get();
    set({ bulkStep: "done", bulkCurrentName: "" });

    if (bulkFailed === 0) {
      toast.success(`✓ ${bulkSucceeded} comisiones calculadas correctamente`);
    } else {
      toast(`${bulkSucceeded} calculadas, ${bulkFailed} con errores`, { icon: "⚠️" });
    }

    // Refrescar la tabla
    await get().fetchRuns();
  },

  // ── Detail ────────────────────────────────────────────────────────────────
  openRunDetail: async (id) => {
    set({ openDetail: true, detail: null, detailId: id, isLoadingDetail: true, error: null });
    try {
      const brandCode = get().getBrandCode();
      const res       = await commissionRunsApi.getById(id, { brand: brandCode });
      const data      = res?.data ?? res;
      const hasAdj    = data?.run?.manual_adjustment != null;
      set({
        detail:          data,
        isLoadingDetail: false,
        hasAdjustment:   hasAdj,
        adjustForm: hasAdj
          ? { amount: String(data.run.manual_adjustment ?? ""), type: data.run.manual_adjustment_type ?? "ADD", note: data.run.manual_adjustment_note ?? "" }
          : { amount: "", type: "ADD", note: "" },
      });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo cargar el detalle";
      toast.error(msg);
      set({ isLoadingDetail: false, error: msg, openDetail: false, detail: null });
    }
  },

  closeRunDetail: () =>
    set({ openDetail: false, detail: null, detailId: null, openAdjustDialog: false }),

  // ── Ajuste manual ─────────────────────────────────────────────────────────
  setAdjustForm: (patch) => set((s) => ({ adjustForm: { ...s.adjustForm, ...patch } })),
  openAdjust:    () => set({ openAdjustDialog: true }),
  closeAdjust:   () => set({ openAdjustDialog: false }),

  submitAdjustment: async () => {
    const { detailId, adjustForm } = get();
    if (!detailId) return;
    const amount = Number(adjustForm.amount);
    if (!amount || amount <= 0) { toast.error("El monto debe ser mayor a 0"); return; }
    if (!["ADD","SUBTRACT"].includes(adjustForm.type)) { toast.error("Selecciona un tipo"); return; }
    if (!adjustForm.note || adjustForm.note.trim().length < 5) { toast.error("El concepto debe tener al menos 5 caracteres"); return; }

    set({ isAdjusting: true });
    const brandCode = get().getBrandCode();
    const toastId   = toast.loading(adjustForm.type === "ADD" ? "Aplicando aumento…" : "Aplicando descuento…");
    try {
      await commissionRunsApi.applyAdjustment(detailId, brandCode, { amount, type: adjustForm.type, note: adjustForm.note.trim() });
      toast.success(adjustForm.type === "ADD" ? "Aumento aplicado ✓" : "Descuento aplicado ✓", { id: toastId });
      set({ isAdjusting: false, openAdjustDialog: false });
      await get().openRunDetail(detailId);
      await get().fetchRuns();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo aplicar", { id: toastId });
      set({ isAdjusting: false });
    }
  },

  removeAdjustment: async () => {
    const { detailId } = get();
    if (!detailId) return;
    const brandCode = get().getBrandCode();
    const toastId   = toast.loading("Eliminando ajuste…");
    set({ isAdjusting: true });
    try {
      await commissionRunsApi.removeAdjustment(detailId, brandCode);
      toast.success("Ajuste eliminado. Comisión restaurada al valor base.", { id: toastId });
      set({ isAdjusting: false, hasAdjustment: false, adjustForm: { amount: "", type: "ADD", note: "" } });
      await get().openRunDetail(detailId);
      await get().fetchRuns();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo eliminar el ajuste", { id: toastId });
      set({ isAdjusting: false });
    }
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  promptDeleteRun: (id) => set({ openConfirmDelete: true, deleteTargetId: id, error: null }),
  cancelDeleteRun: ()   => set({ openConfirmDelete: false, deleteTargetId: null }),

  confirmDeleteRun: async () => {
    const { deleteTargetId } = get();
    if (!deleteTargetId) return;
    set({ isDeleting: true, error: null });
    const toastId = toast.loading("Eliminando comisión…");
    try {
      const brandCode = get().getBrandCode();
      await commissionRunsApi.delete(deleteTargetId, { brand: brandCode });
      toast.success("Comisión eliminada", { id: toastId });
      set({ isDeleting: false, openConfirmDelete: false, deleteTargetId: null });
      await get().fetchRuns();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo eliminar", { id: toastId });
      set({ isDeleting: false, error: e?.response?.data?.message });
    }
  },
}));