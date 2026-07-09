// frontend/src/app/store/users.store.js
// CAMBIOS vs anterior: +openImport, +closeImport, +setImportFile, +runImport, +importResults
import { create }      from "zustand";
import toast           from "react-hot-toast";
import { usersApi }    from "../../api/users.api";
import { rolesApi }    from "../../api/roles.api";
import { http }        from "../../api/http";
import { brandsApi }   from "../../api/brands.api";
import { branchesApi } from "../../api/branches.api";

const initialFilters = {
  page: 1, limit: 10, q: "", role: "", status: "", brand_id: "", branch_id: "",
};

function mergeBrandsForSelection(allBrands = [], current = []) {
  const assignedIds = new Set(
    current.filter((b) => b.can_view || b.can_generate).map((b) => Number(b.brand_id))
  );
  return allBrands.map((b) => ({
    brand_id: Number(b.id),
    name:     b.name,
    code:     b.code,
    assigned: assignedIds.has(Number(b.id)),
  }));
}

export const useUsersStore = create((set, get) => ({
  // ── Data ──────────────────────────────────────────────────────────────────
  items: [], total: 0, totalPages: 1,
  roles: [], brands: [], branches: [],

  // ── UI ────────────────────────────────────────────────────────────────────
  filters:    { ...initialFilters },
  isLoading:  false, isSaving: false, isDeleting: false, error: null,

  // ── Form dialog ───────────────────────────────────────────────────────────
  openForm:            false, formMode: "create",
  formUser:            null,
  formBrandsSelection: null,

  // ── Confirm delete ────────────────────────────────────────────────────────
  openConfirmDelete: false, deleteTargetId: null, deleteTargetName: null,

  // ── Import dialog ─────────────────────────────────────────────────────────
  openImportDialog: false,
  importFile:       null,
  importFileName:   "",
  isImporting:      false,
  importResults:    null,   // { created, updated, skipped, errors[] }

  // ── Filters ───────────────────────────────────────────────────────────────
  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch, page: patch.page ?? s.filters.page ?? 1 } })),
  resetFilters: () => set({ filters: { ...initialFilters } }),

  // ── Meta ──────────────────────────────────────────────────────────────────
  hydrateMeta: async () => {
    try {
      const [rolesRes, brandsRes, branchesRes] = await Promise.all([
        rolesApi.list(),
        brandsApi.list(),
        branchesApi.list().catch(() => ({ data: { items: [] } })),
      ]);
      set({
        roles:    rolesRes?.data || [],
        brands:   Array.isArray(brandsRes) ? brandsRes : (brandsRes?.data?.items || brandsRes?.data || []),
        branches: branchesRes?.data?.items || [],
      });
    } catch { set({ roles: [], brands: [], branches: [] }); }
  },

  // ── Fetch Users ───────────────────────────────────────────────────────────
  fetchUsers: async () => {
    const { filters } = get();
    let role = "";
    try {
      const raw = localStorage.getItem("syncdealer_auth_v1");
      if (raw) role = String(JSON.parse(raw)?.user?.role || "").toUpperCase();
    } catch { /* ignore */ }

    const BRAND_OP = ["ASSISTANT_SALES", "BRAND_MANAGER"];
    if (BRAND_OP.includes(role)) {
      set({ isLoading: true, error: null });
      try {
        const res   = await http.get("/users/brand-advisors");
        const items = res?.data?.data?.items ?? res?.data?.items ?? [];
        const total = res?.data?.data?.total ?? items.length;
        set({ items, total, isLoading: false });
      } catch (e) {
        const msg = e?.response?.data?.message || "Error al cargar usuarios";
        set({ isLoading: false, error: msg }); toast.error(msg);
      }
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const res = await usersApi.list({
        page: filters.page, limit: filters.limit,
        q: filters.q || undefined, role: filters.role || undefined,
        status: filters.status || undefined, brand_id: filters.brand_id || undefined,
        _t: Date.now(),
      });
      const payload = res?.data || {};
      set({ items: payload.items || [], total: payload.total || 0, totalPages: payload.totalPages || 1, isLoading: false });
    } catch (e) {
      const msg = e?.response?.data?.message || "No se pudo cargar usuarios";
      set({ isLoading: false, error: msg }); toast.error(msg);
    }
  },

  // ── Form Create ───────────────────────────────────────────────────────────
  openCreate: async () => {
    set({ openForm: true, formMode: "create", error: null,
      formUser: { full_name: "", email: "", password: "", role_id: "", document_number: "",
        phone: "", hire_date: "", branch_id: "", is_active: true },
      formBrandsSelection: null });
    try {
      if (!get().brands?.length) await get().hydrateMeta();
      set({ formBrandsSelection: mergeBrandsForSelection(get().brands, []) });
    } catch { set({ formBrandsSelection: [] }); }
  },

  // ── Form Edit ─────────────────────────────────────────────────────────────
  openEdit: async (user) => {
    set({ openForm: true, formMode: "edit", formUser: null, formBrandsSelection: null, isSaving: false, error: null });
    try {
      if (!get().brands?.length || !get().branches?.length) await get().hydrateMeta();
      const res = await usersApi.getById(user.id);
      const u   = res?.data;
      set({
        formUser: {
          id: u.id, full_name: u.full_name || "", email: u.email || "", password: "",
          role_id: u?.role?.id ? String(u.role.id) : "",
          document_number: u.document_number || "", phone: u.phone || "",
          hire_date: u.hire_date || "",
          branch_id: u?.branch?.id ? String(u.branch.id) : "",
          is_active: !!u.is_active,
        },
        formBrandsSelection: mergeBrandsForSelection(get().brands, u?.brands || []),
      });
    } catch {
      set({ openForm: false, formUser: null, formBrandsSelection: null });
      toast.error("No se pudo cargar el usuario");
    }
  },

  closeForm: () => set({ openForm: false, formUser: null, formBrandsSelection: null, error: null }),

  setFormUser: (patch) =>
    set((s) => ({ formUser: s.formUser ? { ...s.formUser, ...patch } : s.formUser })),

  toggleBrand: (brand_id) =>
    set((s) => ({
      formBrandsSelection: Array.isArray(s.formBrandsSelection)
        ? s.formBrandsSelection.map((b) => b.brand_id === brand_id ? { ...b, assigned: !b.assigned } : b)
        : s.formBrandsSelection,
    })),

  toggleAllBrands: (assigned) =>
    set((s) => ({
      formBrandsSelection: Array.isArray(s.formBrandsSelection)
        ? s.formBrandsSelection.map((b) => ({ ...b, assigned: !!assigned }))
        : s.formBrandsSelection,
    })),

  // ── Submit ────────────────────────────────────────────────────────────────
  submitForm: async () => {
    const { formMode, formUser, formBrandsSelection } = get();
    if (!formUser) return;
    set({ isSaving: true, error: null });
    try {
      const base = {
        full_name: formUser.full_name, email: formUser.email,
        role_id: Number(formUser.role_id),
        document_number: formUser.document_number || null, phone: formUser.phone || null,
        hire_date: formUser.hire_date || null,
        branch_id: formUser.branch_id ? Number(formUser.branch_id) : null,
        is_active: !!formUser.is_active,
      };
      if (!base.full_name) throw new Error("El nombre es obligatorio");
      if (!base.email)     throw new Error("El email es obligatorio");
      if (!base.role_id)   throw new Error("El rol es obligatorio");

      let userId;
      if (formMode === "create") {
        if (!formUser.password?.trim()) throw new Error("La contraseña es obligatoria");
        const created = await usersApi.create({ ...base, password: formUser.password });
        userId = created?.data?.id;
        toast.success(`Usuario "${formUser.full_name}" creado`);
      } else {
        if (formUser.password?.trim()) base.password = formUser.password.trim();
        await usersApi.update(formUser.id, base);
        userId = formUser.id;
        toast.success("Usuario actualizado");
      }

      const rows = Array.isArray(formBrandsSelection) ? formBrandsSelection : [];
      const brandPayload = rows.filter((b) => b.assigned).map((b) => ({
        brand_id: b.brand_id, can_view: true, can_generate: true,
      }));
      if (userId) await usersApi.replaceBrands(userId, brandPayload);

      set({ isSaving: false, openForm: false, formUser: null, formBrandsSelection: null });
      await get().fetchUsers();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "No se pudo guardar el usuario";
      toast.error(msg); set({ isSaving: false, error: msg });
    }
  },

  // ── Toggle Status ─────────────────────────────────────────────────────────
  toggleStatus: async (user) => {
    const newState = !user.is_active;
    const toastId  = toast.loading(newState ? "Activando usuario…" : "Desactivando usuario…");
    try {
      await usersApi.setStatus(user.id, newState);
      toast.success(newState ? `${user.full_name} activado` : `${user.full_name} desactivado`, { id: toastId });
      await get().fetchUsers();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo actualizar el estado", { id: toastId });
    }
  },

  // ── Delete ────────────────────────────────────────────────────────────────
  promptDelete: (user) =>
    set({ openConfirmDelete: true, deleteTargetId: user.id, deleteTargetName: user.full_name }),
  cancelDelete: () =>
    set({ openConfirmDelete: false, deleteTargetId: null, deleteTargetName: null }),
  confirmDelete: async () => {
    const { deleteTargetId, deleteTargetName } = get();
    if (!deleteTargetId) return;
    set({ isDeleting: true });
    const toastId = toast.loading("Desactivando usuario…");
    try {
      await usersApi.setStatus(deleteTargetId, false);
      toast.success(`${deleteTargetName} desactivado`, { id: toastId });
      set({ isDeleting: false, openConfirmDelete: false, deleteTargetId: null, deleteTargetName: null });
      await get().fetchUsers();
    } catch (e) {
      toast.error(e?.response?.data?.message || "No se pudo completar la acción", { id: toastId });
      set({ isDeleting: false });
    }
  },

  // ── Import ────────────────────────────────────────────────────────────────
  openImport: () =>
    set({ openImportDialog: true, importFile: null, importFileName: "", importResults: null, isImporting: false }),

  closeImport: () =>
    set({ openImportDialog: false, importFile: null, importFileName: "", importResults: null, isImporting: false }),

  setImportFile: (file) =>
    set({ importFile: file, importFileName: file?.name || "", importResults: null }),

  clearImportFile: () =>
    set({ importFile: null, importFileName: "", importResults: null }),

  runImport: async () => {
    const { importFile } = get();
    if (!importFile) { toast.error("Selecciona un archivo Excel primero"); return; }

    set({ isImporting: true, importResults: null });
    const toastId = toast.loading("Procesando archivo Excel…");

    try {
      const res = await usersApi.importFromExcel(importFile);
      toast.success(res.message || "Importación completada", { id: toastId, duration: 5000 });
      set({ isImporting: false, importResults: res.data });
      await get().fetchUsers();
    } catch (e) {
      const msg = e?.response?.data?.message || "Error al procesar el archivo";
      toast.error(msg, { id: toastId });
      set({ isImporting: false });
    }
  },

  downloadUsersTemplate: async () => {
    const toastId = toast.loading("Preparando plantilla…");
    try {
      const blob = await usersApi.downloadTemplate();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url; a.download = "plantilla_asesores.xlsx";
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success("Plantilla descargada", { id: toastId });
    } catch {
      toast.error("No se pudo descargar la plantilla", { id: toastId });
    }
  },
}));
