import { create } from "zustand";
import { usersApi } from "../../api/users.api";
import { rolesApi } from "../../api/roles.api";
import { brandsApi } from "../../api/brands.api";

const initialFilters = {
  page: 1,
  limit: 10,
  q: "",
  role: "",
  status: "",
  brand_id: "",
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

  // UI/State
  filters: { ...initialFilters },
  isLoading: false,
  isSaving: false,
  error: null,

  // Dialog state
  openForm: false,
  formMode: "create",
  formUser: null,

  // Brands for create/edit form (same shape as modal)
  formBrandsSelection: null, // null=cargando | []=cargado

  // Brands Modal
  openBrands: false,
  brandsUser: null,
  brandsSelection: null, // null=cargando | []=cargado

  // --- Actions ---
  setFilters: (patch) =>
    set((s) => ({
      filters: { ...s.filters, ...patch, page: patch.page ?? s.filters.page ?? 1 },
    })),

  resetFilters: () => set({ filters: { ...initialFilters } }),

  hydrateMeta: async () => {
    try {
      const [rolesRes, brandsRes] = await Promise.all([rolesApi.list(), brandsApi.list()]);
      set({
        roles: rolesRes?.data || [],
        brands: brandsRes || [],
      });
    } catch {
      set({ roles: [], brands: [] });
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
      });

      const payload = res?.data || {};
      set({
        items: payload.items || [],
        total: payload.total || 0,
        totalPages: payload.totalPages || 1,
        isLoading: false,
      });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo cargar usuarios";
      set({ isLoading: false, error: msg });
    }
  },

  // --- Form (Create/Edit) ---
  openCreate: async () => {
    set({
      openForm: true,
      formMode: "create",
      formUser: { full_name: "", email: "", password: "", role_id: "", is_active: true },
      formBrandsSelection: null,
      error: null,
    });

    try {
      if (!get().brands?.length) await get().hydrateMeta();
      const allBrands = get().brands || [];
      set({ formBrandsSelection: mergeBrandsForSelection(allBrands, []) });
    } catch {
      set({ formBrandsSelection: [] });
    }
  },

  openEdit: async (user) => {
    set({
      openForm: true,
      formMode: "edit",
      formUser: null,
      formBrandsSelection: null,
      isSaving: false,
      error: null,
    });

    try {
      if (!get().brands?.length) await get().hydrateMeta();

      const res = await usersApi.getById(user.id);
      const u = res?.data;

      set({
        formUser: {
          id: u.id,
          full_name: u.full_name,
          email: u.email,
          password: "",
          role_id: u?.role?.id ? String(u.role.id) : "",
          is_active: !!u.is_active,
        },
      });

      const current = u?.brands || []; // [{brand_id, name, code, can_view, can_generate}]
      const allBrands = get().brands || [];
      set({ formBrandsSelection: mergeBrandsForSelection(allBrands, current) });
    } catch {
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
      if (formMode === "create") {
        const created = await usersApi.create({
          full_name: formUser.full_name,
          email: formUser.email,
          password: formUser.password,
          role_id: Number(formUser.role_id),
          is_active: !!formUser.is_active,
        });

        // Si el usuario seleccionó marcas en el formulario, las aplicamos (2-step)
        const userId = created?.data?.id;
        const rows = Array.isArray(formBrandsSelection) ? formBrandsSelection : [];
        const payload = rows
          .filter((b) => b.can_view || b.can_generate)
          .map((b) => ({
            brand_id: b.brand_id,
            can_view: !!b.can_view,
            can_generate: !!b.can_generate,
          }));

        if (userId && payload.length) {
          await usersApi.replaceBrands(userId, payload);
        }
      } else {
        const payload = {
          full_name: formUser.full_name,
          email: formUser.email,
          role_id: Number(formUser.role_id),
          is_active: !!formUser.is_active,
        };

        if (formUser.password?.trim()) payload.password = formUser.password.trim();

        await usersApi.update(formUser.id, payload);

        // También actualizamos marcas desde el mismo form
        const rows = Array.isArray(formBrandsSelection) ? formBrandsSelection : [];
        const brandPayload = rows
          .filter((b) => b.can_view || b.can_generate)
          .map((b) => ({
            brand_id: b.brand_id,
            can_view: !!b.can_view,
            can_generate: !!b.can_generate,
          }));

        await usersApi.replaceBrands(formUser.id, brandPayload);
      }

      set({ isSaving: false, openForm: false, formUser: null, formBrandsSelection: null });
      await get().fetchUsers();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo guardar el usuario";
      set({ isSaving: false, error: msg });
    }
  },

  // --- Status ---
  toggleStatus: async (user) => {
    try {
      await usersApi.setStatus(user.id, !user.is_active);
      await get().fetchUsers();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo actualizar el estado";
      set({ error: msg });
    }
  },

  // --- Brands Modal (standalone) ---
  openBrandsModal: async (user) => {
    set({
      openBrands: true,
      brandsUser: user,
      brandsSelection: null,
      isSaving: false,
      error: null,
    });

    try {
      if (!get().brands?.length) await get().hydrateMeta();

      const res = await usersApi.getBrands(user.id);
      const current = res?.data || [];

      const allBrands = get().brands || [];
      set({ brandsSelection: mergeBrandsForSelection(allBrands, current) });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron cargar permisos por marca";
      set({ error: msg, brandsSelection: [] });
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
      const rows = Array.isArray(brandsSelection) ? brandsSelection : [];
      const payload = rows
        .filter((b) => b.can_view || b.can_generate)
        .map((b) => ({
          brand_id: b.brand_id,
          can_view: !!b.can_view,
          can_generate: !!b.can_generate,
        }));

      await usersApi.replaceBrands(brandsUser.id, payload);

      set({ isSaving: false, openBrands: false, brandsUser: null, brandsSelection: null });
      await get().fetchUsers();
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudieron guardar permisos por marca";
      set({ isSaving: false, error: msg });
    }
  },
}));
