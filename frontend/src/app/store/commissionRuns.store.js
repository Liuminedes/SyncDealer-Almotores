import { create } from "zustand";
import { commissionRunsApi } from "../../api/commissionRuns.api";
import { brandsApi } from "../../api/brands.api";
import { usersApi } from "../../api/users.api";

const now = new Date();

const initialFilters = {
    page: 1,
    limit: 10,
    brand_id: "6", // KIA por defecto
    cut_year: now.getFullYear(),
    cut_month: now.getMonth() + 1,
    fortnight: "FIRST",
    advisor_id: "",
    status: "",
};

function normalizeListResponse(res) {
    const root = res?.data ?? res ?? {};
    const payload = root?.data ?? root;

    const items =
        payload?.items ||
        payload?.runs ||
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

export const useCommissionRunsStore = create((set, get) => ({
    // ======================
    // DATA
    // ======================
    items: [],
    total: 0,
    totalPages: 1,

    brands: [],
    advisors: [],

    // ======================
    // UI / STATE
    // ======================
    filters: { ...initialFilters },
    isLoading: false,
    isCalculating: false,
    isLoadingDetail: false,
    error: null,

    // Dialogs
    openCalc: false,
    calcForm: null,

    openDetail: false,
    detail: null,
    detailId: null,

    // ======================
    // HELPERS
    // ======================
    getBrandById: (id) => get().brands.find((b) => String(b.id) === String(id)),

    getBrandCode: () => {
        const b = get().getBrandById(get().filters.brand_id);
        return b?.code || "KIA";
    },

    // ======================
    // FILTERS
    // ======================
    setFilters: (patch) =>
        set((s) => ({
            filters: {
                ...s.filters,
                ...patch,
                page:
                    patch.page ??
                    (patch.brand_id !== undefined ||
                        patch.cut_year !== undefined ||
                        patch.cut_month !== undefined ||
                        patch.fortnight !== undefined ||
                        patch.advisor_id !== undefined ||
                        patch.status !== undefined
                        ? 1
                        : s.filters.page),
            },
        })),

    resetFilters: () => set({ filters: { ...initialFilters } }),

    // ======================
    // META
    // ======================
    fetchAdvisors: async () => {
        try {
            // 🔥 IMPORTANTÍSIMO: tu backend NO acepta limit=200 (te da 400)
            // En ventas funciona porque usas limit=100.
            const res = await usersApi.list({
                role: "ADVISOR",
                limit: 100,
                page: 1,
            });

            const items = res?.data?.items ?? [];
            set({ advisors: items });
        } catch (error) {
            console.error("Error cargando asesores (Runs):", error);
            set({ advisors: [] });
        }
    },

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

        // Advisors
        await get().fetchAdvisors();
    },

    // ======================
    // LIST RUNS
    // ======================
    fetchRuns: async () => {
        const { filters } = get();
        set({ isLoading: true, error: null });

        try {
            const brandCode = get().getBrandCode();

            const res = await commissionRunsApi.list({
                brand: brandCode,
                page: filters.page,
                limit: filters.limit,
                cut_year: filters.cut_year || undefined,
                cut_month: filters.cut_month || undefined,
                fortnight: filters.fortnight || undefined,
                advisor_id: filters.advisor_id ? Number(filters.advisor_id) : undefined,
                status: filters.status || undefined,
            });

            const { items, total, totalPages } = normalizeListResponse(res);
            set({ items, total, totalPages, isLoading: false });
        } catch (e) {
            const msg =
                e?.response?.data?.message || "No se pudieron cargar las comisiones";
            set({ isLoading: false, error: msg });
        }
    },

    // ======================
    // CALCULATE
    // ======================
    openCalculate: () => {
        const f = get().filters;
        set({
            openCalc: true,
            error: null,
            calcForm: {
                advisor_id: f.advisor_id || "",
                cut_year: f.cut_year,
                cut_month: f.cut_month,
                fortnight: f.fortnight,
                notes: "",
            },
        });
    },

    closeCalculate: () => set({ openCalc: false, calcForm: null }),

    setCalcForm: (patch) =>
        set((s) => ({
            calcForm: s.calcForm ? { ...s.calcForm, ...patch } : s.calcForm,
        })),

    submitCalculate: async () => {
        const { calcForm } = get();
        if (!calcForm) return;

        set({ isCalculating: true, error: null });

        try {
            const brandCode = get().getBrandCode();

            const payload = {
                advisor_id: Number(calcForm.advisor_id),
                cut_year: Number(calcForm.cut_year),
                cut_month: Number(calcForm.cut_month),
                fortnight: String(calcForm.fortnight || "").toUpperCase(),
            };
            const notes = String(calcForm.notes || "").trim();
            if (notes) payload.notes = notes; // ✅ solo si hay algo

            if (!payload.advisor_id) throw new Error("Selecciona un asesor");
            if (!payload.cut_year || !payload.cut_month)
                throw new Error("Selecciona año y mes");
            if (!["FIRST", "SECOND"].includes(payload.fortnight))
                throw new Error("Quincena inválida");

            const res = await commissionRunsApi.calculate(payload, { brand: brandCode });

            const runId =
                res?.data?.run_id ??
                res?.data?.data?.run_id ??
                res?.data?.run?.id ??
                res?.data?.data?.run?.id ??
                null;

            set({ isCalculating: false, openCalc: false, calcForm: null });

            await get().fetchRuns();
            if (runId) await get().openRunDetail(runId);
        } catch (e) {
            const msg =
                e?.response?.data?.message || e?.message || "No se pudo calcular la comisión";
            set({ isCalculating: false, error: msg });
        }
    },

    // ======================
    // DETAIL
    // ======================
    openRunDetail: async (id) => {
        set({
            openDetail: true,
            detail: null,
            detailId: id,
            isLoadingDetail: true,
            error: null,
        });

        try {
            const brandCode = get().getBrandCode();
            const res = await commissionRunsApi.getById(id, { brand: brandCode });

            set({
                detail: res?.data ?? res,
                isLoadingDetail: false,
            });
        } catch (e) {
            const msg =
                e?.response?.data?.message || "No se pudo cargar el detalle";
            set({
                isLoadingDetail: false,
                error: msg,
                openDetail: false,
                detail: null,
            });
        }
    },

    closeRunDetail: () =>
        set({ openDetail: false, detail: null, detailId: null }),
}));
