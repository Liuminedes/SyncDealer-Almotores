// frontend/src/api/vehicles.api.js
// CAMBIOS: +importFromExcel  +downloadTemplate
import { http } from "./http";

export const vehiclesApi = {
  list:    async (params = {}) => (await http.get("/vehicles", { params })).data,
  getById: async (id)          => (await http.get(`/vehicles/${id}`)).data,
  create:  async (payload)     => (await http.post("/vehicles", payload)).data,
  update:  async (id, payload) => (await http.put(`/vehicles/${id}`, payload)).data,
  setStatus: async (id, isActive) =>
    (await http.patch(`/vehicles/${id}/status`, { is_active: isActive })).data,

  // Importación Excel: recibe un File object del input/dropzone
  importFromExcel: async (file, brand_id) => {
    const form = new FormData();
    form.append("file", file);
    const res = await http.post(`/vehicles/import?brand_id=${brand_id}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // Descarga la plantilla Excel como blob
  downloadTemplate: async () => {
    const res = await http.get("/vehicles/import/template", { responseType: "blob" });
    return res.data; // Blob
  },
};
