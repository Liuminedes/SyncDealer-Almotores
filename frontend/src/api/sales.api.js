// frontend/src/api/sales.api.js
import { http } from "./http";

export const salesApi = {
  list:    async (params = {})         => (await http.get("/sales",           { params })).data,
  getById: async (id)                  => (await http.get(`/sales/${id}`)).data,
  create:  async (payload)             => (await http.post("/sales", payload)).data,
  update:  async (id, payload)         => (await http.put(`/sales/${id}`, payload)).data,

  remove: async (id, options = {}) => {
    const params = options?.force ? { force: "true" } : {};
    return (await http.delete(`/sales/${id}`, { params })).data;
  },

  removeBulk: async (ids = [], force = false) =>
    (await http.delete("/sales/bulk", { data: { ids, force } })).data,

  // ── Importación Excel ────────────────────────────────────────────────────
  // Paso 1: pre-validación (no inserta nada, devuelve resumen)
  previewImport: async (file, brand_id) => {
    const form = new FormData();
    form.append("file", file);
    const res = await http.post(`/sales/import/preview?brand_id=${brand_id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // Paso 2: confirmación (inserta los válidos)
  confirmImport: async (file, brand_id) => {
    const form = new FormData();
    form.append("file", file);
    const res = await http.post(`/sales/import/confirm?brand_id=${brand_id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // Descarga plantilla Excel
  downloadTemplate: async () => {
    const res = await http.get("/sales/import/template", { responseType: "blob" });
    return res.data;
  },
};
