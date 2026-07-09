// frontend/src/api/users.api.js
// CAMBIOS: +importFromExcel  +downloadTemplate
import { http } from "./http";

export const usersApi = {
  list:         async (params = {}) => (await http.get("/users", { params })).data,
  getById:      async (id)          => (await http.get(`/users/${id}`)).data,
  create:       async (payload)     => (await http.post("/users", payload)).data,
  update:       async (id, payload) => (await http.put(`/users/${id}`, payload)).data,
  setStatus:    async (id, active)  => (await http.patch(`/users/${id}/status`, { is_active: active })).data,
  replaceBrands: async (id, brands) => (await http.put(`/users/${id}/brands`, { brands })).data,
  addVacation:    async (id, payload) => (await http.post(`/users/${id}/vacations`, payload)).data,
  removeVacation: async (id, vid)     => (await http.delete(`/users/${id}/vacations/${vid}`)).data,

  // Importación Excel: recibe un File object
  importFromExcel: async (file) => {
    const form = new FormData();
    form.append("file", file);
    const res = await http.post("/users/import", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // Descarga plantilla Excel como Blob
  downloadTemplate: async () => {
    const res = await http.get("/users/import/template", { responseType: "blob" });
    return res.data;
  },
};
