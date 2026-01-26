import { http } from "./http";

export const vehiclesApi = {
  list: async (params = {}) => (await http.get("/vehicles", { params })).data,
  getById: async (id) => (await http.get(`/vehicles/${id}`)).data,
  create: async (payload) => (await http.post("/vehicles", payload)).data,
  update: async (id, payload) => (await http.put(`/vehicles/${id}`, payload)).data,
  setStatus: async (id, isActive) =>
    (await http.patch(`/vehicles/${id}/status`, { is_active: isActive })).data,
};
