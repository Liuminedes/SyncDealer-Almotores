import { http } from "./http";

export const usersApi = {
  // ✅ Soporta filtros/paginación: page, limit, q, role, status, brand_id
  list: async (params = {}) => {
    const { data } = await http.get("/users", { params });
    return data; // { ok, data }
  },

  getById: async (id) => {
    const { data } = await http.get(`/users/${id}`);
    return data;
  },

  create: async (payload) => {
    const { data } = await http.post("/users", payload);
    return data;
  },

  update: async (id, payload) => {
    const { data } = await http.put(`/users/${id}`, payload);
    return data;
  },

  setStatus: async (id, isActive) => {
    const { data } = await http.patch(`/users/${id}/status`, { is_active: isActive });
    return data;
  },

  // ✅ Permisos por marca
  getBrands: async (id) => {
    const { data } = await http.get(`/users/${id}/brands`);
    return data;
  },

  replaceBrands: async (id, brands) => {
    const { data } = await http.put(`/users/${id}/brands`, { brands });
    return data;
  },
};
