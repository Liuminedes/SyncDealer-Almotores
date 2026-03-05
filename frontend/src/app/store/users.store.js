import { create } from "zustand";
import { usersApi } from "../../api/users.api";
import { rolesApi } from "../../api/roles.api";
import { brandsApi } from "../../api/brands.api";
import { branchesApi } from "../../api/branches.api";

const initialFilters = {
  page: 1,
  limit: 10,
  q: "",
  role: "",
  status: "",
  brand_id: "",
  branch_id: "",
};

function mergeBrandsForSelection(allBrands = [], current = []) {
  const byId = new Map(current.map((b) => [Number(b.brand_id), b]));
  return allBrands.map((b) => {
    const hit = byId.get(Number(b.id));
    return {
      brand_id: Number(b.id),
      name: b.name,
      code: b.code,
      can_view: !!hit?.can_view,
      can_generate: !!hit?.can_generate,
    };
  });
}

export const useUsersStore = create((set, get) => ({
  // Data
  items: [],
  total: 0,
  totalPages: 1,

  roles: [],
  brands: [],
  branches: [],

  // UI/State
  filters: { ...initialFilters },
  isLoading: false,
  isSaving: false,
  error: null,

  // Dialog state
  openForm: false,
  formMode: "create",
  formUser: null,
  formBrandsSelection: null,

  // Brands Modal
  openBrands: false,
  brandsUser: null,
  brandsSelection: null,

  // --- Actions ---
  setFilters: (patch) =>
    set((s) => ({
      filters: { ...s.filters, ...patch, page: patch.page ?? s.filters.page ?? 1 },
    })),

  resetFilters: () => set({ filters: { ...initialFilters } }),

  hydrateMeta: async () => {
    try {
      const [rolesRes, brandsRes, branchesRes] = await Promise.all([
        rolesApi.list(),
        brandsApi.list(),
        branchesApi.list().catch(() => ({ data: { items: [] } })), // branches falla gracefully
      ]);

      set({
        roles: rolesRes?.data || [],
        brands: Array.isArray(brandsRes) ? brandsRes : (brandsRes?.data?.items || brandsRes?.data || []),
        branches: branchesRes?.data?.items || [],
      });
    } catch {
      set({ roles: [], brands: [], branches: [] });
    }
  },

  fetchUsers: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });
    try {
      const res = await usersApi.list({
        page: filters.page,
        limit: filters.limit,
        q: filters.q || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        brand_id: filters.brand_id || undefined,
        _t: Date.now(),        // ← rompe el caché del browser
      });
      const payload = res?.data || {};
      set({
        items: payload.items || [],
        total: payload.total || 0,
        totalPages: payload.totalPages || 1,
        isLoading: false,
      });
    } catch (e) {
      set({ isLoading: false, error: e?.response?.data?.message || "No se pudo cargar usuarios" });
    }
  },

  // --- Form (Create/Edit) ---
  openCreate: async () => {
    set({
      openForm: true,
      formMode: "create",
      formUser: {
        full_name: "", email: "", password: "", role_id: "",
        document_number: "", phone: "", hire_date: "", branch_id: "",
        is_active: true,
      },
      formBrandsSelection: null,
      error: null,
    });
    try {
      if (!get().brands?.length) await get().hydrateMeta();
      set({ formBrandsSelection: mergeBrandsForSelection(get().brands, []) });
    } catch {
      set({ formBrandsSelection: [] });
    }
  },

  openEdit: async (user) => {
    set({ openForm: true, formMode: "edit", formUser: null, formBrandsSelection: null, isSaving: false, error: null });
    try {
      // Primero asegurar que meta esté cargada
      if (!get().brands?.length || !get().branches?.length) {
        await get().hydrateMeta();
      }

      const res = await usersApi.getById(user.id);
      const u = res?.data;

      set({
        formUser: {
          id: u.id,
          full_name: u.full_name || "",
          email: u.email || "",
          password: "",
          role_id: u?.role?.id ? String(u.role.id) : "",
          document_number: u.document_number || "",
          phone: u.phone || "",
          hire_date: u.hire_date || "",
          branch_id: u?.branch?.id ? String(u.branch.id) : "",
          is_active: !!u.is_active,
        },
        formBrandsSelection: mergeBrandsForSelection(get().brands, u?.brands || []),
      });
    } catch (e) {
      console.error("openEdit error:", e);
      set({ openForm: false, formUser: null, formBrandsSelection: null });
    }
  },

  closeForm: () => set({ openForm: false, formUser: null, formBrandsSelection: null }),

  setFormUser: (patch) =>
    set((s) => ({ formUser: s.formUser ? { ...s.formUser, ...patch } : s.formUser })),

  setFormBrandPerm: (brand_id, patch) =>
    set((s) => {
      if (!Array.isArray(s.formBrandsSelection)) return {};
      return {
        formBrandsSelection: s.formBrandsSelection.map((b) =>
          b.brand_id === brand_id ? { ...b, ...patch } : b
        ),
      };
    }),

  submitForm: async () => {
    const { formMode, formUser, formBrandsSelection } = get();
    if (!formUser) return;
    set({ isSaving: true, error: null });
    try {
      const basePayload = {
        full_name: formUser.full_name,
        email: formUser.email,
        role_id: Number(formUser.role_id),
        document_number: formUser.document_number || null,
        phone: formUser.phone || null,
        hire_date: formUser.hire_date || null,
        branch_id: formUser.branch_id ? Number(formUser.branch_id) : null,
        is_active: !!formUser.is_active,
      };

      let userId;

      if (formMode === "create") {
        const created = await usersApi.create({ ...basePayload, password: formUser.password });
        userId = created?.data?.id;
      } else {
        if (formUser.password?.trim()) basePayload.password = formUser.password.trim();
        await usersApi.update(formUser.id, basePayload);
        userId = formUser.id;
      }

      // Guardar permisos de marca
      const rows = Array.isArray(formBrandsSelection) ? formBrandsSelection : [];
      const brandPayload = rows
        .filter((b) => b.can_view || b.can_generate)
        .map((b) => ({ brand_id: b.brand_id, can_view: !!b.can_view, can_generate: !!b.can_generate }));

      if (userId) await usersApi.replaceBrands(userId, brandPayload);

      set({ isSaving: false, openForm: false, formUser: null, formBrandsSelection: null });
      await get().fetchUsers();
    } catch (e) {
      set({ isSaving: false, error: e?.response?.data?.message || "No se pudo guardar el usuario" });
    }
  },

  toggleStatus: async (user) => {
    try {
      await usersApi.setStatus(user.id, !user.is_active);
      await get().fetchUsers();
    } catch (e) {
      set({ error: e?.response?.data?.message || "No se pudo actualizar el estado" });
    }
  },

  // --- Brands Modal ---
  openBrandsModal: async (user) => {
    set({ openBrands: true, brandsUser: user, brandsSelection: null, isSaving: false, error: null });
    try {
      if (!get().brands?.length) await get().hydrateMeta();
      const res = await usersApi.getBrands(user.id);
      const current = res?.data || [];
      set({ brandsSelection: mergeBrandsForSelection(get().brands, current) });
    } catch (e) {
      set({ error: e?.response?.data?.message || "No se pudieron cargar permisos por marca", brandsSelection: [] });
    }
  },

  closeBrandsModal: () => set({ openBrands: false, brandsUser: null, brandsSelection: null }),

  setBrandPerm: (brand_id, patch) =>
    set((s) => {
      if (!Array.isArray(s.brandsSelection)) return {};
      return {
        brandsSelection: s.brandsSelection.map((b) =>
          b.brand_id === brand_id ? { ...b, ...patch } : b
        ),
      };
    }),

  saveBrands: async () => {
    const { brandsUser, brandsSelection } = get();
    if (!brandsUser) return;
    set({ isSaving: true, error: null });
    try {
      const payload = (Array.isArray(brandsSelection) ? brandsSelection : [])
        .filter((b) => b.can_view || b.can_generate)
        .map((b) => ({ brand_id: b.brand_id, can_view: !!b.can_view, can_generate: !!b.can_generate }));
      await usersApi.replaceBrands(brandsUser.id, payload);
      set({ isSaving: false, openBrands: false, brandsUser: null, brandsSelection: null });
      await get().fetchUsers();
    } catch (e) {
      set({ isSaving: false, error: e?.response?.data?.message || "No se pudieron guardar permisos por marca" });
    }
  },
}));